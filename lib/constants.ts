export const HP_TOKENS = {
  // ── Theme-reactive tokens (resolve via CSS custom properties) ──
  // These return `var(--hp-*)` strings, so inline styles automatically
  // respond to light/dark mode changes without any component-level edits.
  primary: 'var(--hp-primary)',
  primaryLight: 'var(--hp-primary-light)',
  primarySoft: 'var(--hp-primary-soft)',
  primaryWash: 'var(--hp-primary-wash)',

  // Brand: Yellow (Kept temporarily to avoid TS errors, mapped to primary in CSS)
  yellow: 'var(--hp-yellow)',
  yellowLight: 'var(--hp-yellow-light)',
  yellowSoft: 'var(--hp-yellow-soft)',
  yellowWash: 'var(--hp-yellow-wash)',

  // Brand: Blue
  blue: 'var(--hp-blue)',
  blueLight: 'var(--hp-blue-light)',
  blueSoft: 'var(--hp-blue-soft)',
  blueWash: 'var(--hp-blue-wash)',

  // Semantic colors — static (don't shift between themes)
  sage: '#4A7C59',
  sageLight: '#8FB39B',
  sageSoft: 'var(--hp-sage-soft)',
  sageWash: 'var(--hp-sage-wash)',

  coral: '#E88B7D',
  coralSoft: 'var(--hp-coral-soft)',
  coralWash: 'var(--hp-coral-wash)',

  lavender: '#A89BC9',
  lavenderSoft: 'var(--hp-lavender-soft)',
  lavenderWash: 'var(--hp-lavender-wash)',

  // Neutrals — theme-reactive
  ink: 'var(--hp-ink)',
  inkSoft: 'var(--hp-ink-soft)',
  inkMute: 'var(--hp-ink-mute)',
  inkFade: 'var(--hp-ink-fade)',
  paper: 'var(--hp-paper)',
  card: 'var(--hp-card)',
  line: 'var(--hp-line)',
  lineSoft: 'var(--hp-line-soft)',
};

export const HP_FONT = "var(--hp-font)";
export const HP_FONT_DISPLAY = "var(--hp-font-display)";

export const HP_TEXT = {
  display: { fontFamily: HP_FONT_DISPLAY, fontWeight: 800, fontSize: 34, lineHeight: 1.15, color: HP_TOKENS.ink, letterSpacing: -0.8 },
  title: { fontFamily: HP_FONT_DISPLAY, fontWeight: 800, fontSize: 26, lineHeight: 1.2, color: HP_TOKENS.ink, letterSpacing: -0.4 },
  h: { fontFamily: HP_FONT_DISPLAY, fontWeight: 800, fontSize: 20, lineHeight: 1.25, color: HP_TOKENS.ink },
  body: { fontFamily: HP_FONT, fontWeight: 500, fontSize: 16, lineHeight: 1.45, color: HP_TOKENS.inkSoft },
  small: { fontFamily: HP_FONT, fontWeight: 600, fontSize: 14, lineHeight: 1.4, color: HP_TOKENS.inkMute },
  tiny: { fontFamily: 'var(--hp-font-mono)', fontWeight: 700, fontSize: 11, lineHeight: 1.2, color: HP_TOKENS.inkMute, letterSpacing: 0.5, textTransform: 'uppercase' as const },
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

