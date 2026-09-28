import { createFileRoute } from "@tanstack/react-router";
import { Alerts } from "@/components/twin/Alerts";

export const Route = createFileRoute("/alerts")({
  head: () => ({
    meta: [
      { title: "Alerts & Insights — TwinTrace" },
      { name: "description", content: "Explainable alerts with the evidence behind each one." },
      { property: "og:title", content: "Alerts & Insights — TwinTrace" },
      { property: "og:description", content: "Explainable alerts with the evidence behind each one." },
    ],
  }),
  component: AlertsPage,
});

function AlertsPage() {
  return <Alerts />;
}
