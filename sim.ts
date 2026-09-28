// Bounded discrete-event simulation of one shift. Decision-support estimate only — not a control system.
import { mulberry32 } from "./generator";

export type SimStation = "CNC-01" | "CNC-02" | "CNC-03" | "ALT-CELL" | "ASSEMBLY-01" | "QUALITY-01";
export const CNCS = ["CNC-01", "CNC-02", "CNC-03"] as const;
export type Cnc = (typeof CNCS)[number];
export const SIM_STATIONS: SimStation[] = ["CNC-01", "CNC-02", "CNC-03", "ALT-CELL", "ASSEMBLY-01", "QUALITY-01"];

export type ScenarioKind = "baseline" | "downtime" | "redistribute" | "demand" | "route" | "inspection" | "mitigation";

export interface BaseParams {
  arrivalPerHour: number;
  cycle: Record<"CNC-01" | "CNC-02" | "CNC-03" | "ASSEMBLY-01" | "QUALITY-01", number>; // mean seconds
  travel: { rmToCnc: number; cncToAsm: number; asmToQi: number; qiToFg: number; toAlt: number };
}

export interface Controls {
  downCnc: Cnc;
  downStartMin: number;
  downMin: number;
  redistFrom: Cnc;
  redistTo: Cnc;
  redistPct: number;
  demandPct: number;
  routeFrom: Cnc;
  routePct: number;
  altCycleFactor: number;
  split: Record<Cnc, number>; // relative shares
}

export const SHIFT_HOURS = 8;
export const REPLICATIONS = 12;
export const CV = 0.12;

export interface SimConfig {
  kind: ScenarioKind;
  label: string;
  arrivalPerHour: number;
  share: Record<Cnc | "ALT-CELL", number>; // sums to 1
  down: { cnc: Cnc; start: number; end: number } | null; // seconds
  qualityServers: number;
  cycle: Record<SimStation, number>;
  travel: BaseParams["travel"];
}

export interface StationResult {
  avgQueue: number;
  maxQueue: number;
  util: number;
  started: number;
}

export interface SimResult {
  config: SimConfig;
  throughput: number;
  leadMin: number;
  wip: number;
  stations: Record<SimStation, StationResult>;
  bottleneck: SimStation;
  bottleneckWhy: string;
  runtimeMs: number;
  seed: number;
}

const norm = (sh: Record<string, number>) => {
  const t = Object.values(sh).reduce((a, b) => a + b, 0) || 1;
  return Object.fromEntries(Object.entries(sh).map(([k, v]) => [k, v / t]));
};

export function buildConfig(kind: ScenarioKind, base: BaseParams, c: Controls): SimConfig {
  const share: Record<Cnc | "ALT-CELL", number> = { ...(norm(c.split) as Record<Cnc, number>), "ALT-CELL": 0 };
  let arrival = base.arrivalPerHour;
  let down: SimConfig["down"] = null;
  let q = 1;
  let label = "Baseline";
  const shift = (from: Cnc, to: Cnc | "ALT-CELL", pct: number) => {
    const moved = share[from] * (pct / 100);
    share[from] -= moved;
    share[to] += moved;
  };
  const withDown = () => {
    down = { cnc: c.downCnc, start: c.downStartMin * 60, end: (c.downStartMin + c.downMin) * 60 };
  };
  switch (kind) {
    case "downtime":
      withDown();
      label = `${c.downCnc} down ${c.downMin} min`;
      break;
    case "redistribute":
      shift(c.redistFrom, c.redistTo, c.redistPct);
      label = `Shift ${c.redistPct}% ${c.redistFrom} → ${c.redistTo}`;
      break;
    case "demand":
      arrival *= 1 + c.demandPct / 100;
      label = `Demand +${c.demandPct}%`;
      break;
    case "route":
      shift(c.routeFrom, "ALT-CELL", c.routePct);
      label = `Route ${c.routePct}% ${c.routeFrom} → ALT-CELL`;
      break;
    case "inspection":
      q = 2;
      label = "+1 quality station";
      break;
    case "mitigation":
      withDown();
      shift(c.downCnc, c.redistTo === c.downCnc ? (c.downCnc === "CNC-02" ? "CNC-01" : "CNC-02") : c.redistTo, c.redistPct);
      label = `Downtime + shift ${c.redistPct}% ${c.downCnc} → ${c.redistTo === c.downCnc ? "CNC-02" : c.redistTo}`;
      break;
  }
  const cncMean = (base.cycle["CNC-01"] + base.cycle["CNC-02"] + base.cycle["CNC-03"]) / 3;
  return {
    kind, label, arrivalPerHour: arrival, share, down, qualityServers: q,
    cycle: { ...base.cycle, "ALT-CELL": cncMean * c.altCycleFactor },
    travel: base.travel,
  };
}

