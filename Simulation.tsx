import { useEffect, useMemo, useRef, useState } from "react";
import { useDemo } from "./DemoMode";
import { create } from "zustand";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Info, Play, Scale, ShieldAlert } from "lucide-react";
import { useTwin } from "@/twin/store";
import { cycleStats } from "@/twin/analytics";
import {
  buildConfig, CNCS, CV, pctChange, REPLICATIONS, runScenario, SHIFT_HOURS, SIM_STATIONS,
  type BaseParams, type Cnc, type Controls, type ScenarioKind, type SimResult,
} from "@/twin/sim";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { PageHeader } from "./AppShell";

interface HistoryEntry { id: number; at: string; result: SimResult; baseline: SimResult }
export const useSimHistory = create<{ runs: HistoryEntry[]; add: (r: SimResult, b: SimResult) => void }>((set) => ({
  runs: [],
  add: (result, baseline) =>
    set((s) => ({ runs: [{ id: s.runs.length + 1, at: new Date().toLocaleTimeString("en-GB"), result, baseline }, ...s.runs] })),
}));

const PRESETS: Array<[ScenarioKind, string]> = [
  ["baseline", "Baseline"], ["downtime", "Machine downtime"], ["redistribute", "Workload redistribution"],
  ["demand", "Demand increase"], ["route", "Route change"], ["inspection", "Inspection capacity"],
];
const card = "rounded-lg border border-border bg-card p-4";
const h2 = "mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground";
const axis = { stroke: "var(--muted-foreground)", fontSize: 11 };
const tip = { contentStyle: { background: "var(--popover)", border: "1px solid var(--border)", fontSize: 12 }, labelStyle: { color: "var(--foreground)" } };
const COLORS = ["var(--chart-1)", "var(--destructive)", "var(--chart-2)"];
const selectCls = "h-8 rounded-md border border-input bg-background px-2 font-mono text-xs";

function Delta({ v, base, higherIsBetter = true, unit = "%" }: { v: number; base: number; higherIsBetter?: boolean; unit?: string }) {
  const d = pctChange(v, base);
  if (Math.abs(d) < 0.5) return <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">±0{unit}</span>;
  const good = higherIsBetter ? d > 0 : d < 0;
  return (
    <span className={`rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold ${good ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"}`}>
      {d > 0 ? "+" : ""}{d.toFixed(1)}{unit}
    </span>
  );
}

function CncSelect({ value, onChange, label }: { value: Cnc; onChange: (c: Cnc) => void; label: string }) {
  return (
    <select aria-label={label} className={selectCls} value={value} onChange={(e) => onChange(e.target.value as Cnc)}>
      {CNCS.map((c) => <option key={c}>{c}</option>)}
    </select>
  );
}

function SliderRow({ label, value, min, max, step = 5, unit, onChange }: { label: string; value: number; min: number; max: number; step?: number; unit: string; onChange: (n: number) => void }) {
  return (
    <div>
      <div className="mb-1.5 flex justify-between text-xs"><span className="text-muted-foreground">{label}</span><span className="font-mono">{value}{unit}</span></div>
      <Slider value={[value]} min={min} max={max} step={step} onValueChange={(v) => onChange(v[0]!)} />
    </div>
  );
}

function useBaseParams(): BaseParams {
  const events = useTwin((s) => s.events);
  const routes = useTwin((s) => s.routes);
  return useMemo(() => {
    const scans = events.filter((e) => e.event_type === "TAG_SCAN" && e.station_id === "RM-STORE");
    const span = scans.length > 1 ? (scans[scans.length - 1]!.timestamp - scans[0]!.timestamp) / 3600_000 : 1;
    const cs = Object.fromEntries(cycleStats({ events } as never).map((c) => [c.station, c.avg || 1]));
    const tr = (from: string, to: string) => routes.find((r) => r.from_station === from && r.to_station === to)?.travel_time_sec ?? 30;
    return {
      arrivalPerHour: Math.round((scans.length / span) * 10) / 10,
      cycle: { "CNC-01": cs["CNC-01"]!, "CNC-02": cs["CNC-02"]!, "CNC-03": cs["CNC-03"]!, "ASSEMBLY-01": cs["ASSEMBLY-01"]!, "QUALITY-01": cs["QUALITY-01"]! },
      travel: { rmToCnc: tr("RM-STORE", "CNC-01"), cncToAsm: tr("CNC-01", "ASSEMBLY-01"), asmToQi: tr("ASSEMBLY-01", "QUALITY-01"), qiToFg: tr("QUALITY-01", "FG-STORE"), toAlt: 60 },
    };
  }, [events, routes]);
}

