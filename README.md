# Understanding Module Descriptors — Standalone HTML Course (SETU-branded)

A clean, modern, self-paced e-learning course built from the *Understanding
Module Descriptors* narration & build script (originally written for Articulate
Rise) and styled to the **SETU Online Course Brand Guide** (SETU Brand
Guidelines v1, May 2022). It is a fully **standalone** static web course — no
build step, no server framework, and no external dependencies (brand fonts are
self-hosted).

**Audience:** Industry-based part-time lecturers with high subject expertise but
limited HE/quality-assurance background.
**Runtime:** ~30 minutes, 7 sections.

## SETU branding applied

- **Primary colour** Slate Grey `#435465` — body text, headings, navigation, and
  all structural UI (the common visual anchor throughout).
- **Secondary palette as accents** each section is keyed to a different SETU
  secondary colour (Barrow Blue, Sea Green, Heather Purple, Clover Pink),
  cycling with Slate Grey as the anchor, exactly as the brand guide permits.
  Semantic states reuse the palette too — **Grass Green** for correct answers,
  **Sunset Red** for incorrect.
- **Typography** headings in **DM Sans** (Bold), body in **Inter** — both
  self-hosted as variable WOFF2 files in `assets/fonts/` (no CDN, works offline).
- **Left-aligned** body content throughout, per the guide's accessibility note.
- **SETU "U" motif** used as a recognisable graphic element — on the cover,
  as section markers, and as watermarks behind statement/quote panels.
- **Gradients used sparingly** — a single Slate → Barrow Blue gradient on the
  hero cover only, paired with Slate Grey as the guide advises.
- **Logo** placed top-left in the sidebar (and mobile top bar) with clear space,
  at a legible size above the 60px minimum.
- **8px spacing scale** and generous whitespace for a clean, spacious feel.

## What's included

| Section | Topic |
|--------:|-------|
| 0 | Welcome & orientation (cover, objectives) |
| 1 | What a module descriptor is and why it matters |
| 2 | Learning outcomes, Bloom's Taxonomy & constructive alignment |
| 3 | NFQ levels |
| 4 | ECTS credits & student workload |
| 5 | Bringing it together (four-question checklist) |
| 6 | Summary, final quiz & reflection |

### Interactions (all native, no libraries)
- **Knowledge checks** — MCQ and true/false with instant feedback, retry, shake-on-wrong / tick-on-correct
- **Reflections** — open text prompts (saved locally, never submitted) with an **export-to-file** option
- **Descriptor explorer** (§1) — click each part to reveal what it tells you
- **Build a learning outcome** (§2) — verb + object + standard → a sample outcome with its Bloom's level
- **Alignment checker** (§2) — set outcome/teaching/assessment levels for a live aligned/misaligned verdict
- **Bloom's matching** (§2) — drag-and-drop *and* tap-to-place, with confetti on a perfect score
- **NFQ tabs + scrubber** (§3) — Levels 6–9 via tabs or a slider
- **Pitch check** (§3) — match tasks to their NFQ level
- **ECTS calculator** (§4) — live sliders with an animated contact-vs-independent split bar
- **Workload budget** (§4) — toggle assessment tasks against a 76-hour budget; bar turns red when over
- **Readiness checklist** (§5) — a conic-gradient readiness ring
- **Results dashboard** (§6) — live tiles for sections, quiz score and activities explored
- **Self-building SVG graphics** — annotated descriptor, Bloom's pyramid, alignment triangle, NFQ ladder

### Learner experience
- Left-hand lesson navigation with live **progress bar** and completed ticks
- **Scroll-reveal** entrances, **count-ups**, and **micro-interactions** — all disabled under `prefers-reduced-motion`
- Previous / Next buttons and **←/→ keyboard** navigation
- Progress, quiz answers, activities and reflection notes **persist** in `localStorage`
- **Light / dark** theme (follows the OS, with a manual toggle)
- Fully **responsive** with a slide-out menu on mobile

## SCORM 1.2 packaging

The course ships ready to package for an LMS. A single **SCO** (`index.html`) and
an `imsmanifest.xml` are included; `js/scorm.js` maps the course onto the SCORM
1.2 data model. It is a **no-op when no LMS is present**, so the same files still
run standalone from `file://`.

**Build the uploadable zip:**

```bash
python3 scripts/build_scorm.py
# -> dist/understanding-module-descriptors-scorm12.zip  (manifest at the root)
```

Upload that zip to your LMS, or to <https://cloud.scorm.com> to validate.

**What it reports**

