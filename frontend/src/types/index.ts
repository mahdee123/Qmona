/* Public API types — mirror backend public serializers (see docs/api-contract.md). */
import type { SectionStyle } from "@/lib/section-style";

export interface Media {
  id: string;
  url: string;
  alt_text: string;
  caption: string;
  width: number | null;
  height: number | null;
  mime_type: string;
}

export interface Paginated<T> {
  count: number;
  total_pages: number;
  page: number;
  page_size: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface Link {
  label: string;
  url: string;
}

export type AccentKey = "red" | "orange" | "blue" | "violet" | "green";

export interface SiteProfile {
  agency_name: string;
  short_name: string;
  tagline: string;
  description: string;
  email: string;
  support_email: string;
  phone: string;
  whatsapp: string;
  address: string;
  city: string;
  country: string;
  office_hours: string;
  timezone_label: string;
  availability_label: string;
  logo: Media | null;
  logo_on_dark: Media | null;
  favicon: Media | null;
  accent: AccentKey;
  animations_enabled: boolean;
  default_meta_title: string;
  default_meta_description: string;
  og_image: Media | null;
  footer_note: string;
  privacy_notice: string;
  updated_at: string;
}

export interface NavItem {
  id: string;
  label: string;
  url: string;
  description: string;
  icon_key: string;
  badge: string;
  open_in_new_tab: boolean;
  is_cta: boolean;
  children: NavItem[];
}

export interface SocialLink {
  id: string;
  platform: string;
  label: string;
  url: string;
}

export interface SiteData {
  profile: SiteProfile;
  navigation: {
    header: NavItem[];
    footer_primary: NavItem[];
    footer_secondary: NavItem[];
    footer_legal: NavItem[];
  };
  socials: SocialLink[];
  legal_pages: { slug: string; title: string }[];
  availability: { blog: boolean; pricing: boolean; testimonials: boolean; team: boolean };
}

export interface SectionAnimation {
  enabled: boolean;
  preset: "fade_up" | "fade" | "scale" | "none";
  duration: number;
  delay: number;
}

export interface Section<C = Record<string, unknown>> {
  id: string;
  section_type: string;
  variant: string;
  label: string;
  headline: string;
  subheadline: string;
  content: C;
  style?: SectionStyle;
  animation: SectionAnimation;
  order: number;
}

export interface CMSPage {
  slug: string;
  title: string;
  meta_title: string;
  meta_description: string;
  og_image: Media | null;
  sections: Section[];
  updated_at: string;
}

export interface TaxonomyRef {
  name: string;
  slug: string;
}

export interface ServiceCategory {
  id: string;
  name: string;
  slug: string;
  description: string;
}

export interface Service {
  id: string;
  title: string;
  slug: string;
  tagline: string;
  short_description: string;
  icon_key: string;
  category: ServiceCategory | null;
  cover_image: Media | null;
  capabilities: { id: string; title: string; description: string }[];
  is_featured: boolean;
  order: number;
}

export interface ServiceDetail extends Service {
  full_content: string;
  deliverables: string[];
  meta_title: string;
  meta_description: string;
  updated_at: string;
}

export interface Industry {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon_key: string;
  cover_image: Media | null;
  projects_count: number;
  order: number;
}

export interface IndustryDetail extends Industry {
  overview: string;
  focus_areas: string[];
  meta_title: string;
  meta_description: string;
}

export interface ProductType {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon_key: string;
}

export interface Technology {
  id: string;
  name: string;
  slug: string;
  category: string;
}

export type DeliveryStatus = "Concept" | "Design" | "In Development" | "Delivered" | "Live";

export interface ProjectListItem {
  id: string;
  title: string;
  slug: string;
  tagline: string;
  summary: string;
  thumbnail: Media | null;
  services: TaxonomyRef[];
  industries: TaxonomyRef[];
  product_types: TaxonomyRef[];
  client_name: string;
  delivery_status: DeliveryStatus;
  is_featured: boolean;
  published_at: string | null;
}

export interface GalleryItem {
  id: string;
  media: Media;
  caption: string;
  alt_text: string;
  kind: "mockup" | "screenshot" | "photo";
  layout: "full" | "half";
  order: number;
}

export interface ProjectDetail extends ProjectListItem {
  cover_image: Media | null;
  client_logo: Media | null;
  gallery: GalleryItem[];
  technologies: TaxonomyRef[];
  qmona_role: string;
  challenge: string;
  approach: string;
  solution: string;
  key_features: { title: string; description: string }[];
  case_study_sections: { heading: string; body: string }[];
  timeline: string;
  budget: { min: string | null; max: string | null; currency: string } | null;
  verified_results: { value: string; label: string; source?: string }[];
  external_links: { live_url: string | null; repo_url: string | null } | null;
  testimonial: { content: string; client_name: string; client_role: string; company_name: string } | null;
  meta_title: string;
  meta_description: string;
  updated_at: string;
  _status?: string;
}

export interface Author {
  name: string;
  slug: string;
  role_title: string;
  bio: string;
  avatar: Media | null;
  linkedin_url: string;
}

export type ContentBlock =
  | { type: "heading"; level: 2 | 3 | 4; text: string }
  | { type: "paragraph"; text: string }
  | { type: "list"; style: "ordered" | "unordered"; items: string[] }
  | { type: "quote"; text: string; cite?: string }
  | { type: "callout"; text: string }
  | { type: "image"; media_id: string; url: string; width: number | null; height: number | null; alt: string; caption?: string }
  | { type: "divider" };

export interface PostListItem {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  cover_image: Media | null;
  author: Author | null;
  categories: { name: string; slug: string; description: string }[];
  tags: TaxonomyRef[];
  published_at: string;
  reading_minutes: number;
  is_featured: boolean;
}

export interface PostDetail extends PostListItem {
  body: ContentBlock[];
  meta_title: string;
  meta_description: string;
  og_image: Media | null;
  updated_at: string;
  _status?: string;
}

export interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: string;
  service: string | null;
}

