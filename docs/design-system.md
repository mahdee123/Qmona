# Design system

Derived from the observed reference (`docs/reference-audit.md`). Tokens live in `frontend/src/app/globals.css`.

## Typography
- **Satoshi** (Regular 400 / Medium 500 / Bold 700), self-hosted from `src/styles/fonts/` under the ITF Free Font License. To change the brand font, replace the files and the `localFont` declaration in `src/app/layout.tsx`.
- Display/heading tracking −0.045em; headings split into explicit lines (editors press Enter in the headline field).

| Class | Use | Size (fluid) |
|---|---|---|
| `t-display` | Home hero | 38 → 64px |
| `t-h1` | Page heroes | 36 → 56px |
| `t-h2` | Section headings | 32 → 46px |
| `t-h3` / `t-h4` | Card titles | 22–28px / 22px |
| `t-lead` · `t-body` · `t-small` | Copy | 17–20 · 16 · 14px |

## Colour
| Token | Value |
|---|---|
| `ink` / `ink-deep` | #0A0A0A / #010309 |
| `accent` (editable from an approved list) | #E1443A (red) · orange · blue · violet · green |
| `body` / `muted` / `subtle` | #4D525C / #5D636F / #8A8F99 |
| `page` / `panel` / `card` | #F5F6F8 / #ECEEF1 / #FFFFFF |
| `line` / `line-strong` | #E3E6EA / #D4D8DD |

## Shape & depth
Radii 10 / 16 / 24 / 32 / 48. Card shadow (soft) and pill shadow (heavy layered, as on reference icon pills). Halftone dot textures are pure CSS (`.halftone`, `.halftone-center`). Dashed vertical guides at the container edges and dashed dividers between sections (`.guides`, `.dash-x`).

## Layout
Container 1440px max with 16 / 24 / 32px gutters. Breakpoints `tablet` 810px and `desktop` 1200px (Framer's). Grouping "panels" (gray, radius 32) hold white cards.

## Components
Button (primary red pill with white arrow capsule, secondary white, dark, outline), ArrowLink ("View →"), SectionLabel (red square + text), SectionHeading, IconPill, NumberPill, Tag, Badge, Accordion (pill + FAQ variants), Ticker, CountUp, MediaImage (stable dimensions, placeholder fallback), BlockRenderer (safe rich text), Pagination, Empty/Error states.

## Motion
| Behaviour | Implementation |
|---|---|
| Appear on scroll (fade-up 16–60px) | `Reveal` (motion/react, `whileInView`, once) |
| Hero stagger (spring stiffness 66, damping 20) | `Reveal spring immediate` with staggered delays |
| Tween 0.6s ease [0.62, 0, 0.41, 1] | default `Reveal` transition / `--ease-reference` |
| Number count-up | `CountUp` |
| Header hides on scroll down, returns on scroll up | `Header` (`useScroll`) |
| Marquee | `Ticker` (CSS animation, pauses on hover) |
| Accordions | `Accordion` (height/opacity) |

Editors control per-section motion (on/off, preset fade-up/fade/scale/none, duration 0.2–1.2s, delay 0–1.5s) and a site-wide switch. `prefers-reduced-motion` always disables animation (MotionConfig `reducedMotion="user"` + CSS override).

## Imagery
Temporary placeholders (`public/images/placeholder-*.png`, `og-default.png`) are generated abstract artwork, not photographs of real work. Replace them by uploading real media in the admin.
