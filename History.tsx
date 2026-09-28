import { useEffect, useMemo, useState } from "react";
import { Pause, Play, SkipBack } from "lucide-react";
import { reconstructAt, SHIFT_BOUNDS, useTwin } from "@/twin/store";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { FactoryMap } from "./FactoryMap";
import { PageHeader } from "./AppShell";
import type { StationId } from "@/twin/types";

const fmt = (t: number) => new Date(t).toLocaleTimeString("en-GB", { timeZone: "UTC" });
const STATIONS: StationId[] = ["RM-STORE", "CNC-01", "CNC-02", "CNC-03", "ASSEMBLY-01", "QUALITY-01", "FG-STORE"];
const statusCls = { RUNNING: "text-success", IDLE: "text-muted-foreground", DOWN: "text-destructive" };

export function History() {
  const events = useTwin((s) => s.events);
  const liveNow = useTwin((s) => s.now);
  const start = SHIFT_BOUNDS.start;
  const [t, setT] = useState(() => start + 3 * 3600_000);
  const [speed, setSpeed] = useState<10 | 60>(60);
  const [playing, setPlaying] = useState(false);

  // Replay clock: advances simulated time at 10× or 60× real time
  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => {
      setT((x) => {
        const n = x + speed * 250;
        if (n >= liveNow) {
          setPlaying(false);
          return liveNow;
        }
        return n;
      });
    }, 250);
    return () => clearInterval(id);
  }, [playing, speed, liveNow]);

  const snap = useMemo(() => reconstructAt(events, t), [events, t]);
  const applied = snap.events.length;
  const touched = useMemo(() => new Set(snap.events.map((e) => e.product_id)), [snap]);
  const inStation = (st: StationId) => Object.values(snap.products).filter((p) => p.current_station === st && touched.has(p.product_id));

  return (
    <div className="space-y-5">
      <PageHeader title="History" subtitle="Replay the factory at any past moment — state is rebuilt from the event log up to the selected time." />

      <section className="rounded-lg border border-border bg-card p-4">
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <Button size="sm" onClick={() => setPlaying(!playing)}>{playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}{playing ? "Pause" : "Replay"}</Button>
          <Button size="sm" variant="secondary" onClick={() => { setT(start); setPlaying(false); }}><SkipBack className="h-4 w-4" /> Shift start</Button>
          <div className="flex overflow-hidden rounded-md border border-border">
            {([10, 60] as const).map((s) => (
              <button key={s} onClick={() => setSpeed(s)} className={`px-3 py-1 font-mono text-xs ${speed === s ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>{s}×</button>
            ))}
          </div>
          <div className="ml-auto text-right">
            <div className="font-mono text-2xl font-semibold text-primary">{fmt(t)}</div>
            <div className="font-mono text-[11px] text-muted-foreground">{applied} of {events.length} events replayed</div>
          </div>
        </div>
        <Slider value={[t]} min={start} max={liveNow} step={1000} onValueChange={(v) => { setT(v[0]!); setPlaying(false); }} />
        <div className="mt-1 flex justify-between font-mono text-[10px] text-muted-foreground"><span>{fmt(start)}</span><span>live {fmt(liveNow)}</span></div>
      </section>

      <section className="rounded-lg border border-border bg-card p-3">
        <FactoryMap stations={snap.stations} assets={snap.assets} routes={snap.routes} events={[]} live={playing} onSelect={() => {}} />
      </section>

      <section className="rounded-lg border border-border bg-card p-4">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Station state at {fmt(t)}</h2>
        <table className="w-full text-left font-mono text-xs">
          <thead className="text-[10px] uppercase tracking-wider text-muted-foreground">
            <tr><th className="py-1.5">Station</th><th>Status</th><th>Processing</th><th>Queue</th><th>Products at station</th></tr>
          </thead>
          <tbody>
            {STATIONS.map((st) => {
              const s = snap.stations[st];
              const a = Object.values(snap.assets).find((x) => x.station_id === st);
              const here = inStation(st);
              return (
                <tr key={st} className="border-t border-border/60 align-top">
                  <td className="py-1.5">{st}</td>
                  <td className={a ? statusCls[a.status] : ""}>{a?.status ?? "—"}</td>
                  <td>{s.current_product ?? "—"}</td>
                  <td>{s.queue.length}</td>
                  <td className="max-w-md text-muted-foreground">{here.length} {here.length ? `· ${here.slice(0, 6).map((p) => p.product_id.slice(-4)).join(", ")}${here.length > 6 ? "…" : ""}` : ""}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
    </div>
  );
}
