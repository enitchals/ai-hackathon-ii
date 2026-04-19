import { createTheme, type Theme } from '@mui/material/styles';
import { type AppThemeDefinition } from './themeDefinitions';

export function createAppTheme(
  definition: AppThemeDefinition,
  darkMode: boolean,
): Theme {
  const colors = darkMode ? definition.dark : definition.light;
  const [yellow, green, blue, purple, pink, orange] = definition.accents;

  return createTheme({
    palette: {
      mode: darkMode ? 'dark' : 'light',
      background: {
        default: colors.bg,
        paper: colors.bg,
      },
      text: {
        primary: colors.fg,
      },
      primary: { main: blue },
      secondary: { main: purple },
      error: { main: pink },
      warning: { main: orange },
      success: { main: green },
      info: { main: yellow },
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          ':root': {
            '--app-bg': colors.bg,
            '--app-fg': colors.fg,
            '--accent-yellow': yellow,
            '--accent-green': green,
            '--accent-blue': blue,
            '--accent-purple': purple,
            '--accent-pink': pink,
            '--accent-orange': orange,
          },
          body: {
            backgroundColor: colors.bg,
            color: colors.fg,
          },
        },
      },
    },
  });
}
