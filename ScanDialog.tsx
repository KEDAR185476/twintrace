import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Camera, Keyboard, Nfc, ScanLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { nextManualId, resolveProductId, scanClock, useTwin } from "@/twin/store";

/** Fires TAG_SCAN through applyEvent() and opens the product twin. Returns false if unknown. */
export function useScan() {
  const navigate = useNavigate();
  return (raw: string, via: string) => {
    scanClock.start = performance.now();
    const id = resolveProductId(raw);
    if (!id) {
      scanClock.start = null;
      return false;
    }
    const s = useTwin.getState();
    const p = s.products[id]!;
    s.dispatch({
      event_id: nextManualId(),
      event_type: "TAG_SCAN",
      timestamp: s.now,
      product_id: id,
      station_id: p.current_station,
      batch_id: p.batch_id,
      operation: `Identity scan (${via})`,
    });
    navigate({ to: "/product", search: { id } });
    return true;
  };
}

function QrScanner({ onResult }: { onResult: (text: string) => void }) {
  const [error, setError] = useState<string | null>(null);
  const done = useRef(false);
  const cb = useRef(onResult);
  cb.current = onResult;
  useEffect(() => {
    let scanner: { stop: () => Promise<void>; clear: () => void; isScanning: boolean } | null = null;
    let cancelled = false;
    import("html5-qrcode").then(({ Html5Qrcode }) => {
      if (cancelled) return;
      const s = new Html5Qrcode("tt-qr-reader");
      scanner = s;
      s.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 220, height: 220 } },
        (text) => {
          if (done.current) return;
          done.current = true;
          cb.current(text);
        },
        () => {},
      ).catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)));
    });
    return () => {
      cancelled = true;
      if (scanner?.isScanning) scanner.stop().then(() => scanner?.clear()).catch(() => {});
    };
  }, []);
  return (
    <div>
      <div id="tt-qr-reader" className="mx-auto aspect-square w-full max-w-[320px] overflow-hidden rounded-md border border-border bg-muted" />
      {error ? (
        <p className="mt-2 text-xs text-destructive">Camera unavailable: {error}. Allow camera access or use the text input.</p>
      ) : (
        <p className="mt-2 text-center text-xs text-muted-foreground">Point the camera at a TwinTrace product QR code.</p>
      )}
    </div>
  );
}

export function ScanButton() {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState("manual");
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const scan = useScan();

  const run = (raw: string, via: string) => {
    if (scan(raw, via)) {
      setOpen(false);
      setValue("");
      setError(null);
    } else setError(`No product found for "${raw}".`);
  };

  const simulateNfc = () => {
    const ids = Object.values(useTwin.getState().products);
    const p = ids[Math.floor(Math.random() * ids.length)]!;
    run(p.tag_id, "NFC simulated");
  };

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        <ScanLine className="h-4 w-4" /> Scan product
      </Button>
      <Dialog
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (!o) setTab("manual");
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Scan Product</DialogTitle>
            <DialogDescription>The tag is only the identity bridge — the scan retrieves the product's digital twin.</DialogDescription>
          </DialogHeader>
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="manual"><Keyboard className="mr-1 h-4 w-4" />ID</TabsTrigger>
              <TabsTrigger value="qr"><Camera className="mr-1 h-4 w-4" />QR</TabsTrigger>
              <TabsTrigger value="nfc"><Nfc className="mr-1 h-4 w-4" />NFC</TabsTrigger>
            </TabsList>
            <TabsContent value="manual" className="space-y-3 pt-2">
              <form
                className="flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (value.trim()) run(value, "manual entry");
                }}
              >
                <Input autoFocus value={value} onChange={(e) => setValue(e.target.value)} placeholder="TAG-184 or TT-2026-000184" className="font-mono" />
                <Button type="submit">Retrieve</Button>
              </form>
              <button type="button" className="text-xs text-primary underline-offset-2 hover:underline" onClick={() => run("TAG-184", "manual entry")}>
                Try the demo product TAG-184
              </button>
            </TabsContent>
            <TabsContent value="qr" className="pt-2">
              {tab === "qr" && open && <QrScanner onResult={(t) => run(t, "QR camera")} />}
            </TabsContent>
            <TabsContent value="nfc" className="space-y-3 pt-2">
              <div className="rounded-md border border-warning/40 bg-warning/10 p-3 text-xs text-warning">
                Web NFC works only on supported Android Chrome devices, so NFC is simulated for this demo.
              </div>
              <Button className="w-full" variant="secondary" onClick={simulateNfc}>
                <Nfc className="h-4 w-4" /> Simulate NFC tap
              </Button>
            </TabsContent>
          </Tabs>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </DialogContent>
      </Dialog>
    </>
  );
}
