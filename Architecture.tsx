import { useMemo } from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import { scanClock, useTwin } from "@/twin/store";
import { expectedVsCaptured, productEvents } from "@/twin/trace";
import { bottleneckScores } from "@/twin/analytics";
import { deriveAlerts } from "@/twin/alerts";
import { useSimHistory } from "./Simulation";
import { PageHeader } from "./AppShell";

const card = "rounded-lg border border-border bg-card p-4";
const h2 = "mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground";

const FLOW = [
  ["Physical Factory", "Stations, machines, material, operators"],
  ["NFC/QR + IoT + APIs/CSV", "Identity bridge, sensors, system feeds"],
  ["Event Ingestion", "Validated, time-ordered process events"],
  ["Digital Twin Core", "Assets · Products · Stations · Routes"],
  ["Digital Thread DB + Analytics", "Event log, trace, rule-based KPIs & alerts"],
  ["Simulation Engine", "Bounded discrete-event what-ifs"],
  ["TwinTrace Dashboard", "Operators, quality & planning"],
];

const SCOPE: Array<[string, string]> = [
  ["One flow: RM → 3 CNC → Assembly → Quality → FG", "Multiple lines, plants or product families"],
  ["Product identity via tag / QR, NFC simulated", "Real NFC hardware and reader fleet"],
  ["Event-driven twin state (applyEvent)", "Live MES / SCADA / ERP integration"],
  ["Rule-based analytics and explainable alerts", "Learned or predictive models"],
  ["Trace-back of failures to batch and machine", "Root-cause certification / 8D workflow"],
  ["Bounded discrete-event what-if simulation", "Scheduling, optimization, closed-loop control"],
  ["Synthetic, seeded, reproducible data", "Production data, security, user roles"],
];

const ASSUMPTIONS = [
  "Every product carries a unique tag readable at each station.",
  "Stations emit start/complete events; quality emits pass/fail with defect type.",
  "Event timestamps share one clock; events arrive in order or can be re-ordered.",
  "Each station processes one product at a time; FIFO queues.",
  "Material batch is known at release from the raw-material store.",
  "Sensor readings (temperature, vibration) are sampled per cycle.",
];

const DATA: Array<[string, string, string]> = [
  ["Product", "product_id, tag_id, order_id, status, current_station", "MES, ERP"],
  ["Process", "event_type, timestamp, station, asset, operation, cycle time", "MES, SCADA/PLC"],
  ["Machine", "asset_id, status, utilization, health", "SCADA/PLC/IoT, CMMS"],
  ["Material", "batch_id, supplier_lot, quantity, specification", "ERP, MES"],
  ["Quality", "inspection_id, result, defect_type, measurements", "QMS"],
  ["Flow", "routes, travel times, queue, WIP", "MES, layout data"],
  ["Maintenance", "downtime events, work orders, MTBF/MTTR", "CMMS"],
  ["Environment", "temperature, vibration, humidity", "SCADA/PLC/IoT"],
];

const ROADMAP = [
  ["POC", "One flow, synthetic data, rule-based insights"],
  ["Pilot", "One real line, live tag and MES feeds"],
  ["Multi-asset", "All machines of a cell with sensor data"],
  ["Multi-line", "Several lines, shared material flow"],
  ["Enterprise twin", "Plant-wide thread linked to ERP / QMS"],
  ["Optimization", "Scenario-based planning at scale"],
];

const LIMITS = [
  ["Synthetic data", "All data is generated for the POC demonstration."],
  ["Decision support only", "Outputs inform people; they do not make decisions."],
  ["No machine control", "The twin never writes back to equipment."],
  ["Not a certified simulator", "Simulation is a bounded estimate, not a validated plant model."],
];

function Badge({ ok }: { ok: boolean | null }) {
  if (ok === null) return <span className="rounded bg-muted px-2 py-0.5 font-mono text-[10px] text-muted-foreground">NOT MEASURED</span>;
  return ok ? (
    <span className="inline-flex items-center gap-1 rounded bg-success/15 px-2 py-0.5 font-mono text-[10px] font-semibold text-success"><CheckCircle2 className="h-3 w-3" />PASS</span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded bg-destructive/15 px-2 py-0.5 font-mono text-[10px] font-semibold text-destructive"><XCircle className="h-3 w-3" />FAIL</span>
  );
}

