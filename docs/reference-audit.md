# Reference Audit — lamossa.framer.website

Inspected 2026-11-01 with a headless Chromium (patchright) via the `browser-automation` skill,
plus raw HTML/CSS extraction with `curl`. Screenshots were taken at 1440, 1024 and 390 px
(homepage) and 1440 px (projects, project detail, about, blog, blog post), after scrolling
the page to trigger appear animations.

Everything below is **observed** unless marked *(inferred)*.

## 1. Global tokens (from the published CSS)

| Token | Value | Notes |
|---|---|---|
| Font | **Satoshi** 500/700 (headings + UI), Inter for some body copy | Satoshi is a free Fontshare (ITF) font; self-hosted in `frontend/src/styles/fonts/` as a replaceable slot |
| Heading tracking | −0.04em … −0.05em | Tight, display-style |
| Type scale | 48 / 42 / 40 / 36 / 32 / 28 / 24 / 22 / 20 / 18 / 16 / 15 / 14 / 12 px | |
| Ink | `#0A0A0A`, `#010309` | Text + black buttons + icon pills |
| Accent | `#E1443A` → gradient to slightly lighter red on CTAs | Primary CTA, section-label square, "New/Hiring" badges, quote marks |
| Secondary text | `#595959`, `#5D636F`, `#737373` | |
| Page background | `#F5F6F8`-ish (`#F6F7F8` token) | |
| Panel (grouping) | `#EEF0F3`-ish, radius 32 | Gray rounded panel that holds white cards |
| Card | `#FFFFFF` / `#FCFCFD`, radius 24 | |
| Border/hairline | `#D4D8DD`, dashed 1px guides | |
| Shadows | Layered: `0 7px 16px rgba(1,3,9,.25), 0 29px 29px rgba(1,3,9,.2), 0 65px 39px rgba(1,3,9,.15)` on icon pills; softer `.1/.09/.05` stack on cards | |
| Radii | 12, 16, 24, 32, 48, 56 | Buttons are full pills |
| Breakpoints | Desktop ≥ 1200, Tablet 810–1199, Mobile < 810 | Framer standard |
| Container | 1376 px content at 1440 viewport (32 px gutter); mobile 12–16 px gutter | |

## 2. Signature details
- **Dashed vertical guide lines** at the container's left/right edges running the full page, plus dashed horizontal dividers between sections.
- **Section label**: small red rounded square (10 px) + label text (16 px, gray-700). Centered or left-aligned depending on section.
- **Section headings**: two lines, 40–48 px Satoshi Bold, tight tracking, second line often the "punch" line.
- **Primary CTA**: red pill with label left and a white circular inner pill holding a → arrow on the right.
- **Secondary CTA**: white pill, black text, no border, soft shadow.
- **Black pill button**: "Get Started" / "Contact Us".
- **Icon pill**: black 72×48 rounded pill with a white line icon and a heavy layered drop shadow; sits top-left of stat/process/pricing cards.
- **Image frames**: images sit inside a white card with ~8 px padding; image radius ~20, frame radius ~24.
- **Halftone dot texture** at the corner of CTA cards (gray on light cards, red on black cards). Recreated with CSS radial-gradient dot patterns.
- **Tags**: small white pills (12 px text) under card titles.

## 3. Navigation
- **Desktop**: fixed header (84 px). Logo on the left; on the right a translucent white pill containing links (Company ▾, Projects + red "New" badge, Blog, About us) and a red CTA pill. **Observed behaviour**: visible at top, hides (translateY −84 px) on scroll down, reappears on scroll up.
- A fixed 140 px top gradient fade overlay sits under the header.
- **Mobile (<810)**: logo left, square gray hamburger button right (white ring). Opening shows a white rounded dropdown card under the header with icon + label rows and a full-width red CTA, while the page behind is blurred/dimmed. Hamburger icon morphs to a minus.

