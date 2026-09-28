// Rule-based analytics. Every number here is computed directly from captured events and twin state.
import type { TwinState } from "./store";
import type { StationId } from "./types";
import { SHIFT_START } from "./generator";

export const PROCESS_STATIONS: StationId[] = ["CNC-01", "CNC-02", "CNC-03", "ASSEMBLY-01", "QUALITY-01"];
export const DOWNSTREAM: Record<string, StationId[]> = {
  "CNC-01": ["ASSEMBLY-01", "QUALITY-01", "FG-STORE"],
  "CNC-02": ["ASSEMBLY-01", "QUALITY-01", "FG-STORE"],
  "CNC-03": ["ASSEMBLY-01", "QUALITY-01", "FG-STORE"],
  "ASSEMBLY-01": ["QUALITY-01", "FG-STORE"],
  "QUALITY-01": ["FG-STORE"],
};
export const TARGET_LEAD_MIN = 60;
export const WEIGHTS = { util: 0.4, queue: 0.3, ct: 0.2, down: 0.1 } as const;

const HOUR = 3600_000;
const mean = (a: number[]) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
const std = (a: number[]) => {
  const m = mean(a);
  return Math.sqrt(mean(a.map((x) => (x - m) ** 2)));
};
const pct = (a: number[], p: number) => {
  if (!a.length) return 0;
  const s = [...a].sort((x, y) => x - y);
  return s[Math.min(s.length - 1, Math.floor(p * s.length))]!;
};
export { mean, std };
const hourLabel = (i: number) => `${String(6 + i).padStart(2, "0")}:00`;

export function cycleStats(s: TwinState) {
  const by: Record<string, number[]> = {};
  for (const e of s.events) if (e.event_type === "PROCESS_COMPLETE" && e.cycle_time_sec) (by[e.station_id] ??= []).push(e.cycle_time_sec);
  return PROCESS_STATIONS.map((st) => {
    const a = by[st] ?? [];
    return { station: st, samples: a, n: a.length, avg: Math.round(mean(a)), p90: Math.round(pct(a, 0.9)), std: std(a) };
  });
}

export function throughputPerHour(s: TwinState) {
  const hours = Math.max(1, Math.ceil((s.now - SHIFT_START) / HOUR));
  const rows = Array.from({ length: hours }, (_, i) => ({ hour: hourLabel(i), units: 0 }));
  for (const e of s.events)
    if (e.event_type === "MATERIAL_MOVE" && e.to_station === "FG-STORE") {
      const i = Math.floor((e.timestamp - SHIFT_START) / HOUR);
      if (rows[i]) rows[i]!.units++;
    }
  return rows;
}

/** Queue reconstructed from events: +1 on arrival move, −1 on process start. Sampled every 15 min. */
export function queueOverTime(s: TwinState) {
  const q: Record<string, number> = Object.fromEntries(PROCESS_STATIONS.map((x) => [x, 0]));
  const step = 15 * 60_000;
  const out: Array<Record<string, number | string>> = [];
  let next = SHIFT_START;
  const snap = (t: number) => {
    const d = new Date(t);
    out.push({ time: `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`, ...q });
  };
  for (const e of s.events) {
    while (e.timestamp >= next) {
      snap(next);
      next += step;
    }
    if (e.event_type === "MATERIAL_MOVE" && e.to_station && e.to_station in q) q[e.to_station]!++;
    if (e.event_type === "PROCESS_START" && e.station_id in q) q[e.station_id] = Math.max(0, q[e.station_id]! - 1);
  }
  snap(s.now);
  return out;
}

export function avgQueue(s: TwinState) {
  const series = queueOverTime(s);
  return Object.fromEntries(PROCESS_STATIONS.map((st) => [st, mean(series.map((r) => r[st] as number))]));
}

export function rate(groups: Map<string, { n: number; f: number }>) {
  return [...groups.entries()].map(([key, g]) => ({ key, n: g.n, f: g.f, rate: g.n ? g.f / g.n : 0 }));
}

