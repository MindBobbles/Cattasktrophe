// Gameboy shell / UI chrome
export const GB = {
  darkest:  '#0F380F',
  dark:     '#306230',
  medium:   '#8BAC0F',
  light:    '#9BBC0F',
  lightest: '#C4D0A0',
};

// Base sprite palette — colors 1/2/3/6/7 are overridden by cat color theme
export const SPRITE_PALETTE: Record<number, string> = {
  0:  'transparent',
  1:  '#FFF8E7',  // cream fur (overridden by theme)
  2:  '#F5C06A',  // light orange (overridden by theme)
  3:  '#D4851A',  // dark orange (overridden by theme)
  4:  '#2D1B00',  // dark outline (fixed)
  5:  '#1A0A00',  // eye pupil / dark (fixed)
  6:  '#FF9090',  // pink nose / blush (overridden by theme)
  7:  '#FFD5D5',  // inner ear (overridden by theme)
  8:  '#FFFFFF',  // eye shine (fixed)
  9:  '#A8D8FF',  // tear / hospital blue (fixed)
  10: '#B0C0B0',  // depression grey (fixed)
  11: '#FFE800',  // manic yellow (fixed)
  12: '#FF6060',  // danger red (fixed)
  13: '#C8F0C8',  // hospital green (fixed)
};

// Cat color themes — each randomised on cat creation
export interface CatColorTheme {
  body: string;    // replaces palette[1]
  accent: string;  // replaces palette[2]
  dark: string;    // replaces palette[3]
  blush: string;   // replaces palette[6]
  ear: string;     // replaces palette[7]
}

export const CAT_COLOR_THEMES: Record<string, CatColorTheme> = {
  classic:    { body: '#FFF8E7', accent: '#F5C06A', dark: '#D4851A', blush: '#FF9090', ear: '#FFD5D5' },
  midnight:   { body: '#C0C8D8', accent: '#7880A0', dark: '#4A5070', blush: '#FF9090', ear: '#D0C8E8' },
  skyblue:    { body: '#D8EEFF', accent: '#72AAEE', dark: '#3A70C0', blush: '#FFB0C0', ear: '#C0DEFF' },
  lavender:   { body: '#EEE0FF', accent: '#B898E8', dark: '#7850B8', blush: '#FF90C0', ear: '#E8D8FF' },
  mint:       { body: '#D8F8E8', accent: '#68CCA0', dark: '#329060', blush: '#FF9090', ear: '#C8F8D8' },
  peach:      { body: '#FFE8D8', accent: '#F0A880', dark: '#C07050', blush: '#FF8888', ear: '#FFD8C8' },
  chocolate:  { body: '#EED8B8', accent: '#B88848', dark: '#785028', blush: '#FF9090', ear: '#F0D0A0' },
  snow:       { body: '#F8F8FF', accent: '#D8D8F0', dark: '#A8A8C8', blush: '#FFB0C8', ear: '#FFE0F0' },
};

export const CAT_THEME_NAMES = Object.keys(CAT_COLOR_THEMES);

// Random pastel theme on new cat
export function randomCatColor(): string {
  return CAT_THEME_NAMES[Math.floor(Math.random() * CAT_THEME_NAMES.length)];
}

// Random personality
const PERSONALITIES = ['playful', 'lazy', 'grumpy', 'sweet', 'curious', 'sassy'];
export function randomPersonality(): string {
  return PERSONALITIES[Math.floor(Math.random() * PERSONALITIES.length)];
}

// Level helpers
export function getCatLevel(xp: number): number {
  return Math.floor(xp / 50) + 1;
}

export function getCatEvolution(level: number): { stage: string; emoji: string; tier: 'base' | 'worker' | 'boss' } {
  if (level >= 10) return { stage: 'Boss Kitty',   emoji: '👑', tier: 'boss'   };
  if (level >= 5)  return { stage: 'Worker Kitty', emoji: '⚙️', tier: 'worker' };
  return                  { stage: 'Kitty',         emoji: '🐱', tier: 'base'   };
}

export const STATE_SCREEN_BG: Record<string, string> = {
  happy:     '#9BBC0F',
  okay:      '#8BAC0F',
  sad:       '#708A50',
  depressed: '#6A8060',
  cocaine:   '#C8D820',
  hospital:  '#A8C8B0',
  deathbed:  '#607060',
};

export const STATE_LABEL_COLOR: Record<string, string> = {
  happy:     '#0F380F',
  okay:      '#1A2A10',
  sad:       '#1E2E14',
  depressed: '#2A3820',
  cocaine:   '#4A5000',
  hospital:  '#204020',
  deathbed:  '#181818',
};
