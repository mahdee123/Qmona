import type { Model, QueryFilter } from "mongoose";
import type { z } from "zod";
import { ApiError } from "../../errors/api-error.js";
import { Industry } from "../industries/industries.model.js";
import { FormOption } from "../cms/cms.model.js";
import { ProductType, Project } from "../portfolio/portfolio.model.js";
import { Service } from "../services/services.model.js";
import { INQUIRY_STATUSES, type InquiryAttrs } from "./inquiries.model.js";
import type { publicInquirySchema } from "./inquiries.validation.js";

const OPEN_CHOICES: Record<string, string> = { other: "Other", "not-sure": "Not sure" };
type Submission = z.infer<typeof publicInquirySchema>;

/** Turns a validated public submission into the fields stored on an inquiry, resolving option values to labels. */
export async function buildInquiryFields(input: Submission): Promise<Partial<InquiryAttrs>> {
  const errors: Record<string, string[]> = {};
  const isContact = input.inquiry_type === "contact";

  const option = async (kind: string, value: string | undefined, field: string, required = false): Promise<string> => {
    if (!value) {
      if (required) errors[field] = ["This field is required."];
      return "";
    }
    const found = await FormOption.findOne({ kind, value, is_active: true } as QueryFilter<any>).lean(); // eslint-disable-line @typescript-eslint/no-explicit-any
    if (found) return found.label;
    if (OPEN_CHOICES[value]) return OPEN_CHOICES[value]!;
    errors[field] = ["Select a valid option."];
    return "";
  };

  const taxonomy = async (model: Model<any>, // eslint-disable-line @typescript-eslint/no-explicit-any
     value: string | undefined, field: string, labelField: string) => {
    if (!value) return { id: null, label: "" };
    if (OPEN_CHOICES[value]) return { id: null, label: OPEN_CHOICES[value]! };
    const found = (await model.findOne({ slug: value, is_active: true }).lean()) as Record<string, unknown> | null;
    if (!found) {
      errors[field] = ["Select a valid option."];
      return { id: null, label: "" };
    }
    return { id: found._id as InquiryAttrs["service"], label: String(found[labelField]) };
  };

  let fields: Partial<InquiryAttrs> = {
    inquiry_type: input.inquiry_type,
    full_name: input.full_name,
    email: input.email,
    company: input.company ?? "",
    phone_country_code: input.phone_country_code ?? "",
    phone: input.phone ?? "",
    message: input.message,
    privacy_acknowledged: true,
  };
  const choices: Record<string, unknown> = {};

  if (isContact) {
    const topic = await option("inquiry_topic", input.topic, "topic", true);
    const budget = await option("budget_range", input.budget, "budget");
    const timeline = await option("timeline", input.timeline, "timeline");
    const service = await taxonomy(Service, input.service, "service", "title");
    const industry = await taxonomy(Industry, input.industry, "industry", "name");
    const productType = await taxonomy(ProductType, input.product_type, "product_type", "name");
    const project = input.project ? await Project.findOne({ slug: input.project, publication_status: "Published" }).lean() : null;
    fields = {
      ...fields,
      topic,
      estimated_budget: budget,
      estimated_timeline: timeline,
      service: service.id,
      industry: industry.id as InquiryAttrs["industry"],
      product_type: productType.id as InquiryAttrs["product_type"],
      project_reference: project?._id ?? null,
    };
    Object.assign(choices, {
      topic: input.topic, service: input.service, service_label: service.label, industry: input.industry, industry_label: industry.label,
      product_type: input.product_type, product_type_label: productType.label, budget: input.budget, timeline: input.timeline, project: input.project,
    });
  } else {
    if (!input.subject) errors.subject = ["This field is required."];
    const category = await option("support_category", input.support_category, "support_category", true);
    fields = { ...fields, subject: input.subject ?? "", support_category: category, project_reference_text: input.project_reference_text ?? "" };
    choices.support_category = input.support_category;
  }

  const method = await option("contact_method", input.contact_method, "contact_method");
  fields.preferred_contact_method = method;
  if (input.contact_method) choices.contact_method = input.contact_method;
  if (input.phone && !input.phone_country_code) errors.phone_country_code = ["Add the country code for this phone number."];

  if (Object.keys(errors).length) throw ApiError.validation(errors);

  // Only keep the choices the visitor actually made.
  fields.submitted_choices = Object.fromEntries(Object.entries(choices).filter(([, v]) => v));
  // Never trust a client-supplied page path that is not on this site.
  const page = input.source_page ?? "";
  fields.source_page = page && page.startsWith("/") && !page.startsWith("//") ? page : isContact ? "/contact" : "/support";
  return fields;
}

export const isValidStatus = (s: string): s is (typeof INQUIRY_STATUSES)[number] => (INQUIRY_STATUSES as readonly string[]).includes(s);

/** Spreadsheet formula injection guard (CWE-1236): neutralise cells that would be executed as formulas. */
export function csvSafe(value: unknown): string {
  if (value === null || value === undefined) return "";
  const text = String(value);
  return text && (["=", "+", "-", "@", "\t", "\r", "\n", "|", "%"].includes(text[0]!) || ["=", "+", "-", "@"].includes(text.trimStart()[0] ?? ""))
    ? `'${text}`
    : text;
}

export const csvCell = (v: unknown) => `"${csvSafe(v).replace(/"/g, '""')}"`;
