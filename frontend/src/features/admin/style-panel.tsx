"use client";

import { RotateCcw } from "lucide-react";
import { roleClass, type SectionStyle, type StyleProp, type StyleRole } from "@/lib/section-style";
import { cn } from "@/lib/utils";
import { Btn, FormRow, SelectBox } from "./ui";

export interface StyleSchema {
  options: Record<StyleProp, string[]>;
  roles: Record<StyleRole, StyleProp[]>;
  section_roles: Record<string, StyleRole[]>;
}

const ROLE_LABEL: Record<StyleRole, string> = {
  heading: "Heading",
  subheading: "Sub-heading",
  card: "Card box",
  card_title: "Card title",
  card_text: "Card text",
  button: "Buttons",
};
const PROP_LABEL: Record<StyleProp, string> = {
  size: "Text size", weight: "Font weight", align: "Alignment", color: "Text color",
  padding: "Padding", radius: "Corner radius", bg: "Background",
};
const label = (v: string) => v.replace(/^\w/, (c) => c.toUpperCase());

/** Per-element styling presets for one section. Presets only, never raw CSS (ADR-018). */
export function StylePanel({ sectionType, schema, value, onChange, errors }: {
  sectionType: string; schema: StyleSchema; value: SectionStyle; onChange: (v: SectionStyle) => void; errors?: string;
}) {
  const roles = schema.section_roles[sectionType] || [];
  if (!roles.length) return null;

  const setProp = (role: StyleRole, prop: StyleProp, v: string) => {
    const next = { ...(value[role] || {}), [prop]: v };
    if (!v) delete next[prop];
    const out = { ...value, [role]: next };
    if (!Object.keys(next).length) delete out[role];
    onChange(out);
  };
  const reset = (role: StyleRole) => {
    const out = { ...value };
    delete out[role];
    onChange(out);
  };
  const has = (r: StyleRole) => roles.includes(r);

  return (
    <fieldset className="space-y-4 rounded-[16px] border border-line p-4">
      <legend className="px-1 text-[0.8125rem] font-bold">Styling</legend>
      <p className="text-[0.75rem] text-muted">
        Leave a setting on “Default” to keep the standard design. Card settings apply to every card in this section.
      </p>
      {errors && <p className="text-[0.75rem] font-medium text-danger">{errors}</p>}

      {roles.map((role) => (
        <div key={role} className="space-y-3 rounded-[12px] bg-page p-3">
          <div className="flex items-center justify-between">
            <h4 className="text-[0.8125rem] font-bold">{ROLE_LABEL[role]}</h4>
            {value[role] && (
              <Btn onClick={() => reset(role)}><RotateCcw className="h-3.5 w-3.5" aria-hidden="true" /> Reset</Btn>
            )}
          </div>
          <div className="grid gap-3 tablet:grid-cols-2 desktop:grid-cols-4">
            {schema.roles[role].map((prop) => {
              const id = `style-${role}-${prop}`;
              return (
                <FormRow key={prop} id={id} label={PROP_LABEL[prop]}>
                  <SelectBox
                    id={id}
                    value={value[role]?.[prop] || ""}
                    onChange={(v) => setProp(role, prop, v)}
                    placeholder="Default"
                    options={schema.options[prop].map((o) => ({ value: o, label: label(o) }))}
                  />
                </FormRow>
              );
            })}
          </div>
        </div>
      ))}

      <div>
        <p className="mb-2 text-[0.75rem] font-medium text-muted">Preview</p>
        <div className="space-y-3 rounded-[12px] border border-dashed border-line p-4">
          {has("heading") && <p className={roleClass(value, "heading", "t-h2")}>Section heading</p>}
          {has("subheading") && <p className={roleClass(value, "subheading", "t-lead")}>A short sub-heading under it.</p>}
          {(has("card") || has("card_title") || has("card_text")) && (
            <div className={roleClass(value, "card", "w-full max-w-sm rounded-[24px] bg-card p-6 shadow-[var(--shadow-card)]")}>
              <h3 className={roleClass(value, "card_title", "text-[1.375rem] font-medium tracking-[-0.035em]")}>Card title</h3>
              <p className={cn(roleClass(value, "card_text", "t-small"), "mt-2")}>Card text sits here under the title.</p>
            </div>
          )}
        </div>
      </div>
    </fieldset>
  );
}
