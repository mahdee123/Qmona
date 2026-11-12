# Project specification — Qmona Agency

## Purpose
Qmona Agency's public website (qmona.com) plus the system the team uses to run it: a CMS, media library, project-inquiry and support-request workflow, and a role-based admin portal. Routine content changes never require code edits.

## Audience
Local and international startups, SaaS companies, agencies and businesses.

## Confirmed facts (safe to publish)
- Name: Qmona Agency (short: Qmona). Domain: qmona.com.
- Email: qmonaagency@gmail.com.
- Address: House #2, Block #K (Main Road), South Banasree, Dhaka 1219, Bangladesh.
- Service groups (six): UI/UX & Product Design · Website Development · Custom Software & Business Systems · Mobile App Development · AI Products & Automation · Backend, APIs & Ongoing Development.
- Product capabilities: SaaS & MVPs · ERP, accounting, POS · CRM, HRM, inventory · live streaming & voice party apps · video calling & communication · social & creator platforms · gaming & entertainment · virtual gifts, coins, wallets & subscriptions · live commerce · AI applications · event & community platforms · admin dashboards & integrations.

## Not confirmed (must stay unpublished until verified)
Clients, logos, case studies, testimonials, statistics, awards, budgets, results, team size/members, pricing, legal status, revenue, phone number, office hours. The seed script creates none of these; they must be entered and verified by the agency in the admin portal.

## Taxonomies (separate and editable)
Services (+ categories) · Industries · Product types · Technologies · Blog categories/tags · Form options.

## Public site
Home (CMS sections) · Services + detail · Industries + detail · Work (portfolio with search, service/industry/product-type filters, pagination, URL state) + case study · About · Contact / Start a Project · Support · Blog + article · Privacy · Terms · 404/error pages · authenticated previews.

## Forms
- **Contact**: required name, email, topic, description, privacy acknowledgement; optional company, phone + country code, service, industry, product type, budget, timeline, contact method. Options are backend-managed; "Other / Not sure" supported; service/industry/project context is preselected from CTAs.
- **Support**: name, email, optional company/phone/project reference, subject, issue category, description, privacy acknowledgement. No account required.
- Persist first, then notify; notification failures are recorded and retryable.

## Admin portal roles
| Role | Can |
|---|---|
| Super Admin | Everything, users, audit log |
| Content Editor | Public content, pages & sections, media, settings |
| Inquiry Manager | Inquiries & support (assign, notes, status, export, delete) |

## Language
English for public content and admin.
