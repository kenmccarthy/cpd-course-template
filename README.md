# CPD Course Template

A reusable template for building clean, modern, self-paced SCORM 1.2
e-learning courses as **standalone static sites** — no build step, no server
framework, no external dependencies (fonts are self-hosted, JS is vanilla).

The repo ships with a complete, working example course — *Understanding
Module Descriptors*, styled to the **SETU Online Course Brand Guide** (SETU
Brand Guidelines v1, May 2022) — so you can see the whole system (navigation,
progress tracking, interactive widgets, SCORM packaging, theming) in a
finished state before adapting it.

## Using this as a template

1. **Fork or use this as a GitHub template repo**, then clone it.
2. **Set course identity.** Either run the interactive setup script:
   ```bash
   python3 scripts/init_course.py
   ```
   or edit `js/course.config.js` by hand. This is the single source of
   truth for course title, slug, institution name, the `localStorage` key,
   the SCORM pass mark, and the list of interactive `activities` the results
   dashboard counts — it drives `js/core.js`, `js/dashboard.js`,
   `js/analytics.js`, `imsmanifest.xml` (kept in sync by the script), and the
   output zip filename from `scripts/build_scorm.py`. Re-running the script
   carries your `activities` list over unchanged.
3. **Replace branding.** Swap the logo files in `assets/` (`MONO_WHITE.png`,
   `MONO_BLACK.png`, `RGB.png`, `favicon.png`) for your own, and update the
   color tokens under `/* SETU primary */` / `/* SETU secondary (accents) */`
   in `css/styles.css` (`:root`, lines ~26-41) to your institution's palette.
   Everything else in the stylesheet (layout, components, animations,
   dark theme) reads from those tokens, so a palette swap re-themes the
   whole course.
4. **Write your own section content.** Course copy, learning objectives,
   knowledge checks, and interactive widgets live directly in `index.html`
   (structure) and `js/interactions.js` (widget logic/data, e.g. Bloom's
   verbs, NFQ levels). Use the existing 7 sections as a worked pattern for
   markup, quiz structure, and widget wiring; replace the copy and swap or
   remove widgets that don't fit your subject. There's no data-driven
   content layer — this is a template you edit directly, not a generator.
5. **Update page chrome text.** A handful of strings are still literal HTML
   and aren't read from config: the `<title>`/`<meta description>` in
   `index.html`'s `<head>`, the sidebar `<h1>` and footer text, and the
   topbar title span. Search `index.html` for the course title to find them.
6. **Build the SCORM package** once your content is ready:
   ```bash
   python3 scripts/build_scorm.py
   # -> dist/<your-course-slug>-scorm12.zip
   ```

No shell file needs editing to add a second matching exercise, a second tab
explorer, or a different set of activities — `[data-match]` and `[data-tabs]`
are keyed by their attribute value, and the dashboard reads `activities` from
config. See **Adding a second instance of a widget** below.

**What's reusable vs. what you edit per course**

| Reusable (structural) | Edit per course |
|---|---|
| `js/core.js`, `js/scorm.js`, `js/analytics.js`, `js/animations.js`, `js/confetti.js`, `js/dashboard.js`, `js/app.js` | `js/course.config.js` (identity, `finalQuiz`, `activities`) |
| `css/styles.css` layout, components, animation rules | `css/styles.css` color tokens (~lines 26-41), `assets/` logos/fonts |
| `scripts/build_scorm.py`, `scripts/init_course.py` | `index.html` section content, `js/interactions.js` widget data |
| SCORM 1.2 plumbing (`imsmanifest.xml` structure, `js/scorm.js` adapter) | `imsmanifest.xml` identity fields (kept in sync by `init_course.py`) |

---

## The example course: Understanding Module Descriptors

A clean, modern, self-paced e-learning course built from the *Understanding
Module Descriptors* narration & build script (originally written for Articulate
Rise) and styled to the **SETU Online Course Brand Guide** (SETU Brand
Guidelines v1, May 2022). It is a fully **standalone** static web course — no
build step, no server framework, and no external dependencies (brand fonts are
self-hosted).

**Audience:** Industry-based part-time lecturers with high subject expertise but
limited HE/quality-assurance background.
**Pitch level:** NFQ Level 8 (honours bachelor degree standard) — language,
concepts and tasks are calibrated accordingly.
**Runtime:** ~30 minutes, 7 sections.

**Built from:** *Understanding Module Descriptors — Full Narration & Build Script
for Articulate Rise On-Demand Session* (Script 1, V2).

