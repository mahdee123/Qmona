import type { FieldDef, Values } from "./fields";

export interface Column {
  key: string;
  label: string;
  type?: "text" | "badge" | "bool" | "media" | "date";
  /** dotted path support e.g. "category_name" */
}

export interface ResourceConfig {
  key: string;
  title: string;
  singular: string;
  endpoint: string;
  description?: string;
  /** Evidence / publication guidance shown on list and edit screens. */
  note?: string;
  columns: Column[];
  fields: FieldDef[];
  orderable?: boolean;
  publishField?: string;
  searchable?: boolean;
  filters?: { name: string; label: string; options: { value: string; label: string }[] }[];
  defaults?: Values;
  transformIn?: (item: Values) => Values;
  transformOut?: (values: Values) => Values;
  publicUrl?: (item: Values) => string | null;
  previewUrl?: (item: Values) => string | null;
}

const PUBLISH = (label = "Published", help?: string): FieldDef => ({ name: "is_published", label, type: "boolean", help, wide: true });
const ORDER: FieldDef = { name: "order", label: "Order", type: "number", help: "Lower numbers appear first. You can also reorder from the list." };
const SEO: FieldDef[] = [
  { name: "meta_title", label: "SEO title", type: "text", maxLength: 160, help: "Defaults to the title if empty." },
  { name: "meta_description", label: "SEO description", type: "textarea", maxLength: 255 },
];
const CURRENCIES = ["USD", "EUR", "GBP", "BDT", "AUD", "CAD", "SGD", "AED", "INR", "JPY"].map((c) => ({ value: c, label: c }));

