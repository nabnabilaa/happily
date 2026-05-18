export const HP_TOKENS = {
  // Core palette — all harmonized, low saturation
  // Main Brand Palette — Flow Productivity (Yellow & Blue)
  yellow: '#FDB913',
  yellowLight: '#FFCA4D',
  yellowSoft: '#FFF9DB',
  yellowWash: '#FFFEF5',

  blue: '#4A90E2',
  blueLight: '#7FB1EB',
  blueSoft: '#EBF4FF',
  blueWash: '#F8FBFF',

  sage: '#4A7C59',
  sageLight: '#8FB39B',
  sageSoft: '#E3EDE6',
  sageWash: '#F3F7F4',

  coral: '#E88B7D',
  coralSoft: '#F6D8D2',
  coralWash: '#FAF1EF',

  lavender: '#A89BC9',
  lavenderSoft: '#E9E4F1',
  lavenderWash: '#F6F4FA',

  // Neutrals — warm, not sterile
  ink: '#1F1D1B',
  inkSoft: '#524E49',
  inkMute: '#8A837C',
  inkFade: '#BDB6AE',
  paper: '#FFFBF5',
  card: '#FFFFFF',
  line: 'rgba(31,29,27,0.08)',
  lineSoft: 'rgba(31,29,27,0.04)',
};

export const HP_FONT = "'Nunito', 'Inter', -apple-system, system-ui, sans-serif";

export const HP_TEXT = {
  display: { fontFamily: HP_FONT, fontWeight: 800, fontSize: 28, lineHeight: 1.15, color: HP_TOKENS.ink, letterSpacing: -0.4 },
  title: { fontFamily: HP_FONT, fontWeight: 800, fontSize: 22, lineHeight: 1.2, color: HP_TOKENS.ink, letterSpacing: -0.2 },
  h: { fontFamily: HP_FONT, fontWeight: 700, fontSize: 17, lineHeight: 1.25, color: HP_TOKENS.ink },
  body: { fontFamily: HP_FONT, fontWeight: 500, fontSize: 15, lineHeight: 1.45, color: HP_TOKENS.inkSoft },
  small: { fontFamily: HP_FONT, fontWeight: 600, fontSize: 13, lineHeight: 1.4, color: HP_TOKENS.inkMute },
  tiny: { fontFamily: HP_FONT, fontWeight: 700, fontSize: 11, lineHeight: 1.2, color: HP_TOKENS.inkMute, letterSpacing: 0.3, textTransform: 'uppercase' },
};
