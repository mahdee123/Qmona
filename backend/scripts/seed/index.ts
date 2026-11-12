/**
 * Seed truthful default content for a fresh Qmona installation.
 *
 * Content lives in ./data/*.json (one file per area), so replacing or extending it never means touching code.
 * The seed is idempotent: existing records (matched by slug / key) are left exactly as editors changed them,
 * unless `resetCopy` is set. It deliberately creates NO projects, testimonials, pricing plans, statistics,
 * awards, client logos or team members: those must be entered and verified by the agency in the admin portal.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type { Types } from "mongoose";
import path from "node:path";
import { collectMediaIds, validateSectionContent, validateStyle } from "../../src/modules/cms/section-schemas.js";
import {
  CMSPage, CMSSection, CredibilityItem, FAQ, FormOption, LegalPage, NavigationItem, ProcessStep, loadProfile,
} from "../../src/modules/cms/cms.model.js";
import { Industry } from "../../src/modules/industries/industries.model.js";
import { ProductType, Technology } from "../../src/modules/portfolio/portfolio.model.js";
import { Service, ServiceCategory } from "../../src/modules/services/services.model.js";

const dataDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "data");
// Read at run time (not imported) so the same code works from src with tsx and from dist in the container.
const read = <T>(name: string): T => JSON.parse(readFileSync(path.join(dataDir, `${name}.json`), "utf8")) as T;

interface ServiceData { slug: string; category: string; icon_key: string; title: string; tagline: string; short_description: string; full_content: string; capabilities: string[]; deliverables: string[] }
interface SectionData { section_type: string; variant: string; label?: string; headline?: string; subheadline?: string; content_data: Record<string, unknown>; animation_preset?: string; is_active?: boolean }
interface PageData { title: string; meta_title: string; meta_description: string; sections: SectionData[] }

export interface SeedOptions {
  /** Overwrite existing page sections and copy with the defaults. */
  resetCopy?: boolean;
  log?: (message: string) => void;
}

