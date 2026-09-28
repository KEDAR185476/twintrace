import { useEffect, useMemo, useState } from "react";
import { Pause, Play, RotateCcw, Zap, Timer, ChevronDown } from "lucide-react";
import { useTwin, nextManualId, totalEventCount as TOTAL } from "@/twin/store";
import type { ProcessEvent, StationId } from "@/twin/types";
import { assetOf, CNC_IDS } from "@/twin/generator";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PageHeader } from "./AppShell";
import { FactoryMap } from "./FactoryMap";
import { StationDrawer } from "./StationDrawer";

const fmtTime = (t: number) =>
  new Date(t).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit", timeZone: "UTC" });

const eventTone: Partial<Record<ProcessEvent["event_type"], string>> = {
  QUALITY_FAIL: "text-destructive",
  MACHINE_DOWN: "text-destructive",
  MACHINE_RECOVERED: "text-success",
  QUALITY_PASS: "text-success",
  TAG_SCAN: "text-primary",
  MATERIAL_MOVE: "text-warning",
};

function Kpi({ label, value, hint, tone }: { label: string; value: string; hint: string; tone?: string }) {
  return (
    <div className="rounded-lg border border-border bg-card px-4 py-3" title={hint}>
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div key={value} className={`mt-1 animate-fade-in font-mono text-2xl font-semibold ${tone ?? ""}`}>
        {value}
      </div>
      <div className="mt-0.5 truncate text-[10px] text-muted-foreground">{hint}</div>
    </div>
  );
}