### Reflection-led, not quiz-led

The script is deliberately **reflection-led**. Knowledge checks appear only where a
factual or conceptual check genuinely adds value — there is exactly **one** in the
course (Section 3, a scenario question on constructive alignment). Every other
section instead asks learners to apply the concept to their own **industry
background**, through an ungraded reflection prompt.

That design decision drives the completion model, so it is worth stating plainly:

- `finalQuiz` in `js/course.config.js` is **empty**, so there is no graded quiz.
- The course therefore reports SCORM **`completed`**, never `passed`/`failed`, and
  **sends no score**. `<adlcp:masteryscore>` is omitted from `imsmanifest.xml`.
- Knowledge-check and pitch-check answers are still written as
  `cmi.interactions.n` entries, so per-question analytics survive.
- The results dashboard reports *sections viewed*, *reflections written* and
  *activities explored* instead of a quiz score.

To turn a future course back into a graded one, list the question ids in
`finalQuiz`, mark those knowledge checks with `data-final`, and restore
`<adlcp:masteryscore>` in the manifest. Everything else adapts automatically.

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

| Section | Topic | Time |
|--------:|-------|-----:|
| 1 | Welcome & orientation (objectives, Level 8 framing) | 1.5 min |
| 2 | What a module descriptor is and why it matters | 4.5 min |
| 3 | Learning outcomes, Bloom's Taxonomy & constructive alignment | 7 min |
| 4 | NFQ levels and their alignment with the EQF | 6.5 min |
| 5 | ECTS credits, EQF & student workload | 7 min |
| 6 | Bringing it together (four-question checklist) | 2 min |
| 7 | Summary, references & reflective activity | 1.5 min |

Sections are numbered **1–7** everywhere the learner sees them (navigation,
lesson cards, hero eyebrows). Internally each `<section class="lesson">` keeps a
0-based `data-lesson` id (`0`–`6`) — that id is what `localStorage` progress and the
SCORM bookmark use, so renumbering the display never disturbs saved progress.

