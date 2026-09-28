import { createFileRoute } from "@tanstack/react-router";
import { FactoryTwin } from "@/components/twin/FactoryTwin";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Factory Twin — TwinTrace" },
      { name: "description", content: "Live factory digital twin: station status, queues, utilization and the event stream that keeps it current." },
      { property: "og:title", content: "Factory Twin — TwinTrace" },
      { property: "og:description", content: "Live factory digital twin: station status, queues, utilization and the event stream." },
    ],
  }),
  component: FactoryTwin,
});
