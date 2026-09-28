// Rule-based digital-thread reconstruction. Every output is derived from captured events.
import type { ProcessEvent, Product, QualityRecord, StationId } from "./types";
import { assetOf, CNC_IDS } from "./generator";

export interface ThreadNode {
  key: string;
  kind: "BATCH" | "CNC" | "ASSEMBLY" | "QUALITY";
  label: string;
  sub: string;
  start: number | null;
  end: number | null;
  events: ProcessEvent[];
}
export interface ThreadLink {
  from: string;
  to: string;
  start: number | null;
  end: number | null;
}

export function productEvents(events: ProcessEvent[], id: string) {
  return events.filter((e) => e.product_id === id);
}

export function cncOf(evts: ProcessEvent[]): StationId | null {
  return (evts.find((e) => CNC_IDS.includes(e.station_id) && e.event_type === "PROCESS_START")?.station_id ??
    evts.find((e) => e.event_type === "MATERIAL_MOVE" && e.station_id === "RM-STORE")?.to_station ??
    null) as StationId | null;
}

export function buildThread(p: Product, evts: ProcessEvent[]) {
  const cnc = cncOf(evts);
  const at = (st: StationId | null, t: ProcessEvent["event_type"]) =>
    st ? evts.find((e) => e.station_id === st && e.event_type === t) : undefined;
  const scan = at("RM-STORE", "TAG_SCAN");
  const qres = evts.find((e) => e.event_type === "QUALITY_PASS" || e.event_type === "QUALITY_FAIL");
  const nodes: ThreadNode[] = [
    { key: "BATCH", kind: "BATCH", label: p.batch_id, sub: "Material batch · RM-STORE", start: scan?.timestamp ?? null, end: at("RM-STORE", "MATERIAL_MOVE")?.timestamp ?? null, events: evts.filter((e) => e.station_id === "RM-STORE") },
    { key: "CNC", kind: "CNC", label: cnc ?? "CNC —", sub: cnc ? `Asset ${assetOf[cnc]}` : "not reached", start: at(cnc, "PROCESS_START")?.timestamp ?? null, end: at(cnc, "PROCESS_COMPLETE")?.timestamp ?? null, events: cnc ? evts.filter((e) => e.station_id === cnc) : [] },
    { key: "ASSEMBLY", kind: "ASSEMBLY", label: "ASSEMBLY-01", sub: `Asset ${assetOf["ASSEMBLY-01"]}`, start: at("ASSEMBLY-01", "PROCESS_START")?.timestamp ?? null, end: at("ASSEMBLY-01", "PROCESS_COMPLETE")?.timestamp ?? null, events: evts.filter((e) => e.station_id === "ASSEMBLY-01") },
    { key: "QUALITY", kind: "QUALITY", label: qres ? (qres.event_type === "QUALITY_FAIL" ? "INSPECTION · FAIL" : "INSPECTION · PASS") : "INSPECTION", sub: `QUALITY-01 · ${assetOf["QUALITY-01"]}`, start: at("QUALITY-01", "PROCESS_START")?.timestamp ?? null, end: qres?.timestamp ?? null, events: evts.filter((e) => e.station_id === "QUALITY-01") },
  ];
  const links: ThreadLink[] = [
    { from: "BATCH", to: "CNC", start: nodes[0]!.end ?? nodes[0]!.start, end: nodes[1]!.start },
    { from: "CNC", to: "ASSEMBLY", start: nodes[1]!.end, end: nodes[2]!.start },
    { from: "ASSEMBLY", to: "QUALITY", start: nodes[2]!.end, end: nodes[3]!.start },
  ];
  return { nodes, links, cnc };
}

export interface ExpectedEvent {
  label: string;
  captured: ProcessEvent | undefined;
}

