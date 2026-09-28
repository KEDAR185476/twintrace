import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { QRCodeSVG } from "qrcode.react";
import { AlertOctagon, MapPin, Printer, QrCode, Search, Timer } from "lucide-react";
import { scanClock, useTwin } from "@/twin/store";
import { FLOW } from "@/twin/generator";
import type { Product, StationId } from "@/twin/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { PageHeader } from "./AppShell";

const fmt = (t: number) =>
  new Date(t).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit", timeZone: "UTC" });

const qualityTone = {
  PASS: "border-success/50 bg-success/15 text-success",
  FAIL: "border-destructive/50 bg-destructive/15 text-destructive",
  PENDING: "border-border bg-muted text-muted-foreground",
} as const;

function QualityBadge({ q }: { q: Product["quality_state"] }) {
  return <span className={`rounded border px-2 py-0.5 font-mono text-xs font-semibold ${qualityTone[q]}`}>{q}</span>;
}

function ProductQr({ product }: { product: Product }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-md bg-foreground p-2 transition-transform hover:scale-105"
        aria-label={`Show QR code for ${product.tag_id}`}
      >
        <QRCodeSVG value={product.tag_id} size={96} bgColor="transparent" fgColor="var(--background)" />
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-mono">{product.tag_id}</DialogTitle>
            <DialogDescription>Print this code and scan it live with the QR tab of the scan dialog.</DialogDescription>
          </DialogHeader>
          <div id="tt-print-qr" className="flex flex-col items-center gap-2 rounded-md bg-foreground p-6 text-background">
            <QRCodeSVG value={product.tag_id} size={220} bgColor="transparent" fgColor="currentColor" level="M" />
            <div className="font-mono text-sm font-semibold">{product.tag_id}</div>
            <div className="font-mono text-xs">{product.product_id}</div>
          </div>
          <Button
            onClick={() => {
              document.body.classList.add("print-qr");
              window.print();
              document.body.classList.remove("print-qr");
            }}
          >
            <Printer className="h-4 w-4" /> Print
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}

function MiniFlow({ product }: { product: Product }) {
  const route = useTwin((s) => s.events);
  const visited = useMemo(() => {
    const v = new Set<StationId>();
    for (const e of route) if (e.product_id === product.product_id) v.add(e.station_id);
    if (product.status === "COMPLETED") v.add("FG-STORE");
    return v;
  }, [route, product.product_id, product.status]);
  const cols: StationId[][] = [["RM-STORE"], ["CNC-01", "CNC-02", "CNC-03"], ["ASSEMBLY-01"], ["QUALITY-01"], ["FG-STORE"]];
  return (
    <div className="flex items-center gap-2">
      {cols.map((col, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className="flex flex-col gap-1.5">
            {col.map((id) => {
              const here = product.current_station === id;
              const been = visited.has(id);
              return (
                <div
                  key={id}
                  className={`relative rounded-md border px-2.5 py-1.5 font-mono text-[11px] ${
                    here
                      ? "border-primary bg-primary/20 text-primary shadow-[0_0_0_3px_color-mix(in_oklab,var(--primary)_25%,transparent)]"
                      : been
                        ? "border-primary/40 bg-card text-foreground"
                        : "border-border bg-card/50 text-muted-foreground"
                  }`}
                >
                  {id}
                  {here && (
                    <span className="absolute -top-5 left-1/2 flex -translate-x-1/2 items-center gap-0.5 whitespace-nowrap rounded bg-primary px-1.5 py-px text-[9px] font-semibold uppercase text-primary-foreground">
                      <MapPin className="h-2.5 w-2.5" /> You are here
                    </span>
                  )}
                </div>
              );
            })}
          </div>
          {i < cols.length - 1 && <span className="text-primary/50">→</span>}
        </div>
      ))}
    </div>
  );
}

