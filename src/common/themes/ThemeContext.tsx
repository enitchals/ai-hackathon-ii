import { createContext, useContext, useEffect, useMemo, type ReactNode } from 'react';
import { ThemeProvider as MuiThemeProvider, CssBaseline } from '@mui/material';
import { themeDefinitions, type AppThemeDefinition } from './themeDefinitions';
import { createAppTheme } from './createAppTheme';
import { useLocalStorage } from '../hooks/useLocalStorage';

interface ThemeContextValue {
  themeId: string;
  setThemeId: (id: string) => void;
  darkMode: boolean;
  setDarkMode: (dark: boolean) => void;
  toggleDarkMode: () => void;
  definition: AppThemeDefinition;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function useAppTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useAppTheme must be used within ThemeProvider');
  return ctx;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [themeId, setThemeId] = useLocalStorage('arcade:global:theme', 'pastel');
  const [darkMode, setDarkMode] = useLocalStorage('arcade:global:darkMode', false);

  const definition = useMemo(
    () => themeDefinitions.find((t) => t.id === themeId) ?? themeDefinitions[0],
    [themeId],
  );

  const muiTheme = useMemo(
    () => createAppTheme(definition, darkMode),
    [definition, darkMode],
  );

  useEffect(() => {
    document.body.className = definition.themeClass + (darkMode ? ' dark' : '');
  }, [definition, darkMode]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      themeId,
      setThemeId,
      darkMode,
      setDarkMode,
      toggleDarkMode: () => setDarkMode(!darkMode),
      definition,
    }),
    [themeId, setThemeId, darkMode, setDarkMode, definition],
  );

  return (
    <ThemeContext.Provider value={value}>
      <MuiThemeProvider theme={muiTheme}>
        <CssBaseline />
        {children}
      </MuiThemeProvider>
    </ThemeContext.Provider>
  );
}
