import { useEffect, useRef, useState } from "react";
import type { Asset, ProcessEvent, Route, Station, StationId } from "@/twin/types";

const W = 150;
const H = 118;
export const POS: Record<StationId, { x: number; y: number }> = {
  "RM-STORE": { x: 10, y: 196 },
  "CNC-01": { x: 240, y: 16 },
  "CNC-02": { x: 240, y: 196 },
  "CNC-03": { x: 240, y: 376 },
  "ASSEMBLY-01": { x: 480, y: 196 },
  "QUALITY-01": { x: 700, y: 196 },
  "FG-STORE": { x: 900, y: 196 },
};

export function routePath(from: StationId, to: StationId) {
  const a = POS[from];
  const b = POS[to];
  const x1 = a.x + W;
  const y1 = a.y + H / 2;
  const x2 = b.x - 6;
  const y2 = b.y + H / 2;
  const mx = (x1 + x2) / 2;
  return `M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}`;
}

const statusFill = {
  RUNNING: "var(--success)",
  IDLE: "var(--muted-foreground)",
  DOWN: "var(--destructive)",
} as const;

interface Dot {
  id: string;
  path: string;
  dur: number;
}

/** A dot that travels one route once. Duration is scaled from the route's travel time. */
function FlowDot({ dot, onDone }: { dot: Dot; onDone: (id: string) => void }) {
  const ref = useRef<SVGAnimateMotionElement>(null);
  useEffect(() => {
    ref.current?.beginElement();
    const t = setTimeout(() => onDone(dot.id), dot.dur * 1000 + 50);
    return () => clearTimeout(t);
  }, [dot, onDone]);
  return (
    <circle r="5" fill="var(--primary)" stroke="var(--background)" strokeWidth="1.5">
      <animateMotion ref={ref} begin="indefinite" dur={`${dot.dur}s`} path={dot.path} fill="freeze" />
    </circle>
  );
}

function AmbientDot({ path, dur, delay }: { path: string; dur: number; delay: number }) {
  return (
    <circle r="2.5" fill="var(--primary)" opacity="0.45">
      <animateMotion dur={`${dur}s`} begin={`${delay}s`} repeatCount="indefinite" path={path} />
    </circle>
  );
}

