# Flowbuddy Design System

Calm, neutral, content-first. Hierarchy comes from **weight, size and surface
value** — not from shadows, glows, or saturated fills.

Read this before writing UI. It is short on purpose.

---

## The five rules

1. **Never hardcode a colour.** Every colour comes from `HP_TOKENS`. If the
   shade you want doesn't exist, add it to `app/globals.css` + `lib/constants.ts`,
   not to your component.
2. **Never set `fontWeight` by hand.** Spread a `HP_TEXT` role instead. The
   scale stops at 700 — there is no 800 or 900.
3. **Depth is surface value, not shadow.** Only `HPCard variant="raised"` and
   modals get a shadow, because only they actually float.
4. **One accent.** `HP_TOKENS.primary` marks the current thing or the primary
   action. Other colour is *status* (`success`/`warning`/`danger`/`info`), never
   decoration.
5. **Compose from `@/components/ui`.** If you're writing `display: flex,
   alignItems: center, gap: 12` by hand, use `<Row>`.

Run `npm run check` to verify. It type-checks and fails on token drift.

---

## Tokens

All tokens resolve through CSS custom properties, so flipping `.dark` on
`<html>` repaints the whole app with no JS.

```tsx
import { HP_TOKENS, HP_TEXT } from "@/components/ui";
```

### Colour

| Group | Tokens | Use for |
|---|---|---|
| Accent | `primary`, `primaryDark`, `primarySoft`, `primaryWash`, `onPrimary` | current selection, primary action, links |
| Honey | `yellow`, `yellowDark`, `yellowSoft`, `honey` | brand warmth: mascot, streaks, rewards |
| Status | `success`, `warning`, `danger`, `info` (+ `*Soft`, `*Wash`) | outcomes and states |
| Text | `ink` → `inkSoft` → `inkMute` → `inkFade` | most → least emphasis |
| Surface | `paper`, `card`, `cardRaised`, `sunken` | background → raised → inset |
| Line | `lineSoft`, `line`, `lineStrong`, `border` | separators, outlines |

`inkFade` fails WCAG for body text. It's for placeholders and disabled states
only — never for anything the user must read.

Legacy aliases (`sage`, `coral`, `lavender`, `teal`, `amber`) still resolve, but
map to the semantic names. Don't use them in new code.

### Type

Spread the role. Don't cherry-pick `fontSize` out of it.

```tsx
<h1 style={HP_TEXT.display}>Dashboard</h1>
<p style={HP_TEXT.body}>Ringkasan hari ini.</p>
```

| Role | Size | Weight | Use |
|---|---|---|---|
| `display` | 28–34 | 700 | the one screen title |
| `title` | 22–26 | 700 | section / modal title |
| `h` | 17–19 | 650 | card heading |
| `sub` | 15 | 600 | sub-heading in a card |
| `body` | 15 | 450 | running text |
| `bodyStrong` | 15 | 600 | inline emphasis, values |
| `small` | 13 | 500 | metadata, helper copy |
| `label` | 13.5 | 600 | control labels |
| `tiny` | 11 | 650 | uppercase eyebrow, 1–3 words |
| `metric` | 26–32 | 700 | big figures (tabular numerals) |

Manrope is loaded as a **variable font**. Do not add a `weight` array to it in
`app/layout.tsx` — that pins it to static cuts and the 450/650 steps collapse
to 400/700.

### Spacing

4pt rhythm. Layout primitives take *scale steps*, not pixels:

```
1=4  2=8  3=12  4=16  5=20  6=24  8=32  10=40  12=48
```

```tsx
<Stack gap={4}>       {/* 16px */}
<Row gap={2} p={3}>   {/* 8px gap, 12px padding */}
```

### Radius & elevation

`radiusXs` 8 · `radiusSm` 12 · `radiusMd` 16 · `radius` 20 · `radiusLg` 26 ·
`radiusXl` 32 · `radiusPill`

`shadowSm` → `shadow` → `shadowMd` → `shadowLg`. You will rarely need any of
them. Reach for a hairline border first.

---

## Components

```tsx
import { Stack, Row, Grid, HPCard, HPButton, StatTile, ListRow } from "@/components/ui";
```

### Layout
`Stack` `Row` `Grid` `Spacer` `Divider` `IconBadge`

`Grid` wraps automatically — give it `min={160}` rather than writing
breakpoints. `Row stackOnMobile` collapses to a column under 500px; use it for
any row pairing text with a button.

### Surfaces
`HPCard` — `variant`: `surface` (default) · `soft` (nested) · `outline` ·
`raised` (floats). Passing `onClick` makes it a real `<button>`, keyboard
reachable, with press feedback. Always pass `ariaLabel` when the card's text
alone doesn't describe the action.

`Modal` — handles Escape, focus trap, focus restore, and background scroll lock
for you. Pass `footer` for pinned actions.

### Controls
`HPButton` — `variant`: `primary` · `secondary` · `ghost` · `danger`.
Every size clears 44px. `iconOnly` requires `aria-label`.

`TabBar` — segmented control; the active pill slides via shared layout
animation. Arrow keys work.

### Data
`StatTile` — one figure. Set `upIsGood={false}` when rising is bad (burnout,
overtime), otherwise the trend colour will lie.

`ListRow` + `ListGroup` — the standard list shape. `ListGroup` draws the
separators, so don't add `borderBottom` yourself.

`EmptyState` — always give it an `action`. An empty state without a next step
is a dead end.

---

## Motion

Import from `@/components/ui`, never from `motion/react` directly — that's how
timings drift apart.

```tsx
<Stagger gap={3}>
  {items.map(i => <StaggerItem key={i.id}><Card/></StaggerItem>)}