export const RESOURCES: Record<string, ResourceConfig> = {
  services: {
    key: "services", title: "Services", singular: "Service", endpoint: "/manage/services/",
    description: "The six main service groups shown on the homepage, services pages and contact form.",
    columns: [{ key: "title", label: "Title" }, { key: "category_name", label: "Category" }, { key: "is_featured", label: "Homepage", type: "bool" }],
    publishField: "is_active", orderable: true, searchable: true,
    fields: [
      { name: "title", label: "Title", type: "text", required: true },
      { name: "slug", label: "Slug", type: "slug", required: true, from: "title", help: "Used in the URL: /services/<slug>" },
      { name: "category", label: "Category", type: "ref", ref: { endpoint: "/manage/service-categories/", label: "name" } },
      { name: "icon_key", label: "Icon", type: "icon", required: true },
      { name: "tagline", label: "Tagline", type: "text", wide: true },
      { name: "short_description", label: "Short description", type: "textarea", required: true, help: "Shown on cards and in the services accordion." },
      { name: "full_content", label: "Full description", type: "textarea", help: "Detail page overview. Blank line = new paragraph." },
      { name: "capability_titles", label: "Capabilities", type: "string-list" },
      { name: "deliverables", label: "Deliverables", type: "string-list" },
      { name: "cover_image", label: "Cover image", type: "media", detailKey: "cover_image_detail", help: "Shown beside the services accordion when this service is open." },
      { name: "is_featured", label: "Show on homepage", type: "boolean" },
      { name: "is_active", label: "Active (visible on the website)", type: "boolean" },
      ORDER, ...SEO,
    ],
    defaults: { icon_key: "layers", is_active: true, is_featured: true, capability_titles: [], deliverables: [] },
    transformIn: (item) => ({ ...item, capability_titles: ((item.capabilities as { title: string }[]) || []).map((c) => c.title) }),
    publicUrl: (i) => `/services/${i.slug}`,
  },
  "service-categories": {
    key: "service-categories", title: "Service categories", singular: "Service category", endpoint: "/manage/service-categories/",
    columns: [{ key: "name", label: "Name" }, { key: "services_count", label: "Services" }],
    publishField: "is_active", orderable: true,
    fields: [
      { name: "name", label: "Name", type: "text", required: true },
      { name: "slug", label: "Slug", type: "slug", required: true, from: "name" },
      { name: "description", label: "Description", type: "textarea" },
      { name: "is_active", label: "Active", type: "boolean" }, ORDER,
    ],
    defaults: { is_active: true },
  },
  industries: {
    key: "industries", title: "Industries", singular: "Industry", endpoint: "/manage/industries/",
    description: "Industry taxonomy used for pages, portfolio filters and the contact form. Listing an industry does not claim past work.",
    columns: [{ key: "name", label: "Name" }, { key: "projects_count", label: "Projects" }],
    publishField: "is_active", orderable: true, searchable: true,
    fields: [
      { name: "name", label: "Name", type: "text", required: true },
      { name: "slug", label: "Slug", type: "slug", required: true, from: "name" },
      { name: "icon_key", label: "Icon", type: "icon", required: true },
      { name: "description", label: "Short description", type: "textarea" },
      { name: "overview", label: "Overview (detail page)", type: "textarea" },
      { name: "focus_areas", label: "Typical needs we build for", type: "string-list" },
      { name: "cover_image", label: "Cover image", type: "media", detailKey: "cover_image_detail" },
      { name: "is_active", label: "Active", type: "boolean" }, ORDER, ...SEO,
    ],
    defaults: { icon_key: "briefcase", is_active: true, focus_areas: [] },
    publicUrl: (i) => `/industries/${i.slug}`,
  },
  "product-types": {
    key: "product-types", title: "Product types", singular: "Product type", endpoint: "/manage/product-types/",
    columns: [{ key: "name", label: "Name" }, { key: "projects_count", label: "Projects" }],
    publishField: "is_active", orderable: true, searchable: true,
    fields: [
      { name: "name", label: "Name", type: "text", required: true },
      { name: "slug", label: "Slug", type: "slug", required: true, from: "name" },
      { name: "icon_key", label: "Icon", type: "icon", required: true },
      { name: "description", label: "Description", type: "textarea" },
      { name: "is_active", label: "Active", type: "boolean" }, ORDER,
    ],
    defaults: { icon_key: "layers", is_active: true },
  },
  technologies: {
    key: "technologies", title: "Technologies", singular: "Technology", endpoint: "/manage/technologies/",
    columns: [{ key: "name", label: "Name" }, { key: "category", label: "Category" }, { key: "projects_count", label: "Projects" }],
    publishField: "is_active", orderable: true, searchable: true,
    fields: [
      { name: "name", label: "Name", type: "text", required: true },
      { name: "slug", label: "Slug", type: "slug", required: true, from: "name" },
      { name: "category", label: "Category", type: "text", placeholder: "Frontend, Backend, Mobile…" },
      { name: "is_active", label: "Active", type: "boolean" }, ORDER,
    ],
    defaults: { is_active: true },
  },
  faqs: {
    key: "faqs", title: "FAQs", singular: "FAQ", endpoint: "/manage/faqs/",
    columns: [{ key: "question", label: "Question" }, { key: "service_title", label: "Service" }, { key: "show_on_home", label: "Homepage", type: "bool" }],
    publishField: "is_published", orderable: true, searchable: true,
    fields: [
      { name: "question", label: "Question", type: "text", required: true, wide: true },
      { name: "answer", label: "Answer", type: "textarea", required: true },
      { name: "service", label: "Related service", type: "ref", ref: { endpoint: "/manage/services/?page_size=100", label: "title" }, help: "Shown on that service's page." },
      { name: "category", label: "Category", type: "text" },
      { name: "show_on_home", label: "Show on homepage FAQ", type: "boolean" },
      PUBLISH(), ORDER,
    ],
    defaults: { is_published: true, show_on_home: true },
  },
  testimonials: {
    key: "testimonials", title: "Testimonials", singular: "Testimonial", endpoint: "/manage/testimonials/",
    note: "Only publish testimonials the client has approved. Publishing requires “Verified”, and the section stays hidden until at least one is published.",
    columns: [{ key: "client_name", label: "Client" }, { key: "company_name", label: "Company" }, { key: "is_verified", label: "Verified", type: "bool" }],
    publishField: "is_published", orderable: true, searchable: true,
    fields: [
      { name: "client_name", label: "Client name", type: "text", required: true },
      { name: "client_role", label: "Role", type: "text" },
      { name: "company_name", label: "Company", type: "text" },
      { name: "project", label: "Related project", type: "ref", ref: { endpoint: "/manage/projects/?page_size=100", label: "title" } },
      { name: "content", label: "Quote", type: "textarea", required: true },
      { name: "metric_value", label: "Headline metric (verified)", type: "text", placeholder: "e.g. 2x" },
      { name: "metric_label", label: "Metric label", type: "text", placeholder: "e.g. faster release cycle" },
      { name: "avatar", label: "Photo", type: "media", detailKey: "avatar_detail" },
      { name: "evidence_note", label: "Evidence (internal)", type: "textarea", help: "Where/when the client approved this. Never shown publicly." },
      { name: "is_verified", label: "Verified — client approved publication", type: "boolean" },
      { name: "is_featured", label: "Featured", type: "boolean" },
      PUBLISH("Published", "Requires Verified."), ORDER,
    ],
    defaults: { rating: 5 },
  },
  team: {
    key: "team", title: "Team", singular: "Team member", endpoint: "/manage/team/",
    note: "Publish only real team members who agreed to appear on the website. The team section is hidden while none are published.",
    columns: [{ key: "full_name", label: "Name" }, { key: "role_title", label: "Role" }],
    publishField: "is_published", orderable: true, searchable: true,
    fields: [
      { name: "full_name", label: "Full name", type: "text", required: true },
      { name: "role_title", label: "Role", type: "text", required: true },
      { name: "bio", label: "Bio", type: "textarea" },
      { name: "avatar", label: "Photo", type: "media", detailKey: "avatar_detail" },
      { name: "linkedin_url", label: "LinkedIn URL", type: "url" },
      PUBLISH(), ORDER,
    ],
  },
  pricing: {
    key: "pricing", title: "Pricing plans", singular: "Pricing plan", endpoint: "/manage/pricing/",
    note: "Prices must be confirmed by the agency before publishing. The pricing section is hidden while no plan is published (and can also be hidden in Pages & sections).",
    columns: [{ key: "name", label: "Plan" }, { key: "price_amount", label: "Price" }, { key: "variant", label: "Style", type: "badge" }],
    publishField: "is_published", orderable: true,
    fields: [
      { name: "name", label: "Name", type: "text", required: true },
      { name: "slug", label: "Slug", type: "slug", required: true, from: "name" },
      { name: "description", label: "Description", type: "textarea" },
      { name: "price_amount", label: "Price", type: "decimal", help: "Leave empty for “Custom”." },
      { name: "currency", label: "Currency", type: "select", options: CURRENCIES, required: true },
      { name: "price_prefix", label: "Price prefix", type: "text", placeholder: "Starts at" },
      { name: "billing", label: "Billing", type: "select", required: true, options: [{ value: "one_time", label: "One time" }, { value: "monthly", label: "Per month" }, { value: "custom", label: "Custom / quote" }] },
      { name: "badge", label: "Badge", type: "text", placeholder: "Limited spots" },
      { name: "variant", label: "Card style", type: "select", required: true, options: [{ value: "light", label: "Light" }, { value: "highlight", label: "Highlighted" }, { value: "dark", label: "Dark" }] },
      { name: "icon_key", label: "Icon", type: "icon", required: true },
      { name: "features", label: "Features", type: "string-list" },
      { name: "cta_label", label: "Button label", type: "text", required: true },
      { name: "cta_url", label: "Button link", type: "text", required: true, help: "Internal path like /contact or a full https:// URL." },
      PUBLISH("Published", "Only after the price is confirmed."), ORDER,
    ],
    defaults: { currency: "USD", billing: "custom", variant: "light", icon_key: "layers", cta_label: "Start a project", cta_url: "/contact", features: [] },
  },
  process: {
    key: "process", title: "Process steps", singular: "Process step", endpoint: "/manage/process/",
    columns: [{ key: "title", label: "Step" }],
    publishField: "is_published", orderable: true,
    fields: [
      { name: "title", label: "Title", type: "text", required: true },
      { name: "icon_key", label: "Icon", type: "icon", required: true },
      { name: "description", label: "Description", type: "textarea", required: true },
      { name: "deliverables", label: "Deliverable chips", type: "string-list" },
      { name: "image", label: "Image (optional)", type: "media", detailKey: "image_detail", help: "Replaces the generated icon illustration." },
      PUBLISH(), ORDER,
    ],
    defaults: { icon_key: "compass", is_published: true, deliverables: [] },
  },
  credibility: {
    key: "credibility", title: "Credibility items", singular: "Credibility item", endpoint: "/manage/credibility/",
    description: "Content for the homepage impact section.",
    note: "Capability facts describe what Qmona does. Statistics, awards and client logos are claims: they appear only when marked Verified and Published.",
    columns: [{ key: "title", label: "Title" }, { key: "kind", label: "Kind", type: "badge" }, { key: "value", label: "Value" }, { key: "is_verified", label: "Verified", type: "bool" }],
    publishField: "is_published", orderable: true,
    filters: [{ name: "kind", label: "Kind", options: [{ value: "capability", label: "Capability fact" }, { value: "stat", label: "Statistic" }, { value: "award", label: "Award" }, { value: "client_logo", label: "Client logo" }] }],
    fields: [
      { name: "kind", label: "Kind", type: "select", required: true, options: [{ value: "capability", label: "Capability fact" }, { value: "stat", label: "Statistic (claim)" }, { value: "award", label: "Award (claim)" }, { value: "client_logo", label: "Client logo (claim)" }] },
      { name: "title", label: "Title", type: "text", required: true },
      { name: "value", label: "Value", type: "text", placeholder: "6, 2024, 120+" },
      { name: "icon_key", label: "Icon", type: "icon", required: true },
      { name: "description", label: "Description", type: "textarea" },
      { name: "logo", label: "Logo (client logos)", type: "media", detailKey: "logo_detail" },
      { name: "link_url", label: "Link", type: "text" },
      { name: "evidence_note", label: "Evidence (internal)", type: "textarea", help: "Source / proof. Never shown publicly." },
      { name: "is_verified", label: "Verified", type: "boolean" },
      PUBLISH(), ORDER,
    ],
    defaults: { kind: "capability", icon_key: "gem" },
  },
  navigation: {
    key: "navigation", title: "Navigation", singular: "Navigation link", endpoint: "/manage/navigation/",
    description: "Header menu, footer columns and legal links.",
    columns: [{ key: "label", label: "Label" }, { key: "location", label: "Location", type: "badge" }, { key: "url", label: "URL" }],
    publishField: "is_visible", orderable: true,
    filters: [{ name: "location", label: "Location", options: [{ value: "header", label: "Header" }, { value: "footer_primary", label: "Footer – Company" }, { value: "footer_secondary", label: "Footer – Services" }, { value: "footer_legal", label: "Footer – Legal" }] }],
    fields: [
      { name: "location", label: "Location", type: "select", required: true, options: [{ value: "header", label: "Header" }, { value: "footer_primary", label: "Footer – Company column" }, { value: "footer_secondary", label: "Footer – Services column" }, { value: "footer_legal", label: "Footer – Legal row" }] },
      { name: "label", label: "Label", type: "text", required: true },
      { name: "url", label: "URL", type: "text", required: true, help: "Internal path (/work) or full https:// URL." },
      { name: "parent", label: "Dropdown parent (header only)", type: "ref", ref: { endpoint: "/manage/navigation/?location=header", label: "label" } },
      { name: "description", label: "Dropdown description", type: "text" },
      { name: "icon_key", label: "Icon (mobile menu)", type: "icon" },
      { name: "badge", label: "Badge", type: "text", placeholder: "New" },
      { name: "is_cta", label: "Render as the header CTA button", type: "boolean" },
      { name: "open_in_new_tab", label: "Open in new tab", type: "boolean" },
      { name: "is_visible", label: "Visible", type: "boolean" }, ORDER,
    ],
    defaults: { location: "header", is_visible: true },
  },
  socials: {
    key: "socials", title: "Social links", singular: "Social link", endpoint: "/manage/socials/",
    columns: [{ key: "platform", label: "Platform", type: "badge" }, { key: "url", label: "URL" }],
    publishField: "is_visible", orderable: true,
    fields: [
      { name: "platform", label: "Platform", type: "select", required: true, options: ["linkedin", "x", "facebook", "instagram", "dribbble", "behance", "github", "youtube", "clutch", "upwork", "fiverr", "whatsapp", "other"].map((p) => ({ value: p, label: p })) },
      { name: "label", label: "Label", type: "text" },
      { name: "url", label: "URL", type: "url", required: true },
      { name: "is_visible", label: "Visible", type: "boolean" }, ORDER,
    ],
    defaults: { platform: "linkedin", is_visible: true },
  },
  legal: {
    key: "legal", title: "Legal pages", singular: "Legal page", endpoint: "/manage/legal/",
    note: "Legal texts should be reviewed by the agency (and legal counsel) before publishing. Draft pages return 404 publicly.",
    columns: [{ key: "title", label: "Title" }, { key: "slug", label: "Slug" }, { key: "status", label: "Status", type: "badge" }],
    fields: [
      { name: "title", label: "Title", type: "text", required: true },
      { name: "slug", label: "Slug", type: "slug", required: true, from: "title", help: "privacy and terms are linked from the site." },
      { name: "status", label: "Status", type: "select", required: true, options: [{ value: "draft", label: "Draft" }, { value: "published", label: "Published" }] },
      { name: "last_reviewed", label: "Last reviewed", type: "date" },
      { name: "summary", label: "Summary", type: "textarea" },
      { name: "body", label: "Content", type: "blocks" },
      ...SEO,
    ],
    defaults: { status: "draft", body: [] },
    publicUrl: (i) => (i.status === "published" ? `/${i.slug}` : null),
    previewUrl: (i) => `/preview/legal/${i.slug}`,
  },
  "form-options": {
    key: "form-options", title: "Form options", singular: "Form option", endpoint: "/manage/form-options/",
    description: "Choices offered in the contact and support forms. “Other” and “Not sure” are always available for service, industry and product type.",
    columns: [{ key: "label", label: "Label" }, { key: "kind", label: "Field", type: "badge" }, { key: "value", label: "Value" }],
    publishField: "is_active", orderable: true,
    filters: [{ name: "kind", label: "Field", options: [{ value: "inquiry_topic", label: "Inquiry topic" }, { value: "budget_range", label: "Budget range" }, { value: "timeline", label: "Timeline" }, { value: "contact_method", label: "Contact method" }, { value: "support_category", label: "Support category" }] }],
    fields: [
      { name: "kind", label: "Field", type: "select", required: true, options: [{ value: "inquiry_topic", label: "Inquiry topic" }, { value: "budget_range", label: "Budget range" }, { value: "timeline", label: "Timeline" }, { value: "contact_method", label: "Preferred contact method" }, { value: "support_category", label: "Support issue category" }] },
      { name: "label", label: "Label", type: "text", required: true },
      { name: "value", label: "Value (stable key)", type: "slug", required: true, from: "label" },
      { name: "is_active", label: "Active", type: "boolean" }, ORDER,
    ],
    defaults: { kind: "inquiry_topic", is_active: true },
  },
  "blog-categories": {
    key: "blog-categories", title: "Blog categories", singular: "Blog category", endpoint: "/manage/blog/categories/",
    columns: [{ key: "name", label: "Name" }, { key: "posts_count", label: "Posts" }],
    orderable: true,
    fields: [
      { name: "name", label: "Name", type: "text", required: true },
      { name: "slug", label: "Slug", type: "slug", required: true, from: "name" },
      { name: "description", label: "Description", type: "textarea" }, ORDER,
    ],
  },
  "blog-tags": {
    key: "blog-tags", title: "Blog tags", singular: "Tag", endpoint: "/manage/blog/tags/",
    columns: [{ key: "name", label: "Name" }, { key: "posts_count", label: "Posts" }],
    fields: [
      { name: "name", label: "Name", type: "text", required: true },
      { name: "slug", label: "Slug", type: "slug", required: true, from: "name" },
    ],
  },
  "blog-authors": {
    key: "blog-authors", title: "Blog authors", singular: "Author", endpoint: "/manage/blog/authors/",
    columns: [{ key: "name", label: "Name" }, { key: "role_title", label: "Role" }, { key: "posts_count", label: "Posts" }],
    fields: [
      { name: "name", label: "Name", type: "text", required: true },
      { name: "slug", label: "Slug", type: "slug", required: true, from: "name" },
      { name: "role_title", label: "Role", type: "text" },
      { name: "bio", label: "Bio", type: "textarea" },
      { name: "avatar", label: "Photo", type: "media", detailKey: "avatar_detail" },
      { name: "linkedin_url", label: "LinkedIn URL", type: "url" },
    ],
  },
  projects: {
    key: "projects", title: "Projects", singular: "Project", endpoint: "/manage/projects/",
    description: "Portfolio case studies. Delivery status and publication status are separate.",
    note: "Publish only real, client-approved work. Keep client name, budget and links hidden unless the client agreed. Unverified projects must stay drafts.",
    columns: [{ key: "thumbnail_image_detail", label: "", type: "media" }, { key: "title", label: "Title" }, { key: "delivery_status", label: "Delivery", type: "badge" }, { key: "publication_status", label: "Publication", type: "badge" }, { key: "is_featured", label: "Featured", type: "bool" }],
    orderable: true, searchable: true,
    filters: [{ name: "publication_status", label: "Publication", options: [{ value: "Draft", label: "Draft" }, { value: "Published", label: "Published" }, { value: "Archived", label: "Archived" }] }],
    fields: [
      { name: "title", label: "Title", type: "text", required: true },
      { name: "slug", label: "Slug", type: "slug", required: true, from: "title" },
      { name: "tagline", label: "Subtitle", type: "text", wide: true },
      { name: "summary", label: "Summary", type: "textarea", required: true },
      { name: "publication_status", label: "Publication status", type: "select", required: true, options: [{ value: "Draft", label: "Draft" }, { value: "Published", label: "Published" }, { value: "Archived", label: "Archived" }] },
      { name: "delivery_status", label: "Delivery status", type: "select", required: true, options: ["Concept", "Design", "In Development", "Delivered", "Live"].map((v) => ({ value: v, label: v })) },
      { name: "is_featured", label: "Featured (homepage)", type: "boolean" },
      { name: "cover_image", label: "Cover image", type: "media", detailKey: "cover_image_detail" },
      { name: "thumbnail_image", label: "Card thumbnail", type: "media", detailKey: "thumbnail_image_detail", help: "Falls back to the cover image." },
      { name: "services", label: "Services", type: "multi-ref", ref: { endpoint: "/manage/services/?page_size=100", label: "title" } },
      { name: "industries", label: "Industries", type: "multi-ref", ref: { endpoint: "/manage/industries/?page_size=100", label: "name" } },
      { name: "product_types", label: "Product types", type: "multi-ref", ref: { endpoint: "/manage/product-types/?page_size=100", label: "name" } },
      { name: "technologies", label: "Technologies", type: "multi-ref", ref: { endpoint: "/manage/technologies/?page_size=100", label: "name" } },
      { name: "client_name", label: "Client name", type: "text" },
      { name: "client_logo", label: "Client logo", type: "media", help: "Shown only when the client name is visible." },
      { name: "is_client_name_visible", label: "Show client name publicly", type: "boolean", help: "Off = shown as “Confidential client”." },
      { name: "qmona_role", label: "Qmona's role", type: "text", wide: true },
      { name: "timeline", label: "Timeline", type: "text", placeholder: "e.g. 12 weeks" },
      { name: "challenge", label: "Challenge", type: "textarea" },
      { name: "approach", label: "Approach", type: "textarea" },
      { name: "solution", label: "Solution", type: "textarea" },
      { name: "key_features", label: "Key features", type: "obj-list", fields: [{ name: "title", label: "Title", type: "text" }, { name: "description", label: "Description", type: "textarea" }] },
      { name: "case_study_sections", label: "Additional case-study sections", type: "obj-list", fields: [{ name: "heading", label: "Heading", type: "text" }, { name: "body", label: "Body", type: "textarea" }] },
      { name: "verified_results", label: "Verified outcomes", type: "obj-list", fields: [{ name: "value", label: "Value (e.g. 2x)", type: "text" }, { name: "label", label: "Label", type: "text" }, { name: "source", label: "Source (internal reference)", type: "text" }] },
      { name: "budget_min", label: "Budget minimum", type: "decimal" },
      { name: "budget_max", label: "Budget maximum", type: "decimal" },
      { name: "currency", label: "Currency", type: "select", options: CURRENCIES, required: true },
      { name: "is_budget_visible", label: "Show budget publicly", type: "boolean" },
      { name: "live_url", label: "Live URL", type: "url" },
      { name: "repo_url", label: "Repository URL", type: "url" },
      { name: "is_external_link_visible", label: "Show approved links publicly", type: "boolean" },
      ORDER, ...SEO,
    ],
    defaults: { publication_status: "Draft", delivery_status: "Delivered", currency: "USD", is_client_name_visible: false, is_budget_visible: false, is_external_link_visible: false, services: [], industries: [], product_types: [], technologies: [], key_features: [], case_study_sections: [], verified_results: [] },
    publicUrl: (i) => (i.publication_status === "Published" ? `/work/${i.slug}` : null),
    previewUrl: (i) => `/preview/project/${i.slug}`,
  },
  posts: {
    key: "posts", title: "Blog posts", singular: "Post", endpoint: "/manage/blog/posts/",
    note: "Do not publish fabricated agency news. Scheduled posts (future publish date) stay hidden until that time.",
    columns: [{ key: "cover_image_detail", label: "", type: "media" }, { key: "title", label: "Title" }, { key: "author_name", label: "Author" }, { key: "status", label: "Status", type: "badge" }, { key: "published_at", label: "Published", type: "date" }],
    searchable: true,
    filters: [{ name: "status", label: "Status", options: [{ value: "draft", label: "Draft" }, { value: "published", label: "Published" }, { value: "archived", label: "Archived" }] }],
    fields: [
      { name: "title", label: "Title", type: "text", required: true, wide: true },
      { name: "slug", label: "Slug", type: "slug", required: true, from: "title" },
      { name: "status", label: "Status", type: "select", required: true, options: [{ value: "draft", label: "Draft" }, { value: "published", label: "Published" }, { value: "archived", label: "Archived" }] },
      { name: "published_at", label: "Publish date", type: "datetime", help: "Set automatically when first published. A future date schedules the post." },
      { name: "author", label: "Author", type: "ref", ref: { endpoint: "/manage/blog/authors/", label: "name" } },
      { name: "excerpt", label: "Excerpt", type: "textarea", required: true, maxLength: 500 },
      { name: "cover_image", label: "Cover image", type: "media", detailKey: "cover_image_detail" },
      { name: "categories", label: "Categories", type: "multi-ref", ref: { endpoint: "/manage/blog/categories/", label: "name" } },
      { name: "tags", label: "Tags", type: "multi-ref", ref: { endpoint: "/manage/blog/tags/", label: "name" } },
      { name: "is_featured", label: "Featured", type: "boolean" },
      { name: "body", label: "Article content", type: "blocks" },
      ...SEO,
      { name: "og_image", label: "Social sharing image", type: "media" },
    ],
    defaults: { status: "draft", body: [], categories: [], tags: [] },
    publicUrl: (i) => (i.status === "published" ? `/blog/${i.slug}` : null),
    previewUrl: (i) => `/preview/post/${i.slug}`,
  },
};