export function defectGroups(s: TwinState) {
  const g = (fn: (r: TwinState["qualityRecords"][number]) => string) => {
    const m = new Map<string, { n: number; f: number; defects: Record<string, number> }>();
    for (const r of s.qualityRecords) {
      const k = fn(r);
      const x = m.get(k) ?? { n: 0, f: 0, defects: {} };
      x.n++;
      if (r.result === "FAIL") {
        x.f++;
        const d = r.defect_type ?? "unspecified";
        x.defects[d] = (x.defects[d] ?? 0) + 1;
      }
      m.set(k, x);
    }
    return [...m.entries()]
      .map(([key, x]) => ({ key, n: x.n, f: x.f, rate: x.n ? x.f / x.n : 0, top: Object.entries(x.defects).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—" }))
      .sort((a, b) => a.key.localeCompare(b.key));
  };
  const machineStation = (a: string) => a.replace(/-M$/, "");
  return {
    plant: s.qualityRecords.length ? s.qualityRecords.filter((r) => r.result === "FAIL").length / s.qualityRecords.length : 0,
    total: s.qualityRecords.length,
    byMachine: g((r) => r.asset_id),
    byBatch: g((r) => r.batch_id),
    byStation: g((r) => machineStation(r.asset_id)),
    byHour: g((r) => hourLabel(Math.floor((r.timestamp - SHIFT_START) / HOUR))),
  };
}

export function leadTimes(s: TwinState) {
  const scan: Record<string, number> = {};
  const lt: number[] = [];
  for (const e of s.events) {
    if (!e.product_id) continue;
    if (e.event_type === "TAG_SCAN" && e.station_id === "RM-STORE") scan[e.product_id] ??= e.timestamp;
    if (e.event_type === "MATERIAL_MOVE" && e.to_station === "FG-STORE" && scan[e.product_id]) lt.push((e.timestamp - scan[e.product_id]!) / 60_000);
  }
  return lt;
}

export function kpis(s: TwinState) {
  const fg = s.events.filter((e) => e.event_type === "MATERIAL_MOVE" && e.to_station === "FG-STORE");
  const lastHour = fg.filter((e) => e.timestamp > s.now - HOUR).length;
  const cts = s.events.filter((e) => e.event_type === "PROCESS_COMPLETE").slice(-60).map((e) => e.cycle_time_sec ?? 0);
  const queue = PROCESS_STATIONS.reduce((n, st) => n + s.stations[st].queue.length, 0);
  const util = mean(Object.values(s.assets).filter((a) => PROCESS_STATIONS.includes(a.station_id)).map((a) => a.utilization));
  const qr = s.qualityRecords;
  const fails = qr.filter((r) => r.result === "FAIL").length;
  const lt = leadTimes(s);
  return {
    throughput: lastHour,
    cycle: Math.round(mean(cts)),
    queue,
    util: util * 100,
    defect: qr.length ? (fails / qr.length) * 100 : 0,
    fpy: qr.length ? ((qr.length - fails) / qr.length) * 100 : 100,
    lead: mean(lt.slice(-30)),
    onTime: lt.length ? (lt.filter((m) => m <= TARGET_LEAD_MIN).length / lt.length) * 100 : 0,
    completed: lt.length,
  };
}

export interface BottleneckRow {
  station: StationId;
  score: number;
  inputs: { util: number; queue: number; ct: number; down: number };
  raw: { util: number; queue: number; avgQueue: number; lineQueue: number; avgCt: number; lineCt: number; ctDevPct: number; flowShare: number };
  parts: { util: number; queue: number; ct: number; down: number };
}

/** Score = 0.40·Util + 0.30·NormQueue + 0.20·CT deviation + 0.10·Downstream impact, all inputs 0–1. */
export function bottleneckScores(s: TwinState): BottleneckRow[] {
  const cs = cycleStats(s);
  const aq = avgQueue(s);
  const lineCt = mean(cs.filter((c) => c.n).map((c) => c.avg));
  const lineQueue = mean(PROCESS_STATIONS.map((st) => aq[st]!));
  const maxQ = Math.max(1e-9, ...PROCESS_STATIONS.map((st) => aq[st]! + s.stations[st].queue.length));
  const devs = cs.map((c) => Math.max(0, (c.avg - lineCt) / (lineCt || 1)));
  const maxDev = Math.max(1e-9, ...devs);
  const starts: Record<string, number> = {};
  let released = 0;
  for (const e of s.events) {
    if (e.event_type === "PROCESS_START") starts[e.station_id] = (starts[e.station_id] ?? 0) + 1;
    if (e.event_type === "TAG_SCAN" && e.station_id === "RM-STORE") released++;
  }
  const downRaw = PROCESS_STATIONS.map((st) => Math.min(1, (starts[st] ?? 0) / Math.max(1, released)) * (DOWNSTREAM[st]!.length / 3));
  const maxDown = Math.max(1e-9, ...downRaw);
  return PROCESS_STATIONS.map((st, i) => {
    const a = Object.values(s.assets).find((x) => x.station_id === st)!;
    const inputs = {
      util: Math.min(1, a.utilization),
      queue: (aq[st]! + s.stations[st].queue.length) / maxQ,
      ct: devs[i]! / maxDev,
      down: downRaw[i]! / maxDown,
    };
    const parts = { util: WEIGHTS.util * inputs.util, queue: WEIGHTS.queue * inputs.queue, ct: WEIGHTS.ct * inputs.ct, down: WEIGHTS.down * inputs.down };
    return {
      station: st,
      score: parts.util + parts.queue + parts.ct + parts.down,
      inputs,
      parts,
      raw: {
        util: a.utilization, queue: s.stations[st].queue.length, avgQueue: aq[st]!, lineQueue, avgCt: cs[i]!.avg, lineCt,
        ctDevPct: lineCt ? ((cs[i]!.avg - lineCt) / lineCt) * 100 : 0, flowShare: (starts[st] ?? 0) / Math.max(1, released),
      },
    };
  }).sort((a, b) => b.score - a.score);
}
