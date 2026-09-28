import { useMemo, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { AlertTriangle, CheckCircle2, Download, Printer, Factory, Package, Search, ShieldCheck, Wrench, XCircle } from "lucide-react";
import { resolveProductId, useTwin } from "@/twin/store";
import { buildThread, cncOf, expectedVsCaptured, productEvents, toCsv, traceBack, type ThreadNode } from "@/twin/trace";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "./AppShell";

const fmt = (t: number | null) =>
  t === null ? "—" : new Date(t).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit", timeZone: "UTC" });
const dur = (a: number | null, b: number | null) => {
  if (a === null || b === null) return "—";
  const s = Math.max(0, Math.round((b - a) / 1000));
  return s >= 60 ? `${Math.floor(s / 60)}m ${s % 60}s` : `${s}s`;
};
const card = "rounded-lg border border-border bg-card p-4";
const h2 = "mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground";
const icons = { BATCH: Package, CNC: Wrench, ASSEMBLY: Factory, QUALITY: ShieldCheck };

function ThreadGraph({ nodes, links, selected, onSelect, failed }: {
  nodes: ThreadNode[]; links: ReturnType<typeof buildThread>["links"]; selected: string; onSelect: (k: string) => void; failed: boolean;
}) {
  return (
    <div className="flex items-stretch overflow-x-auto pb-2">
      {nodes.map((n, i) => {
        const Icon = icons[n.kind];
        const reached = n.start !== null || n.end !== null;
        const bad = failed && n.kind === "QUALITY";
        const link = links[i];
        return (
          <div key={n.key} className="flex items-center">
            <button
              onClick={() => onSelect(n.key)}
              className={`w-48 shrink-0 rounded-lg border-2 p-3 text-left transition-colors ${
                selected === n.key ? "border-primary bg-primary/10" : bad ? "border-destructive/60 bg-destructive/10" : reached ? "border-border bg-background/50 hover:border-primary/50" : "border-dashed border-border bg-background/20 opacity-60"
              }`}
            >
              <div className={`flex items-center gap-1.5 text-[10px] uppercase tracking-wider ${bad ? "text-destructive" : "text-muted-foreground"}`}>
                <Icon className="h-3.5 w-3.5" /> {n.kind}
              </div>
              <div className={`mt-1 font-mono text-sm font-semibold ${bad ? "text-destructive" : ""}`}>{n.label}</div>
              <div className="font-mono text-[11px] text-muted-foreground">{n.sub}</div>
              <div className="mt-2 font-mono text-[11px]">{fmt(n.start)} → {fmt(n.end)}</div>
              <div className="font-mono text-[11px] text-primary">dwell {dur(n.start, n.end)}</div>
            </button>
            {link && (
              <div className="flex w-32 shrink-0 flex-col items-center px-1">
                <span className="font-mono text-[11px] text-primary">{dur(link.start, link.end)}</span>
                <div className="relative my-1 h-0.5 w-full bg-primary/60">
                  <span className="absolute -right-1 -top-[5px] text-xs leading-none text-primary">▶</span>
                </div>
                <span className="font-mono text-[10px] text-muted-foreground">{fmt(link.start)}</span>
                <span className="font-mono text-[10px] text-muted-foreground">{fmt(link.end)}</span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function NodeDetail({ node }: { node: ThreadNode }) {
  const batch = useTwin((s) => s.batches.find((b) => b.batch_id === node.label));
  const asset = useTwin((s) => Object.values(s.assets).find((a) => node.sub.includes(a.asset_id)));
  return (
    <div className="mt-3 rounded-md border border-border bg-background/40 p-3 text-xs">
      <div className="mb-2 font-mono text-sm font-semibold">{node.label}</div>
      {batch && (
        <div className="mb-2 grid grid-cols-3 gap-2 font-mono">
          <div>Supplier lot: {batch.supplier_lot}</div><div>Qty: {batch.quantity}</div><div>Spec: {batch.specification}</div>
        </div>
      )}
      {asset && (
        <div className="mb-2 grid grid-cols-4 gap-2 font-mono">
          <div>Status: {asset.status}</div><div>Health: {asset.health.toFixed(0)}%</div><div>Temp: {asset.temperature.toFixed(1)}°C</div><div>Vib: {asset.vibration.toFixed(2)} mm/s</div>
        </div>
      )}
      {node.events.length === 0 ? (
        <p className="text-muted-foreground">No events captured at this node yet.</p>
      ) : (
        <table className="w-full font-mono">
          <tbody>
            {node.events.map((e) => (
              <tr key={e.event_id} className="border-t border-border/50">
                <td className="py-1 pr-3 text-muted-foreground">{fmt(e.timestamp)}</td>
                <td className="pr-3">{e.event_type}</td>
                <td className="pr-3">{e.asset_id ?? (e.to_station ? `→ ${e.to_station}` : "")}</td>
                <td className="text-muted-foreground">{e.operation ?? ""}{e.cycle_time_sec ? ` · ${e.cycle_time_sec}s` : ""}{e.defect_type ? ` · ${e.defect_type}` : ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function BatchView({ batchId, onBatch }: { batchId: string; onBatch: (b: string) => void }) {
  const products = useTwin((s) => s.products);
  const events = useTwin((s) => s.events);
  const batches = useTwin((s) => s.batches);
  const rows = useMemo(
    () => Object.values(products).filter((p) => p.batch_id === batchId).map((p) => {
      const evts = productEvents(events, p.product_id);
      return { p, stations: [...new Set(evts.map((e) => e.station_id))], cnc: cncOf(evts) };
    }),
    [products, events, batchId],
  );
  const fails = rows.filter((r) => r.p.quality_state === "FAIL").length;
  const cncCounts = rows.reduce<Record<string, number>>((m, r) => (r.cnc ? { ...m, [r.cnc]: (m[r.cnc] ?? 0) + 1 } : m), {});
  return (
    <section className={card}>
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <h2 className={`${h2} mb-0 mr-auto`}>Batch view</h2>
        <select value={batchId} onChange={(e) => onBatch(e.target.value)} className="h-9 rounded-md border border-input bg-background px-2 font-mono text-sm" aria-label="Pick a batch">
          {batches.map((b) => <option key={b.batch_id}>{b.batch_id}</option>)}
        </select>
      </div>
      <div className="mb-3 flex flex-wrap gap-2 font-mono text-xs">
        <span className="rounded border border-border px-2 py-1">{rows.length} products</span>
        <span className={`rounded border px-2 py-1 ${fails ? "border-destructive/50 text-destructive" : "border-border"}`}>{fails} failed</span>
        {Object.entries(cncCounts).sort().map(([k, v]) => <span key={k} className="rounded border border-border px-2 py-1">{k}: {v}</span>)}
      </div>
      <div className="max-h-72 overflow-y-auto rounded-md border border-border">
        <table className="w-full text-left font-mono text-xs">
          <thead className="sticky top-0 bg-secondary text-[10px] uppercase tracking-wider text-muted-foreground">
            <tr>{["Product", "Stations visited", "Status", "Quality"].map((h) => <th key={h} className="px-3 py-2 font-medium">{h}</th>)}</tr>
          </thead>
          <tbody>
            {rows.map(({ p, stations }) => (
              <tr key={p.product_id} className="border-t border-border/60 hover:bg-accent">
                <td className="px-3 py-1.5"><Link to="/trace" search={{ id: p.product_id, batch: batchId }} className="text-primary hover:underline">{p.product_id}</Link></td>
                <td className="px-3 py-1.5">{stations.join(" → ") || "—"}</td>
                <td className="px-3 py-1.5">{p.status}</td>
                <td className={`px-3 py-1.5 ${p.quality_state === "FAIL" ? "text-destructive" : p.quality_state === "PASS" ? "text-success" : "text-muted-foreground"}`}>{p.quality_state}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function TraceExplorer({ productId, batchId }: { productId: string; batchId: string | null }) {
  const navigate = useNavigate();
  const products = useTwin((s) => s.products);
  const events = useTwin((s) => s.events);
  const qrs = useTwin((s) => s.qualityRecords);
  const [input, setInput] = useState(productId);
  const [err, setErr] = useState<string | null>(null);
  const [sel, setSel] = useState("CNC");
  const product = products[productId];

  const evts = useMemo(() => productEvents(events, productId), [events, productId]);
  const thread = useMemo(() => (product ? buildThread(product, evts) : null), [product, evts]);
  const evc = useMemo(() => expectedVsCaptured(evts), [evts]);
  const tb = useMemo(() => (product ? traceBack(product, products, events, qrs) : null), [product, products, events, qrs]);
  const batch = batchId ?? product?.batch_id ?? "RM-1092";

  const go = (e: React.FormEvent) => {
    e.preventDefault();
    const id = resolveProductId(input);
    if (!id) return setErr(`No product found for "${input}".`);
    setErr(null);
    navigate({ to: "/trace", search: { id } });
  };

  const exportCsv = () => {
    const url = URL.createObjectURL(new Blob([toCsv(evts)], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `trace-report-${productId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const ok = evc.pct >= 95;

  return (
    <div className="space-y-5">
      <PageHeader title="Trace Explorer" subtitle="Follow the digital thread of a product from material batch to inspection." />
      <form onSubmit={go} className="flex flex-wrap items-center gap-2 print:hidden">
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input value={input} onChange={(e) => setInput(e.target.value)} className="h-9 w-64 pl-8 font-mono" placeholder="Product or tag ID" />
        </div>
        <Button type="submit" size="sm">Trace</Button>
        <Button type="button" size="sm" variant="secondary" onClick={exportCsv} disabled={!product}>
          <Download className="h-4 w-4" /> Export trace report
        </Button>
        <Button type="button" size="sm" variant="secondary" onClick={() => window.print()} disabled={!product}>
          <Printer className="h-4 w-4" /> Print report
        </Button>
        {err && <span className="text-sm text-destructive">{err}</span>}
      </form>

      {!product || !thread ? (
        <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">No product found for {productId}. Enter a product ID like TT-2026-000184 or a tag like TAG-184.</div>
      ) : (
        <>
          <div className="hidden border-b border-border pb-2 print:block">
            <div className="text-xl font-semibold">TwinTrace — Trace report · {product.product_id}</div>
            <div className="text-xs">Tag {product.tag_id} · Batch {product.batch_id} · Order {product.order_id} · Status {product.status} · Quality {product.quality_state} · Synthetic data for POC demonstration</div>
          </div>
          <section id="digital-thread" className={card}>
            <div className="mb-3 flex items-center justify-between">
              <h2 className={`${h2} mb-0`}>Digital thread · <span className="font-mono normal-case text-foreground">{product.product_id}</span></h2>
              <span className="text-xs text-muted-foreground">Click a node for details</span>
            </div>
            <ThreadGraph nodes={thread.nodes} links={thread.links} selected={sel} onSelect={setSel} failed={product.quality_state === "FAIL"} />
            <NodeDetail node={thread.nodes.find((n) => n.key === sel)!} />
          </section>

          <div className="grid gap-4 lg:grid-cols-2">
            <section className={card}>
              <div className="mb-3 flex items-center justify-between">
                <h2 className={`${h2} mb-0`}>Expected vs captured events</h2>
                <span className={`rounded border px-2 py-1 font-mono text-sm font-semibold ${ok ? "border-success/50 bg-success/10 text-success" : "border-destructive/50 bg-destructive/10 text-destructive"}`}>
                  Trace completeness {evc.pct.toFixed(1)}%
                </span>
              </div>
              <p className="mb-2 text-xs text-muted-foreground">
                {evc.captured} of {evc.expected.length} expected events captured (up to the furthest stage reached) · target ≥ 95%
              </p>
              <ul className="space-y-1 font-mono text-xs">
                {evc.expected.map((c) => (
                  <li key={c.label} className={`flex items-center gap-2 rounded px-2 py-1 ${c.captured ? "" : "bg-destructive/10 text-destructive"}`}>
                    {c.captured ? <CheckCircle2 className="h-3.5 w-3.5 text-success" /> : <XCircle className="h-3.5 w-3.5" />}
                    <span className="flex-1">{c.label}</span>
                    <span className="text-muted-foreground">{c.captured ? fmt(c.captured.timestamp) : "MISSING"}</span>
                  </li>
                ))}
              </ul>
            </section>

            <section id="trace-back" className={card}>
              <h2 className={h2}>Trace-back</h2>
              {!tb ? (
                <p className="text-sm text-muted-foreground">
                  Trace-back runs automatically when a product fails inspection. {product.product_id} is {product.quality_state === "PASS" ? "passed" : "not yet inspected"}.
                </p>
              ) : (
                <div className="space-y-3 text-sm">
                  <div className="flex gap-2 rounded-md border border-warning/50 bg-warning/10 p-3 text-warning">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                    <div>
                      <div className="font-semibold">{tb.finding}</div>
                      <div className="mt-1 text-xs opacity-90">
                        Evidence: {tb.shareBatch} of {tb.sameDefect} share batch {tb.qr.batch_id}; {tb.shareMachine} of {tb.sameDefect} were machined on {tb.station}.
                      </div>
                    </div>
                  </div>
                  <dl className="grid grid-cols-2 gap-2 font-mono text-xs">
                    {[
                      ["Defect", tb.defect], ["Inspection", tb.qr.inspection_id],
                      ["Material batch", tb.qr.batch_id], ["Machine / station", `${tb.qr.asset_id} / ${tb.station}`],
                      ["Batch siblings", String(tb.siblings.length)],
                      ["Siblings failed", `${tb.failedSiblings.length} of ${tb.inspectedSiblings.length} inspected`],
                    ].map(([k, v]) => (
                      <div key={k} className="rounded border border-border bg-background/40 px-2 py-1.5">
                        <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">{k}</dt><dd>{v}</dd>
                      </div>
                    ))}
                  </dl>
                  <div className="max-h-40 overflow-y-auto rounded border border-border print:max-h-none">
                    <table className="w-full font-mono text-xs">
                      <tbody>
                        {tb.siblings.map((s) => (
                          <tr key={s.product_id} className="border-t border-border/50 first:border-0">
                            <td className="px-2 py-1"><Link to="/trace" search={{ id: s.product_id }} className="text-primary hover:underline">{s.product_id}</Link></td>
                            <td className="px-2">{tb.cncBySibling.get(s.product_id) ?? "—"}</td>
                            <td className={`px-2 ${s.quality_state === "FAIL" ? "text-destructive" : s.quality_state === "PASS" ? "text-success" : "text-muted-foreground"}`}>{s.quality_state}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </section>
          </div>

          <section className={`${card} hidden print:block`}>
            <h2 className={h2}>Full event chain</h2>
            <table className="w-full text-left font-mono text-[10px]">
              <thead><tr>{["Time", "Event", "Station", "Asset", "Operation", "Cycle s", "Defect"].map((h) => <th key={h} className="py-1 pr-2">{h}</th>)}</tr></thead>
              <tbody>
                {evts.map((e) => (
                  <tr key={e.event_id} className="border-t border-border">
                    <td className="py-0.5 pr-2">{fmt(e.timestamp)}</td><td className="pr-2">{e.event_type}</td>
                    <td className="pr-2">{e.station_id}{e.to_station ? ` → ${e.to_station}` : ""}</td><td className="pr-2">{e.asset_id ?? ""}</td>
                    <td className="pr-2">{e.operation ?? ""}</td><td className="pr-2">{e.cycle_time_sec ?? ""}</td><td>{e.defect_type ?? ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </>
      )}

      <div className="print:hidden"><BatchView batchId={batch} onBatch={(b) => navigate({ to: "/trace", search: { id: productId, batch: b } })} /></div>
    </div>
  );
}
