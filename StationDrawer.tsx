import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useTwin } from "@/twin/store";
import type { StationId } from "@/twin/types";

const tone = { RUNNING: "text-success", IDLE: "text-muted-foreground", DOWN: "text-destructive" } as const;

export function StationDrawer({ stationId, onClose }: { stationId: StationId | null; onClose: () => void }) {
  const s = useTwin();
  const st = stationId ? s.stations[stationId] : null;
  const asset = stationId ? Object.values(s.assets).find((a) => a.station_id === stationId) : null;

  const trend = stationId
    ? s.events
        .filter((e) => e.event_type === "PROCESS_COMPLETE" && e.station_id === stationId && e.cycle_time_sec)
        .slice(-25)
        .map((e, i) => ({ n: i + 1, sec: e.cycle_time_sec, product: e.product_id }))
    : [];

  return (
    <Sheet open={!!stationId} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-[420px] overflow-y-auto sm:max-w-[420px]">
        {st && asset && (
          <>
            <SheetHeader>
              <SheetTitle className="font-mono">{st.station_id}</SheetTitle>
              <SheetDescription>
                Asset {asset.asset_id} · {st.type} · capacity {st.capacity}
              </SheetDescription>
            </SheetHeader>
            <div className="mt-5 grid grid-cols-2 gap-3 px-4">
              {[
                ["Status", <span className={tone[asset.status]}>{asset.status}</span>],
                ["Health", `${asset.health.toFixed(0)}%`],
                ["Temperature", `${asset.temperature.toFixed(1)} °C`],
                ["Vibration", `${asset.vibration.toFixed(1)} mm/s`],
                ["Utilization", `${(asset.utilization * 100).toFixed(1)}%`],
                ["Processing", st.current_product ?? "—"],
              ].map(([k, v]) => (
                <div key={k as string} className="rounded-md border border-border bg-card p-3">
                  <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{k}</div>
                  <div className="mt-1 font-mono text-sm">{v}</div>
                </div>
              ))}
            </div>
            <div className="mt-5 px-4">
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Cycle-time trend (last {trend.length})</h3>
              {trend.length ? (
                <div className="h-40 rounded-md border border-border bg-card p-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trend}>
                      <XAxis dataKey="n" hide />
                      <YAxis width={36} tick={{ fill: "var(--muted-foreground)", fontSize: 10 }} axisLine={false} tickLine={false} unit="s" domain={["auto", "auto"]} />
                      <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", fontSize: 12 }} />
                      <Line type="monotone" dataKey="sec" stroke="var(--primary)" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No processing cycles at this station.</p>
              )}
            </div>
            <div className="mt-5 px-4 pb-6">
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Current queue ({st.queue.length})</h3>
              {st.queue.length ? (
                <ol className="divide-y divide-border rounded-md border border-border font-mono text-xs">
                  {st.queue.map((p, i) => (
                    <li key={p} className="flex justify-between px-3 py-1.5">
                      <span>{p}</span>
                      <span className="text-muted-foreground">#{i + 1}</span>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="text-sm text-muted-foreground">Queue is empty.</p>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