export interface Testimonial {
  id: string;
  client_name: string;
  client_role: string;
  company_name: string;
  content: string;
  metric_value: string;
  metric_label: string;
  rating: number;
  avatar: Media | null;
  project: { title: string; slug: string } | null;
  is_featured: boolean;
}

export interface TeamMember {
  id: string;
  full_name: string;
  role_title: string;
  bio: string;
  avatar: Media | null;
  linkedin_url: string;
}

export interface PricingPlan {
  id: string;
  name: string;
  slug: string;
  description: string;
  price_amount: string | null;
  currency: string;
  price_prefix: string;
  billing: "one_time" | "monthly" | "custom";
  badge: string;
  features: string[];
  icon_key: string;
  cta_label: string;
  cta_url: string;
  variant: "light" | "highlight" | "dark";
}

export interface ProcessStep {
  id: string;
  title: string;
  description: string;
  icon_key: string;
  image: Media | null;
  deliverables: string[];
  order: number;
}

export interface CredibilityItem {
  id: string;
  kind: "capability" | "stat" | "award" | "client_logo";
  value: string;
  title: string;
  description: string;
  icon_key: string;
  logo: Media | null;
  link_url: string;
}

export interface LegalPage {
  slug: string;
  title: string;
  summary: string;
  body: ContentBlock[];
  last_reviewed: string | null;
  meta_title: string;
  meta_description: string;
  updated_at: string;
}

export interface FormOption {
  value: string;
  label: string;
}

export interface FormOptions {
  options: {
    inquiry_topic: FormOption[];
    budget_range: FormOption[];
    timeline: FormOption[];
    contact_method: FormOption[];
    support_category: FormOption[];
  };
  services: { slug: string; title: string }[];
  industries: { slug: string; name: string }[];
  product_types: { slug: string; name: string }[];
}

export interface ApiErrorBody {
  detail: string;
  code: string;
  errors: Record<string, string[]>;
  [key: string]: unknown;
}