## 4. Homepage section order (desktop)
1. **Hero** (centered): status chip ("● Open for work"), 2-line H1 (~64 px), subtitle, red CTA + white CTA, "Trusted by" logo row. Soft red radial glow behind the hero. On desktop, floating quote cards are tilted at the left/right edges *(Lamossa testimonial content; not reusable)*.
2. **Featured project panel**: white panel with title + one-line result on the left, "View Project →" on the right, large image with 3 thumbnails overlaid bottom-left.
3. **Impact**: centered label + heading; grid of stat cards (icon pill, big number with **count-up animation observed** 1,432 → 1,500, title, description), a gray "Let's start building" CTA card, and an awards list card.
4. **Services**: left-aligned label + 2-line heading, red CTA on the right. **Accordion** of 4 items on the left (black icon pill + title + chevron; the open item shows description in a gray inset), a large image on the right. The block is `position: sticky` *(observed in computed style)*.
5. **Projects**: centered heading, 2-column grid of 6 cards inside a gray panel (title, tags, "View →" link, framed 4:3-ish image). "View All Projects" white pill bottom-right.
6. **Process**: centered heading + sub, 2×2 grid of white cards (illustration area on top, black number pill 01–04, title, description), followed by a full-width gray "Let's start building" CTA card.
7. **Pricing**: centered heading, 3 plans (light, highlighted with red halftone, black), each with icon pill, name, description, price, CTA and feature list with icons. Followed by a featured testimonial + black CTA card.
8. **Testimonials**: centered heading, 2-column cards (red quote mark, metric, metric label, quote, avatar + name + role), black full-width CTA card, "View All Reviews".
9. **FAQ**: left-aligned heading, gray panel with a "Still have question" card bottom-left and an **accordion** on the right (+ / − icons, the first item is open).
10. **Contact**: left heading + sub; contact details card (gray) on the left; form card on the right (pill inputs with gray fill, phone with country code, services checkboxes, budget select, gray "Send Request" button that turns active when valid *(inferred)*).
11. **Blog**: left heading; one large featured card on the left (meta row, title, tags, framed image with a red "Featured" chip), two horizontal cards on the right; "Read More".
12. **Final CTA panel**: centered heading + sub, red + white CTAs, logo row, red halftone glow.
13. **Footer**: logo + newsletter (pill input + red round button) on the left; Company and Socials columns on the right; bottom row with © and legal links.

## 5. Inner pages
- **Projects listing**: centered H1 + sub; a search pill (top-right); a category chip row (All + categories; the active chip is white); the same 2-column project card grid.
- **Project detail**: "← Go to Projects" pill-link, H1 + subtitle, "Preview Project" white pill, meta row (icon circle + label + value × 3: Company, Timeline, Services), large framed cover, then alternating sections (text column + stacked images, then image + text column), results/quote, CTA, "More projects" grid, contact block.
- **About**: centered H1 + sub, 1 large + 2 half-width framed images, story section, team grid, awards list, comparison table.
- **Blog post**: "← Go to Blog", "Read in 8 min", H1 (~36 px), lede, author + share buttons (X, LinkedIn), published date + categories, full-width cover (radius 32), body H5 numbered sections with 16 px gray text, inline 2-up images, related posts.

## 6. Motion (observed)
- Appear animations: opacity 0 → 1 with translateY 16/24/60 px; spring (stiffness 66, damping 20) with staggered delays (0.6 s, 0.9 s, 1.4 s) on the hero; tween 0.6 s, ease `[0.62, 0, 0.41, 1]` elsewhere.
- Number count-up on stat cards.
- Header hide/reveal on scroll direction.
- Tickers: the hero logo row scrolls horizontally on mobile (observed: logos cut off at the viewport edge in the 390 px capture).
- Accordions (services, FAQ) expand/collapse.
- **Audio / video**: none. No `<audio>`/`<video>` elements or media files in the page. **No audio is implemented.**

## 7. Not reused (Lamossa-owned content)
Client names, testimonials, metrics (+45%, $100M+, 1,500+ …), award entries, photography, logo, "Get Template"/Framer badges, and the Polar/Trustpilot links. Qmona uses its own copy, and sections that would need unverifiable claims are hidden by default (see `docs/decisions.md`).

## 8. Implementation mapping & content-driven differences

