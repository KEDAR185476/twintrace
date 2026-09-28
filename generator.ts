import type {
  Asset,
  MaterialBatch,
  ProcessEvent,
  Product,
  QualityRecord,
  Route,
  Station,
  StationId,
} from "./types";

/** Deterministic PRNG so the synthetic dataset is reproducible. */
export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const SEED = 2026;
/** Fixed shift start so server and browser generate identical data. */
export const SHIFT_START = Date.UTC(2026, 8, 28, 6, 0, 0);
export const HERO_PRODUCT = "TT-2026-000184";
export const HERO_BATCH = "RM-1092";
export const HERO_ORDER = "PO-47281";

export const CNC_IDS: StationId[] = ["CNC-01", "CNC-02", "CNC-03"];
export const FLOW: StationId[] = [
  "RM-STORE",
  "CNC-01",
  "CNC-02",
  "CNC-03",
  "ASSEMBLY-01",
  "QUALITY-01",
  "FG-STORE",
];

export const assetOf: Record<StationId, string> = {
  "RM-STORE": "RM-RACK-01",
  "CNC-01": "CNC-01-M",
  "CNC-02": "CNC-02-M",
  "CNC-03": "CNC-03-M",
  "ASSEMBLY-01": "ASM-01-CELL",
  "QUALITY-01": "CMM-01",
  "FG-STORE": "FG-RACK-01",
};

/** Mean cycle times (seconds). CNC-03 is the injected bottleneck. */
const CYCLE: Record<string, number> = {
  "CNC-01": 240,
  "CNC-02": 250,
  "CNC-03": 390,
  "ASSEMBLY-01": 115,
  "QUALITY-01": 70,
};

export function buildRoutes(): Route[] {
  const r: Route[] = [];
  const add = (from: StationId, to: StationId, t: number) =>
    r.push({ route_id: `R-${from}>${to}`, from_station: from, to_station: to, travel_time_sec: t });
  add("RM-STORE", "CNC-01", 60);
  add("RM-STORE", "CNC-02", 75);
  add("RM-STORE", "CNC-03", 95);
  add("CNC-01", "ASSEMBLY-01", 80);
  add("CNC-02", "ASSEMBLY-01", 70);
  add("CNC-03", "ASSEMBLY-01", 55);
  add("ASSEMBLY-01", "QUALITY-01", 45);
  add("QUALITY-01", "FG-STORE", 60);
  return r;
}

export interface Dataset {
  products: Product[];
  batches: MaterialBatch[];
  stations: Station[];
  assets: Asset[];
  routes: Route[];
  events: ProcessEvent[]; // full timeline, sorted
  cutoff: number; // "now" at load; events after this are played live
}

