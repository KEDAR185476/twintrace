import { createFileRoute } from "@tanstack/react-router";
import { History } from "@/components/twin/History";

export const Route = createFileRoute("/history")({
  head: () => ({
    meta: [
      { title: "History — TwinTrace" },
      { name: "description", content: "Replay the event stream that keeps the twin current." },
      { property: "og:title", content: "History — TwinTrace" },
      { property: "og:description", content: "Replay the event stream that keeps the twin current." },
    ],
  }),
  component: HistoryPage,
});

function HistoryPage() {
  return <History />;
}