function ResultTable({ results }: { results: SimResult[] }) {
  const base = results[0]!;
  const rows: Array<[string, (r: SimResult) => number, (n: number) => string, boolean]> = [
    ["Throughput / shift", (r) => r.throughput, (n) => n.toFixed(1), true],
    ["Avg lead time (min)", (r) => r.leadMin, (n) => n.toFixed(1), false],
    ["WIP at shift end", (r) => r.wip, (n) => n.toFixed(1), false],
  ];
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-xs">
        <thead className="text-[10px] uppercase tracking-wider text-muted-foreground">
          <tr><th className="py-1.5 pr-3">Metric</th>{results.map((r, i) => <th key={i} className="px-3">{r.config.label}</th>)}</tr>
        </thead>
        <tbody className="font-mono">
          {rows.map(([name, f, fmt, hib]) => (
            <tr key={name} className="border-t border-border/60">
              <td className="py-1.5 pr-3 font-sans text-muted-foreground">{name}</td>
              {results.map((r, i) => (
                <td key={i} className="px-3"><span className="mr-2">{fmt(f(r))}</span>{i > 0 && <Delta v={f(r)} base={f(base)} higherIsBetter={hib} />}</td>
              ))}
            </tr>
          ))}
          {SIM_STATIONS.filter((s) => results.some((r) => r.stations[s].started > 0)).map((s) => (
            <tr key={s} className="border-t border-border/60">
              <td className="py-1.5 pr-3 font-sans text-muted-foreground">{s} util · avg/max queue</td>
              {results.map((r, i) => {
                const x = r.stations[s];
                return (
                  <td key={i} className={`px-3 ${r.bottleneck === s ? "text-warning" : ""}`}>
                    {(x.util * 100).toFixed(0)}% · {x.avgQueue.toFixed(1)}/{x.maxQueue.toFixed(0)}
                    {i > 0 && <span className="ml-2"><Delta v={x.util} base={base.stations[s].util} higherIsBetter={false} /></span>}
                  </td>
                );
              })}
            </tr>
          ))}
          <tr className="border-t border-border/60">
            <td className="py-1.5 pr-3 font-sans text-muted-foreground">Bottleneck</td>
            {results.map((r, i) => <td key={i} className="px-3 text-warning">{r.bottleneck}<div className="font-sans text-[10px] text-muted-foreground">{r.bottleneckWhy}</div></td>)}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

export function Simulation() {
  const base = useBaseParams();
  const [kind, setKind] = useState<ScenarioKind>("baseline");
  const [c, setC] = useState<Controls>({
    downCnc: "CNC-03", downStartMin: 300, downMin: 60, redistFrom: "CNC-03", redistTo: "CNC-02", redistPct: 30,
    demandPct: 20, routeFrom: "CNC-03", routePct: 20, altCycleFactor: 1.5, split: { "CNC-01": 1, "CNC-02": 1, "CNC-03": 1 },
  });
  const set = <K extends keyof Controls>(k: K, v: Controls[K]) => setC((x) => ({ ...x, [k]: v }));
  const [single, setSingle] = useState<{ result: SimResult; baseline: SimResult } | null>(null);
  const [compare, setCompare] = useState<SimResult[] | null>(null);
  const history = useSimHistory();

  const [running, setRunning] = useState(false);
  // Runs are deferred one frame so the "Running model…" state is visible
  const run = (k: ScenarioKind = kind, cc: Controls = c) => {
    setRunning(true);
    setTimeout(() => {
      const baseline = runScenario(buildConfig("baseline", base, cc));
      const result = k === "baseline" ? baseline : runScenario(buildConfig(k, base, cc));
      setSingle({ result, baseline });
      setCompare(null);
      history.add(result, baseline);
      setRunning(false);
    }, 30);
  };
  const runCompare = (cc: Controls = c) => {
    setRunning(true);
    setTimeout(() => {
      const rs = (["baseline", "downtime", "mitigation"] as const).map((k) => runScenario(buildConfig(k, base, cc)));
      setCompare(rs);
      setSingle(null);
      history.add(rs[1]!, rs[0]!);
      history.add(rs[2]!, rs[0]!);
      setRunning(false);
    }, 30);
  };

  // Demo Mode drives the same controls and buttons a user would
  const cmd = useDemo((d) => d.simCommand);
  const lastCmd = useRef(0);
  useEffect(() => {
    if (!cmd || cmd.nonce === lastCmd.current) return;
    lastCmd.current = cmd.nonce;
    const cc = { ...c, ...cmd.patch };
    setC(cc);
    if (cmd.kind) setKind(cmd.kind);
    if (cmd.run === "compare") runCompare(cc);
    else run(cmd.kind ?? kind, cc);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cmd]);

  const summary = useMemo(() => {
    if (compare) {
      const [b, d, m] = compare as [SimResult, SimResult, SimResult];
      const lost = b.throughput - d.throughput;
      const rec = m.throughput - d.throughput;
      const to = m.config.label.split("→ ")[1];
      const head = `Shifting ${c.redistPct}% of load from ${c.downCnc} to ${to}`;
      const out = `a ${c.downMin}-minute outage on ${c.downCnc}`;
      const core = lost <= 0.05
        ? `${head} changes throughput by ${rec >= 0 ? "+" : ""}${rec.toFixed(1)} units; ${out} costs no measurable output in this model`
        : rec >= lost
          ? `${head} recovers all ${lost.toFixed(1)} units lost during ${out} and adds ${(rec - lost).toFixed(1)} more`
          : `${head} recovers ${Math.max(0, rec).toFixed(1)} of the ${lost.toFixed(1)} units lost during ${out} (${((Math.max(0, rec) / lost) * 100).toFixed(0)}% recovery)`;
      return `${core}. Lead time goes from ${d.leadMin.toFixed(1)} to ${m.leadMin.toFixed(1)} min; bottleneck ${d.bottleneck} → ${m.bottleneck}.`;
    }
    if (single) {
      const { result: r, baseline: b } = single;
      if (r.config.kind === "baseline") return `Baseline shift produces ${r.throughput.toFixed(1)} units with ${r.leadMin.toFixed(1)} min average lead time; ${r.bottleneck} is the bottleneck (${r.bottleneckWhy}).`;
      const d = r.throughput - b.throughput;
      return `${r.config.label}: throughput ${r.throughput.toFixed(1)} units/shift (${d >= 0 ? "+" : ""}${d.toFixed(1)} units, ${pctChange(r.throughput, b.throughput).toFixed(1)}% vs baseline); lead time ${r.leadMin.toFixed(1)} min vs ${b.leadMin.toFixed(1)} min; bottleneck ${r.bottleneck}${r.bottleneck !== b.bottleneck ? ` (was ${b.bottleneck})` : ""}.`;
    }
    return null;
  }, [single, compare, c]);

  const chartResults = compare ?? (single ? (single.result === single.baseline ? [single.baseline] : [single.baseline, single.result]) : []);
  const tpData = chartResults.map((r) => ({ name: r.config.label, throughput: +r.throughput.toFixed(1), lead: +r.leadMin.toFixed(1) }));
  const utilData = SIM_STATIONS.filter((s) => chartResults.some((r) => r.stations[s].started > 0)).map((s) =>
    Object.fromEntries([["station", s], ...chartResults.map((r, i) => [`s${i}`, +(r.stations[s].util * 100).toFixed(1)])]),
  );

  const shares = Object.values(c.split).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-5">
      <PageHeader title="Simulation" subtitle="What-if scenarios on a bounded discrete-event model of one shift." />
      <div className="flex items-center gap-2 rounded-md border border-warning/50 bg-warning/10 px-4 py-2.5 text-sm text-warning">
        <ShieldAlert className="h-4 w-4 shrink-0" /> Decision-support estimate from a bounded simulation, not a certified plant model.
      </div>

      <div className="grid gap-5 xl:grid-cols-[360px_1fr]">
        {/* Controls */}
        <aside className="space-y-4">
          <section className={card}>
            <h2 className={h2}>Scenario</h2>
            <div className="grid grid-cols-2 gap-1.5">
              {PRESETS.map(([k, l], i) => (
                <button key={k} onClick={() => setKind(k)} className={`rounded-md border px-2 py-1.5 text-left text-xs ${kind === k ? "border-primary bg-primary/15 text-primary" : "border-border hover:border-primary/50"}`}>
                  <span className="font-mono text-muted-foreground">{i + 1}.</span> {l}
                </button>
              ))}
            </div>
          </section>

          <section className={`${card} space-y-4`}>
            <h2 className={`${h2} mb-0`}>Controls</h2>
            <div className={kind === "downtime" ? "" : "opacity-60"}>
              <div className="mb-2 flex items-center justify-between text-xs"><span>Downtime on</span><CncSelect label="Downtime machine" value={c.downCnc} onChange={(v) => set("downCnc", v)} /></div>
              <SliderRow label="Duration" value={c.downMin} min={10} max={240} step={10} unit=" min" onChange={(v) => set("downMin", v)} />
              <div className="mt-2"><SliderRow label="Starts after" value={c.downStartMin} min={0} max={420} step={15} unit=" min" onChange={(v) => set("downStartMin", v)} /></div>
            </div>
            <div className={kind === "redistribute" ? "" : "opacity-60"}>
              <div className="mb-2 flex items-center justify-between gap-2 text-xs"><span>Shift load</span><CncSelect label="From" value={c.redistFrom} onChange={(v) => set("redistFrom", v)} /><span>→</span><CncSelect label="To" value={c.redistTo} onChange={(v) => set("redistTo", v)} /></div>
              <SliderRow label="Share moved" value={c.redistPct} min={0} max={100} unit="%" onChange={(v) => set("redistPct", v)} />
            </div>
            <div className={kind === "demand" ? "" : "opacity-60"}>
              <SliderRow label={`Demand increase (base ${base.arrivalPerHour}/h)`} value={c.demandPct} min={0} max={100} unit="%" onChange={(v) => set("demandPct", v)} />
            </div>
            <div className={kind === "route" ? "" : "opacity-60"}>
              <div className="mb-2 flex items-center justify-between text-xs"><span>Route from</span><CncSelect label="Route from" value={c.routeFrom} onChange={(v) => set("routeFrom", v)} /><span className="font-mono">→ ALT-CELL</span></div>
              <SliderRow label="Share rerouted" value={c.routePct} min={0} max={100} unit="%" onChange={(v) => set("routePct", v)} />
              <div className="mt-2"><SliderRow label="ALT-CELL cycle vs CNC mean" value={c.altCycleFactor} min={1} max={3} step={0.1} unit="×" onChange={(v) => set("altCycleFactor", v)} /></div>
            </div>
            <div>
              <div className="mb-1 text-xs text-muted-foreground">Routing split (all scenarios)</div>
              <div className="grid grid-cols-3 gap-2">
                {CNCS.map((k) => (
                  <label key={k} className="text-[11px]">
                    <span className="font-mono">{k}</span>
                    <input type="number" min={0} max={10} step={0.5} value={c.split[k]} onChange={(e) => set("split", { ...c.split, [k]: Math.max(0, +e.target.value) })} className={`${selectCls} mt-1 w-full`} />
                    <span className="text-muted-foreground">{((c.split[k] / (shares || 1)) * 100).toFixed(0)}%</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <Button className="flex-1" onClick={() => run()} disabled={running}><Play className="h-4 w-4" /> Run scenario</Button>
              <Button className="flex-1" variant="secondary" onClick={() => runCompare()} disabled={running}><Scale className="h-4 w-4" /> Compare</Button>
            </div>
            <p className="text-[11px] text-muted-foreground">Compare runs Baseline vs Downtime vs Mitigation (downtime + the load shift above, from the downed machine).</p>
          </section>

          <section className={card}>
            <h2 className={h2}><Info className="mr-1 inline h-3.5 w-3.5" />Assumptions</h2>
            <ul className="space-y-1 text-xs">
              <li>• One {SHIFT_HOURS}-hour shift, {REPLICATIONS} seeded replications, results averaged.</li>
              <li>• Arrivals: Poisson, {base.arrivalPerHour} products/h (measured from captured tag scans).</li>
              <li>• Mean cycle times from captured completions: {Object.entries(base.cycle).map(([k, v]) => `${k} ${v}s`).join(", ")}.</li>
              <li>• Cycle-time distribution: normal, CV {CV * 100}%, truncated at 50% of the mean.</li>
              <li>• Capacity: 1 part at a time per station (quality: 2 with +1 station).</li>
              <li>• Routing decided at release by the split; no dynamic rebalancing.</li>
              <li>• Travel times from the route table; ALT-CELL travel {base.travel.toAlt}s, cycle {c.altCycleFactor}× CNC mean.</li>
              <li>• No breakdowns other than the injected one; the part in process finishes, no new starts while down.</li>
              <li>• FIFO queues, unlimited buffers, no scrap or rework, no operator limits.</li>
              <li>• Shift starts empty; throughput = units reaching finished goods before shift end.</li>
            </ul>
          </section>
        </aside>

        {/* Results */}
        <div id="sim-results" className="min-w-0 space-y-4" aria-busy={running}>
          {running && (
            <div role="status" className="flex items-center gap-2 rounded-lg border border-primary/40 bg-primary/5 p-3 text-sm text-primary">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" /> Running model — {REPLICATIONS} replications…
            </div>
          )}
          {!single && !compare ? (
            <div className="rounded-lg border border-dashed border-border p-10 text-center text-sm text-muted-foreground">Pick a scenario and press Run scenario, or press Compare.</div>
          ) : (
            <>
              {summary && (
                <section id="decision-supported" className="rounded-lg border-2 border-primary/50 bg-primary/10 p-4">
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-primary">Decision supported</div>
                  <p className="mt-1 text-base">{summary}</p>
                </section>
              )}
              {single && (
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                  {[
                    ["Throughput / shift", single.result.throughput.toFixed(1), <Delta key="d" v={single.result.throughput} base={single.baseline.throughput} />],
                    ["Avg lead time", `${single.result.leadMin.toFixed(1)} min`, <Delta key="d" v={single.result.leadMin} base={single.baseline.leadMin} higherIsBetter={false} />],
                    ["Bottleneck", single.result.bottleneck, null],
                    ["Model runtime", `${single.result.runtimeMs.toFixed(0)} ms`, <span key="d" className="text-[10px] text-muted-foreground">{REPLICATIONS} replications</span>],
                  ].map(([t, v, d]) => (
                    <div key={t as string} className="rounded-lg border border-border bg-card px-3 py-2.5">
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{t}</div>
                      <div className="font-mono text-2xl font-semibold">{v}</div>
                      <div className="h-5">{d}</div>
                    </div>
                  ))}
                </div>
              )}
              <section className={card}>
                <h2 className={h2}>{compare ? "Baseline vs Downtime vs Mitigation" : "Scenario vs baseline"}</h2>
                <ResultTable results={chartResults} />
              </section>
              <div className="grid gap-4 lg:grid-cols-2">
                <section className={card}>
                  <h2 className={h2}>Throughput per shift</h2>
                  <div className="h-56"><ResponsiveContainer><BarChart data={tpData}><CartesianGrid stroke="var(--border)" vertical={false} /><XAxis dataKey="name" {...axis} /><YAxis {...axis} /><Tooltip {...tip} /><Bar dataKey="throughput" fill="var(--chart-1)" radius={[3, 3, 0, 0]} /></BarChart></ResponsiveContainer></div>
                </section>
                <section className={card}>
                  <h2 className={h2}>Utilization per station (%)</h2>
                  <div className="h-56"><ResponsiveContainer><BarChart data={utilData}><CartesianGrid stroke="var(--border)" vertical={false} /><XAxis dataKey="station" {...axis} /><YAxis domain={[0, 100]} {...axis} /><Tooltip {...tip} /><Legend wrapperStyle={{ fontSize: 11 }} />
                    {chartResults.map((r, i) => <Bar key={i} dataKey={`s${i}`} name={r.config.label} fill={COLORS[i % 3]} />)}
                  </BarChart></ResponsiveContainer></div>
                </section>
              </div>
            </>
          )}

          <section className={card}>
            <h2 className={h2}>Scenario history</h2>
            {history.runs.length === 0 ? (
              <p className="text-xs text-muted-foreground">No runs yet.</p>
            ) : (
              <table className="w-full text-left font-mono text-xs">
                <thead className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  <tr><th className="py-1">#</th><th>Time</th><th>Scenario</th><th>Throughput</th><th>vs base</th><th>Lead min</th><th>Bottleneck</th><th>Runtime</th></tr>
                </thead>
                <tbody>
                  {history.runs.map((h) => (
                    <tr key={h.id} className="border-t border-border/60">
                      <td className="py-1.5">{h.id}</td><td>{h.at}</td><td className="font-sans">{h.result.config.label}</td>
                      <td>{h.result.throughput.toFixed(1)}</td><td><Delta v={h.result.throughput} base={h.baseline.throughput} /></td>
                      <td>{h.result.leadMin.toFixed(1)}</td><td>{h.result.bottleneck}</td><td>{h.result.runtimeMs.toFixed(0)} ms</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
