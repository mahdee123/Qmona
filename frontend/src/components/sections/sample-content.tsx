import type { PricingPlan, ProjectListItem, Testimonial } from "@/types";

/**
 * Sample content for the reference-style sections (projects, pricing, testimonials).
 * Lives in the frontend only: it is never stored, never served by the API and never
 * counted as a verified claim (AGENTS.md §2). It is used only while a section has no
 * published data and its "Show sample content" setting is on. Copy is deliberately generic.
 */

export function SampleChip({ className }: { className?: string }) {
  return (
    <p className={className}>
      <span className="inline-flex items-center rounded-full bg-card px-3 py-1 text-[0.75rem] font-medium text-muted shadow-[var(--shadow-button)]">
        Sample content — replace in admin
      </span>
    </p>
  );
}

const tag = (name: string) => ({ name, slug: name.toLowerCase().replace(/\W+/g, "-") });

const PROJECT_TAGS = [
  ["Product Design", "Websites"],
  ["Mobile Apps", "Product Design"],
  ["Custom Software", "Backend & APIs", "Websites"],
  ["AI Products", "Product Design"],
  ["Websites", "Custom Software"],
  ["Mobile Apps", "Backend & APIs"],
];

export const SAMPLE_PROJECTS: ProjectListItem[] = PROJECT_TAGS.map((tags, i) => ({
  id: `sample-project-${i + 1}`,
  title: `Sample project ${String(i + 1).padStart(2, "0")}`,
  slug: "",
  tagline: "",
  summary: "",
  thumbnail: null,
  services: tags.map(tag),
  industries: [],
  product_types: [],
  client_name: "",
  delivery_status: "Concept",
  is_featured: false,
  published_at: null,
}));

export type SamplePlan = PricingPlan & { price_text?: string; addon?: { label: string; price: string } };

const PLAN_BASE = { currency: "USD", price_prefix: "", cta_label: "Get Started Now", cta_url: "/contact", price_amount: null } as const;

export const SAMPLE_PLANS: SamplePlan[] = [
  {
    ...PLAN_BASE, id: "sample-plan-1", slug: "sample-1", name: "Starter plan", variant: "light", icon_key: "layers",
    description: "Sample description for a one-time project plan.", billing: "one_time", badge: "",
    price_text: "$0,000",
    features: ["Sample feature one", "Sample feature two", "Sample feature three", "Sample feature four"],
    addon: { label: "Add optional extra", price: "+$000" },
  },
  {
    ...PLAN_BASE, id: "sample-plan-2", slug: "sample-2", name: "Partner plan", variant: "highlight", icon_key: "compass",
    description: "Sample description for an ongoing monthly partnership.", billing: "monthly", badge: "",
    price_text: "$0,000",
    features: ["Sample feature one", "Sample feature two", "Sample feature three", "Sample feature four", "Sample feature five"],
  },
  {
    ...PLAN_BASE, id: "sample-plan-3", slug: "sample-3", name: "Custom", variant: "dark", icon_key: "gem",
    description: "Sample description for a larger, tailored engagement.", billing: "custom", badge: "Limited spots",
    price_prefix: "Starts at", price_text: "$0,000+",
    features: ["Sample feature one", "Sample feature two", "Sample feature three", "Sample feature four"],
  },
];

const QUOTE = "Sample testimonial text. Replace this with a verified client quote once the client has approved it.";

export const SAMPLE_TESTIMONIALS: Testimonial[] = [
  ["0×", "sample result metric", "Client name", "Role"],
  ["00%", "sample result metric", "Client name", "Role"],
  ["0×", "sample result metric", "Client name", "Role"],
  ["00%", "sample result metric", "Client name", "Role"],
  ["00%", "sample result metric", "Client name", "Role"],
  ["0×", "sample result metric", "Client name", "Role"],
].map(([metric_value, metric_label, client_name, client_role], i) => ({
  id: `sample-testimonial-${i + 1}`,
  client_name, client_role, company_name: "", content: QUOTE, metric_value, metric_label,
  rating: 5, avatar: null, project: null, is_featured: false,
}));
