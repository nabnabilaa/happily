/**
 * Decorative palettes.
 *
 * These are the deliberate exception to "one accent". A sticky note's colour
 * and a reward card's skin are *chosen by a person* — they carry no status and
 * rank nothing, so the semantic tokens don't apply. They live here, beside the
 * tokens, rather than inline in a component: that is what kept the old style
 * sprawl going.
 *
 * Anything that means good/bad/warn belongs in `HP_TOKENS`, not here.
 * Anything distinguishing series in a chart belongs in `HP_CATEGORICAL`.
 */

/**
 * Onboarding celebration colours — confetti, blobs, the title gradient.
 *
 * Pure decoration on a full-bleed splash the user sees once. It is deliberately
 * louder than the app proper, so it does not draw on the app's accent.
 */
export const ONBOARDING_CONFETTI = [
  '#FF4D00', '#FFD166', '#00D68F', '#7C5CFC',
  '#FF6B9D', '#3EA6FF', '#FF8040', '#AEFF6E',
] as const;

export const ONBOARDING_SPLASH = {
  /** Title gradient: warm ends, honey middle. */
  gradientFrom: '#FF4D00',
  gradientMid: '#FFD166',
  gradientTo: '#FF4D00',
  /** Background blobs, pre-multiplied with their alpha. */
  blobWarm: '#FF4D0040',
  blobViolet: '#7C5CFC30',
  blobHoney: '#FFD16625',
} as const;

/**
 * Print colours.
 *
 * Exported reports open in their own window, so none of the app's CSS custom
 * properties reach them — these must be literal. They are also going onto
 * paper, where our screen greys are too light to survive a printer.
 */
export const PRINT = {
  line: '#DDDDDD',
  ink: '#111111',
  inkMute: '#555555',
} as const;

/**
 * Mascot moods.
 *
 * Illustration, not chrome: the bee's colour *is* the emotion, so these are
 * fixed art values and must not be folded onto the semantic tokens. An earlier
 * pass mapped `annoyed` onto `dangerWash` — a 4%-alpha wash — and the wings
 * went nearly invisible. Keep them opaque and keep them here.
 *
 * `w1` wing fill · `w2` wing edge · `wp` wing pattern · `color` body accent.
 */
export const MASCOT_MOODS: Record<
  string,
  { svgState: string; w1: string; w2: string; wp: string; mouth: string; color: string }
> = {
  idle:       { color: '#3B82F6', svgState: 'idle',      w1: '#D6E4FF', w2: '#3B82F6', wp: '#93C5FD', mouth: 'M 90 125 Q 100 130 110 125' },
  neutral:    { color: '#3B82F6', svgState: 'idle',      w1: '#D6E4FF', w2: '#3B82F6', wp: '#93C5FD', mouth: 'M 90 125 Q 100 130 110 125' },
  happy:      { color: '#F06595', svgState: 'senang',    w1: '#FEEAF1', w2: '#F06595', wp: '#FAA2C1', mouth: 'M 80 125 Q 100 155 120 125' },
  sad:        { color: '#7A92A8', svgState: 'sedih',     w1: '#E5E9F0', w2: '#7A92A8', wp: '#B8C6D6', mouth: 'M 85 135 Q 100 115 115 135' },
  sleepy:     { color: '#A89BC9', svgState: 'ngantuk',   w1: '#EAE6F4', w2: '#A89BC9', wp: '#D3CCEB', mouth: 'M 95 130 Q 100 132 105 130' },
  focus:      { color: '#FFBE0B', svgState: 'fokus',     w1: '#FFF8CC', w2: '#FFBE0B', wp: '#FFDCA8', mouth: 'M 92 128 L 108 128' },
  eating:     { color: '#FF6B35', svgState: 'makan',     w1: '#FFE6D6', w2: '#FF6B35', wp: '#FFB899', mouth: 'M 85 125 Q 100 155 115 125' },
  stretching: { color: '#20C997', svgState: 'olahraga',  w1: '#E6FCF5', w2: '#20C997', wp: '#96F2D7', mouth: 'M 85 125 Q 100 115 115 125' },
  excited:    { color: '#F59F00', svgState: 'semangat',  w1: '#FFF3BF', w2: '#F59F00', wp: '#FFD43B', mouth: 'M 80 130 Q 100 160 120 130' },
  surprised:  { color: '#845EF7', svgState: 'idle',      w1: '#E5DBFF', w2: '#845EF7', wp: '#B197FC', mouth: 'M 95 125 A 5 5 0 1 1 105 125 A 5 5 0 1 1 95 125' },
  annoyed:    { color: '#FF4444', svgState: 'kesal',     w1: '#FFE5E5', w2: '#FF4444', wp: '#FFAAAA', mouth: 'M 85 135 Q 100 115 115 135' },
  waiting:    { color: '#15AABF', svgState: 'menunggu',  w1: '#E3FAFC', w2: '#15AABF', wp: '#66D9E8', mouth: 'M 95 125 A 5 5 0 1 1 105 125 A 5 5 0 1 1 95 125' },
};