export function generateDataset(): Dataset {
  const rnd = mulberry32(SEED);
  const jitter = (mean: number, spread = 0.15) => Math.round(mean * (1 + (rnd() * 2 - 1) * spread));
  const routes = buildRoutes();
  const travel = (a: StationId, b: StationId) =>
    routes.find((r) => r.from_station === a && r.to_station === b)!.travel_time_sec;

  const batches: MaterialBatch[] = Array.from({ length: 15 }, (_, i) => {
    const id = `RM-${1085 + i}`;
    return {
      batch_id: id,
      supplier_lot: `SL-${(4400 + i * 7).toString()}-${["A", "B", "C"][i % 3]}`,
      quantity: 20 + Math.floor(rnd() * 20),
      specification: i % 2 ? "EN8 steel bar Ø40" : "EN19 steel bar Ø40",
    };
  });

  const products: Product[] = [];
  const events: ProcessEvent[] = [];
  let ev = 0;
  const push = (e: Omit<ProcessEvent, "event_id">) =>
    events.push({ event_id: `EV-${String(++ev).padStart(5, "0")}`, ...e });

  const free: Record<string, number> = {
    "CNC-01": SHIFT_START,
    "CNC-02": SHIFT_START,
    "CNC-03": SHIFT_START,
    "ASSEMBLY-01": SHIFT_START,
    "QUALITY-01": SHIFT_START,
  };

  let releaseTime = SHIFT_START;
  let insp = 0;
  for (let i = 1; i <= 300; i++) {
    const num = 100 + i; // product 84 → 000184
    const pid = `TT-2026-${String(num).padStart(6, "0")}`;
    const hero = pid === HERO_PRODUCT;
    const batch = hero ? HERO_BATCH : batches[Math.floor(rnd() * batches.length)]!.batch_id;
    const order = hero ? HERO_ORDER : `PO-${47200 + Math.floor(i / 12)}`;
    products.push({
      product_id: pid,
      tag_id: `TAG-${num}`,
      batch_id: batch,
      order_id: order,
      status: "QUEUED",
      current_station: "RM-STORE",
      quality_state: "PENDING",
    });

    releaseTime += jitter(150, 0.3) * 1000;
    let t = releaseTime;
    push({ event_type: "TAG_SCAN", timestamp: t, product_id: pid, station_id: "RM-STORE", asset_id: assetOf["RM-STORE"], operation: "Material issue", batch_id: batch });

    // Dispatch: pick CNC that frees up earliest, but CNC-03 absorbs a fixed share (bottleneck)
    let cnc: StationId;
    if (hero) cnc = "CNC-03";
    else {
      const earliest = [...CNC_IDS].sort((a, b) => free[a]! - free[b]!)[0]!;
      cnc = rnd() < 0.4 ? "CNC-03" : earliest;
    }
    push({ event_type: "MATERIAL_MOVE", timestamp: t + 5000, product_id: pid, station_id: "RM-STORE", to_station: cnc, batch_id: batch });
    t += 5000 + travel("RM-STORE", cnc) * 1000;

    const stage = (st: StationId, op: string, arrive: number) => {
      const start = Math.max(arrive, free[st]!);
      const ct = jitter(CYCLE[st]!);
      push({ event_type: "PROCESS_START", timestamp: start, product_id: pid, station_id: st, asset_id: assetOf[st], operation: op, batch_id: batch });
      const end = start + ct * 1000;
      push({ event_type: "PROCESS_COMPLETE", timestamp: end, product_id: pid, station_id: st, asset_id: assetOf[st], operation: op, cycle_time_sec: ct, batch_id: batch });
      free[st] = end;
      return end;
    };

    t = stage(cnc, "Turning & milling", t);
    push({ event_type: "MATERIAL_MOVE", timestamp: t + 2000, product_id: pid, station_id: cnc, to_station: "ASSEMBLY-01", batch_id: batch });
    t += 2000 + travel(cnc, "ASSEMBLY-01") * 1000;
    t = stage("ASSEMBLY-01", "Sub-assembly fit", t);
    push({ event_type: "MATERIAL_MOVE", timestamp: t + 2000, product_id: pid, station_id: "ASSEMBLY-01", to_station: "QUALITY-01", batch_id: batch });
    t += 2000 + travel("ASSEMBLY-01", "QUALITY-01") * 1000;
    t = stage("QUALITY-01", "Dimensional inspection", t);

    // Sampled detailed inspection; failure probability is rule-driven so the correlation is discoverable
    let fail = false;
    let defect: string | undefined;
    const sampled = hero || rnd() < 0.3;
    if (sampled) {
      insp++;
      let p = 0.05;
      if (cnc === "CNC-03") p += 0.2;
      if (batch === HERO_BATCH) p += 0.3;
      fail = hero || rnd() < p;
      if (fail) {
        const dimensional = cnc === "CNC-03" || batch === HERO_BATCH ? 0.8 : 0.3;
        defect = hero || rnd() < dimensional ? "dimensional deviation" : rnd() < 0.5 ? "surface finish" : "burr";
      }
    }
    push({
      event_type: fail ? "QUALITY_FAIL" : "QUALITY_PASS",
      timestamp: t + 1000,
      product_id: pid,
      station_id: "QUALITY-01",
      ...(sampled ? { asset_id: assetOf[cnc] } : {}),
      operation: sampled ? `INSP-${String(insp).padStart(4, "0")}` : "Visual check",
      batch_id: batch,
      ...(defect ? { defect_type: defect } : {}),
    });
    if (!fail) {
      push({ event_type: "MATERIAL_MOVE", timestamp: t + 3000, product_id: pid, station_id: "QUALITY-01", to_station: "FG-STORE", batch_id: batch });
    }
  }

  // Machine incidents
  const downs: [StationId, number, number][] = [
    ["CNC-03", 2.1, 18],
    ["CNC-01", 5.4, 9],
    ["CNC-03", 8.6, 14],
  ];
  const last = events.reduce((m, e) => Math.max(m, e.timestamp), 0);
  const span = last - SHIFT_START;
  for (const [st, frac, mins] of downs) {
    const at = SHIFT_START + (span * frac) / 10;
    push({ event_type: "MACHINE_DOWN", timestamp: at, station_id: st, asset_id: assetOf[st], operation: "Spindle overload" });
    push({ event_type: "MACHINE_RECOVERED", timestamp: at + mins * 60000, station_id: st, asset_id: assetOf[st], operation: "Reset & recalibrated" });
  }

  events.sort((a, b) => a.timestamp - b.timestamp);
  const cutoff = SHIFT_START + span * 0.9;

  const stations: Station[] = FLOW.map((id) => ({
    station_id: id,
    type: id.startsWith("CNC") ? "CNC" : id.startsWith("ASM") || id.startsWith("ASSEMBLY") ? "ASSEMBLY" : id.startsWith("QUALITY") ? "QUALITY" : "STORE",
    capacity: id.endsWith("STORE") ? 500 : 1,
    status: "IDLE",
    queue: [],
    current_product: null,
  }));

  const assets: Asset[] = FLOW.map((id) => ({
    asset_id: assetOf[id],
    station_id: id,
    utilization: id === "CNC-03" ? 0.9 : id.endsWith("STORE") ? 0 : 0.6,
    health: id === "CNC-03" ? 78 : 94,
    status: "IDLE",
    temperature: id.endsWith("STORE") ? 24 : 38,
    vibration: id.endsWith("STORE") ? 0 : 2.2,
  }));

  return { products, batches, stations, assets, routes, events, cutoff };
}