// Minimal binary heap on event time
type Ev = { t: number; seq: number; type: "arrive" | "reach" | "finish" | "up" | "fg"; pid: number; st?: SimStation };
class Heap {
  a: Ev[] = [];
  push(e: Ev) {
    const a = this.a;
    a.push(e);
    let i = a.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (a[p]!.t < e.t || (a[p]!.t === e.t && a[p]!.seq < e.seq)) break;
      a[i] = a[p]!;
      i = p;
    }
    a[i] = e;
  }
  pop(): Ev | undefined {
    const a = this.a;
    const top = a[0];
    const last = a.pop();
    if (a.length && last) {
      let i = 0;
      for (;;) {
        const l = 2 * i + 1, r = l + 1;
        let m = i;
        const lt = (x: Ev, y: Ev) => x.t < y.t || (x.t === y.t && x.seq < y.seq);
        if (l < a.length && lt(a[l]!, m === i ? last : a[m]!)) m = l;
        if (r < a.length && lt(a[r]!, m === i ? last : a[m]!)) m = r;
        if (m === i) break;
        a[i] = a[m]!;
        i = m;
      }
      a[i] = last;
    }
    return top;
  }
}

function replicate(cfg: SimConfig, seed: number) {
  const rnd = mulberry32(seed);
  const T = SHIFT_HOURS * 3600;
  const normal = () => Math.sqrt(-2 * Math.log(1 - rnd())) * Math.cos(2 * Math.PI * rnd());
  const sample = (mean: number) => Math.max(mean * 0.5, mean * (1 + CV * normal()));
  const servers = (s: SimStation) => (s === "QUALITY-01" ? cfg.qualityServers : 1);
  const st = Object.fromEntries(
    SIM_STATIONS.map((s) => [s, { busy: 0, queue: [] as number[], busyTime: 0, area: 0, lastT: 0, max: 0, started: 0 }]),
  ) as Record<SimStation, { busy: number; queue: number[]; busyTime: number; area: number; lastT: number; max: number; started: number }>;
  const arrivedAt: number[] = [];
  const leads: number[] = [];
  const heap = new Heap();
  let seq = 0;
  const push = (e: Omit<Ev, "seq">) => heap.push({ ...e, seq: seq++ });
  const isDown = (s: SimStation, t: number) => !!cfg.down && cfg.down.cnc === s && t >= cfg.down.start && t < cfg.down.end;
  const qStat = (s: SimStation, t: number) => {
    const x = st[s];
    x.area += x.queue.length * (Math.min(t, T) - Math.min(x.lastT, T));
    x.lastT = t;
  };
  const tryStart = (s: SimStation, t: number) => {
    const x = st[s];
    while (x.busy < servers(s) && x.queue.length && !isDown(s, t)) {
      qStat(s, t);
      const pid = x.queue.shift()!;
      x.busy++;
      x.started++;
      const ct = sample(cfg.cycle[s]);
      x.busyTime += Math.max(0, Math.min(t + ct, T) - Math.min(t, T));
      push({ t: t + ct, type: "finish", pid, st: s });
    }
  };
  const next: Partial<Record<SimStation, [SimStation | "FG", number]>> = {
    "CNC-01": ["ASSEMBLY-01", cfg.travel.cncToAsm], "CNC-02": ["ASSEMBLY-01", cfg.travel.cncToAsm], "CNC-03": ["ASSEMBLY-01", cfg.travel.cncToAsm],
    "ALT-CELL": ["ASSEMBLY-01", cfg.travel.cncToAsm], "ASSEMBLY-01": ["QUALITY-01", cfg.travel.asmToQi], "QUALITY-01": ["FG", cfg.travel.qiToFg],
  };
  const shareKeys = Object.keys(cfg.share) as Array<Cnc | "ALT-CELL">;

  // Poisson arrivals over the shift
  let t = 0, pid = 0;
  const gap = 3600 / cfg.arrivalPerHour;
  while (t < T) {
    push({ t, type: "arrive", pid: pid++ });
    t += -Math.log(1 - rnd()) * gap;
  }
  if (cfg.down) push({ t: cfg.down.end, type: "up", pid: -1, st: cfg.down.cnc });

  for (let e = heap.pop(); e && e.t <= T; e = heap.pop()) {
    if (e.type === "arrive") {
      arrivedAt[e.pid] = e.t;
      let r = rnd(), dest: SimStation = "CNC-01";
      for (const k of shareKeys) {
        if ((r -= cfg.share[k]) <= 0) { dest = k; break; }
      }
      push({ t: e.t + (dest === "ALT-CELL" ? cfg.travel.toAlt : cfg.travel.rmToCnc), type: "reach", pid: e.pid, st: dest });
    } else if (e.type === "reach") {
      const s = e.st!;
      qStat(s, e.t);
      st[s].queue.push(e.pid);
      st[s].max = Math.max(st[s].max, st[s].queue.length);
      tryStart(s, e.t);
    } else if (e.type === "finish") {
      const s = e.st!;
      st[s].busy--;
      const [to, tt] = next[s]!;
      if (to === "FG") push({ t: e.t + tt, type: "fg", pid: e.pid });
      else push({ t: e.t + tt, type: "reach", pid: e.pid, st: to });
      tryStart(s, e.t);
    } else if (e.type === "up") tryStart(e.st!, e.t);
    else if (e.type === "fg") leads.push(e.t - arrivedAt[e.pid]!);
  }
  for (const s of SIM_STATIONS) qStat(s, T);
  return {
    throughput: leads.length,
    lead: leads.length ? leads.reduce((a, b) => a + b, 0) / leads.length : 0,
    wip: pid - leads.length,
    stations: Object.fromEntries(
      SIM_STATIONS.map((s) => [s, { avgQueue: st[s].area / T, maxQueue: st[s].max, util: st[s].busyTime / (servers(s) * T), started: st[s].started }]),
    ) as Record<SimStation, StationResult>,
  };
}