/** Sticky-note skins. Resolved through CSS vars, so they flip with the theme. */
export const NOTE_THEMES = [
  { id: 'yellow', label: 'Kuning', bg: 'var(--hp-note-yellow-bg)', border: 'var(--hp-note-yellow-line)', blob: 'var(--hp-note-yellow-blob)' },
  { id: 'blue',   label: 'Biru',   bg: 'var(--hp-note-blue-bg)',   border: 'var(--hp-note-blue-line)',   blob: 'var(--hp-note-blue-blob)' },
  { id: 'green',  label: 'Hijau',  bg: 'var(--hp-note-green-bg)',  border: 'var(--hp-note-green-line)',  blob: 'var(--hp-note-green-blob)' },
  { id: 'purple', label: 'Ungu',   bg: 'var(--hp-note-purple-bg)', border: 'var(--hp-note-purple-line)', blob: 'var(--hp-note-purple-blob)' },
  { id: 'pink',   label: 'Pink',   bg: 'var(--hp-note-pink-bg)',   border: 'var(--hp-note-pink-line)',   blob: 'var(--hp-note-pink-blob)' },
] as const;

export type NoteTheme = (typeof NOTE_THEMES)[number];

/**
 * Reward-card skins: a saturated fill carrying white text, one darker step for
 * the rule, one lighter step for the trim. They read the same on a light or a
 * dark page, so unlike the notes they need no per-theme values.
 */
export const REWARD_THEMES = [
  { name: 'orange',  bg: '#EA580C', border: '#C2410C', accent: '#FDBA74' },
  { name: 'purple',  bg: '#7C3AED', border: '#6D28D9', accent: '#A78BFA' },
  { name: 'teal',    bg: '#059669', border: '#047857', accent: '#6EE7B7' },
  { name: 'magenta', bg: '#DB2777', border: '#BE185D', accent: '#F472B6' },
  { name: 'blue',    bg: '#2563EB', border: '#1D4ED8', accent: '#60A5FA' },
  { name: 'amber',   bg: '#D97706', border: '#B45309', accent: '#FDE047' },
  { name: 'indigo',  bg: '#4F46E5', border: '#4338CA', accent: '#A5B4FC' },
  { name: 'coral',   bg: '#DC2626', border: '#B91C1C', accent: '#FCA5A5' },
] as const;

export type RewardTheme = (typeof REWARD_THEMES)[number];

/**
 * Chrome shared by every reward skin. These do not vary by theme: the card is
 * a saturated fill in both light and dark mode, so its text stays white and its
 * locked state stays the same slate.
 */
export const REWARD_CHROME = {
  /** Title / body on an unlocked card. */
  text: '#FFFFFF',
  subtext: 'rgba(255, 255, 255, 0.85)',
  /** A locked card drops to slate — the fill greys out beneath it. */
  lockedText: '#94A3B8',
  lockedSubtext: '#64748B',
  /** Wishlist marker: honey, the brand's "you chose this" colour. */
  star: '#FFD43B',
  starLine: '#FCC419',
  starWash: 'rgba(255, 212, 59, 0.3)',
  starBorder: 'rgba(255, 212, 59, 0.7)',
  /** The white action button and its label. */
  btnBg: '#FFFFFF',
  btnText: '#0F172A',
  badgeBg: 'rgba(0, 0, 0, 0.25)',
} as const;

/** Tone names accepted from the data, folded onto the eight skins above. */
export const REWARD_THEME_BY_TONE: Record<string, RewardTheme> = {
  orange: REWARD_THEMES[0],
  purple: REWARD_THEMES[1],
  teal: REWARD_THEMES[2],
  magenta: REWARD_THEMES[3],
  blue: REWARD_THEMES[4],
  yellow: REWARD_THEMES[5],
  amber: REWARD_THEMES[5],
  indigo: REWARD_THEMES[6],
  coral: REWARD_THEMES[7],
  pink: REWARD_THEMES[3],
  sage: REWARD_THEMES[2],
};
