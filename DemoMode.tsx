import { useEffect, useRef } from "react";
import { create } from "zustand";
import { useNavigate } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, Presentation, X } from "lucide-react";
import { useTwin } from "@/twin/store";
import { HERO_PRODUCT } from "@/twin/generator";
import type { Controls, ScenarioKind } from "@/twin/sim";
import { Button } from "@/components/ui/button";
import { useScan } from "./ScanDialog";

export interface SimCommand {
  nonce: number;
  kind?: ScenarioKind;
  patch?: Partial<Controls>;
  run: "single" | "compare";
}

interface DemoState {
  active: boolean;
  step: number;
  simCommand: SimCommand | null;
  start: () => void;
  stop: () => void;
  go: (n: number) => void;
  sendSim: (c: Omit<SimCommand, "nonce">) => void;
}

export const useDemo = create<DemoState>((set) => ({
  active: false,
  step: 0,
  simCommand: null,
  start: () => set({ active: true, step: 0 }),
  stop: () => set({ active: false }),
  go: (n) => set({ step: Math.max(0, Math.min(STEPS.length - 1, n)) }),
  sendSim: (c) => set((s) => ({ simCommand: { ...c, nonce: (s.simCommand?.nonce ?? 0) + 1 } })),
}));

type Ctx = {
  navigate: ReturnType<typeof useNavigate>;
  scan: ReturnType<typeof useScan>;
  setPlaying: (p: boolean) => void;
  sendSim: DemoState["sendSim"];
};

interface Step {
  title: string;
  body: string;
  target: string;
  enter: (c: Ctx) => void;
}

const STEPS: Step[] = [
  {
    title: "Factory Twin: the POC boundary",
    body: "One flow only: Raw Material Store → CNC-01 / CNC-02 / CNC-03 in parallel → ASSEMBLY-01 → QUALITY-01 → Finished Goods. Tags are just the identity bridge; the twin is the live relationship between products, stations, batches and events.",
    target: "#factory-map",
    enter: ({ navigate, setPlaying }) => {
      setPlaying(false);
      navigate({ to: "/" });
    },
  },
  {
    title: "Stations, queues and flow — live",
    body: "Live simulation is now running: every new event passes through applyEvent(), and station status, queues, moving parts and KPIs update from the twin. Watch the queue build at CNC-03.",
    target: "#factory-map",
    enter: ({ navigate, setPlaying }) => {
      navigate({ to: "/" });
      setPlaying(true);
    },
  },
  {
    title: `Scan product ${HERO_PRODUCT}`,
    body: "Scanning tag TAG-184 fires a TAG_SCAN event and retrieves the product's digital twin. The retrieval time is measured with a real timer.",
    target: "#product-header",
    enter: ({ scan }) => {
      scan("TAG-184", "demo scan");
    },
  },
  {
    title: "Product Twin and lifecycle",
    body: "Identity, batch RM-1092, order PO-47281, current position on the flow, and the full timeline of operations with station, asset and cycle time.",
    target: "#lifecycle",
    enter: ({ navigate }) => navigate({ to: "/product", search: { id: HERO_PRODUCT } }),
  },
  {
    title: "Trace Explorer: the digital thread",
    body: "Batch → CNC machine → Assembly → Quality inspection, with timestamps and durations on each link, plus expected vs captured events.",
    target: "#digital-thread",
    enter: ({ navigate }) => navigate({ to: "/trace", search: { id: HERO_PRODUCT } }),
  },
  {
    title: "Failed inspection and trace-back",
    body: "The product failed with dimensional deviation. Trace-back automatically lists the batch, the machine, sibling products and how many of them failed — the finding is counted from the data.",
    target: "#trace-back",
    enter: ({ navigate }) => navigate({ to: "/trace", search: { id: HERO_PRODUCT } }),
  },
  {
    title: "Analytics: bottleneck evidence",
    body: "The bottleneck score is a fixed weighted formula. The stacked bar shows exactly which factors put CNC-03 first.",
    target: "#bottleneck",
    enter: ({ navigate }) => navigate({ to: "/analytics" }),
  },
  {
    title: "Simulation: CNC-03 down for 60 minutes",
    body: "A bounded discrete-event model runs one shift with several seeded replications. Here CNC-03 is taken down for 60 minutes and compared with baseline.",
    target: "#sim-results",
    enter: ({ navigate, sendSim }) => {
      navigate({ to: "/simulation" });
      sendSim({ kind: "downtime", patch: { downCnc: "CNC-03", downMin: 60 }, run: "single" });
    },
  },
  {
    title: "Simulation: redistribute 30% to CNC-02",
    body: "Now 30% of CNC-03's load is shifted to CNC-02 to see how the line responds.",
    target: "#sim-results",
    enter: ({ navigate, sendSim }) => {
      navigate({ to: "/simulation" });
      sendSim({ kind: "redistribute", patch: { redistFrom: "CNC-03", redistTo: "CNC-02", redistPct: 30 }, run: "single" });
    },
  },
  {
    title: "Compare and decide",
    body: "Baseline vs Downtime vs Mitigation side by side. Read the \"Decision supported\" sentence — every number in it comes from the model run.",
    target: "#decision-supported",
    enter: ({ navigate, sendSim }) => {
      navigate({ to: "/simulation" });
      sendSim({ patch: { downCnc: "CNC-03", downMin: 60, redistTo: "CNC-02", redistPct: 30 }, run: "compare" });
    },
  },
  {
    title: "Architecture and scale-up",
    body: "How the twin is fed, what this POC covers, the success metrics measured live, and the path from POC to an enterprise twin.",
    target: "#architecture",
    enter: ({ navigate, setPlaying }) => {
      setPlaying(false);
      navigate({ to: "/architecture" });
    },
  },
];

