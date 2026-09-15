# Lifelong Learning at SETU — Design Toolkit → Course Design Reference

Extracted from *Lifelong Learning at SETU Design Toolkit* (Version 1, July 2026, WIP),
for application to this course and all future courses built from this template.
Reviewer comments in the source PDF were deliberately ignored. Where the toolkit is
silent, the **SETU masterbrand guidelines** apply (the toolkit itself says so).

---

## 1. Positioning and voice

- **Programme:** *Lifelong Learning at SETU* — extends the SETU brand to adult learners,
  professionals and organisations; flexible online/blended/part-time pathways with
  university-standard credibility.
- **Tagline:** **LEARN MORE. GO FURTHER.** — clear, confidence-building, encouraging,
  supportive. Set in Compressa Condensed Black, uppercase, two lines.
- **Tone:** supportive, accessible, credible; "not simply about qualifications — people
  realising what they are capable of." Reassuring to nervous/returning learners;
  authoritative for employers and mid-career professionals.
- **Audiences the copy adapts to:** first-time HE learners, adults returning to
  education, career changers, employers/organisations, mid-career professionals,
  flexible upskillers, learners from disadvantaged backgrounds, access participants,
  international/remote learners.
- **Course copy implication:** write from the learner's side; name barriers
  ("Will you feel out of your depth?") and answer them with credibility + support.

## 2. Colour — an annually rotating system

The LLL palette is a **selected subset of the SETU palette that rotates each academic
year**, always anchored on **Slate Grey** and **White**. The template should expose this
as a single config switch (`programmeYear`).

| Year | Accent trio | Anchors |
|---|---|---|
| **2026/27** (current) | Heather Purple `#5F5AA8` · Sunset Red `#E74751` · Clover Pink `#A752A0` | Slate Grey `#435465` · White |
| 2027/28 | Suir Blue `#2AC5F4` · Barrow Blue `#0062AF` · Grass Green `#4EB47D` | Slate Grey · White |
| 2028/29 | Sea Green `#378B84` · Sunrise Yellow `#FCCA3A` · Suir Blue `#2AC5F4` | Slate Grey · White |

**Tints:** each accent is approved at **80 / 60 / 40 / 20 %** (mixed toward white).
Use tints for panels, backgrounds and hover states rather than inventing new colours.

**2026/27 reference values**
- Slate Grey `#435465` — C77 M60 Y44 K25 · PMS 7547 · RAL 7024
- Heather Purple `#5F5AA8` — C73 M73 Y0 K0 · PMS 7672 · RAL 4005
- Sunset Red `#E74751` — C0 M84 Y58 K0 · PMS 199 · RAL 3018
- Clover Pink `#A752A0` — C37 M81 Y0 K0 · PMS 7655 · RAL 4006

## 3. Gradients — the core visual element

- Built **only** from the year's accent trio **+ White**. Soft, diffuse, *mesh-like*
  blends with broad light "highlight" bands — never hard linear stripes, never extra
  colours, never mixed years.
- Used for: hero/cover panels, U-shape fills, crest fills, feature/quote panels,
  section dividers. Kept as high-impact moments; they should not dominate reading pages.
- **Text on gradients (accessibility):**
  - Slate Grey text on **light** gradient areas; **white** text on **dark** areas.
  - Never run text across multiple tonal shifts.
  - Generous clear space around key messages. Test contrast before shipping.
- **Screen recipe (CSS approximation):** layered `radial-gradient`s of the three accents
  with a large white/tinted highlight, on a base of one accent; a subtle grain overlay
  matches the toolkit's soft, slightly textured look. Prefer the **official gradient
  assets** if supplied.

## 4. Graphic devices

**U-Shape (primary layout device).** A rounded-bottom "U" panel derived from the SETU
identity. It **houses** things: gradient fills, photography, type, campaign messaging.
Rules: gradients inside the shape; clear margins around it; legible content within it;
photography inside it to spotlight learners. On screen it works as the hero panel,
a lesson-header panel, a quote/statement panel (white U cut-out on gradient), and a
contact/footer panel.

**Crest symbol.** The radiating-lines SETU crest, in gradient versions for LLL. Use
**large**, **crop confidently** for dynamic compositions, combine with gradients and
photography, keep it identifiable, **no repetition within one layout**. On screen: a
large cropped crest bleeding off a hero or overview corner is the signature move.

**3D symbol.** Rendered tubes in Slate + one accent; hero/background visual. Balance its
complexity with simple type and generous space; crop to abstract compositions. Use only
if official renders are supplied.

## 5. Typography

| Role | Face | Notes |
|---|---|---|
| Campaign headlines & tagline | **Compressa Condensed Black** | Uppercase, tight leading; **licensed** — needs a supplied web font, else a condensed fallback |
| Short headlines, titles, CTAs | **DM Sans Bold** | The everyday display face |
| Paragraph headers & body | **Inter** (range of weights; Medium for sub-heads) | Always **left-aligned** — justified type is explicitly avoided for accessibility |

Screen-scale hierarchy (derived from the toolkit's PowerPoint specs, where slide pt ≈ px
at 1:1): title ~38–42, big statement/quote ~44, slide/section title ~40, sub-head ~25
DM Sans Bold, body ~18–25 Inter Medium, small labels Inter. A sub-head may be set in a
single accent colour (the toolkit shows an amber/accent sub-head over slate).

## 6. Photography

Five themes: **Embodied Futures** (learners already living the future they're working
toward), **Learning in Real Life** (homes, workplaces, evening/early study), **Supported
Journeys** (small groups, feedback, collaboration — not lecture halls), **Skills in
Action** (making, testing, tools and screens in frame), **Our People** (natural
environmental portraits, diverse ages/backgrounds).
Styling: shallow depth of field, high contrast, soft natural light, strong saturation,
relaxed poses. **Avoid** staged corporate stock, artificial poses, overly youthful
"undergraduate" imagery, visible brands, cluttered backgrounds. Shoot portrait and
landscape crops. Course use: hero images and the inside of U-shapes; never decorative
filler.

## 7. Layout patterns (from the covers, flyers, social and PowerPoint examples)

- **Slate Grey ground + one gradient U-panel + white type** is the default hero.
- **Gradient background + white U cut-out holding a quote/statement** in Slate type.
- **Photo + gradient U overlay** carrying title and short text; logo top-left in white.
- Title block: DM Sans Bold title, Inter Medium subtitle beneath, tagline in Compressa
  where campaign-level.
- Always a **small "setu.ie" or programme URL** anchor and the white logo on dark panels.
- Generous margins; one focal graphic per layout; type never fights the crest.

## 8. Accessibility rules carried into the template

- Left-aligned copy; no justified text.
- Contrast-checked type on every gradient (slate-on-light / white-on-dark).
- Colour never the only carrier of meaning (state also shown by shape/label).
- Clear space around logo and crest; nothing intrudes on the U-shape's margins.

## 9. How this maps onto the course template

- `programmeYear` config → selects the accent trio + gradient set (2026/27 default).
- Heroes, overview and statement panels use **U-shape** containers with mesh gradients.
- A single large **cropped gradient crest** on the course overview page (one per layout).
- Section accents cycle through the year's trio (not the full SETU palette).
- Tagline "LEARN MORE. GO FURTHER." available as an optional cover/closing element.
- Photography slots in heroes/U-shapes follow §6; placeholders are labelled by theme.
