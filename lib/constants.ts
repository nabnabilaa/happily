/**
 * Design tokens. Every value resolves through a CSS custom property so a
 * single theme switch on <html> repaints the whole app.
 *
 * Rules of the system:
 *  - One accent (primary). Colour is meaning, not decoration.
 *  - Depth comes from surface value + hairlines, not shadow. Reach for
 *    `shadow` only on things that genuinely float (sheets, popovers).
 *  - Never hardcode a hex in a component. If a shade is missing, add it here.
 */
export const HP_TOKENS = {
  // ── Accent ──
  primary: 'var(--hp-primary)',
  primaryDark: 'var(--hp-primary-dark)',
  primaryLight: 'var(--hp-primary-light)',
  primarySoft: 'var(--hp-primary-soft)',
  primaryWash: 'var(--hp-primary-wash)',
  onPrimary: 'var(--hp-on-primary)',

  // ── Honey (brand warmth: mascot, streaks, rewards) ──
  yellow: 'var(--hp-yellow)',
  yellowDark: 'var(--hp-yellow-dark)',
  yellowLight: 'var(--hp-yellow-light)',
  yellowSoft: 'var(--hp-yellow-soft)',
  yellowWash: 'var(--hp-yellow-wash)',
  honey: 'var(--hp-honey)',
  honeySoft: 'var(--hp-honey-soft)',
  gold: 'var(--hp-gold)',

  // ── Deep neutral (brand marks, high-emphasis surfaces) ──
  blue: 'var(--hp-blue)',
  blueLight: 'var(--hp-blue-light)',
  blueSoft: 'var(--hp-blue-soft)',
  blueWash: 'var(--hp-blue-wash)',

  // ── Semantic status ──
  success: 'var(--hp-success)',
  successSoft: 'var(--hp-success-soft)',
  successWash: 'var(--hp-success-wash)',
  warning: 'var(--hp-warning)',
  warningSoft: 'var(--hp-warning-soft)',
  warningWash: 'var(--hp-warning-wash)',
  danger: 'var(--hp-danger)',
  dangerSoft: 'var(--hp-danger-soft)',
  dangerWash: 'var(--hp-danger-wash)',
  info: 'var(--hp-info)',
  infoSoft: 'var(--hp-info-soft)',
  infoWash: 'var(--hp-info-wash)',

  // ── Legacy colour aliases — prefer the semantic names above ──
  teal: 'var(--hp-success)',
  tealLight: 'var(--hp-teal-light)',
  tealSoft: 'var(--hp-success-soft)',
  sage: 'var(--hp-success)',
  sageLight: 'var(--hp-success)',
  sageSoft: 'var(--hp-success-soft)',
  sageWash: 'var(--hp-success-wash)',
  coral: 'var(--hp-danger)',
  coralSoft: 'var(--hp-danger-soft)',
  coralWash: 'var(--hp-danger-wash)',
  lavender: 'var(--hp-info)',
  lavenderSoft: 'var(--hp-info-soft)',
  lavenderWash: 'var(--hp-info-wash)',
  amber: 'var(--hp-warning)',
  amberSoft: 'var(--hp-warning-soft)',

  // ── Text ── (ink → inkFade = most → least emphasis)
  ink: 'var(--hp-ink)',
  inkSoft: 'var(--hp-ink-soft)',
  inkMute: 'var(--hp-ink-mute)',
  inkFade: 'var(--hp-ink-fade)',

  // ── Surfaces ──
  paper: 'var(--hp-paper)',
  card: 'var(--hp-card)',
  cardRaised: 'var(--hp-card-raised)',
  sunken: 'var(--hp-sunken)',
  overlay: 'var(--hp-overlay)',

  // ── Lines ──
  line: 'var(--hp-line)',
  lineSoft: 'var(--hp-line-soft)',
  lineStrong: 'var(--hp-line-strong)',
  border: 'var(--hp-border)',

  // ── Radius ──
  radiusXs: 'var(--hp-radius-xs)',
  radiusSm: 'var(--hp-radius-sm)',
  radiusMd: 'var(--hp-radius-md)',
  radius: 'var(--hp-radius)',
  radiusLg: 'var(--hp-radius-lg)',
  radiusXl: 'var(--hp-radius-xl)',
  radiusPill: 'var(--hp-radius-pill)',

  // ── Elevation — use sparingly ──
  shadowNone: 'none',
  shadowSm: 'var(--hp-shadow-sm)',
  shadow: 'var(--hp-shadow)',
  shadowMd: 'var(--hp-shadow-md)',
  shadowLg: 'var(--hp-shadow-lg)',
  shadowOrange: 'var(--hp-shadow)', // legacy alias, no longer a glow

  // ── Focus ──
  focusRing: 'var(--hp-focus-ring)',
};

/**
 * Categorical palette — for series that differ in *kind*, not in quality:
 * departments, chart lines, team groupings.
 *
 * Never reach for status colours here. A department rendered in `danger` red
 * reads as a department in trouble, which is a claim the data isn't making.
 *
 *   const colour = HP_CATEGORICAL[i % HP_CATEGORICAL.length];
 */
export const HP_CATEGORICAL = [
  'var(--hp-cat-1)',
  'var(--hp-cat-2)',
  'var(--hp-cat-3)',
  'var(--hp-cat-4)',
  'var(--hp-cat-5)',
  'var(--hp-cat-6)',
  'var(--hp-cat-7)',
  'var(--hp-cat-8)',
] as const;