export function FactoryTwin() {
  const s = useTwin();
  const { playing, setPlaying, step, reset, dispatch } = s;
  const [selected, setSelected] = useState<StationId | null>(null);

  // Live simulation ticker runs in the shared layout so every screen stays current

  const machineEvent = (station: StationId, type: "MACHINE_DOWN" | "MACHINE_RECOVERED") =>
    dispatch({
      event_id: nextManualId(),
      event_type: type,
      timestamp: s.now + 1000,
      station_id: station,
      asset_id: assetOf[station],
      operation: type === "MACHINE_DOWN" ? "Operator-triggered stop" : "Operator reset",
    });

  const kpis = useMemo(() => {
    const ev = s.events;
    const hourAgo = s.now - 3_600_000;
    const scanAt = new Map<string, number>();
    let fgLastHour = 0;
    const leads: number[] = [];
    let qp = 0;
    let qf = 0;
    for (const e of ev) {
      if (e.event_type === "TAG_SCAN" && e.product_id) scanAt.set(e.product_id, e.timestamp);
      if (e.event_type === "MATERIAL_MOVE" && e.to_station === "FG-STORE" && e.product_id) {
        if (e.timestamp > hourAgo) fgLastHour++;
        const st = scanAt.get(e.product_id);
        if (st) leads.push(e.timestamp - st);
      }
      if (e.event_type === "QUALITY_PASS") qp++;
      if (e.event_type === "QUALITY_FAIL") qf++;
    }
    const cycles = ev.filter((e) => e.event_type === "PROCESS_COMPLETE" && e.cycle_time_sec).slice(-60);
    const avgCycle = cycles.length ? cycles.reduce((a, e) => a + (e.cycle_time_sec ?? 0), 0) / cycles.length : 0;
    const recentLeads = leads.slice(-30);
    const lead = recentLeads.length ? recentLeads.reduce((a, b) => a + b, 0) / recentLeads.length : 0;
    const totalQueue = Object.values(s.stations)
      .filter((st) => st.type !== "STORE")
      .reduce((a, st) => a + st.queue.length, 0);
    const qr = s.qualityRecords;
    const defect = qr.length ? qr.filter((r) => r.result === "FAIL").length / qr.length : 0;
    const fpy = qp + qf ? qp / (qp + qf) : 1;
    return { throughput: fgLastHour, avgCycle, totalQueue, defect, fpy, lead };
  }, [s.events, s.now, s.stations, s.qualityRecords]);

  const feed = s.events.slice(-30).reverse();

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <PageHeader title="Factory Twin" subtitle="Live 2D twin of the POC line · every change below comes from applyEvent()" />
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded border border-primary/40 bg-primary/10 px-2 py-1 font-mono text-xs text-primary">
            <Timer className="h-3.5 w-3.5" />
            Twin update latency: {s.latencyMs === null ? "—" : `${s.latencyMs.toFixed(1)} ms`}
          </span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="secondary" size="sm">
                <Zap className="h-4 w-4" /> Simulate machine event <ChevronDown className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              {CNC_IDS.map((c, i) => (
                <div key={c}>
                  {i > 0 && <DropdownMenuSeparator />}
                  <DropdownMenuLabel className="font-mono text-xs">{c}</DropdownMenuLabel>
                  <DropdownMenuItem onClick={() => machineEvent(c, "MACHINE_DOWN")} disabled={s.stations[c].status === "DOWN"}>
                    <span className="h-2 w-2 rounded-full bg-destructive" /> MACHINE_DOWN
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => machineEvent(c, "MACHINE_RECOVERED")} disabled={s.stations[c].status !== "DOWN"}>
                    <span className="h-2 w-2 rounded-full bg-success" /> MACHINE_RECOVERED
                  </DropdownMenuItem>
                </div>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button size="sm" onClick={() => setPlaying(!playing)} disabled={!s.pending.length && !playing}>
            {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            {playing ? "Pause" : "Start Live Simulation"}
          </Button>
          <Button size="sm" variant="outline" onClick={reset}>
            <RotateCcw className="h-4 w-4" /> Reset
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Kpi label="Throughput" value={`${kpis.throughput} u/hr`} hint="Units into FG, last 60 min" tone="text-primary" />
        <Kpi label="Avg cycle time" value={`${kpis.avgCycle.toFixed(0)} s`} hint="Mean of last 60 operations" />
        <Kpi label="Total queue" value={String(kpis.totalQueue)} hint="Parts waiting at all stations" tone={kpis.totalQueue >= 10 ? "text-warning" : ""} />
        <Kpi label="Defect rate" value={`${(kpis.defect * 100).toFixed(1)}%`} hint="Failed / inspected records" tone={kpis.defect > 0.12 ? "text-destructive" : ""} />
        <Kpi label="First-pass yield" value={`${(kpis.fpy * 100).toFixed(1)}%`} hint="Passed first time at QUALITY-01" tone={kpis.fpy < 0.95 ? "text-warning" : "text-success"} />
        <Kpi label="Lead time" value={`${(kpis.lead / 60000).toFixed(0)} min`} hint="Tag scan → FG, last 30 units" />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_340px]">
        <section className="rounded-lg border border-border bg-card/50 p-4">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Factory map</h2>
            <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-success" />RUNNING</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-muted-foreground" />IDLE</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-destructive" />DOWN</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-primary" />product in transit</span>
              <span>Click a station for details</span>
            </div>
          </div>
          <FactoryMap stations={s.stations} assets={s.assets} routes={s.routes} events={s.events} live={playing} onSelect={setSelected} />
          <div className="mt-2 flex justify-between font-mono text-[11px] text-muted-foreground">
            <span>Twin time {fmtTime(s.now)} UTC</span>
            <span>
              {s.events.length} / {TOTAL} events applied · {s.pending.length} queued in stream
            </span>
          </div>
        </section>

        <section className="flex max-h-[640px] flex-col rounded-lg border border-border bg-card/50">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Live Event Feed</h2>
            <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <span className={`h-2 w-2 rounded-full ${playing ? "animate-pulse bg-success" : "bg-muted-foreground"}`} />
              {playing ? "live" : "paused"}
            </span>
          </div>
          <ol className="flex-1 overflow-y-auto font-mono text-[11px]">
            {feed.map((e, i) => (
              <li key={e.event_id} className={`border-b border-border/50 px-4 py-1.5 ${i === 0 ? "animate-fade-in bg-primary/5" : ""}`}>
                <div className="flex justify-between">
                  <span className={eventTone[e.event_type] ?? "text-foreground"}>{e.event_type}</span>
                  <span className="text-muted-foreground">{fmtTime(e.timestamp)}</span>
                </div>
                <div className="text-muted-foreground">
                  {e.product_id ?? e.asset_id} · {e.station_id}
                  {e.to_station ? ` → ${e.to_station}` : ""}
                  {e.defect_type ? ` · ${e.defect_type}` : ""}
                </div>
              </li>
            ))}
          </ol>
        </section>
      </div>

      <StationDrawer stationId={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
