import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { ProductTwin } from "@/components/twin/ProductTwin";

const search = z.object({ id: z.string().optional() });

export const Route = createFileRoute("/product")({
  validateSearch: (s) => search.parse(s),
  head: () => ({
    meta: [
      { title: "Product Twin — TwinTrace" },
      { name: "description", content: "Scan a tag to retrieve a product's digital twin: identity, position, lifecycle timeline and quality state." },
      { property: "og:title", content: "Product Twin — TwinTrace" },
      { property: "og:description", content: "Scan a tag to retrieve a product's digital twin and full lifecycle." },
    ],
  }),
  component: ProductPage,
});

function ProductPage() {
  const { id } = Route.useSearch();
  return <ProductTwin productId={id ?? null} />;
}
