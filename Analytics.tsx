import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useTwin } from "@/twin/store";
import { bottleneckScores, cycleStats, defectGroups, kpis, PROCESS_STATIONS, queueOverTime, TARGET_LEAD_MIN, throughputPerHour, WEIGHTS } from "@/twin/analytics";
import { PageHeader } from "./AppShell";

const card = "rounded-lg border border-border bg-card p-4";
const h2 = "mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground";
const axis = { stroke: "var(--muted-foreground)", fontSize: 11 };
const tip = { contentStyle: { background: "var(--popover)", border: "1px solid var(--border)", fontSize: 12 }, labelStyle: { color: "var(--foreground)" } };
const SERIES = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];
export const FACTOR_COLORS = { util: "var(--chart-1)", queue: "var(--chart-3)", ct: "var(--chart-2)", down: "var(--chart-5)" };

function Chart({ title, note, children }: { title: string; note?: string; children: React.ReactElement }) {
  return (
    <section className={card}>
      <h2 className={h2}>{title}</h2>
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">{children}</ResponsiveContainer>
      </div>
      {note && <p className="mt-2 text-[11px] text-muted-foreground">{note}</p>}
    </section>
  );
}

export function BottleneckTable() {
  const s = useTwin();
  const rows = useMemo(() => bottleneckScores(s), [s.events, s.assets, s.stations]); // eslint-disable-line react-hooks/exhaustive-deps
  const legend = [
    ["util", `${WEIGHTS.util} × Utilization`],
    ["queue", `${WEIGHTS.queue} × Normalized Queue`],
    ["ct", `${WEIGHTS.ct} × Cycle-Time Deviation`],
    ["down", `${WEIGHTS.down} × Downstream Impact`],
  ] as const;
  return (
    <section id="bottleneck" className={card}>
      <h2 className={h2}>Bottleneck score (explainable)</h2>
      <div className="mb-3 rounded-md border border-primary/30 bg-primary/5 px-3 py-2 font-mono text-sm">
        Score = 0.40 × Utilization + 0.30 × Normalized Queue + 0.20 × Cycle-Time Deviation + 0.10 × Downstream Impact
        <div className="mt-1 font-sans text-[11px] text-muted-foreground">
          Inputs normalized 0–1 · Queue = (average + current) ÷ highest station · CT deviation = % above line-mean cycle ÷ largest · Downstream = share of flow × stations downstream ÷ largest
        </div>
      </div>
      <div className="mb-3 flex flex-wrap gap-3 text-xs">
        {legend.map(([k, l]) => (
          <span key={k} className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: FACTOR_COLORS[k] }} />{l}</span>
        ))}
      </div>
      <table className="w-full text-left text-xs">
        <thead className="text-[10px] uppercase tracking-wider text-muted-foreground">
          <tr><th className="py-1.5">#</th><th>Station</th><th className="w-[40%]">Contribution</th><th>Score</th><th>Util</th><th>Queue</th><th>CT dev</th><th>Downstr.</th></tr>
        </thead>
        <tbody className="font-mono">
          {rows.map((r, i) => (
            <tr key={r.station} className={`border-t border-border/60 ${i === 0 ? "bg-warning/5" : ""}`}>
              <td className="py-2">{i + 1}</td>
              <td className={i === 0 ? "font-semibold text-warning" : ""}>{r.station}</td>
              <td>
                <div className="flex h-4 w-full overflow-hidden rounded-sm bg-muted">
                  {(Object.keys(FACTOR_COLORS) as Array<keyof typeof FACTOR_COLORS>).map((k) => (
                    <div key={k} title={`${k}: ${r.parts[k].toFixed(3)}`} style={{ width: `${r.parts[k] * 100}%`, background: FACTOR_COLORS[k] }} />
                  ))}
                </div>
              </td>
              <td className="font-semibold">{r.score.toFixed(2)}</td>
              <td>{r.inputs.util.toFixed(2)}</td>
              <td>{r.inputs.queue.toFixed(2)}</td>
              <td>{r.inputs.ct.toFixed(2)}</td>
              <td>{r.inputs.down.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {rows[0] && (
        <p className="mt-3 text-sm">
          <span className="font-semibold text-warning">{rows[0].station}</span> ranks first: utilization {(rows[0].raw.util * 100).toFixed(0)}%, average queue {rows[0].raw.avgQueue.toFixed(1)} vs line {rows[0].raw.lineQueue.toFixed(1)}, cycle time {rows[0].raw.avgCt}s ({rows[0].raw.ctDevPct >= 0 ? "+" : ""}{rows[0].raw.ctDevPct.toFixed(0)}% vs line mean).
        </p>
      )}
    </section>
  );
}

export function Analytics() {
  const s = useTwin();
  const k = useMemo(() => kpis(s), [s]);
  const tp = useMemo(() => throughputPerHour(s), [s.events, s.now]); // eslint-disable-line react-hooks/exhaustive-deps
  const cs = useMemo(() => cycleStats(s), [s.events]); // eslint-disable-line react-hooks/exhaustive-deps
  const qot = useMemo(() => queueOverTime(s), [s.events]); // eslint-disable-line react-hooks/exhaustive-deps
  const dg = useMemo(() => defectGroups(s), [s.qualityRecords]); // eslint-disable-line react-hooks/exhaustive-deps
  const util = Object.values(s.assets).filter((a) => PROCESS_STATIONS.includes(a.station_id)).map((a) => ({ asset: a.asset_id, util: +(a.utilization * 100).toFixed(1) }));
  const toPct = (rows: typeof dg.byMachine) => rows.map((r) => ({ key: r.key, rate: +(r.rate * 100).toFixed(1), n: r.n }));

  const cards = [
    ["Throughput", `${k.throughput}`, "units/hr (last 60 min)"],
    ["Cycle time", `${k.cycle}s`, "avg of last 60 completions"],
    ["Queue length", `${k.queue}`, "parts waiting, all stations"],
    ["Utilization", `${k.util.toFixed(0)}%`, "avg across process assets"],
    ["Defect rate", `${k.defect.toFixed(1)}%`, `${s.qualityRecords.length} inspections`],
    ["First-pass yield", `${k.fpy.toFixed(1)}%`, "passed at first inspection"],
    ["Lead time", `${k.lead.toFixed(0)} min`, "tag scan → finished goods"],
    ["On-time completion", `${k.onTime.toFixed(0)}%`, `lead time ≤ ${TARGET_LEAD_MIN} min, ${k.completed} units`],
  ];

  return (
    <div className="space-y-5">
      <PageHeader title="Analytics" subtitle="Rule-based performance and quality analytics computed from captured events." />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8">
        {cards.map(([t, v, n]) => (
          <div key={t} className="rounded-lg border border-border bg-card px-3 py-2.5">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{t}</div>
            <div className="font-mono text-2xl font-semibold">{v}</div>
            <div className="text-[10px] text-muted-foreground">{n}</div>
          </div>
        ))}
      </div>

      <BottleneckTable />

      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        <Chart title="Throughput per hour">
          <BarChart data={tp}><CartesianGrid stroke="var(--border)" vertical={false} /><XAxis dataKey="hour" {...axis} /><YAxis {...axis} /><Tooltip {...tip} /><Bar dataKey="units" fill="var(--chart-1)" radius={[3, 3, 0, 0]} /></BarChart>
        </Chart>
        <Chart title="Cycle time per station (s)">
          <BarChart data={cs}><CartesianGrid stroke="var(--border)" vertical={false} /><XAxis dataKey="station" {...axis} /><YAxis {...axis} /><Tooltip {...tip} /><Legend wrapperStyle={{ fontSize: 11 }} /><Bar dataKey="avg" name="Average" fill="var(--chart-1)" /><Bar dataKey="p90" name="P90" fill="var(--chart-3)" /></BarChart>
        </Chart>
        <Chart title="Machine utilization per asset (%)">
          <BarChart data={util}><CartesianGrid stroke="var(--border)" vertical={false} /><XAxis dataKey="asset" {...axis} /><YAxis domain={[0, 100]} {...axis} /><Tooltip {...tip} /><Bar dataKey="util" fill="var(--chart-2)" radius={[3, 3, 0, 0]} /></BarChart>
        </Chart>
        <Chart title="Queue length over time" note="Rebuilt from events: +1 on arrival, −1 on process start; sampled every 15 min.">
          <LineChart data={qot}><CartesianGrid stroke="var(--border)" vertical={false} /><XAxis dataKey="time" {...axis} /><YAxis allowDecimals={false} {...axis} /><Tooltip {...tip} /><Legend wrapperStyle={{ fontSize: 11 }} />
            {PROCESS_STATIONS.map((st, i) => <Line key={st} dataKey={st} stroke={SERIES[i]} dot={false} strokeWidth={st === "CNC-03" ? 2.5 : 1.5} />)}
          </LineChart>
        </Chart>
        <Chart title="Defect rate by machine (%)" note={`Plant average ${(dg.plant * 100).toFixed(1)}%`}>
          <BarChart data={toPct(dg.byMachine)}><CartesianGrid stroke="var(--border)" vertical={false} /><XAxis dataKey="key" {...axis} /><YAxis {...axis} /><Tooltip {...tip} /><Bar dataKey="rate" fill="var(--destructive)" radius={[3, 3, 0, 0]} /></BarChart>
        </Chart>
        <Chart title="Defect rate by hour (%)">
          <BarChart data={toPct(dg.byHour)}><CartesianGrid stroke="var(--border)" vertical={false} /><XAxis dataKey="key" {...axis} /><YAxis {...axis} /><Tooltip {...tip} /><Bar dataKey="rate" fill="var(--warning)" radius={[3, 3, 0, 0]} /></BarChart>
        </Chart>
      </div>
      <Chart title="Defect rate by batch (%)" note="Hover a bar for its sample size.">
        <BarChart data={toPct(dg.byBatch)}><CartesianGrid stroke="var(--border)" vertical={false} /><XAxis dataKey="key" {...axis} /><YAxis {...axis} /><Tooltip {...tip} /><Bar dataKey="rate" fill="var(--destructive)" radius={[3, 3, 0, 0]} /></BarChart>
      </Chart>
    </div>
  );
}