/** Expected chain up to the furthest stage the product has reached; anything earlier that is absent is missing. */
export function expectedVsCaptured(evts: ProcessEvent[]) {
  const cnc = cncOf(evts);
  const find = (t: ProcessEvent["event_type"], st: StationId | null, to?: StationId) =>
    evts.find((e) => e.event_type === t && (st === null || e.station_id === st) && (!to || e.to_station === to));
  const qres = evts.find((e) => e.event_type === "QUALITY_PASS" || e.event_type === "QUALITY_FAIL");
  const chain: ExpectedEvent[] = [
    { label: "TAG_SCAN @ RM-STORE", captured: find("TAG_SCAN", "RM-STORE") },
    { label: `MATERIAL_MOVE RM-STORE → ${cnc ?? "CNC"}`, captured: cnc ? find("MATERIAL_MOVE", "RM-STORE", cnc) : undefined },
    { label: `PROCESS_START @ ${cnc ?? "CNC"}`, captured: find("PROCESS_START", cnc) },
    { label: `PROCESS_COMPLETE @ ${cnc ?? "CNC"}`, captured: find("PROCESS_COMPLETE", cnc) },
    { label: `MATERIAL_MOVE ${cnc ?? "CNC"} → ASSEMBLY-01`, captured: cnc ? find("MATERIAL_MOVE", cnc, "ASSEMBLY-01") : undefined },
    { label: "PROCESS_START @ ASSEMBLY-01", captured: find("PROCESS_START", "ASSEMBLY-01") },
    { label: "PROCESS_COMPLETE @ ASSEMBLY-01", captured: find("PROCESS_COMPLETE", "ASSEMBLY-01") },
    { label: "MATERIAL_MOVE ASSEMBLY-01 → QUALITY-01", captured: find("MATERIAL_MOVE", "ASSEMBLY-01", "QUALITY-01") },
    { label: "PROCESS_START @ QUALITY-01", captured: find("PROCESS_START", "QUALITY-01") },
    { label: "PROCESS_COMPLETE @ QUALITY-01", captured: find("PROCESS_COMPLETE", "QUALITY-01") },
    { label: "QUALITY_PASS / QUALITY_FAIL", captured: qres },
  ];
  if (qres?.event_type === "QUALITY_PASS") chain.push({ label: "MATERIAL_MOVE QUALITY-01 → FG-STORE", captured: find("MATERIAL_MOVE", "QUALITY-01", "FG-STORE") });
  let last = -1;
  chain.forEach((c, i) => c.captured && (last = i));
  const expected = chain.slice(0, last + 1);
  const captured = expected.filter((c) => c.captured).length;
  return { expected, captured, pct: expected.length ? (captured / expected.length) * 100 : 100 };
}

const stationOfAsset = (asset: string) =>
  (Object.entries(assetOf).find(([, a]) => a === asset)?.[0] ?? asset) as StationId;

export function traceBack(p: Product, products: Record<string, Product>, events: ProcessEvent[], qrs: QualityRecord[]) {
  const qr = [...qrs].reverse().find((r) => r.product_id === p.product_id && r.result === "FAIL");
  if (!qr) return null;
  const station = stationOfAsset(qr.asset_id);
  const siblings = Object.values(products).filter((x) => x.batch_id === p.batch_id && x.product_id !== p.product_id);
  const failedSiblings = siblings.filter((x) => x.quality_state === "FAIL");
  const inspectedSiblings = siblings.filter((x) => x.quality_state !== "PENDING");
  const defect = qr.defect_type ?? "unspecified";
  const sameDefect = qrs.filter((r) => r.result === "FAIL" && r.defect_type === qr.defect_type);
  const shareBoth = sameDefect.filter((r) => r.batch_id === qr.batch_id && stationOfAsset(r.asset_id) === station);
  const shareBatch = sameDefect.filter((r) => r.batch_id === qr.batch_id);
  const shareMachine = sameDefect.filter((r) => stationOfAsset(r.asset_id) === station);
  const cncBySibling = new Map(siblings.map((s) => [s.product_id, cncOf(productEvents(events, s.product_id))]));
  return {
    qr, station, defect, siblings, failedSiblings, inspectedSiblings, cncBySibling,
    sameDefect: sameDefect.length, shareBoth: shareBoth.length, shareBatch: shareBatch.length, shareMachine: shareMachine.length,
    finding: `${shareBoth.length} of ${sameDefect.length} ${defect} failures share batch ${qr.batch_id} and ${station}.`,
  };
}

export function toCsv(evts: ProcessEvent[]) {
  const cols = ["event_id", "event_type", "timestamp", "product_id", "station_id", "to_station", "asset_id", "operation", "cycle_time_sec", "batch_id", "defect_type"] as const;
  const esc = (v: unknown) => {
    const s = v === undefined || v === null ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [cols.join(","), ...evts.map((e) => cols.map((c) => esc(c === "timestamp" ? new Date(e.timestamp).toISOString() : e[c])).join(","))].join("\n");
}
