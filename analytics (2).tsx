import { createFileRoute } from "@tanstack/react-router";
import { Analytics } from "@/components/twin/Analytics";

export const Route = createFileRoute("/analytics")({
  head: () => ({
    meta: [
      { title: "Analytics — TwinTrace" },
      { name: "description", content: "Rule-based throughput, bottleneck and quality analytics." },
      { property: "og:title", content: "Analytics — TwinTrace" },
      { property: "og:description", content: "Rule-based throughput, bottleneck and quality analytics." },
    ],
  }),
  component: AnalyticsPage,
});

function AnalyticsPage() {
  return <Analytics />;
}
