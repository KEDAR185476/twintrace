import { useMemo } from "react";
import { AlertOctagon, AlertTriangle, Info } from "lucide-react";
import { useTwin } from "@/twin/store";
import { deriveAlerts, LIMITS } from "@/twin/alerts";
import { defectGroups } from "@/twin/analytics";
import { PageHeader } from "./AppShell";

const sev = {
  CRITICAL: { cls: "border-destructive/60 bg-destructive/10", text: "text-destructive", Icon: AlertOctagon },
  WARNING: { cls: "border-warning/60 bg-warning/10", text: "text-warning", Icon: AlertTriangle },
  INFO: { cls: "border-border bg-card", text: "text-muted-foreground", Icon: Info },
};

export function Alerts() {
  const s = useTwin();
  const alerts = useMemo(() => deriveAlerts(s), [s]);
  const dg = useMemo(() => defectGroups(s), [s.qualityRecords]); // eslint-disable-line react-hooks/exhaustive-deps
  const counts = { CRITICAL: 0, WARNING: 0, INFO: 0 };
  alerts.forEach((a) => counts[a.severity]++);

  const corr = [
    ...dg.byMachine.map((r) => ({ dim: "Machine", ...r })),
    ...dg.byBatch.map((r) => ({ dim: "Batch", ...r })),
    ...dg.byStation.map((r) => ({ dim: "Station", ...r })),
    ...dg.byHour.map((r) => ({ dim: "Time window", ...r, key: `${r.key}–${String(+r.key.slice(0, 2) + 1).padStart(2, "0")}:00` })),
  ].filter((r) => r.f > 0);

  return (
    <div className="space-y-5">
      <PageHeader title="Alerts & Insights" subtitle="Every alert is produced by a fixed rule and lists the numbers that triggered it." />
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="rounded border border-destructive/50 px-2 py-1 font-mono text-destructive">{counts.CRITICAL} critical</span>
        <span className="rounded border border-warning/50 px-2 py-1 font-mono text-warning">{counts.WARNING} warning</span>
        <span className="text-muted-foreground">
          Rules: bottleneck score &gt; {LIMITS.bottleneckWarn} · cycle-time |z| &gt; {LIMITS.zScore} · temperature &gt; {LIMITS.tempC}°C or vibration &gt; {LIMITS.vibration} mm/s · failure rate &gt; {LIMITS.clusterFactor}× plant (n ≥ {LIMITS.clusterMinSample}) · asset DOWN
        </span>
        <span className="ml-auto flex items-center gap-1.5 text-muted-foreground">
          <span className={`h-2 w-2 rounded-full ${s.playing ? "animate-pulse bg-success" : "bg-muted-foreground"}`} />
          {s.playing ? "Updating live" : "Paused — start Live in the header"}
        </span>
      </div>

      {alerts.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">No rule is currently triggered.</div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {alerts.map((a) => {
            const { cls, text, Icon } = sev[a.severity];
            return (
              <article key={a.alert_id} className={`rounded-lg border p-4 ${cls}`}>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{a.type.replace(/_/g, " ")}</span>
                  <span className={`flex items-center gap-1 rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold ${text}`}><Icon className="h-3.5 w-3.5" />{a.severity}</span>
                </div>
                <h3 className="mt-1 font-semibold">{a.title}</h3>
                <div className="font-mono text-xs text-muted-foreground">Entity: {a.entity_id}</div>
                <div className="mt-3 text-[10px] uppercase tracking-wider text-muted-foreground">Why this alert</div>
                <ul className="mt-1 space-y-0.5 font-mono text-xs">
                  {a.evidence.map((e) => <li key={e} className={e.startsWith("Rule:") ? "text-muted-foreground" : ""}>• {e}</li>)}
                </ul>
              </article>
            );
          })}
        </div>
      )}

      <section className="rounded-lg border border-border bg-card p-4">
        <h2 className="mb-1 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Quality correlation</h2>
        <p className="mb-3 text-xs text-muted-foreground">
          Failures grouped by machine, batch, machining station and time window. Plant average {(dg.plant * 100).toFixed(1)}% over {dg.total} inspections. Highlighted rows exceed {LIMITS.clusterFactor}× the average with n ≥ {LIMITS.clusterMinSample}.
        </p>
        <div className="max-h-96 overflow-y-auto rounded-md border border-border">
          <table className="w-full text-left font-mono text-xs">
            <thead className="sticky top-0 bg-secondary text-[10px] uppercase tracking-wider text-muted-foreground">
              <tr>{["Group by", "Value", "Inspected", "Failed", "Fail rate", "× plant avg", "Top defect"].map((h) => <th key={h} className="px-3 py-2 font-medium">{h}</th>)}</tr>
            </thead>
            <tbody>
              {corr.map((r) => {
                const x = dg.plant ? r.rate / dg.plant : 0;
                const hot = r.n >= LIMITS.clusterMinSample && x > LIMITS.clusterFactor;
                return (
                  <tr key={r.dim + r.key} className={`border-t border-border/60 ${hot ? "bg-destructive/10 text-destructive" : ""}`}>
                    <td className="px-3 py-1.5 text-muted-foreground">{r.dim}</td>
                    <td className="px-3 py-1.5">{r.key}</td>
                    <td className="px-3 py-1.5">{r.n}</td>
                    <td className="px-3 py-1.5">{r.f}</td>
                    <td className="px-3 py-1.5">{(r.rate * 100).toFixed(0)}%</td>
                    <td className="px-3 py-1.5">{x.toFixed(2)}×</td>
                    <td className="px-3 py-1.5">{r.top}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
