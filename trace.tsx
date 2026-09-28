import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { TraceExplorer } from "@/components/twin/TraceExplorer";

const search = z.object({ id: z.string().optional(), batch: z.string().optional() });

export const Route = createFileRoute("/trace")({
  validateSearch: (s) => search.parse(s),
  head: () => ({
    meta: [
      { title: "Trace Explorer — TwinTrace" },
      { name: "description", content: "Follow a product's digital thread from material batch to inspection, check trace completeness and trace failures back to batch and machine." },
      { property: "og:title", content: "Trace Explorer — TwinTrace" },
      { property: "og:description", content: "Digital thread, trace completeness and trace-back for every product." },
    ],
  }),
  component: TracePage,
});

function TracePage() {
  const { id, batch } = Route.useSearch();
  return <TraceExplorer productId={id ?? "TT-2026-000184"} batchId={batch ?? null} />;
}