function ProductDetail({ product }: { product: Product }) {
  const events = useTwin((s) => s.events);
  const qualityRecords = useTwin((s) => s.qualityRecords);
  const [traceMs, setTraceMs] = useState<number | null>(null);

  // Real timer: scan start → product twin rendered
  useEffect(() => {
    if (scanClock.start !== null) {
      scanClock.last = { id: product.product_id, ms: performance.now() - scanClock.start };
      scanClock.start = null;
    }
    if (scanClock.last?.id === product.product_id) setTraceMs(scanClock.last.ms);
  }, [product.product_id, events.length]);

  const timeline = events.filter((e) => e.product_id === product.product_id);
  const qr = [...qualityRecords].reverse().find((r) => r.product_id === product.product_id);
  const fail = product.quality_state === "FAIL";
  const defect = qr?.defect_type ?? timeline.find((e) => e.event_type === "QUALITY_FAIL")?.defect_type ?? "unspecified";

  return (
    <div className="space-y-4">
      {fail && (
        <div className="flex items-center gap-3 rounded-lg border-2 border-destructive bg-destructive/15 px-4 py-3 text-destructive">
          <AlertOctagon className="h-6 w-6 shrink-0" />
          <div>
            <div className="text-lg font-bold tracking-wide">HOLD — quality failed</div>
            <div className="text-sm">
              Defect: <span className="font-mono font-semibold">{defect}</span>
              {qr && (
                <>
                  {" "}· inspection {qr.inspection_id} · machined on {qr.asset_id} · batch {qr.batch_id}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[1fr_auto]">
        <section id="product-header" className="rounded-lg border border-border bg-card p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Product</div>
              <div className="font-mono text-2xl font-semibold">{product.product_id}</div>
            </div>
            <div className="flex items-center gap-2">
              {traceMs !== null && (
                <span className="inline-flex items-center gap-1.5 rounded border border-primary/40 bg-primary/10 px-2 py-1 font-mono text-xs text-primary">
                  <Timer className="h-3.5 w-3.5" /> Trace retrieved in {(traceMs / 1000).toFixed(2)} s
                </span>
              )}
              <QualityBadge q={product.quality_state} />
            </div>
          </div>
          <dl className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3">
            {[
              ["Tag ID", product.tag_id],
              ["Batch", product.batch_id],
              ["Order", product.order_id],
              ["Current station", product.current_station],
              ["Status", product.status],
              ["Events", String(timeline.length)],
            ].map(([k, v]) => (
              <div key={k} className="rounded-md border border-border bg-background/40 px-3 py-2">
                <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">{k}</dt>
                <dd className="font-mono text-sm">{v}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-6 overflow-x-auto pb-1 pt-5">
            <MiniFlow product={product} />
          </div>
        </section>
        <section className="flex flex-col items-center gap-2 rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-1 text-[11px] uppercase tracking-wider text-muted-foreground">
            <QrCode className="h-3.5 w-3.5" /> Product QR
          </div>
          <ProductQr product={product} />
          <div className="font-mono text-xs text-muted-foreground">click to enlarge / print</div>
        </section>
      </div>

      <section id="lifecycle" className="rounded-lg border border-border bg-card p-4">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Lifecycle timeline</h2>
        {timeline.length === 0 ? (
          <p className="text-sm text-muted-foreground">No events recorded yet — product not released.</p>
        ) : (
          <ol className="relative ml-2 border-l border-border">
            {timeline.map((e) => {
              const bad = e.event_type === "QUALITY_FAIL";
              const good = e.event_type === "QUALITY_PASS";
              return (
                <li key={e.event_id} className="mb-3 ml-5">
                  <span
                    className={`absolute -left-[5px] mt-1.5 h-2.5 w-2.5 rounded-full ${bad ? "bg-destructive" : good ? "bg-success" : "bg-primary"}`}
                  />
                  <div className="grid grid-cols-[80px_170px_1fr] gap-3 font-mono text-xs md:grid-cols-[80px_170px_130px_120px_1fr]">
                    <span className="text-muted-foreground">{fmt(e.timestamp)}</span>
                    <span className={bad ? "text-destructive" : good ? "text-success" : "text-foreground"}>{e.event_type}</span>
                    <span>{e.station_id}{e.to_station ? ` → ${e.to_station}` : ""}</span>
                    <span className="hidden text-muted-foreground md:inline">{e.asset_id ?? "—"}</span>
                    <span className="text-muted-foreground">
                      {e.operation ?? ""}
                      {e.cycle_time_sec ? ` · ${e.cycle_time_sec}s` : ""}
                      {e.defect_type ? ` · ${e.defect_type}` : ""}
                    </span>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </section>
    </div>
  );
}

const selectCls = "h-9 rounded-md border border-input bg-background px-2 text-sm";

function ProductTable({ selected }: { selected: string | null }) {
  const products = useTwin((s) => s.products);
  const batches = useTwin((s) => s.batches);
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [station, setStation] = useState("");
  const [batch, setBatch] = useState("");
  const [quality, setQuality] = useState("");

  const rows = Object.values(products).filter(
    (p) =>
      (!q || p.product_id.includes(q.toUpperCase()) || p.tag_id.includes(q.toUpperCase()) || p.order_id.includes(q.toUpperCase())) &&
      (!status || p.status === status) &&
      (!station || p.current_station === station) &&
      (!batch || p.batch_id === batch) &&
      (!quality || p.quality_state === quality),
  );

  return (
    <section className="rounded-lg border border-border bg-card p-4">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <h2 className="mr-auto text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          All products <span className="font-mono normal-case">({rows.length})</span>
        </h2>
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Product, tag or order" className="h-9 w-52 pl-8 font-mono" />
        </div>
        <select className={selectCls} value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter by status">
          <option value="">All statuses</option>
          {["QUEUED", "IN_PROCESS", "IN_TRANSIT", "COMPLETED", "REJECTED"].map((v) => <option key={v}>{v}</option>)}
        </select>
        <select className={selectCls} value={station} onChange={(e) => setStation(e.target.value)} aria-label="Filter by station">
          <option value="">All stations</option>
          {FLOW.map((v) => <option key={v}>{v}</option>)}
        </select>
        <select className={selectCls} value={batch} onChange={(e) => setBatch(e.target.value)} aria-label="Filter by batch">
          <option value="">All batches</option>
          {batches.map((b) => <option key={b.batch_id}>{b.batch_id}</option>)}
        </select>
        <select className={selectCls} value={quality} onChange={(e) => setQuality(e.target.value)} aria-label="Filter by quality">
          <option value="">All quality</option>
          {["PENDING", "PASS", "FAIL"].map((v) => <option key={v}>{v}</option>)}
        </select>
      </div>
      <div className="max-h-[420px] overflow-y-auto rounded-md border border-border">
        <table className="w-full text-left font-mono text-xs">
          <thead className="sticky top-0 bg-secondary text-[10px] uppercase tracking-wider text-muted-foreground">
            <tr>
              {["Product", "Tag", "Batch", "Order", "Station", "Status", "Quality"].map((h) => (
                <th key={h} className="px-3 py-2 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr
                key={p.product_id}
                tabIndex={0}
                aria-label={`Open product twin ${p.product_id}`}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    navigate({ to: "/product", search: { id: p.product_id } });
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }
                }}
                onClick={() => {
                  navigate({ to: "/product", search: { id: p.product_id } });
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className={`cursor-pointer border-t border-border/60 hover:bg-accent focus-visible:bg-accent focus-visible:outline-none ${selected === p.product_id ? "bg-primary/10" : ""}`}
              >
                <td className="px-3 py-1.5 text-primary">{p.product_id}</td>
                <td className="px-3 py-1.5">{p.tag_id}</td>
                <td className="px-3 py-1.5">{p.batch_id}</td>
                <td className="px-3 py-1.5">{p.order_id}</td>
                <td className="px-3 py-1.5">{p.current_station}</td>
                <td className="px-3 py-1.5">{p.status}</td>
                <td className="px-3 py-1.5"><QualityBadge q={p.quality_state} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function ProductTwin({ productId }: { productId: string | null }) {
  const product = useTwin((s) => (productId ? s.products[productId] : undefined));
  return (
    <div className="space-y-5">
      <PageHeader title="Product Twin" subtitle="Scan a tag (header button) or pick a product below to retrieve its digital twin." />
      {product ? (
        <ProductDetail key={product.product_id} product={product} />
      ) : (
        <div className="rounded-lg border border-dashed border-border bg-card/40 p-8 text-center text-sm text-muted-foreground">
          {productId ? `No product found for ${productId}. Check the ID or pick a row below.` : "No product selected yet. Use Scan product in the header, or choose a row below."}
        </div>
      )}
      <ProductTable selected={productId} />
    </div>
  );
}