| Reference | Qmona implementation | Difference & reason |
|---|---|---|
| Fixed header, logo + pill nav + red CTA, hides on scroll down | `components/layout/header.tsx` | Same behaviour; links from CMS navigation |
| Mobile dropdown card with icon rows | Same pattern, focus trap, Esc, blurred backdrop | — |
| Hero: status chip, 2-line H1, sub, red + white CTAs, logo row, side quote cards | `sections/hero.tsx` | Logo row → ticker of **product capabilities** (no verified client logos). Side quote cards only render when ≥ 2 verified testimonials exist (none today) |
| Featured project panel | `sections/featured-project.tsx` | Hidden until a featured project is published |
| Impact: 2 stat cards + CTA card + funding + awards | `sections/impact.tsx` | Funding/award claims replaced by **truthful capability facts** (6 service groups, 12 product categories, Dhaka GMT+6). Reference's awards card → "What we build" card of product categories; real awards card appears only with verified awards |
| Services: 4-item accordion + image | `sections/services.tsx` | **6 items** (Qmona's six service groups), same component; image switches with the open item |
| Projects: 6 cards in gray panel | `sections/projects.tsx` | Frontend-only sample cards (ADR-016) until projects are published |
| Process: 4 cards with illustrations + CTA | `sections/process.tsx` | Illustrations replaced by composed icon + deliverable chips (upload slot per step) |
| Pricing: 3 plans | `sections/pricing.tsx` | Frontend-only sample plans (ADR-016) until real plans are published; includes add-on switch, featured testimonial and dark CTA card as on the reference |
| Testimonials grid with metrics | `sections/testimonials.tsx` | Frontend-only sample cards (ADR-016) until verified testimonials exist; dark CTA card and "View All Reviews" as on the reference |
| FAQ: side card + accordion | `sections/faq.tsx` | 6 truthful FAQs instead of 8 template FAQs |
| Contact: details card + form | `sections/contact.tsx` + `ContactForm` | Form extended to Qmona's required fields (topic, service, industry, product type, budget, timeline, contact method, privacy) |
| Blog: featured + 2 rows | `sections/blog.tsx` | Hidden until articles are published |
| Final CTA panel with logos | `sections/cta-banner.tsx` | Capability ticker instead of client logos |
| Footer: newsletter, company, socials, legal | `layout/footer.tsx` | **No newsletter** (no mailing system exists); socials column hidden until links are added |
| Projects page: chips + search | `/work` | Multi-group filters (service chips + industry/product-type panel), pagination, URL state |
| Project detail | `/work/[slug]` | Adds features, outcomes, budget (if public), technologies, related projects, contextual CTA |
| Blog post | `/blog/[slug]` | Same composition; share buttons X/LinkedIn |
| Pages without a reference equivalent (services, industries, support, legal) | same section/card system | — |

Font: Satoshi (the reference's font), self-hosted. Photography: none of the reference's images are used; abstract placeholders are generated locally and are replaceable.

## 9. Visual comparison log

Method: headless Chromium screenshots of the reference and of the Qmona build at the same widths (1440 and 390 px; homepage also 1024 px), compared section by section. **Not pixel-perfect** — compared by eye.

| Area | Result |
|---|---|
| Header & hero (1440) | Matches composition: logo left, translucent pill nav right, centered chip/H1/sub/CTAs, red glow. Fixed: glow was clipped under the header → hero now extends beneath the header |
| Section sequence | Matches the order mapped above; sections without verified data are hidden, so the live page is shorter than the reference (≈ 8.5k px vs 16.5k px at 1440) |
| Typography | Satoshi 700 headings with tight tracking and two-line breaks match; body Satoshi 500 (reference uses Inter in some body copy) |
| Cards | Stat cards, icon pills with heavy shadow, gray panels, white framed images and halftone CTA cards match |
| Buttons | Red gradient pill with white arrow capsule, white secondary pill, black pill — match |
| Forms | Gray pill inputs and labels-above match; Qmona form is longer (more required business fields) |
| Footer | Similar columns; no newsletter (content difference) |
| Mobile 390 | Hero stacks with full-width CTAs, hamburger + dropdown card, stacked stat cards, accordion — matches reference behaviour. Fixed: lone stat card layout on desktop |
| Motion | Implemented the observed patterns (fade-up appear, spring hero stagger, count-up, header hide/reveal, marquee, accordions). Exact timing of every reference element was **not** measured frame by frame |
| Audio | None on reference, none implemented |

### Measured style comparison (computed styles, headless Chromium, 1440 / 390 px)

| Property | Reference | Qmona before | Qmona after |
|---|---|---|---|
| H1 size | 48 / 36 px | 64 / 38.5 | **48 / 36** |
| H2 size | 40 / 32 px | 46 / 32 | **40 / 32** |
| Heading tracking | −0.05em | −0.045em | **−0.05em** |
| Page background | rgb(246,247,248) | rgb(245,246,248) | **rgb(246,247,248)** |
| Content gutter (mobile) | 12 px | 16 | **12** |
| Primary CTA height | 52 px | 60 | **52** |
| Container gutter (desktop) | 32 px | 32 | 32 |

The first by-eye review missed these differences; the measurement found them and they were corrected.