export function FactoryMap({
  stations,
  assets,
  routes,
  events,
  live,
  onSelect,
}: {
  stations: Record<StationId, Station>;
  assets: Record<string, Asset>;
  routes: Route[];
  events: ProcessEvent[];
  live: boolean;
  onSelect: (id: StationId) => void;
}) {
  const [dots, setDots] = useState<Dot[]>([]);
  const seen = useRef<string | null>(null);

  // Spawn a travelling dot for every new MATERIAL_MOVE applied to the twin
  useEffect(() => {
    const last = events[events.length - 1];
    if (!last || seen.current === null) {
      seen.current = last?.event_id ?? "";
      return;
    }
    const idx = events.findIndex((e) => e.event_id === seen.current);
    const fresh = events.slice(idx + 1).slice(-10);
    seen.current = last.event_id;
    const add: Dot[] = [];
    for (const e of fresh) {
      if (e.event_type !== "MATERIAL_MOVE" || !e.to_station) continue;
      const r = routes.find((x) => x.from_station === e.station_id && x.to_station === e.to_station);
      if (!r) continue;
      add.push({ id: e.event_id, path: routePath(r.from_station, r.to_station), dur: Math.max(0.8, r.travel_time_sec / 50) });
    }
    if (add.length) setDots((d) => [...d, ...add]);
  }, [events, routes]);

  const remove = (id: string) => setDots((d) => d.filter((x) => x.id !== id));
  const assetBy = (id: StationId) => Object.values(assets).find((a) => a.station_id === id)!;

  return (
    <svg id="factory-map" role="img" aria-label="Factory flow map" viewBox="0 0 1060 510" className="h-auto w-full select-none">
      <defs>
        <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0,0 L10,5 L0,10 z" fill="var(--primary)" opacity="0.7" />
        </marker>
        <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M20 0 L0 0 0 20" fill="none" stroke="var(--border)" strokeWidth="0.5" opacity="0.5" />
        </pattern>
      </defs>
      <rect width="1060" height="510" fill="url(#grid)" />

      {routes.map((r) => {
        const d = routePath(r.from_station, r.to_station);
        const down = stations[r.from_station].status === "DOWN" || stations[r.to_station].status === "DOWN";
        return (
          <g key={r.route_id}>
            <path d={d} fill="none" stroke={down ? "var(--destructive)" : "var(--primary)"} strokeOpacity={down ? 0.5 : 0.35} strokeWidth="2" strokeDasharray={down ? "5 5" : undefined} markerEnd="url(#arrow)" />
            {live && !down && [0, 0.5].map((f) => <AmbientDot key={f} path={d} dur={r.travel_time_sec / 15} delay={(-f * r.travel_time_sec) / 15} />)}
          </g>
        );
      })}

      {dots.map((d) => (
        <FlowDot key={d.id} dot={d} onDone={remove} />
      ))}

      {(Object.keys(POS) as StationId[]).map((id) => {
        const st = stations[id];
        const a = assetBy(id);
        const p = POS[id];
        const store = st.type === "STORE";
        const stroke = st.status === "DOWN" ? "var(--destructive)" : "var(--border)";
        return (
          <g key={id} transform={`translate(${p.x},${p.y})`} className="cursor-pointer" onClick={() => onSelect(id)} role="button" aria-label={`Open ${id} details`}>
            <rect width={W} height={H} rx="8" fill="var(--card)" stroke={stroke} strokeWidth={st.status === "DOWN" ? 2 : 1} className="transition-colors hover:stroke-[var(--primary)]" />
            <rect width="5" height={H} rx="2" fill={store ? "var(--primary)" : statusFill[st.status]} />
            {st.status === "DOWN" && <rect width={W} height={H} rx="8" fill="var(--destructive)" opacity="0.08" className="animate-pulse" />}
            <text x="14" y="22" fill="var(--foreground)" fontFamily="var(--font-mono)" fontSize="13" fontWeight="600">
              {id}
            </text>
            {!store && (
              <>
                <circle cx={W - 14} cy="17" r="5" fill={statusFill[st.status]} />
                <text x={W - 24} y="21" textAnchor="end" fill={statusFill[st.status]} fontFamily="var(--font-mono)" fontSize="9">
                  {st.status}
                </text>
                <text x="14" y="44" fill="var(--muted-foreground)" fontSize="10">Utilization</text>
                <text x={W - 10} y="44" textAnchor="end" fill="var(--foreground)" fontFamily="var(--font-mono)" fontSize="11">
                  {(a.utilization * 100).toFixed(0)}%
                </text>
                <rect x="14" y="49" width={W - 24} height="4" rx="2" fill="var(--muted)" />
                <rect x="14" y="49" width={(W - 24) * a.utilization} height="4" rx="2" fill={a.utilization >= 0.88 ? "var(--destructive)" : a.utilization >= 0.75 ? "var(--warning)" : "var(--success)"} />
                <text x="14" y="72" fill="var(--muted-foreground)" fontSize="10">Queue</text>
                <text x={W - 10} y="72" textAnchor="end" fill={st.queue.length >= 5 ? "var(--warning)" : "var(--foreground)"} fontFamily="var(--font-mono)" fontSize="12" fontWeight="600">
                  {st.queue.length}
                </text>
                <text x="14" y="94" fill="var(--muted-foreground)" fontSize="10">Processing</text>
                <text x="14" y="108" fill={st.current_product ? "var(--primary)" : "var(--muted-foreground)"} fontFamily="var(--font-mono)" fontSize="10.5">
                  {st.current_product ?? "—"}
                </text>
              </>
            )}
            {store && (
              <>
                <text x="14" y="50" fill="var(--muted-foreground)" fontSize="10">
                  {id === "FG-STORE" ? "Finished units" : "Material issue point"}
                </text>
                {id === "FG-STORE" && (
                  <text x="14" y="86" fill="var(--foreground)" fontFamily="var(--font-mono)" fontSize="28" fontWeight="600">
                    {st.queue.length}
                  </text>
                )}
                {id === "RM-STORE" && (
                  <text x="14" y="86" fill="var(--foreground)" fontFamily="var(--font-mono)" fontSize="11">
                    15 batches
                  </text>
                )}
              </>
            )}
          </g>
        );
      })}
    </svg>
  );
}