/** Runs REPLICATIONS seeded replications and averages every output. */
export function runScenario(cfg: SimConfig, seed = 2026): SimResult {
  const t0 = performance.now();
  const reps = Array.from({ length: REPLICATIONS }, (_, i) => replicate(cfg, seed + i * 7919));
  const avg = (f: (r: (typeof reps)[number]) => number) => reps.reduce((a, r) => a + f(r), 0) / reps.length;
  const stations = Object.fromEntries(
    SIM_STATIONS.map((s) => [s, {
      avgQueue: avg((r) => r.stations[s].avgQueue),
      maxQueue: avg((r) => r.stations[s].maxQueue),
      util: avg((r) => r.stations[s].util),
      started: avg((r) => r.stations[s].started),
    }]),
  ) as Record<SimStation, StationResult>;
  const active = SIM_STATIONS.filter((s) => stations[s].started > 0);
  const bottleneck = active.reduce((b, s) =>
    stations[s].util + stations[s].avgQueue / 100 > stations[b].util + stations[b].avgQueue / 100 ? s : b, active[0] ?? "CNC-03");
  const b = stations[bottleneck];
  return {
    config: cfg,
    throughput: avg((r) => r.throughput),
    leadMin: avg((r) => r.lead) / 60,
    wip: avg((r) => r.wip),
    stations,
    bottleneck,
    bottleneckWhy: `highest utilization ${(b.util * 100).toFixed(0)}%, avg queue ${b.avgQueue.toFixed(1)}, max queue ${b.maxQueue.toFixed(1)}`,
    runtimeMs: performance.now() - t0,
    seed,
  };
}

export const pctChange = (v: number, base: number) => (base ? ((v - base) / base) * 100 : 0);
