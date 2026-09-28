import { Link, useNavigate, useRouter } from "@tanstack/react-router";
import { DemoButton, DemoGuide } from "./DemoMode";
import { useEffect, useState, type ReactNode } from "react";
import {
  Factory,
  Package,
  GitBranch,
  BarChart3,
  Siren,
  FlaskConical,
  History,
  Layers,
  Cog,
  Link2,
  Play,
  Pause,
} from "lucide-react";
import { ScanButton } from "./ScanDialog";
import { useTwin } from "@/twin/store";

const NAV = [
  { to: "/", label: "Factory Twin", icon: Factory },
  { to: "/product", label: "Product Twin", icon: Package },
  { to: "/trace", label: "Trace Explorer", icon: GitBranch },
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/alerts", label: "Alerts & Insights", icon: Siren },
  { to: "/simulation", label: "Simulation", icon: FlaskConical },
  { to: "/history", label: "History", icon: History },
  { to: "/architecture", label: "Architecture & POC Scope", icon: Layers },
] as const;

export function Logo() {
  return (
    <div className="flex items-center gap-2">
      <div className="relative flex h-8 w-8 items-center justify-center rounded-md bg-primary/15 text-primary">
        <Cog className="h-5 w-5" />
        <Link2 className="absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-sm bg-background p-px" />
      </div>
      <span className="text-lg font-semibold tracking-tight">
        Twin<span className="text-primary">Trace</span>
      </span>
    </div>
  );
}

function Clock() {
  const [t, setT] = useState<Date | null>(null);
  useEffect(() => {
    setT(new Date());
    const id = setInterval(() => setT(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="font-mono text-sm tabular-nums text-muted-foreground">
      {t ? t.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "medium" }) : "--"}
    </div>
  );
}

export function SyntheticBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded border border-warning/40 bg-warning/10 px-2 py-0.5 text-xs font-medium uppercase tracking-wider text-warning">
      <span className="h-1.5 w-1.5 rounded-full bg-warning" />
      Synthetic Data
    </span>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <a href="#main" className="sr-only z-50 rounded bg-primary px-3 py-2 text-primary-foreground focus:not-sr-only focus:fixed focus:left-2 focus:top-2">Skip to content</a>
      <KeyboardAndOffline />
      <DemoGuide />
      <aside className="print:hidden sticky top-0 flex h-screen w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar">
        <div className="flex h-14 items-center border-b border-sidebar-border px-4">
          <Logo />
        </div>
        <nav className="flex-1 space-y-0.5 p-2">
          {NAV.map(({ to, label, icon: Icon }, i) => (
            <Link
              key={to}
              to={to}
              activeOptions={{ exact: true }}
              title={`${label} (Alt+${i + 1})`}
              aria-keyshortcuts={`Alt+${i + 1}`}
              className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-sidebar-foreground transition-colors hover:bg-sidebar-accent"
              activeProps={{ className: "bg-sidebar-accent text-primary font-medium" }}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-sidebar-border p-3 text-[11px] leading-snug text-muted-foreground">
          L&amp;T Techgium 2026 · PS #29
          <br />
          Proof of concept
          <br />
          <span className="text-muted-foreground/80">Alt+1…8 switch screens</span>
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="print:hidden sticky top-0 z-10 flex h-14 items-center justify-between border-b border-border bg-background/90 px-6 backdrop-blur">
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">Product-centric factory digital twin</span>
            <SyntheticBadge />
          </div>
          <div className="flex items-center gap-4">
            <DemoButton />
            <LiveToggle />
            <ScanButton />
            <Clock />
          </div>
        </header>
        <main id="main" tabIndex={-1} className="flex-1 p-6 outline-none print:p-0">{children}</main>
        <footer className="print:mt-4 border-t border-border px-6 py-2 text-xs text-muted-foreground">
          Synthetic data for POC demonstration
        </footer>
      </div>
    </div>
  );
}

/** Alt+1…8 jump between screens; after first load every screen and the QR module are preloaded so the app keeps working offline. */
function KeyboardAndOffline() {
  const navigate = useNavigate();
  const router = useRouter();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!e.altKey || e.ctrlKey || e.metaKey) return;
      const n = Number(e.key);
      const item = NAV[n - 1];
      if (item) {
        e.preventDefault();
        navigate({ to: item.to });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [navigate]);
  useEffect(() => {
    const t = setTimeout(() => {
      for (const n of NAV) router.preloadRoute({ to: n.to }).catch(() => {});
      import("html5-qrcode").catch(() => {});
    }, 1500);
    return () => clearTimeout(t);
  }, [router]);
  return null;
}

/** Live simulation: emits the next synthetic event every 1–2 s through applyEvent(), on every screen. */
function LiveToggle() {
  const playing = useTwin((s) => s.playing);
  const setPlaying = useTwin((s) => s.setPlaying);
  const step = useTwin((s) => s.step);
  const left = useTwin((s) => s.pending.length);
  useEffect(() => {
    if (!playing) return;
    let t: ReturnType<typeof setTimeout>;
    const loop = () => {
      t = setTimeout(() => {
        step();
        loop();
      }, 1000 + Math.random() * 1000);
    };
    loop();
    return () => clearTimeout(t);
  }, [playing, step]);
  return (
    <button
      onClick={() => setPlaying(!playing)}
      disabled={!left && !playing}
      className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium disabled:opacity-40 ${playing ? "border-success/50 bg-success/10 text-success" : "border-border text-muted-foreground hover:text-foreground"}`}
    >
      {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
      {playing ? "Live" : "Paused"}
    </button>
  );
}

export function PageHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-5">
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
    </div>
  );
}

export function Placeholder({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div>
      <PageHeader title={title} subtitle={subtitle} />
      <div className="flex h-72 items-center justify-center rounded-lg border border-dashed border-border bg-card/40 text-sm text-muted-foreground">
        This screen will be built in a following step.
      </div>
    </div>
  );
}