function SuccessMetrics() {
  const s = useTwin();
  const runs = useSimHistory((h) => h.runs);
  const m = useMemo(() => {
    const ids = [...new Set(s.events.map((e) => e.product_id).filter(Boolean) as string[])];
    const comp = ids.map((id) => expectedVsCaptured(productEvents(s.events, id)));
    const exp = comp.reduce((a, c) => a + c.expected.length, 0);
    const cap = comp.reduce((a, c) => a + c.captured, 0);
    const top = bottleneckScores(s)[0];
    const alerts = deriveAlerts(s);
    return { completeness: exp ? (cap / exp) * 100 : 0, products: ids.length, top, alerts };
  }, [s]);
  const trace = scanClock.last;
  const sim = runs[0]?.result.runtimeMs ?? null;
  const rows: Array<[string, string, string, boolean | null]> = [
    ["Trace retrieval time", "< 10 s", trace ? `${(trace.ms / 1000).toFixed(2)} s (${trace.id})` : "scan a product", trace ? trace.ms < 10_000 : null],
    ["Twin update latency", "< 2 s", s.latencyMs !== null ? `${s.latencyMs.toFixed(1)} ms` : "start Live or trigger an event", s.latencyMs !== null ? s.latencyMs < 2000 : null],
    ["Trace completeness", "≥ 95%", `${m.completeness.toFixed(1)}% over ${m.products} products`, m.completeness >= 95],
    ["Scenario response time", "< 5 s", sim !== null ? `${sim.toFixed(0)} ms (${runs[0]!.result.config.label})` : "run a scenario", sim !== null ? sim < 5000 : null],
    ["Injected bottleneck detected", "CNC-03 ranks first", m.top ? `${m.top.station} (score ${m.top.score.toFixed(2)})` : "—", m.top?.station === "CNC-03"],
    ["Every alert has evidence", "Yes", `${m.alerts.filter((a) => a.evidence.length > 0).length} of ${m.alerts.length} alerts`, m.alerts.every((a) => a.evidence.length > 0)],
  ];
  return (
    <section className={card}>
      <h2 className={h2}>Success metrics — measured live</h2>
      <table className="w-full text-left text-sm">
        <thead className="text-[10px] uppercase tracking-wider text-muted-foreground"><tr><th className="py-1.5">Metric</th><th>Target</th><th>Observed</th><th>Result</th></tr></thead>
        <tbody>
          {rows.map(([n, tgt, obs, ok]) => (
            <tr key={n} className="border-t border-border/60"><td className="py-2">{n}</td><td className="font-mono text-xs">{tgt}</td><td className="font-mono text-xs">{obs}</td><td><Badge ok={ok} /></td></tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

export function Architecture() {
  return (
    <div className="space-y-5">
      <PageHeader title="Architecture & POC Scope" subtitle="How TwinTrace is built, what this proof of concept covers, and how it grows." />

      <section id="architecture" className={card}>
        <h2 className={h2}>Architecture</h2>
        <div className="flex items-stretch gap-1 overflow-x-auto pb-2">
          {FLOW.map(([t, d], i) => (
            <div key={t} className="flex items-center gap-1">
              <div className={`w-40 shrink-0 rounded-lg border-2 p-3 ${i === 3 ? "border-primary bg-primary/10" : "border-border bg-background/40"}`}>
                <div className={`text-sm font-semibold ${i === 3 ? "text-primary" : ""}`}>{t}</div>
                <div className="mt-1 text-[11px] text-muted-foreground">{d}</div>
              </div>
              {i < FLOW.length - 1 && <span className="text-lg text-primary">→</span>}
            </div>
          ))}
        </div>
      </section>

      <SuccessMetrics />

      <div className="grid gap-4 lg:grid-cols-2">
        <section className={card}>
          <h2 className={h2}>In scope / Out of scope</h2>
          <table className="w-full text-left text-xs">
            <thead className="text-[10px] uppercase tracking-wider"><tr><th className="py-1.5 text-success">In scope</th><th className="text-destructive">Out of scope</th></tr></thead>
            <tbody>{SCOPE.map(([a, b]) => <tr key={a} className="border-t border-border/60 align-top"><td className="py-1.5 pr-3">{a}</td><td className="text-muted-foreground">{b}</td></tr>)}</tbody>
          </table>
        </section>
        <section className={card}>
          <h2 className={h2}>Assumptions</h2>
          <ul className="space-y-1.5 text-sm">{ASSUMPTIONS.map((a) => <li key={a}>• {a}</li>)}</ul>
        </section>
      </div>

      <section className={card}>
        <h2 className={h2}>Data requirements</h2>
        <table className="w-full text-left text-xs">
          <thead className="text-[10px] uppercase tracking-wider text-muted-foreground"><tr><th className="py-1.5">Domain</th><th>Fields</th><th>Possible real sources</th></tr></thead>
          <tbody>{DATA.map(([d, f, src]) => <tr key={d} className="border-t border-border/60"><td className="py-1.5 font-semibold">{d}</td><td className="font-mono">{f}</td><td className="font-mono text-primary">{src}</td></tr>)}</tbody>
        </table>
      </section>

      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <section className={card}>
          <h2 className={h2}>Evolution roadmap</h2>
          <ol className="flex flex-wrap items-stretch gap-1">
            {ROADMAP.map(([t, d], i) => (
              <li key={t} className="flex items-center gap-1">
                <div className={`w-32 rounded-md border p-2 ${i === 0 ? "border-primary bg-primary/10" : "border-border"}`}>
                  <div className="font-mono text-[10px] text-muted-foreground">STAGE {i + 1}{i === 0 ? " · NOW" : ""}</div>
                  <div className="text-sm font-semibold">{t}</div>
                  <div className="text-[11px] text-muted-foreground">{d}</div>
                </div>
                {i < ROADMAP.length - 1 && <span className="text-primary">→</span>}
              </li>
            ))}
          </ol>
        </section>
        <section className="rounded-lg border border-warning/50 bg-warning/5 p-4">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-warning">Limitations</h2>
          <ul className="space-y-2 text-sm">{LIMITS.map(([t, d]) => <li key={t}><span className="font-semibold">{t}.</span> <span className="text-muted-foreground">{d}</span></li>)}</ul>
        </section>
      </div>
    </div>
  );
}
