import { create } from "zustand";
import { generateDataset, SHIFT_START, type Dataset } from "./generator";
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

export interface TwinState {
  now: number;
  products: Record<string, Product>;
  stations: Record<StationId, Station>;
  assets: Record<string, Asset>;
  batches: MaterialBatch[];
  routes: Route[];
  events: ProcessEvent[]; // applied events, in order
  qualityRecords: QualityRecord[];
  busy: Record<string, { ms: number; since: number | null }>;
}

const hash = (s: string) => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return ((h >>> 0) % 1000) / 1000;
};

const round1 = (n: number) => Math.round(n * 10) / 10;

/**
 * The only way twin state changes. Pure: returns a new state for each event.
 */
export function applyEvent(s: TwinState, e: ProcessEvent): TwinState {
  const products = { ...s.products };
  const stations = { ...s.stations };
  const assets = { ...s.assets };
  const busy = { ...s.busy };
  let qualityRecords = s.qualityRecords;
  const now = Math.max(s.now, e.timestamp);

  const setProduct = (patch: Partial<Product>) => {
    if (!e.product_id) return;
    const p = products[e.product_id];
    if (p) products[e.product_id] = { ...p, ...patch };
  };
  const setStation = (id: StationId, patch: Partial<Station>) => {
    stations[id] = { ...stations[id], ...patch };
  };
  const assetFor = (id: StationId) => Object.values(assets).find((a) => a.station_id === id)!;
  const setAsset = (a: Asset, patch: Partial<Asset>) => {
    assets[a.asset_id] = { ...a, ...patch };
  };
  const startBusy = (id: string) => {
    const b = busy[id] ?? { ms: 0, since: null };
    busy[id] = { ...b, since: e.timestamp };
  };
  const stopBusy = (id: string) => {
    const b = busy[id] ?? { ms: 0, since: null };
    busy[id] = { ms: b.ms + (b.since ? e.timestamp - b.since : 0), since: null };
  };

  const st = e.station_id;
  const noise = hash(e.event_id);

  switch (e.event_type) {
    case "TAG_SCAN":
      // Issue scan at the store sets the start position; later identity scans only record the event
      if (st === "RM-STORE" && e.product_id && products[e.product_id]?.status === "QUEUED") {
        setProduct({ current_station: st });
      }
      break;
    case "MATERIAL_MOVE": {
      if (!e.to_station || !e.product_id) break;
      setProduct({
        status: e.to_station === "FG-STORE" ? "COMPLETED" : "IN_TRANSIT",
        current_station: e.to_station,
      });
      if (e.to_station !== "FG-STORE") {
        setStation(e.to_station, { queue: [...stations[e.to_station].queue, e.product_id] });
      } else {
        setStation("FG-STORE", { queue: [...stations["FG-STORE"].queue, e.product_id] });
      }
      break;
    }
    case "PROCESS_START": {
      setProduct({ status: "IN_PROCESS", current_station: st });
      setStation(st, {
        queue: stations[st].queue.filter((q) => q !== e.product_id),
        status: stations[st].status === "DOWN" ? "DOWN" : "RUNNING",
        current_product: e.product_id ?? null,
      });
      const a = assetFor(st);
      startBusy(a.asset_id);
      const base = st === "CNC-03" ? 61 : st.startsWith("CNC") ? 52 : 40;
      setAsset(a, {
        status: a.status === "DOWN" ? "DOWN" : "RUNNING",
        temperature: round1(a.temperature * 0.7 + (base + noise * 4) * 0.3),
        vibration: round1(a.vibration * 0.7 + ((st === "CNC-03" ? 5.2 : 2.6) + noise) * 0.3),
      });
      break;
    }
    case "PROCESS_COMPLETE": {
      setStation(st, {
        status: stations[st].status === "DOWN" ? "DOWN" : "IDLE",
        current_product: stations[st].current_product === e.product_id ? null : stations[st].current_product,
      });
      const a = assetFor(st);
      stopBusy(a.asset_id);
      setAsset(a, {
        status: a.status === "DOWN" ? "DOWN" : "IDLE",
        temperature: round1(a.temperature - 0.5),
        health: Math.max(40, round1(a.health - (st === "CNC-03" ? 0.04 : 0.01))),
      });
      break;
    }
    case "QUALITY_PASS":
    case "QUALITY_FAIL": {
      const fail = e.event_type === "QUALITY_FAIL";
      setProduct({ quality_state: fail ? "FAIL" : "PASS", status: fail ? "REJECTED" : "IN_PROCESS" });
      if (e.asset_id && e.product_id && e.batch_id && e.operation) {
        qualityRecords = [
          ...qualityRecords,
          {
            inspection_id: e.operation,
            product_id: e.product_id,
            result: fail ? "FAIL" : "PASS",
            defect_type: e.defect_type ?? null,
            station_id: "QUALITY-01",
            asset_id: e.asset_id,
            batch_id: e.batch_id,
            timestamp: e.timestamp,
          },
        ];
      }
      break;
    }
    case "MACHINE_DOWN": {
      setStation(st, { status: "DOWN" });
      const a = assetFor(st);
      stopBusy(a.asset_id);
      setAsset(a, { status: "DOWN", health: Math.max(40, a.health - 6), vibration: round1(a.vibration + 3) });
      break;
    }
    case "MACHINE_RECOVERED": {
      setStation(st, { status: "IDLE" });
      const a = assetFor(st);
      setAsset(a, { status: "IDLE", vibration: round1(Math.max(1.5, a.vibration - 3)) });
      break;
    }
  }

  // Utilization = busy time / elapsed shift time (explainable, cumulative)
  const elapsed = Math.max(1, now - SHIFT_START);
  for (const id of Object.keys(busy)) {
    const b = busy[id]!;
    const ms = b.ms + (b.since ? now - b.since : 0);
    const a = assets[id];
    if (a) assets[id] = { ...a, utilization: Math.min(1, ms / elapsed) };
  }

  return { ...s, now, products, stations, assets, busy, qualityRecords, events: [...s.events, e] };
}

