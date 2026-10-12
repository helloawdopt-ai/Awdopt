# AWDOPT Design System: "Sticker Club"

**Status:** approved by the client (Arjun), Oct 2026. This file is the single source of truth for how AWDOPT looks, moves and sounds.

**Reference prototype:** `docs/design/prototype/*.dc.html`. These are 13 screens exported from the approved clickable mock. Read them for exact layout, spacing, copy and states. They will not run on their own (they need the design tool's runtime). They are reference files, not components to import.

When this file and the prototype disagree, **this file wins**. When this file and the agreed project scope disagree, **the scope wins**.

---

## 1. Personality

**Loud but warm. Playful on the outside, serious about trust.**

AWDOPT should feel like a sticker-covered laptop belonging to someone you'd trust with your dog. The style has three parts:

- **Chunky outlines and hard drop shadows.** Every surface is a "sticker".
- **A few things tilted.** Polaroids, speech bubbles and badges sit slightly off-angle; everything else stays straight.
- **Big, wide, friendly headings.** Short lines and lowercase sticker labels.

Calm zones. The style turns **down** wherever trust matters:

- forms that collect contact details
- consent and privacy copy
- errors
- the admin panel

In these places: no tilt, no sparkles and no jokes in the copy. Keep the same colours and borders.

---

## 2. Logo: the "aw" bubble

The wordmark is lowercase **awdopt**. The letters **"aw"** sit inside a bubblegum speech bubble with a tail at the bottom left. The name literally says *"aww"*.

### Construction

| Part | Spec |
|---|---|
| Font | Unbounded 800, letter-spacing −0.04em, line-height 1 |
| Text colour | Plum `#2A1736` |
| Bubble | wraps "aw". Background Bubblegum `#FF8FB8`, 2–3px Plum border (scale with size), radius 0.32em, padding 0.04em 0.14em 0.10em, margin-right 0.04em |
| Tail | SVG at the bubble's bottom-left, `left: 0.24em; top: calc(100% - 1px)`, size 0.30em × 0.25em, viewBox `0 0 26 22`. It has two parts: a fill `polygon points="0,-3 26,-3 4,20"` in Bubblegum, which covers the bubble's bottom border, and an outline `polyline points="0,0 4,20 26,0"` in Plum with a round join. |
| "dopt" | plain text, directly after the bubble, sharing its baseline |

The exact markup is in the header of any prototype screen (e.g. `Browse.dc.html`). Build the logo as an **SVG component** (`<Logo size=… variant=… />`) with the text converted to outlined paths, so it never depends on the font loading.

### Variants

| Variant | Use |
|---|---|
| **Primary** | Plum text, Bubblegum bubble, on Oat Milk or White |
| **Sticker** | Primary logo inside a white sticker: 3px Plum border, 30px radius, 8px hard shadow, rotated −4°. Use only for the landing hero, social images and print. |
| **Reversed** | Oat Milk "dopt" and a Bubblegum bubble with Plum "aw", on a Plum background. The bubble has no outline in this variant. |
| **App icon / favicon** | Just the "aw" bubble (with tail) centred on a Tangerine rounded square with a Plum border. At 32px and below, drop the tail and use a 1.5px border. |

### Rules
- Minimum size: the full wordmark at 20px font-size, the icon at 16px.
- Clear space: equal to the bubble's height on all sides.
- Never recolour the bubble in anything except Bubblegum, never add a second bubble, and never tilt the logo outside the "Sticker" variant.

---

## 3. Colour

### Tokens

| Token | Name | Hex | Role |
|---|---|---|---|
| `--bg` | Oat Milk | `#FFF7EC` | Page background |
| `--surface` | White | `#FFFFFF` | Cards, inputs, sheets |
| `--ink` | Plum | `#2A1736` | All text, **all borders**, hard shadows, dark surfaces |
| `--muted` | Mauve | `#6A5874` | Secondary text and meta lines |
| `--primary` | Tangerine | `#FF6B2C` | Primary buttons, the app icon, accent stickers |
| `--bubble` | Bubblegum | `#FF8FB8` | The logo bubble, "aww" stickers, heart button, photo tints |
| `--highlight` | Butter | `#FFE066` | Selected chips/options, "Good fit", private-link banner, menu button |
| `--fresh` | Mint | `#7FDDBE` | Hero panels, "Great fit", checkmarks, trust/privacy panels, success screens |
| `--peach` | Peach | `#FFD3BF` | Photo placeholder tint only |
| `--scrim` | Plum 55% | `rgba(42,23,54,.55)` | Behind bottom sheets and dialogs |

### Contrast (checked)

| Pair | Ratio | Allowed |
|---|---|---|
| Plum on Oat Milk / White | 15.5 / 16.5 | Any text |
| Plum on Butter / Mint / Bubblegum / Tangerine | 12.6 / 10.2 / 7.8 / 5.8 | Any text |
| Mauve on Oat Milk / White | 6.1 / 6.4 | Any text |
| Mauve on Butter | 4.9 | Body text OK |
| Mauve on Mint | 4.0 | **Large text only.** Use Plum on Mint instead |
| **White on Tangerine** | **2.8** | **Never.** Tangerine buttons always get **Plum** text |

**Non-text contrast.** Tangerine and Bubblegum fills are under 3:1 against Oat Milk. That is why every filled control keeps its **Plum border**. Never remove the border from a button, chip or input.

### Proportions
Oat Milk ≈ 55%, White ≈ 15%, Plum ≈ 15% (mostly lines and text), with the accents sharing the remaining 15%. Use at most **two accent colours per screen region**. Never use the bright fills as large backgrounds behind long text, except Mint and Butter for full-screen moments (loading, success).

### Meaning

| Meaning | Colour |
|---|---|
| Great fit (85+), a positive reason, done, trust | Mint |
| Good fit (70–84), selected, attention without alarm | Butter |
| Worth a look (below 70) | White chip with a Plum border |
| Things to consider | Butter "i" icon |
| Unknown or missing data | **dashed** Plum border plus the text "Not known yet". Never shown as a colour. |
| Error | Plum text with an alert icon in a small Tangerine circle, plus a written message. Never colour alone. |

---

## 4. Typography

**Fonts:** Unbounded (500–900) for display, Figtree (400–800) for text. Self-host both with `next/font`. Never use Inter, Roboto or system fonts as the visible face.

| Style | Font | Size / line-height | Weight | Tracking | Used for |
|---|---|---|---|---|---|
| Display XL | Unbounded | 30 / 1.08 | 800 | −0.035em | Landing H1 |
| Display L | Unbounded | 26–28 / 1.1 | 800 | −0.035em | Screen titles |
| Display M | Unbounded | 22–24 / 1.12 | 800 | −0.03em | Section titles, questionnaire question |
| Display S | Unbounded | 17–20 / 1.15 | 700–800 | −0.03em | Dog names in lists, sticker text |
| Body L | Figtree | 16–17 / 1.5 | 500–600 | 0 | Intro paragraphs |
| Body | Figtree | 15 / 1.45–1.5 | 400–500 | 0 | Paragraphs, list text |
| Label | Figtree | 14–15 | 800 | 0 | Form labels, card headings |
| Meta | Figtree | 13–14 | 500–700 | 0 | Mauve meta lines |
| Overline | Figtree | 13 | 800 | 0.08em, uppercase | Section labels ("WHY THIS COULD WORK") |
| Button | Figtree | 17 (mobile) / 16 | 800 | 0 | All buttons |

- Inputs are always **16px or larger**, to prevent iOS zoom.
- Numbers (scores, counts) use `font-variant-numeric: tabular-nums`.
- Sticker copy is lowercase ("aww.", "interest sent!", "in review"). Headings use sentence case.

---

## 5. Shape, lines and depth

| Element | Border | Radius | Hard shadow |
|---|---|---|---|
| Primary button | 2.5px Plum | pill (999px) | `4px 4px 0 Plum` |
| Secondary button | 2.5px Plum | pill | none |
| Icon button (44×44) | 2px Plum | 14px | `3px 3px 0 Plum` (menu) or none (back) |
| Input / textarea | 2.5px Plum | 16px | none |
| Chip / filter pill | 2px Plum | pill | `3px 3px 0 Plum` only when selected |
| Card (dog, match) | 2.5px Plum | 22–24px | `5px 5px 0 Plum` (featured) / `3px` (list) |
| Panel (hero, info) | 2.5px Plum | 20–28px | none, or `5px` when it's a sticker |
| Sticker (bubble, polaroid, badge) | 2.5–3px Plum | 14–30px | `4–8px 4–8px 0 Plum` |
| Bottom sheet | 2.5px Plum top only | 28px top corners | none |

- **Shadows are always solid Plum, offset down and right, with no blur.** There are no soft or blurred shadows anywhere.
- **Tilt** (−6° to +6°) is for decorative stickers only: polaroids, "aww" bubbles, status badges, the hero sticker. Never tilt anything someone must read carefully or tap precisely.
- **Dashed borders** mean "empty or unknown": photo upload slots, "Not known yet", the private-link field and the "Based on limited info" tag.
- **Sparkles** are a 4-point star (`M20 0 C22 14 26 18 40 20 C26 22 22 26 20 40 C18 26 14 22 0 20 C14 18 18 14 20 0Z`, viewBox 40), filled Butter, Tangerine or White, with a 2.5px Plum outline. Use at most 2 per screen, and only in hero, loading and success moments.

---

## 6. Spacing and layout

- **Mobile first at 360px.** The design is drawn at 390px and must not break at 360px.
- Page side padding is **16px**. Vertical rhythm comes from gaps of **8 / 10 / 12 / 14 / 16 / 18 / 22**, using the smallest gap that separates the groups.
- The header is **56px** tall: the logo on the left and one 44px action on the right.
- **Sticky bottom action bar.** It has a 2.5px Plum top border, Oat Milk background and padding `14px 16px calc(22px + env(safe-area-inset-bottom))`. Every screen with a primary action uses it.
- Touch targets are **at least 44×44px**, with at least 8px between them.
- Above 768px: centre the content in a 560px column for flows (questionnaire, forms, results), and use a 2–3 column card grid for discovery, with a max width of 1200px. The admin panel is desktop-first at 1280px with a 230px side nav.

---

## 7. Components

Each component has a matching example in the prototype file shown in brackets.

**Button.** Variants:
- `primary`: Tangerine fill, Plum text, hard shadow
- `secondary`: White fill
- `ghost`: transparent fill
- `icon`: square, 44px

Mobile buttons are 54px tall and desktop buttons 48px. The pressed state moves the button `translate(2px,2px)` and shrinks the shadow by 2px, so it physically "presses into the page". The disabled state uses 40% opacity, no shadow and `cursor: not-allowed`. Links styled as buttons stay `<a>`; actions stay `<button>`. (`Main`, `Browse`)

**Chip.** It is 40–44px tall with a 2px border. Types:
- **Filter chips** toggle. When selected they get a Butter fill, a 3px shadow and `aria-pressed`. (`Filters`)
- **Applied-filter chips** have an × to remove the filter.
- **Status chips** are small: 11–13px text, 1.5–2px border.

**Segmented control.** A pill with a 2.5px border, made of equal segments split by 2px Plum dividers. The selected segment is Butter. (`ListDog`)

**Option card** (questionnaire). A 2×2 grid of cards at least 84px tall, each with a bold label and a one-line hint. The selected card is Butter with a 3px shadow. Selecting an option never moves on automatically. (`Quiz`)

**Progress.** Five segments 8px tall: completed segments are Plum, the current one is Tangerine with a Plum outline, and upcoming ones are Plum at 15% opacity. The label reads "Step 3 of 5 · Lifestyle". (`Quiz`, `ListDog`)

**Dog card** (discovery). A 210px photo, then a 2.5px Plum divider, then the name (Display S), the locality (Meta, on the right), the meta line, and a one-line personality summary. An energy badge sits on the photo, top-right. The whole card is one link. (`Browse`)

**Match row** (results). An 84px thumbnail, then the rank, name, meta and top reason, with the score and match-level chip on the right. The #1 match gets the 5px shadow and the others 3px. A "Based on limited info" tag appears when confidence is below 70%. (`Results`)

**Score sticker.** A Bubblegum bubble with "aww." above the score in Display XL, rotated 5° and overlapping the corner of the photo. (`Why`)

**Category bar.** The label plus the weight in Mauve, the score on the right, and a 10px track with a 1.5px Plum border. The fill is Mint at 90 or above and Butter below 90. All 8 categories are always shown, in the scope's order. (`Why`)

**Reason line.** A 22px circle icon: a Mint tick for "Why this could work", a Butter "i" for "Things to consider". (`Why`)

**Bottom sheet.** It sits over the Plum scrim, with a 44×5px grab handle, a title plus close button, scrollable content, and a sticky footer holding "Clear" (secondary) and "Show N dogs" (primary). Tapping the scrim or pressing Esc closes it, and focus is trapped while it's open. (`Filters`)

**Input.** A label always sits above the field (no placeholder-only fields). The field is 52px tall with a 16px radius and 2.5px border. Optional fields add "(optional)" in Mauve. Set the correct `type`, `inputmode` and `autocomplete`. Error state: the message appears below the field in Plum 14px with an icon, and the field gets a 3px Butter outer ring. (`Interested`)

**Checkbox.** A native checkbox at 24px with `accent-color: Tangerine` and a label that is clickable. The consent checkbox is **always unticked by default**. (`Interested`)

**Photo uploader.** A 3-column grid of 100px slots. Filled slots have a remove × button (28px circle, offset to the top-right). Empty slots are dashed with a "+ Add" label. Below it sits the line: "We strip location data from photos before upload." (`ListDog`)

**Trust panel.** A Mint panel with a lock icon and a bold heading reading "How we handle your details", followed by 1–3 plain sentences. It appears next to **every** form that collects personal data. (`Interested`)

**Trust line.** An 18px lock icon followed by a Mauve 13px sentence. Used under hero CTAs and under the lister's name on a profile. (`Main`, `Profile`)

**Private-link card.** A dashed field showing the link, "Copy link" and "WhatsApp it to me" buttons, and the line: "Anyone with this link can see your matches, so keep it to yourself. It never shows your contact details." (`Sent`)

**Timeline steps.** Numbered 32px circles in Mint, Bubblegum and Tangerine, each followed by a bold lead-in and a sentence. (`Sent`)

**Photo placeholder.** A tint block (Butter, Bubblegum, Mint or Peach, rotating) with a camera icon and a label like "[Bruno's photo]". It is used **only** while real photos load or are missing. Real dog photos replace every placeholder.

**Admin table** (kept simple). A White card with a 2px border and 16px radius. Header rows use an Oat Milk background, and rows are divided by a 1.5px `#E3D6E8` line. Status is a native `<select>` holding the 8 statuses. In admin: no tilt, no stickers and no sparkles. (`Admin`)

---

## 8. Iconography

- Use `lucide-react` at `strokeWidth={2.25}` with round caps and joins, at 16–22px. Icon colour is always Plum, except inside dark surfaces.
- Custom icons: the sparkle (§5) and the heart. The heart path is `M0 7C-6 2-10-1-10-5C-10-8-7.5-10-5-10C-2.5-10-1-8.5 0-7C1-8.5 2.5-10 5-10C7.5-10 10-8 10-5C10-1 6 2 0 7Z` with a viewBox of `-12 -12 24 22`.
- **Never use emoji** in the UI, including the ❤️ in "I'm Interested".
- Icon-only buttons always have an `aria-label`.

---

## 9. Motion

| Interaction | Motion |
|---|---|
| Button / chip press | `translate(2px,2px)`, shadow −2px, 90ms ease-out |
| Chip / option select | Fill colour change, plus a scale 0.96 → 1 spring (stiffness 500, damping 30) |
| Sticker enter (hero, success, score) | From scale 0.85 and rotate −12° to its final tilt, spring, staggered 60ms |
| Bottom sheet | Slides up 220ms with ease-out `cubic-bezier(.2,.8,.2,1)`; scrim fades over 150ms |
| Screen to screen | 160ms fade plus 8px rise. No sideways page slides. |
| Score count-up | 0 → score over 700ms with ease-out, run once |
| Matching screen | Category ticks appear one by one, 120ms apart |

- Use the `motion` library. Animate only `transform` and `opacity`.
- With `prefers-reduced-motion`: no tilting entrances, no count-up and no spring. Use instant state changes and keep the colour changes.

---

## 10. Landing 3D hero: "The Sticker Flip"

This replaces the earlier tag concept, to match Sticker Club.

- **Object:** a thick die-cut **polaroid sticker** of a dog in 3D, with a white border, a Plum outline (an edge bevel), a printed photo area and a slightly peeled corner. Next to it floats a 3D **"aww" speech bubble** sticker in Bubblegum. Two Butter sparkles drift nearby.
- **Behaviour:**
  - Idle: a gentle bob and a slight sway.
  - Drag or swipe: the polaroid **flips** (Y-axis spring) to reveal its back, a printed match card reading "92% match · great fit" with three tiny Mint/Butter bars.
  - Release: it settles back to the front.
  - Desktop: tilts toward the cursor.
- **Materials:** matte paper (roughness around 0.8) on the front and back, with a subtle sheen on the bubble. Lighting is a soft studio setup built from `Lightformer`s, with no CDN HDRs, and the Plum outline comes from a back-face hull or an outline pass.
- The project's performance, fallback and poster rules for the hero still apply. The **poster** is a still render of the sticker front, and it doubles as the reduced-motion and low-end fallback.

---

## 11. Voice and copy

| Context | Voice | Examples |
|---|---|---|
| Hero, stickers, loading, success | Playful, lowercase, short | "aww. 92% match", "sniffing out your matches…", "interest sent!", "in review" |
| Headings, buttons | Clear, sentence case, verb-first | "Find a Dog", "Get my match scores", "See if we match", "Send my interest" |
| Explanations (why, consider) | Specific and data-led, second person | "Your daily walks and weekend runs match his zoomies." |
| Privacy, consent, errors, admin | **Plain and calm. No jokes, no slang.** | "Only the AWDOPT team sees your contact details. Never shown publicly." |

- Fixed phrases from the brief: the tagline "Better Matches. Better Adoptions.", "Find a Dog", "List a Dog", "I'm Interested" and "Find My Matches" (the questionnaire's final button).
- Say "dog", not "pet". Say "Indie", not "stray" or "desi breed".
- Explanations never invent facts. Every "why" line maps to a category score, as set out in scope §3.

---

## 12. Screen map (prototype → route → scope deliverable)

| # | Prototype file | Route | Scope # |
|---|---|---|---|
| 01 | `Main.dc.html` | `/` | 1, 2 |
| 02 | `Browse.dc.html` | `/dogs` | 2, 3 |
| 03 | `Filters.dc.html` | bottom sheet on `/dogs` (state in the URL query) | 3 |
| 04 | `Profile.dc.html` | `/dogs/[slug]` | 4 |
| 05 | `Quiz.dc.html` | `/match/[step]` (5 steps: basic, home, lifestyle, preferences, intent) | 6 |
| 06 | `Matching.dc.html` | loading state after "Find My Matches" | 7 |
| 07 | `Results.dc.html` | `/r/[token]` | 8, 9 |
| 08 | `Why.dc.html` | `/r/[token]/[dogSlug]` | 9, 10 |
| 09 | `Interested.dc.html` | `/r/[token]/[dogSlug]/interested` | 11 |
| 10 | `Sent.dc.html` | confirmation state of 09 | 11 |
| 11 | `ListDog.dc.html` | `/list/[step]` (5 steps) | 5 |
| 12 | `ListSent.dc.html` | `/list/submitted` | 5 |
| 13 | `Admin.dc.html` | `/admin` (plus dogs, adopters, enquiries and weights sub-pages) | 12, 13 |

A profile reached from discovery (no token) shows "See if we match", which starts the questionnaire. A profile reached from results shows the score sticker and "I'm Interested".

---

## 13. Accessibility checklist

- Text contrast follows §3, with no exceptions. Every control keeps its Plum border.
- Focus-visible style: a `3px solid #2A1736` outline with a 3px offset, plus a Butter inner ring on dark surfaces. Never remove the outline.
- Use real `<button>`, `<a>`, `<label>` and `<input>`. Never put click handlers on divs.
- The bottom sheet and dialogs trap focus, close on Esc, and return focus to the trigger.
- The questionnaire announces "Step X of 5" with `aria-live="polite"`.
- Scores are written as text (e.g. "92% match, great fit"), never shown only as a bar or colour.
- Decorative stickers, sparkles and the 3D canvas are `aria-hidden="true"`.

---

## 14. Tokens (copy into `app/tokens.css`)

```css
:root {
  --bg: #FFF7EC;
  --surface: #FFFFFF;
  --ink: #2A1736;
  --muted: #6A5874;
  --primary: #FF6B2C;
  --bubble: #FF8FB8;
  --highlight: #FFE066;
  --fresh: #7FDDBE;
  --peach: #FFD3BF;
  --row-line: #E3D6E8;
  --scrim: rgba(42, 23, 54, 0.55);

  --border: 2.5px;
  --border-sm: 2px;
  --radius-input: 16px;
  --radius-card: 24px;
  --radius-panel: 28px;
  --radius-pill: 999px;

  --shadow-sm: 3px 3px 0 var(--ink);
  --shadow-md: 4px 4px 0 var(--ink);
  --shadow-lg: 5px 5px 0 var(--ink);
  --shadow-xl: 8px 8px 0 var(--ink);

  --font-display: var(--font-unbounded), sans-serif;
  --font-text: var(--font-figtree), sans-serif;

  --ease-out: cubic-bezier(.2, .8, .2, 1);
  --dur-press: 90ms;
  --dur-sheet: 220ms;
}
```

```css
/* Tailwind v4 */
@theme inline {
  --color-bg: var(--bg);
  --color-surface: var(--surface);
  --color-ink: var(--ink);
  --color-muted: var(--muted);
  --color-primary: var(--primary);
  --color-bubble: var(--bubble);
  --color-highlight: var(--highlight);
  --color-fresh: var(--fresh);
  --font-display: var(--font-display);
  --font-sans: var(--font-text);
  --shadow-sticker-sm: var(--shadow-sm);
  --shadow-sticker: var(--shadow-md);
  --shadow-sticker-lg: var(--shadow-lg);
}
```

No hex values anywhere outside this file. There is no dark mode in V1, so the theme is light only.

---

## 15. Do / Don't

| Do | Don't |
|---|---|
| Plum text on Tangerine buttons | White text on Tangerine |
| A Plum border on every filled control | Borderless coloured buttons or chips |
| Hard Plum shadows | Blurred or grey shadows, gradients, glassmorphism |
| Tilt decorative stickers | Tilt forms, prices, scores in tables, or body copy |
| Dashed borders plus "Not known yet" for missing data | Hide missing data, or show it as a low score |
| Calm, plain copy around personal data | Jokes near consent, errors or privacy |
| Real dog photos as the hero of every card | Stock photos or AI-generated dogs |
| Up to 2 sparkles in a hero or success moment | Sparkles on every screen |

---

## 16. Additions

Approved Oct 2026, after the design-system build.

**Hover.** Only under `@media (hover: hover)`, so touch devices never get stuck hover states. Hover never replaces the focus style.
- Shadowed controls and cards lift 1px up and left, and their hard shadow grows by 1px.
- Shadowless secondary buttons gain a 3px hard shadow.
- Chips, option cards and segments fill Oat Milk.
- Ghost buttons gain a Plum border.

**Skeleton.** Oat Milk blocks with a 2px dashed Plum border at 20% opacity, at the exact final size so nothing shifts when content arrives. No shimmer. Used for discovery cards, the profile, results and admin tables.

**Empty state.** A White panel with a 2.5px Plum border, a Display S heading, one Body line and one secondary action (for example "Clear filters"). No sparkles: it is not a success moment.

**Async error state.** A calm zone. Plum text with the Tangerine-circle alert icon, one plain sentence saying what failed, and a "Try again" secondary button. No jokes.

**Implementation notes.**
- Touch targets are at least 44px even where an earlier screen shows less: chips are 44px, and admin buttons and selects are 44px below 1024px wide.
- The photo-remove × is drawn at 28px with a 44px hit area.
- A missing dog photo shows the tinted placeholder with "Photo coming soon".
- Dog names on cards use Display S (20px).
