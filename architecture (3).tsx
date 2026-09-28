import { createFileRoute } from "@tanstack/react-router";
import { Architecture } from "@/components/twin/Architecture";

export const Route = createFileRoute("/architecture")({
  head: () => ({
    meta: [
      { title: "Architecture & POC Scope — TwinTrace" },
      { name: "description", content: "Pipeline, data model and the boundary of this proof of concept." },
      { property: "og:title", content: "Architecture & POC Scope — TwinTrace" },
      { property: "og:description", content: "Pipeline, data model and the boundary of this proof of concept." },
    ],
  }),
  component: ArchitecturePage,
});

function ArchitecturePage() {
  return <Architecture />;
}