export async function runSeed({ resetCopy = false, log = () => undefined }: SeedOptions = {}): Promise<void> {
  const reset = resetCopy;

  // Site profile --------------------------------------------------------------------------------------
  const profile = await loadProfile();
  if (reset || !profile.email) {
    profile.set(read<Record<string, string>>("profile"));
    await profile.save();
    log("site profile");
  }

  // Service categories and services -----------------------------------------------------------------------
  const categories = new Map<string, Types.ObjectId>();
  for (const [i, c] of read<{ slug: string; name: string }[]>("service-categories").entries()) {
    const doc = await ServiceCategory.findOneAndUpdate({ slug: c.slug }, { $setOnInsert: { name: c.name, slug: c.slug, order: i } }, { upsert: true, returnDocument: "after" });
    categories.set(c.slug, doc._id);
  }
  for (const [i, s] of read<ServiceData[]>("services").entries()) {
    const { capabilities, category, ...fields } = s;
    const body = { ...fields, category: categories.get(category) ?? null, order: i, capabilities: capabilities.map((title, order) => ({ title, description: "", order })) } as never;
    const existing = await Service.findOne({ slug: s.slug });
    if (!existing) await Service.create(body);
    else if (reset) await Service.updateOne({ slug: s.slug }, { $set: body });
  }
  log("services");

  // Taxonomies --------------------------------------------------------------------------------------------
  for (const [i, t] of read<{ slug: string; name: string; icon_key: string }[]>("product-types").entries()) {
    await ProductType.updateOne({ slug: t.slug }, { $setOnInsert: { ...t, order: i } }, { upsert: true });
  }
  for (const [i, t] of read<{ slug: string; name: string; icon_key: string; description: string }[]>("industries").entries()) {
    await Industry.updateOne({ slug: t.slug }, { $setOnInsert: { ...t, order: i } }, { upsert: true });
  }
  for (const [i, t] of read<{ slug: string; name: string; category: string }[]>("technologies").entries()) {
    await Technology.updateOne({ slug: t.slug }, { $setOnInsert: { ...t, order: i } }, { upsert: true });
  }
  log("taxonomies");

  // Process, FAQs, form options, credibility ------------------------------------------------------------------
  if (reset || !(await ProcessStep.exists({}))) {
    await ProcessStep.deleteMany({});
    await ProcessStep.insertMany(read<Record<string, unknown>[]>("process").map((p, order) => ({ ...p, order })));
  }
  for (const [i, f] of read<{ question: string; answer: string }[]>("faqs").entries()) {
    await FAQ.updateOne({ question: f.question }, { $setOnInsert: { ...f, order: i, category: "General" } }, { upsert: true });
  }
  for (const [kind, options] of Object.entries(read<Record<string, { value: string; label: string }[]>>("form-options"))) {
    for (const [i, o] of options.entries()) {
      await FormOption.updateOne({ kind, value: o.value } as never, { $setOnInsert: { kind, ...o, order: i } }, { upsert: true });
    }
  }
  for (const [i, c] of read<{ value: string; title: string; description: string; icon_key: string }[]>("capabilities").entries()) {
    // Capability facts describe what Qmona does, so they are published. Claims (stats, awards, logos) are never seeded.
    await CredibilityItem.updateOne({ kind: "capability", title: c.title } as never, { $setOnInsert: { kind: "capability", ...c, order: i, is_published: true } }, { upsert: true });
  }
  log("process, faqs, forms, credibility");

  // Navigation ---------------------------------------------------------------------------------------------
  if (reset || !(await NavigationItem.exists({}))) {
    await NavigationItem.deleteMany({});
    const nav = read<Record<string, { label: string; url: string; badge: string }[]>>("navigation");
    for (const [location, items] of Object.entries(nav)) {
      await NavigationItem.insertMany(items.map((n, order) => ({ location, ...n, order })));
    }
    await NavigationItem.create({ location: "header", label: "Start a Project", url: "/contact", is_cta: true, order: 99 });
    await NavigationItem.insertMany(read<ServiceData[]>("services").map((s, order) => ({ location: "footer_secondary", label: s.title, url: `/services/${s.slug}`, order })));
  }
  log("navigation");

  // Legal pages: the privacy policy is a factual draft of what the site does; terms stay a draft until written. ----
  const legal = read<{ privacy: unknown[]; terms: unknown[] }>("legal");
  await LegalPage.updateOne({ slug: "privacy" }, { $setOnInsert: { slug: "privacy", title: "Privacy Policy", summary: "How the Qmona website handles the information you submit.", body: legal.privacy, status: "published" } }, { upsert: true });
  await LegalPage.updateOne({ slug: "terms" }, { $setOnInsert: { slug: "terms", title: "Terms of Service", summary: "", body: legal.terms, status: "draft" } }, { upsert: true });
  log("legal pages");

  // Pages and sections (validated with the same rules the admin editor uses) -------------------------------------
  for (const [slug, spec] of Object.entries(read<Record<string, PageData>>("pages"))) {
    const page = await CMSPage.findOneAndUpdate({ slug }, { $setOnInsert: { slug, title: spec.title, meta_title: spec.meta_title, meta_description: spec.meta_description } }, { upsert: true, returnDocument: "after" });
    if (reset || !(await CMSSection.exists({ page: page._id }))) {
      await CMSSection.deleteMany({ page: page._id });
      for (const [order, sec] of spec.sections.entries()) {
        const content = await validateSectionContent(sec.section_type, sec.variant, sec.content_data);
        await CMSSection.create({
          ...sec,
          page: page._id,
          order,
          is_active: sec.is_active ?? true,
          content_data: content,
          style: validateStyle(sec.section_type, {}),
          media_ids: collectMediaIds(sec.section_type, content),
        } as never);
      }
    }
  }
  log("pages");
}