/** 4pt spacing rhythm. Use these instead of arbitrary pixel values. */
export const HP_SPACE = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 40,
  '5xl': 48,
} as const;

/** Motion. Micro-interactions stay in the 140–320ms band. */
export const HP_MOTION = {
  ease: 'cubic-bezier(0.22, 0.61, 0.36, 1)',
  easeOut: 'cubic-bezier(0.16, 1, 0.3, 1)',
  spring: 'cubic-bezier(0.34, 1.4, 0.5, 1)',
  fast: 140,
  base: 220,
  slow: 320,
} as const;

export const HP_FONT = "var(--hp-font)";
export const HP_FONT_DISPLAY = "var(--hp-font-display)";

/**
 * Type scale. Weight is a hierarchy signal, so it varies by role —
 * large text sits lighter and tighter, small text sits heavier.
 * Anything below `body` must not carry long-form copy.
 */
export const HP_TEXT = {
  /** Screen title. One per screen, at the top. */
  display: { fontFamily: HP_FONT_DISPLAY, fontWeight: 700, fontSize: 'clamp(28px, 6.5vw, 34px)', lineHeight: 1.18, color: HP_TOKENS.ink, letterSpacing: '-0.028em' },
  /** Major section / modal title. */
  title:   { fontFamily: HP_FONT_DISPLAY, fontWeight: 700, fontSize: 'clamp(22px, 5vw, 26px)', lineHeight: 1.24, color: HP_TOKENS.ink, letterSpacing: '-0.022em' },
  /** Card heading. */
  h:       { fontFamily: HP_FONT_DISPLAY, fontWeight: 650, fontSize: 'clamp(17px, 4vw, 19px)', lineHeight: 1.3, color: HP_TOKENS.ink, letterSpacing: '-0.016em' },
  /** Sub-heading inside a card. */
  sub:     { fontFamily: HP_FONT, fontWeight: 600, fontSize: 15, lineHeight: 1.4, color: HP_TOKENS.ink, letterSpacing: '-0.008em' },
  /** Default running text. */
  body:    { fontFamily: HP_FONT, fontWeight: 450, fontSize: 15, lineHeight: 1.55, color: HP_TOKENS.inkSoft, letterSpacing: '-0.005em' },
  /** Emphasised body — values, names, numbers inline with body text. */
  bodyStrong: { fontFamily: HP_FONT, fontWeight: 600, fontSize: 15, lineHeight: 1.5, color: HP_TOKENS.ink, letterSpacing: '-0.008em' },
  /** Supporting text, metadata, helper copy. */
  small:   { fontFamily: HP_FONT, fontWeight: 500, fontSize: 13, lineHeight: 1.45, color: HP_TOKENS.inkMute, letterSpacing: 0 },
  /** Button and control labels. */
  label:   { fontFamily: HP_FONT, fontWeight: 600, fontSize: 13.5, lineHeight: 1.3, color: HP_TOKENS.ink, letterSpacing: '-0.005em' },
  /** Section eyebrow. Uppercase — keep to 1–3 words. */
  tiny:    { fontFamily: HP_FONT, fontWeight: 650, fontSize: 11, lineHeight: 1.3, color: HP_TOKENS.inkMute, letterSpacing: '0.06em', textTransform: 'uppercase' as const },
  /** Large figures in stat tiles. Tabular so digits don't jitter on update. */
  metric:  { fontFamily: HP_FONT_DISPLAY, fontWeight: 700, fontSize: 'clamp(26px, 6vw, 32px)', lineHeight: 1.1, color: HP_TOKENS.ink, letterSpacing: '-0.03em', fontVariantNumeric: 'tabular-nums' as const },
};

export const HP_MOODS = [
  { key: 'joy', label: 'Bahagia', glyph: 'sparkle', emoji: '😊', tone: 'yellow', value: 5 },
  { key: 'calm', label: 'Tenang', glyph: 'check', emoji: '😌', tone: 'sage', value: 4 },
  { key: 'neutral', label: 'Biasa', glyph: 'activity', emoji: '😐', tone: 'neutral', value: 3 },
  { key: 'tired', label: 'Lelah', glyph: 'moon', emoji: '😫', tone: 'blue', value: 2 },
  { key: 'stress', label: 'Stress', glyph: 'zap', emoji: '🤯', tone: 'coral', value: 1 },
];

export const HP_ENERGY = [
  { key: 'low', label: 'Rendah', hint: 'Cocok untuk admin, review, tugas ringan' },
  { key: 'mid', label: 'Sedang', hint: 'Kolaborasi, meeting, eksekusi rutin' },
  { key: 'high', label: 'Tinggi', hint: 'Deep work, keputusan penting, kreativitas' },
];

export const HP_QUICK_TAGS = ['Semangat', 'Fokus', 'Lelah', 'Cemas', 'Bersyukur', 'Overwhelmed'];

export const HP_VALUES = ['Collaboration', 'Innovation', 'Respect', 'Ownership', 'Growth'];

export const HP_COACH_SUGGESTIONS = [
  'Bantu susun prioritas',
  'Aku lagi overwhelmed',
  'Kasih ide untuk 1-on-1 besok',
  'Refleksikan minggu ini',
];