### Interactions (all native, no libraries)
- **Knowledge check** (§3) — one scenario MCQ with instant feedback, retry, shake-on-wrong / tick-on-correct
- **Reflections** (§2–§5, §7) — five ungraded *industry-link* prompts that ask learners to map the concept onto their own professional experience (saved locally, never submitted) with an **export-to-file** option
- **Descriptor explorer** (§2) — a keyboard-operable tab list; pick each part to reveal what it tells you
- **Build a learning outcome** (§3) — verb + object + standard → a sample outcome with its Bloom's level
- **Alignment checker** (§3) — set outcome/teaching/assessment levels for a live aligned/misaligned verdict
- **Bloom's matching** (§3) — five outcome phrases onto six Bloom's levels, where one level takes two phrases and two levels stay empty (so it can't be solved by elimination). Drag-and-drop, tap-to-place *and* keyboard, with confetti on a perfect score
- **NFQ tabs + scrubber** (§4) — Levels 6–9 via arrow-key tabs or a slider
- **Pitch check** (§4) — match tasks to their NFQ level (practice, not scored)
- **ECTS calculator** (§5) — live sliders with an animated contact-vs-independent split bar
- **Workload budget** (§5) — toggle assessment tasks against a 76-hour budget; bar turns red when over
- **Readiness checklist** (§6) — a conic-gradient progress ring (an instance of the generic checklist widget below)
- **Results dashboard** (§7) — live tiles for sections viewed, reflections written and activities explored
- **Self-building SVG graphics** — annotated descriptor, Bloom's pyramid (with the Level 8 band marked), alignment triangle, and a side-by-side **NFQ–EQF ladder** highlighting NFQ 8 / EQF 6

### Adding a second instance of a widget

The matching exercise and the tab explorer are keyed by their own data
attribute, so a course can carry several of each without touching the shell:

```html
<div class="widget match" data-match="bloom">   <!-- emits "bloom-match" -->
<div class="widget match" data-match="rubric">  <!-- emits "rubric-match" -->

<div class="tabs" data-tabs="nfq">              <!-- emits "nfq-tabs" -->
<div class="tabs" data-tabs="levels">           <!-- emits "levels-tabs" -->
```

The attribute value becomes the `interaction.complete` id, which is what the
results dashboard, SCORM `suspend_data` and analytics all key on. Add the new
id to `activities` in `js/course.config.js` and the dashboard counts it.

Everything else follows the same rule: a widget is a no-op when its markup is
absent, so removing a section's markup removes the widget with it — just drop
its id from `activities` too.

### Widgets available to any course

Three components are carried in the shell but only appear when a course
provides their markup, so they cost nothing here. Each one's markup contract is
documented at the top of its block in `js/interactions.js`.

**Checklist with a progress ring** — a tickable self-audit. Keyed like the other
widgets, so a course can have several; the message under the ring is picked by
score from `data-msgs`, which keeps the copy in the HTML rather than the JS.

```html
<div class="widget checklist" data-checklist="readiness"
     data-msgs="none yet|one|two|three|all four">   <!-- emits "readiness-checklist" -->
  <div class="checklist__grid">
    <label class="check"><input type="checkbox"> <span>…</span></label>
  </div>
  <div class="checklist__meter">
    <div class="checklist__ring" data-ring><span data-score>0/4</span></div>
    <p class="checklist__msg" data-msg role="status">none yet</p>
  </div>
</div>
```

**Scenario chooser** — a situation with several approaches, each carrying its own
trade-off feedback. Deliberately **not scored**: the verdicts read *strong choice*
/ *workable, with trade-offs* / *high risk* rather than right and wrong, and the
event reports how many options the learner opened, which rewards comparing rather
than guessing.

```html
<div class="widget scenario" data-scenario="planning">   <!-- emits "planning-scenario" -->
  <p class="scenario__setup">…the situation…</p>
  <div class="scenario__opts">
    <button class="scenario__opt" data-verdict="good" data-feedback="what this trades off">
      <span class="scenario__opt-k" aria-hidden="true">A</span><span>…the approach…</span>
    </button>
  </div>
  <div class="scenario__fb" role="status"></div>
</div>
```

**Side-tab explorer** — a `.tabs--side` variant of the tab widget that puts the
tab list in a column beside its panel, for labels too long to sit in a row. Same
JS, same keyboard behaviour; add `.tabs--side` and wrap the list and panels in
`.tabs__grid`. It stacks to one column below 760px.

Remember to add each widget's id to `activities` in `js/course.config.js` if it
should count toward *activities explored*.

### Learner experience
- Left-hand lesson navigation with live **progress bar** and completed ticks
- **Scroll-reveal** entrances, **count-ups**, and **micro-interactions** — all disabled under `prefers-reduced-motion`
- Previous / Next buttons and **←/→ keyboard** navigation (ignored while a form control, tab list or matching token has focus)
- Progress, quiz answers, activities and reflection notes **persist** in `localStorage`
- **Light / dark** theme (follows the OS, with a manual toggle)
- Fully **responsive** with a slide-out menu on mobile

## Rise-style learner experience (Lifelong Learning at SETU look)

The template follows the Articulate Rise pattern and the *Lifelong Learning at SETU
Design Toolkit* (see `docs/design-toolkit.md`):

- **Course overview page** — the front door: a Slate Grey hero with a gradient
  **U-shape** panel (title, subtitle, tagline "LEARN MORE. GO FURTHER."), a large
  cropped **gradient crest**, a *Start / Continue* button, and **lesson cards**
  showing duration and live status (not started / in progress / completed) with a
  progress bar. Also reachable from the sidebar's "Course overview" item.
- **Hero banner per lesson** — every lesson opens with the *same treatment as the
  overview*: a Slate Grey block with a gradient **U-panel** (eyebrow "Section N of 7",
  title, read time), the large cropped **gradient crest**, and a progress strip on
  the right (one segment per section, completed ones in Grass Green) with a
  "N of 7 sections completed" line. The eyebrow and strip are rendered by
  `js/rise.js` from `Course.SECTIONS`, so the counts are never hand-typed. To add a
  cover photo, place `<img class="hero__bg" src="assets/…" alt="">` as the first
  child of the `.hero` element — it sits behind the crest at reduced opacity.
- **Continue-button reveal** — lesson content is paced in chunks separated by
  `<div class="gate" data-gate></div>` markers. Each *Continue* reveals the next chunk
  with a staggered entrance and scrolls to it; the lesson's Next/Previous bar appears
  only after the last gate. Progress through the gates persists and feeds the lesson
  cards. `Course.rise.revealAll(lessonEl)` opens a lesson fully (testing/accessibility).
- **Horizontal slide transitions** — lessons slide in from the right (forward) or the
  left (back) with a crossfade; a plain swap under `prefers-reduced-motion`. The
  outgoing lesson is pinned at the scroll position the learner was reading (so that
  part is what slides away), the scroll reset is instant rather than smooth, and
  blocks already in view settle at once instead of staggering in on top of the slide —
  one motion per page change, no judder.
- **Rise block layout** — a wider 900px content column for full-bleed blocks, with prose
  held to a ~70-character measure for readability.

### Programme colour year

`programmeYear` in `js/course.config.js` selects the Lifelong Learning accent trio
(always on Slate Grey + White). It drives section accents, tints, mesh gradients,
heroes and cards:

| Year | Accent trio |
|---|---|
| `"2026/27"` (default) | Heather Purple · Sunset Red · Clover Pink |
| `"2027/28"` | Barrow Blue · Suir Blue · Grass Green |
| `"2028/29"` | Sea Green · Sunrise Yellow · Suir Blue |

Section accents cycle through the trio via `data-accent="1|2|3"` on each lesson.
Semantic colours stay fixed (Grass Green = correct, Sunset Red = incorrect).

### Tagline font

The campaign tagline uses **Compressa Condensed Black**, a licensed face. Drop
`assets/fonts/compressa.woff2` into the repo to enable it; until then it falls back to
DM Sans Bold. Set `showTagline: false` in the config to hide the tagline entirely.

### Icons

All UI icons come from a single **inline SVG sprite** at the top of `index.html`
(24px line icons adapted from Lucide, ISC licence) — no emoji, no icon font, no
external requests, so they render identically on every OS and LMS. Use one with

```html
<svg class="icon" aria-hidden="true" focusable="false"><use href="#i-check"></use></svg>
```

or from JavaScript with `Course.icon("check")`. Icons are decorative (the adjacent
text carries the meaning); add new `<symbol id="i-…">` entries to the sprite as
needed. Sizing follows the surrounding font size (`.icon` = 1.05em) with a few
context overrides in `css/styles.css` under *Icons + accessibility utilities*.

## Accessibility

The template is built to WCAG 2.1 AA and audited with axe-core (no violations
across the overview, lessons and the dark theme). Conventions to keep when
authoring new courses:

- **Landmarks & skip link** — `<main id="scroll">`, `<nav aria-label="Course
  sections">`, and a "Skip to course content" link that appears on keyboard focus.
- **Page changes are announced** — a visually hidden live region (`#a11yStatus`)
  receives "Section N of 7: …", "Course overview", "More of this section revealed"
  etc. via `Course.announce(text)`; focus moves to the new lesson's `<h1>` (or the
  newly revealed chunk after *Continue*) so screen-reader and keyboard users land on
  the new content. The active navigation item carries `aria-current="page"`.