| SCORM (CMI) field | Meaning |
|---|---|
| `cmi.core.lesson_status` | `passed` (final quiz ≥ 75%), `failed` (below), or `completed` (finished, quiz not fully attempted) |
| `cmi.core.score.raw` | Final-quiz percentage (min 0, max 100; mastery score 75) |
| `cmi.core.lesson_location` | Bookmark — the section the learner was on |
| `cmi.suspend_data` | Compact resume state (visited sections, answers, activities). Kept **well under the SCORM 1.2 ~4 KB cap**; reflections are **excluded** (private, and local only) |
| `cmi.core.session_time` | Time on task |
| `cmi.interactions.n` | One entry per knowledge-check answer — see *Analytics* |

**Test the adapter offline:** append `?scorm=mock` to the URL to inject a mock
LMS that logs every SCORM call to an in-memory store (used by the automated tests).

## Analytics

Per the chosen design, the **LMS is the analytics store**: every knowledge-check
answer is written as a `cmi.interactions.n` entry, so completion, scores and
per-question results appear in the LMS's own reporting — no third-party scripts,
no external calls, and nothing that breaks the standalone/offline property.

- **Event bus** — all interactions emit typed events through `js/core.js`
  (`section.view`, `knowledge_check.answer`, `interaction.complete`,
  `quiz.complete`, `course.complete`, …). SCORM and analytics subscribe to these.
- **Dev event inspector** — append `?debug=1` to see a live on-screen log of
  every event (and whether an LMS is connected).
- **Optional self-hosted sink** — for non-LMS hosting, set
  `Course.analytics.endpoint = "https://…"` to POST events via `sendBeacon`.
  Disabled by default.

## Running it

It's static, so any of these work:

```bash
# Simplest: just open the file
open index.html            # macOS   (or double-click it)

# Or serve it (recommended for a shared/hosted copy)
python3 -m http.server 8000
# then visit http://localhost:8000
```

Deploy by copying the whole folder to any static host (GitHub Pages, Netlify,
an LMS file area, a shared drive, etc.).

## File structure

```
.
├── index.html                 # all course content + interactive markup
├── imsmanifest.xml            # SCORM 1.2 package manifest (single SCO)
├── css/styles.css             # SETU design tokens, layout, components, animations
├── js/
│   ├── core.js                # config, state store, and the event bus (foundation)
│   ├── scorm.js               # SCORM 1.2 adapter (+ ?scorm=mock test harness)
│   ├── analytics.js           # dev event inspector + optional endpoint sink
│   ├── animations.js          # scroll-reveal, count-ups, self-building diagrams
│   ├── confetti.js            # brand-coloured canvas confetti
│   ├── interactions.js        # builder, alignment, pitch, budget, readiness, anatomy
│   ├── dashboard.js           # results dashboard + export-my-notes
│   └── app.js                 # navigation, progress, theme, core widgets
├── scripts/build_scorm.py     # builds dist/…-scorm12.zip
└── assets/
    ├── MONO_WHITE.png         # official SETU reversed (white) logo — used in the UI
    ├── MONO_BLACK.png         # official SETU mono-black logo (for light backgrounds)
    ├── RGB.png                # official SETU full-colour logo
    └── fonts/                 # self-hosted DM Sans + Inter (variable WOFF2)
```

Load order in `index.html`: `core → scorm → analytics → animations → confetti →
interactions → dashboard → app`. `scorm.js` runs early so it can restore
`suspend_data` into the shared state before the widgets read it.

## Logos

The official SETU logo files are used directly. The interface shows
`assets/MONO_WHITE.png` (the reversed/white lockup) in the sidebar and mobile
top bar, both of which sit on Slate Grey. `MONO_BLACK.png` and `RGB.png` are
kept in `assets/` for use on light backgrounds (e.g. print, certificates, or a
light header if you add one). Clear space is preserved around the logo and it is
displayed well above the 60px minimum.

## Placeholders / items needing your input

Marked in-course with a *[Placeholder …]* note:

- **Cover image** — currently the SETU U-motif over a Slate → Barrow Blue brand
  gradient. Swap in an approved SETU photo or official gradient if preferred.
- **Further-reading links** — the reference list in Section 6 is plain text;
  add live hyperlinks to SETU/QQI/National Forum/ECTS documents.
- **Hours-per-credit default** — set to 20 (common Irish HE figure); the
  calculator slider allows 20–25.

## Brand fonts

DM Sans and Inter (both open-source, and both named in the SETU guide) are
self-hosted as variable WOFF2 files under `assets/fonts/`, so the course renders
with the correct brand typography **offline and with no external requests**. If
you ever need additional weights/styles, add the WOFF2s and extend the
`@font-face` block at the top of `css/styles.css`.

All diagrams called for in the script (Bloom's pyramid, alignment triangle, NFQ
ladder, ECTS infographic, annotated descriptor) are rendered as inline SVG in
the SETU palette, so they stay crisp and theme-aware without external images.

## A note on dark mode

The SETU guide describes a white-background identity. An optional, restrained
**slate-based dark theme** is included as a learner accessibility feature (toggle
in the sidebar). The default is the on-brand light theme; the dark theme keeps
Slate Grey and the approved accents.