export function DemoButton() {
  const start = useDemo((s) => s.start);
  const active = useDemo((s) => s.active);
  return (
    <Button size="sm" variant={active ? "default" : "secondary"} onClick={start} aria-label="Start guided demo">
      <Presentation className="h-4 w-4" /> Demo Mode
    </Button>
  );
}

export function DemoGuide() {
  const { active, step, stop, go, sendSim } = useDemo();
  const navigate = useNavigate();
  const scan = useScan();
  const setPlaying = useTwin((s) => s.setPlaying);
  const cardRef = useRef<HTMLDivElement>(null);
  const s = STEPS[step]!;

  // Enter step: navigate, trigger actions, then spotlight the target
  useEffect(() => {
    if (!active) return;
    s.enter({ navigate, scan, setPlaying, sendSim });
    let el: Element | null = null;
    const t = setTimeout(() => {
      el = document.querySelector(s.target);
      if (el) {
        el.classList.add("demo-highlight");
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 450);
    cardRef.current?.focus();
    return () => {
      clearTimeout(t);
      document.querySelectorAll(".demo-highlight").forEach((x) => x.classList.remove("demo-highlight"));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, step]);

  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.closest("input, textarea, select, [role=dialog]:not([data-demo])")) return;
      if (e.key === "ArrowRight") go(step + 1);
      else if (e.key === "ArrowLeft") go(step - 1);
      else if (e.key === "Escape") stop();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, step, go, stop]);

  if (!active) return null;
  const last = step === STEPS.length - 1;
  return (
    <div
      ref={cardRef}
      tabIndex={-1}
      role="dialog"
      data-demo=""
      aria-modal="false"
      aria-label={`Demo step ${step + 1} of ${STEPS.length}: ${s.title}`}
      className="fixed bottom-6 right-6 z-50 w-[420px] rounded-xl border-2 border-primary bg-card p-5 shadow-2xl outline-none print:hidden"
    >
      <div className="flex items-center justify-between">
        <span className="font-mono text-xs font-semibold text-primary">DEMO · STEP {step + 1} / {STEPS.length}</span>
        <button onClick={stop} className="rounded p-1 text-muted-foreground hover:text-foreground" aria-label="Exit demo">
          <X className="h-4 w-4" />
        </button>
      </div>
      <h3 className="mt-2 text-lg font-semibold">{s.title}</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
      <div className="mt-4 flex gap-1">
        {STEPS.map((_, i) => (
          <button
            key={i}
            onClick={() => go(i)}
            aria-label={`Go to step ${i + 1}`}
            className={`h-1.5 flex-1 rounded-full ${i === step ? "bg-primary" : i < step ? "bg-primary/40" : "bg-muted"}`}
          />
        ))}
      </div>
      <div className="mt-4 flex items-center justify-between">
        <span className="text-[11px] text-muted-foreground">← → to move · Esc to exit</span>
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" onClick={() => go(step - 1)} disabled={step === 0}>
            <ChevronLeft className="h-4 w-4" /> Back
          </Button>
          {last ? (
            <Button size="sm" onClick={stop}>Finish</Button>
          ) : (
            <Button size="sm" onClick={() => go(step + 1)}>
              Next <ChevronRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