- **Real widget semantics** — NFQ levels and the descriptor explorer are ARIA tab
  lists (roving tabindex, ←/→/Home/End); the accordion buttons expose
  `aria-expanded`/`aria-controls`; knowledge-check options are grouped under their
  question, feedback and scores are `role="status"`; reflection textareas are
  labelled by their prompt; budget items use `aria-pressed`; matching tokens are
  keyboard-operable buttons and every placement/removal is announced.
- **Keyboard** — everything works without a mouse: `Esc` closes the mobile menu
  (focus returns to the menu button), the global ←/→ page shortcuts stay out of the
  way of controls, and `:focus-visible` rings are visible on every colour (white on
  slate/gradients, accent elsewhere).
- **Contrast** — text tokens and the sidebar's white-on-slate opacities meet 4.5:1;
  colour is never the only signal (correct/incorrect also show a tick/cross and text).
- **Motion** — every animation and transition, including the slide between lessons,
  is disabled under `prefers-reduced-motion`.
- **Structure** — one `<h1>` per lesson, headings step by one level, figures are
  `role="img"` with a text alternative, decorative art is `aria-hidden`.

## SCORM 1.2 packaging

The course ships ready to package for an LMS. A single **SCO** (`index.html`) and
an `imsmanifest.xml` are included; `js/scorm.js` maps the course onto the SCORM
1.2 data model. It is a **no-op when no LMS is present**, so the same files still
run standalone from `file://`.

**Build the uploadable zip:**

```bash
python3 scripts/build_scorm.py
# -> dist/<course-slug>-scorm12.zip  (manifest at the root)
```

Upload that zip to your LMS, or to <https://cloud.scorm.com> to validate.

**What it reports**

