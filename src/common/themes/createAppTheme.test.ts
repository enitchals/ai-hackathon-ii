import { describe, it, expect } from 'vitest';
import { createAppTheme } from './createAppTheme';
import { themeDefinitions } from './themeDefinitions';

describe('createAppTheme', () => {
  it('creates a light theme with correct background', () => {
    const theme = createAppTheme(themeDefinitions[0], false);
    expect(theme.palette.mode).toBe('light');
    expect(theme.palette.background.default).toBe(themeDefinitions[0].light.bg);
  });

  it('creates a dark theme with inverted colors', () => {
    const theme = createAppTheme(themeDefinitions[0], true);
    expect(theme.palette.mode).toBe('dark');
    expect(theme.palette.background.default).toBe(themeDefinitions[0].dark.bg);
  });

  it('maps accent colors to MUI palette', () => {
    const def = themeDefinitions[1]; // bold
    const theme = createAppTheme(def, false);
    expect(theme.palette.primary.main).toBe(def.accents[2]); // blue
    expect(theme.palette.secondary.main).toBe(def.accents[3]); // purple
    expect(theme.palette.error.main).toBe(def.accents[4]); // pink
    expect(theme.palette.warning.main).toBe(def.accents[5]); // orange
    expect(theme.palette.success.main).toBe(def.accents[1]); // green
  });

  it('works for all defined themes', () => {
    for (const def of themeDefinitions) {
      const light = createAppTheme(def, false);
      const dark = createAppTheme(def, true);
      expect(light.palette.mode).toBe('light');
      expect(dark.palette.mode).toBe('dark');
    }
  });
});