</Stagger>
```

| Primitive | Use |
|---|---|
| `FadeIn` | single element entrance |
| `Stagger` / `StaggerItem` | list reveal |
| `Reveal` | entrance on scroll into view |
| `Press` | tap feedback on custom surfaces |
| `CountUp` | animating figures |
| `SwitchView` | crossfade between tabs/screens |

Rules: transform and opacity only · 140–320ms · entrances travel 6–14px ·
presses never change layout bounds.

Every primitive already honours `prefers-reduced-motion`. If you hand-roll an
animation, you must handle it yourself — use `useReducedMotion()`.

---

## Accessibility floor

Non-negotiable, checked before any UI ships:

- Touch targets ≥ 44px. Use padding to grow the hit area, not the icon.
- Body text ≥ 4.5:1, secondary ≥ 3:1 — **in both themes**. Dark mode is not
  inferred from light.
- Colour is never the only signal. Pair it with an icon, arrow, or label.
- Interactive elements are `<button>`/`<a>`, not clickable `<div>`s.
- Focus is visible. The global `:focus-visible` rule handles it — don't remove it.
- Icons are SVG (`HPGlyph`). **No emoji as icons** — they render differently per
  platform and can't be themed.
- Test at 375px wide and with reduced motion on.

---

## Decorative palettes

Three things are *not* status and must never borrow the semantic tokens. They
live in `lib/palettes.ts`:

| Export | For | Why it's exempt |
|---|---|---|
| `HP_CATEGORICAL` (in `constants.ts`) | departments, chart series | series differ in *kind*; a red department isn't a failing one |
| `NOTE_THEMES` | sticky notes | the user picks the colour; it means only itself |
| `REWARD_THEMES` + `REWARD_CHROME` | reward card skins | saturated fills carrying white text |
| `MASCOT_MOODS` | the bee | illustration — the colour *is* the emotion |
| `ONBOARDING_*` | the one-time splash | deliberately louder than the app |
| `PRINT` | exported reports | opens in its own window, can't see our CSS vars |

Reach for these instead of inventing a colour. If you catch yourself mapping a
mood or a department onto `success`/`danger`, stop — that's a claim the data
isn't making.

---

## Migrating an old screen

The codebase is fully migrated: `npm run check` reports **0 violations**, and
the baseline in `scripts/design-baseline.json` is empty. Keep it that way.

When you touch a screen:

1. Replace ad-hoc flex objects with `Stack` / `Row` / `Grid`.
2. Replace hex colours with `HP_TOKENS` (or a palette above, if it's decoration).
3. Replace font declarations with `HP_TEXT` roles.
4. Delete `boxShadow` unless the thing genuinely floats — only modals and
   popovers do, and they use `HP_TOKENS.shadowLg` / `shadowMd`.
5. Swap emoji icons for `HPGlyph`, and hand-rolled fields for `HPInput`.
6. Replace hand-rolled overlays with `Modal` — you get Escape, focus trap and
   scroll lock for free.

`npm run check` fails if any file regresses. There are exactly two escape
hatches, both narrow:

- **`// design-ok: <reason>`** on a line whose colour genuinely can't be a CSS
  variable — printed reports, OS theme-colour metadata. State the reason.
- **`ARTWORK`** in `scripts/check-design.mjs`, for inline illustration. It holds
  one file (`BeeMascot.tsx`) and should stay that short.

Neither is for "I haven't migrated this yet."

---

## Dark mode safety net

`globals.css` used to end with a wall of `!important` attribute-selector
overrides catching hardcoded light-mode hexes. Those hexes are gone, so the
colour rules are too.

What remains is not legacy debt:

- **Form controls** — a hand-rolled `<input>` still inherits the UA's white.
  Delete this once every field goes through `HPInput`.
- **White backgrounds** — `#fff` is deliberately allowed by the checker, so a
  few surfaces set it directly and need flipping in dark mode.
