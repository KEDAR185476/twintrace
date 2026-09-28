import { createFileRoute } from "@tanstack/react-router";
import { Simulation } from "@/components/twin/Simulation";

export const Route = createFileRoute("/simulation")({
  head: () => ({
    meta: [
      { title: "Simulation — TwinTrace" },
      { name: "description", content: "What-if scenarios on routes, capacity and cycle times." },
      { property: "og:title", content: "Simulation — TwinTrace" },
      { property: "og:description", content: "What-if scenarios on routes, capacity and cycle times." },
    ],
  }),
  component: SimulationPage,
});

function SimulationPage() {
  return <Simulation />;
}
