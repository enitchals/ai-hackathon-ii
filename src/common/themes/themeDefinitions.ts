export interface AppThemeDefinition {
  id: string;
  name: string;
  light: {
    bg: string;
    fg: string;
  };
  dark: {
    bg: string;
    fg: string;
  };
  accents: [string, string, string, string, string, string];
  themeClass: string;
}

export const themeDefinitions: AppThemeDefinition[] = [
  {
    id: 'pastel',
    name: 'Pastel Rainbow',
    light: { bg: '#FFFDF7', fg: '#2D2D2D' },
    dark: { bg: '#2D2D2D', fg: '#FFFDF7' },
    accents: ['#FFE5A0', '#A8E6CF', '#A0D2DB', '#D5AAFF', '#FFAAA5', '#FFD3B6'],
    themeClass: 'theme-pastel',
  },
  {
    id: 'bold',
    name: 'Bold Rainbow',
    light: { bg: '#FFFFFF', fg: '#000000' },
    dark: { bg: '#000000', fg: '#FFFFFF' },
    accents: ['#FFD600', '#00C853', '#2979FF', '#AA00FF', '#FF1744', '#FF6D00'],
    themeClass: 'theme-bold',
  },
  {
    id: 'neon',
    name: 'Neon Lights',
    light: { bg: '#FFFFFF', fg: '#1A1A2E' },
    dark: { bg: '#0D0D1A', fg: '#F0F0FF' },
    accents: ['#FFFF00', '#39FF14', '#00F0FF', '#BF00FF', '#FF073A', '#FF6600'],
    themeClass: 'theme-neon',
  },
];

export const ACCENT_NAMES = ['yellow', 'green', 'blue', 'purple', 'pink', 'orange'] as const;