| SCORM (CMI) field | Meaning |
|---|---|
| `cmi.core.lesson_status` | **`completed`** for this course (reflection-led, no graded quiz). With a `finalQuiz` configured it reports `passed` / `failed` instead |
| `cmi.core.score.raw` | Not sent for this course. With a graded quiz: final-quiz percentage (min 0, max 100) |
| `cmi.core.lesson_location` | Bookmark — the section the learner was on |
| `cmi.suspend_data` | Compact resume state (visited sections, Continue-gate progress, answers, activities). Kept **well under the SCORM 1.2 ~4 KB cap**; reflections are **excluded** (private, and local only) |
| `cmi.core.session_time` | Time on task |
| `cmi.interactions.n` | One entry per knowledge-check answer — see *Analytics* |

**Test the adapter offline:** append `?scorm=mock` to the URL to inject a mock
LMS that logs every SCORM call to an in-memory store (used by the automated tests).

## Analytics

Per the chosen design, the **LMS is the analytics store**: every knowledge-check
and pitch-check answer is written as a `cmi.interactions.n` entry, so completion
and per-question results appear in the LMS's own reporting — no third-party
scripts, no external calls, and nothing that breaks the standalone/offline
property. Reflection prompts report only that a note was saved and how long it
was, never its text.

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
├── index.html                 # all course content + interactive markup (+ inline icon sprite)
├── imsmanifest.xml            # SCORM 1.2 package manifest (single SCO)
├── css/styles.css             # SETU design tokens, layout, components, animations
├── js/
│   ├── course.config.js       # per-course identity (title, slug, institution, storeKey, pass mark, activities)
│   ├── core.js                # state store and the event bus (foundation)
│   ├── scorm.js               # SCORM 1.2 adapter (+ ?scorm=mock test harness)
│   ├── analytics.js           # dev event inspector + optional endpoint sink
│   ├── animations.js          # scroll-reveal, count-ups, self-building diagrams
│   ├── confetti.js            # brand-coloured canvas confetti
│   ├── interactions.js        # builder, alignment, pitch, budget, readiness, anatomy
│   ├── dashboard.js           # results dashboard + export-my-notes
│   ├── rise.js                # overview page, lesson cards, Continue-reveal
│   └── app.js                 # navigation, progress, theme, core widgets
├── scripts/
│   ├── build_scorm.py         # builds dist/<slug>-scorm12.zip
│   └── init_course.py         # interactive setup for a new course's identity
└── assets/
    ├── MONO_WHITE.png         # official SETU reversed (white) logo — used in the UI
    ├── MONO_BLACK.png         # official SETU mono-black logo (for light backgrounds)
    ├── RGB.png                # official SETU full-colour logo
    └── fonts/                 # self-hosted DM Sans + Inter (variable WOFF2)
```

Load order in `index.html`: `course.config → core → scorm → analytics →
animations → confetti → interactions → dashboard → rise → app`. `course.config.js`
must load before `core.js` (which reads `window.CourseConfig`), and
`scorm.js` runs early so it can restore `suspend_data` into the shared state
before the widgets read it.

## Logos

The official SETU logo files are used directly. The interface shows
`assets/MONO_WHITE.png` (the reversed/white lockup) in the sidebar and mobile
top bar, both of which sit on Slate Grey. `MONO_BLACK.png` and `RGB.png` are
kept in `assets/` for use on light backgrounds (e.g. print, certificates, or a
light header if you add one). Clear space is preserved around the logo and it is
displayed well above the 60px minimum.

`assets/favicon.png` is used as the browser-tab icon. `assets/setu-symbol.png`
(the official SETU "U" symbol) is used everywhere the course shows its "U"
motif — the cover graphic, the small eyebrow icon on each section, and the
watermark behind statement panels — via a CSS `mask-image` on the `.cover__u`,
`.u-mark`, and `.u-watermark` classes in `css/styles.css`, so it's still tinted
with `currentColor` (white on Slate, accent colours, dark-mode-aware) rather
than baked in as a fixed-colour image.

## Placeholders / items needing your input

Marked in-course with a *[Placeholder …]* note:

- **Hero photos** — the overview and section heroes use the gradient crest; add
  approved SETU photography via `<img class="hero__bg">` if preferred.
- **Further-reading links** — the *Further reading* list in Section 7 is plain
  text; add live hyperlinks to SETU/QQI/National Forum/ECTS documents. (The
  four **References** below it already carry live DOI/JSTOR links from the script.)
- **NFQ–EQF alignment** — the ladder graphic in Section 4 uses the commonly
  published Irish mapping. Confirm it level-by-level against QQI's current
  comparison chart before publishing; the course carries an in-page note saying so.
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
