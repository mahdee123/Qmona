import "server-only";

import { cache } from "react";
import type {
  CMSPage,
  CredibilityItem,
  FAQItem,
  FormOptions,
  Industry,
  IndustryDetail,
  LegalPage,
  Paginated,
  PostDetail,
  PostListItem,
  PricingPlan,
  ProcessStep,
  ProductType,
  ProjectDetail,
  ProjectListItem,
  Service,
  ServiceDetail,
  SiteData,
  TeamMember,
  Technology,
  Testimonial,
} from "@/types";

/**
 * Server-side data access for public pages.
 *
 * Responses are cached in the Next.js data cache with tags. The backend calls
 * /api/revalidate with the affected tags whenever editors publish changes,
 * and REVALIDATE_SECONDS is the time-based fallback.
 */

const BACKEND = process.env.BACKEND_INTERNAL_URL || "http://127.0.0.1:4000";
const REVALIDATE = Number(process.env.REVALIDATE_SECONDS || 300);

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

async function request<T>(path: string, tags: string[], init?: RequestInit & { noStore?: boolean }): Promise<T | null> {
  const url = `${BACKEND}/api/v1${path}`;
  const { noStore, ...rest } = init || {};
  const res = await fetch(url, {
    ...rest,
    headers: { Accept: "application/json", ...(rest.headers || {}) },
    ...(noStore ? { cache: "no-store" as const } : { next: { revalidate: REVALIDATE, tags } }),
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new ApiError(`API ${res.status} for ${path}`, res.status);
  return (await res.json()) as T;
}

async function list<T>(path: string, tags: string[]): Promise<T[]> {
  return (await request<T[]>(path, tags)) ?? [];
}

function qs(params: Record<string, string | string[] | number | undefined | null>) {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === "") continue;
    if (Array.isArray(v)) {
      if (v.length) sp.set(k, v.join(","));
    } else sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : "";
}

const FALLBACK_SITE: SiteData = {
  profile: {
    agency_name: "Qmona Agency",
    short_name: "Qmona",
    tagline: "Product design & software development",
    description: "",
    email: "",
    support_email: "",
    phone: "",
    whatsapp: "",
    address: "",
    city: "Dhaka",
    country: "Bangladesh",
    office_hours: "",
    timezone_label: "",
    availability_label: "",
    logo: null,
    logo_on_dark: null,
    favicon: null,
    accent: "red",
    animations_enabled: true,
    default_meta_title: "Qmona Agency",
    default_meta_description: "",
    og_image: null,
    footer_note: "",
    privacy_notice: "",
    updated_at: "",
  },
  navigation: { header: [], footer_primary: [], footer_secondary: [], footer_legal: [] },
  socials: [],
  legal_pages: [],
  availability: { blog: false, pricing: false, testimonials: false, team: false },
};

/** Global site data. Falls back to minimal defaults if the API is unreachable so layouts still render. */
export const getSite = cache(async (): Promise<SiteData> => {
  try {
    return (await request<SiteData>("/site/", ["site"])) ?? FALLBACK_SITE;
  } catch {
    return FALLBACK_SITE;
  }
});

export const getPage = cache((slug: string) => request<CMSPage>(`/pages/${slug}/`, ["cms", `page:${slug}`]));

export const getServices = cache((featured = false) =>
  list<Service>(`/services/${featured ? "?featured=true" : ""}`, ["services"]),
);
export const getService = cache((slug: string) => request<ServiceDetail>(`/services/${slug}/`, ["services"]));

export const getIndustries = cache(() => list<Industry>("/industries/", ["industries"]));
export const getIndustry = cache((slug: string) => request<IndustryDetail>(`/industries/${slug}/`, ["industries"]));
export const getProductTypes = cache(() => list<ProductType>("/product-types/", ["taxonomies"]));
export const getTechnologies = cache(() => list<Technology>("/technologies/", ["taxonomies"]));

export interface ProjectQuery {
  services?: string[];
  industries?: string[];
  product_types?: string[];
  search?: string;
  page?: number;
  page_size?: number;
  featured?: boolean;
}

export const getProjects = cache(async (q: ProjectQuery = {}) => {
  const empty: Paginated<ProjectListItem> = {
    count: 0, total_pages: 1, page: 1, page_size: q.page_size || 12, next: null, previous: null, results: [],
  };
  return (
    (await request<Paginated<ProjectListItem>>(
      `/projects/${qs({ ...q, featured: q.featured ? "true" : undefined })}`,
      ["projects"],
    )) ?? empty
  );
});
export const getProject = cache((slug: string) => request<ProjectDetail>(`/projects/${slug}/`, ["projects"]));
export const getRelatedProjects = cache((slug: string) => list<ProjectListItem>(`/projects/${slug}/related/`, ["projects"]));

export const getPosts = cache(async (q: { page?: number; category?: string; page_size?: number } = {}) => {
  const empty: Paginated<PostListItem> = {
    count: 0, total_pages: 1, page: 1, page_size: q.page_size || 12, next: null, previous: null, results: [],
  };
  return (await request<Paginated<PostListItem>>(`/blog/posts/${qs(q)}`, ["blog"])) ?? empty;
});
export const getPost = cache((slug: string) => request<PostDetail>(`/blog/posts/${slug}/`, ["blog"]));
export const getRelatedPosts = cache((slug: string) => list<PostListItem>(`/blog/posts/${slug}/related/`, ["blog"]));
export const getBlogCategories = cache(() =>
  list<{ name: string; slug: string; description: string }>("/blog/categories/", ["blog"]),
);

export const getFaqs = cache((params: { home?: boolean; service?: string } = {}) =>
  list<FAQItem>(`/faqs/${qs({ home: params.home ? "true" : undefined, service: params.service })}`, ["faqs"]),
);
export const getTestimonials = cache(() => list<Testimonial>("/testimonials/", ["testimonials"]));
export const getTeam = cache(() => list<TeamMember>("/team/", ["team"]));
export const getPricing = cache(() => list<PricingPlan>("/pricing/", ["pricing"]));
export const getProcess = cache(() => list<ProcessStep>("/process/", ["process"]));
export const getCredibility = cache(() => list<CredibilityItem>("/credibility/", ["credibility"]));
export const getLegalPage = cache((slug: string) => request<LegalPage>(`/legal/${slug}/`, ["legal"]));
export const getFormOptions = cache(async (): Promise<FormOptions> => {
  const empty: FormOptions = {
    options: { inquiry_topic: [], budget_range: [], timeline: [], contact_method: [], support_category: [] },
    services: [], industries: [], product_types: [],
  };
  try {
    return (await request<FormOptions>("/forms/options/", ["forms", "services", "industries", "taxonomies"])) ?? empty;
  } catch {
    return empty;
  }
});

/** Authenticated preview fetch (forwards the editor's session cookie; never cached). */
export async function getPreview<T>(kind: string, slug: string, cookieHeader: string): Promise<T | null> {
  return request<T>(`/manage/preview/${kind}/${slug}/`, [], { noStore: true, headers: { cookie: cookieHeader } });
}
