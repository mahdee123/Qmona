# Admin guide

Sign in at **https://qmona.com/admin** (local: http://localhost:3000/admin). Accounts are created by a Super Admin (Admin → Users) or on the server with the `create-admin` command (see `docs/deploy/README.md`). There is no sign-up page.

## Roles
- **Super Admin** — everything, plus Users and Audit log.
- **Content Editor** — pages & sections, projects, blog, services, industries, FAQs, testimonials, credibility, pricing, team, media, navigation, legal pages, form options, site settings.
- **Inquiry Manager** — Inquiries & support only.

## Publishing rules (please read)
Only publish what is true and approved:
- **Projects**: real work the client agreed to show. Keep "Show client name", "Show budget" and "Show approved links" off unless the client agreed. Unverified projects stay **Draft**.
- **Testimonials**: need the client's approval; tick **Verified** (and note the evidence internally) before **Published**. The website hides the testimonials section until one is published.
- **Credibility**: capability facts can be published; statistics, awards and client logos need **Verified**.
- **Pricing**: publish only confirmed prices. The pricing section is also switched off in Pages & sections by default.
- **Team**: only people who agreed to appear.
- **Legal pages**: Terms are a draft placeholder — have them written/reviewed before publishing. The privacy policy describes how the website actually handles form data; review it.

Changes appear on the website within seconds of saving (or within 5 minutes if the website cannot be notified).

## Homepage & page sections (Pages & sections)
Open a page (Home, About, Services, …). For each section you can:
- reorder with the ↑ ↓ arrows,
- show/hide with the switch (hidden sections stay saved),
- **Edit**: layout variant, small label, headline (press Enter for the second line), sub-headline, section-specific content (buttons, images, limits) and motion (on/off, preset, duration, delay),
- add a new section of an allowed type, or delete one.
Sections with no published data (projects, blog, testimonials, pricing, team) hide themselves automatically.
Use **Preview** to see the page before visitors do, and **Page settings & SEO** for the title and description.

## Projects
Projects → New project. Fill the title (slug is generated), summary, statuses, taxonomies, case study text, features, outcomes (verified only), budget (visible only if allowed) and SEO. After the first save, a **Gallery & mockups** panel appears: upload images or pick from the library, add captions/alt text, choose mockup/screenshot and full/half width, and reorder. Use **Preview** for drafts; switch **Publication status** to Published to go live. *Featured* projects can appear in the homepage feature panel.

## Blog
Blog posts → New post. Content is built from blocks (paragraph, heading, list, quote, callout, image, divider). Formatting: `**bold**` and `[link text](https://…)` or `[link](/contact)`. Set status to Published; a future publish date schedules the post.

## Media library
Upload PNG, JPEG, WebP or SVG (max 10 MB). SVGs containing scripts, event handlers or external references are rejected. Always add **alt text** describing the image. The detail panel shows where a file is used; files in use cannot be deleted until removed from those places.

## Navigation, form options, settings
- **Navigation**: header links (one level of dropdown), the header CTA (tick "Render as the header CTA button"), footer columns and legal links.
- **Form options**: choices in the contact/support forms. Deactivate instead of deleting options that were already used.
- **Site settings**: name, contact details, logos, favicon, accent colour (approved palette), site-wide animation switch, default SEO image and text, privacy acknowledgement text.

## Inquiries & support (Inquiry Manager)
- The list shows unread items highlighted; filter by type, status, date, service, industry, assignee or archive state, or search.
- Opening an inquiry marks it read. Use **Email**/**Call** buttons to respond from your own mail client.
- Set **status** (New → Reviewing → Contacted → Qualified → Closed, or Spam) with an optional comment — every change is kept in the history.
- **Assign** to a team member, add **private notes** (never visible to clients).
- **Email notification** shows whether the agency email was sent; use **Retry** if it failed. A failed email never loses the submission.
- **Archive** hides finished items from the default list. **Delete** permanently removes the record (type the reference to confirm) — use it for deletion requests from the person concerned.
- **Export CSV** exports the current filtered list (spreadsheet-formula-safe), e.g. for a data access request.

## Data retention guidance
Keep inquiries only as long as needed for the relationship. Suggested routine: archive closed items monthly; delete spam and closed inquiries older than 24 months unless needed for contracts/accounting. Exports, deletions and logins are recorded in the Audit log.