function initialState(d: Dataset): TwinState {
  return {
    now: SHIFT_START,
    products: Object.fromEntries(d.products.map((p) => [p.product_id, p])),
    stations: Object.fromEntries(d.stations.map((s) => [s.station_id, s])) as Record<StationId, Station>,
    assets: Object.fromEntries(d.assets.map((a) => [a.asset_id, a])),
    batches: d.batches,
    routes: d.routes,
    events: [],
    qualityRecords: [],
    busy: {},
  };
}

/** Faster bulk replay used only at boot (mutable arrays, same reducer semantics per event). */
function replay(state: TwinState, events: ProcessEvent[]): TwinState {
  let s = state;
  const applied: ProcessEvent[] = [];
  for (const e of events) {
    s = applyEvent({ ...s, events: [] }, e);
    applied.push(e);
  }
  return { ...s, events: applied };
}

const dataset = generateDataset();
const past = dataset.events.filter((e) => e.timestamp <= dataset.cutoff);
const future = dataset.events.filter((e) => e.timestamp > dataset.cutoff);
const booted = replay(initialState(dataset), past);
booted.now = dataset.cutoff;

export const SHIFT_BOUNDS = { start: initialState(dataset).now, cutoff: dataset.cutoff };

/** Rebuilds the twin at a past moment by replaying the event log up to time t through applyEvent(). */
export function reconstructAt(events: ProcessEvent[], t: number): TwinState {
  const s = replay(initialState(dataset), events.filter((e) => e.timestamp <= t));
  return { ...s, now: t };
}

interface TwinStore extends TwinState {
  pending: ProcessEvent[];
  playing: boolean;
  latencyMs: number | null;
  dispatch: (e: ProcessEvent) => void;
  step: () => void;
  reset: () => void;
  setPlaying: (p: boolean) => void;
}

let manualSeq = 0;
export const nextManualId = () => `EV-M${String(++manualSeq).padStart(4, "0")}`;

export const useTwin = create<TwinStore>((set, get) => ({
  ...booted,
  pending: future,
  playing: false,
  latencyMs: null,
  /** Emit an event: measured from emit until the new twin state is committed to the store. */
  dispatch: (e) => {
    const t0 = performance.now();
    set((s) => applyEvent(s, e));
    set({ latencyMs: performance.now() - t0 });
  },
  step: () => {
    const [next, ...rest] = get().pending;
    if (!next) {
      set({ playing: false });
      return;
    }
    const t0 = performance.now();
    set((s) => ({ ...applyEvent(s, next), pending: rest }));
    set({ latencyMs: performance.now() - t0 });
  },
  reset: () => set({ ...booted, pending: future, playing: false, latencyMs: null }),
  setPlaying: (playing) => set({ playing }),
}));

/** Identity lookup: accepts a tag ID ("TAG-184") or a product ID ("TT-2026-000184"). */
export function resolveProductId(input: string): string | null {
  const q = input.trim().toUpperCase();
  const products = useTwin.getState().products;
  if (products[q]) return q;
  const m = q.match(/^TAG-?(\d+)$/) ?? q.match(/^(\d+)$/);
  if (m) {
    const id = `TT-2026-${m[1]!.padStart(6, "0")}`;
    if (products[id]) return id;
  }
  return null;
}

/** Scan timing: set when a scan starts, read when the product twin has rendered. */
export const scanClock = { start: null as number | null, last: null as { id: string; ms: number } | null };

export const totalEventCount = dataset.events.length;
