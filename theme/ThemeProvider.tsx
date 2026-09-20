import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import { Appearance, useColorScheme } from 'react-native';
import { darkColors, lightColors, ThemeColors, ThemeMode } from './colors';

type ThemeContextValue = {
  colors: ThemeColors;
  mode: ThemeMode;
  resolvedMode: 'light' | 'dark';
  setMode: (mode: ThemeMode) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);
const KEY = 'abc_doctor_theme_v1';

export function ThemeProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme();
  // Nothing stored means System, the way fitness's themeService.normalizePreference falls through
  // to it. Dark stays AMOLED, so a device already in dark appearance renders exactly what picking
  // Dark by hand would — one palette, not two — and a device in light appearance is no longer
  // overridden on first launch.
  const [mode, setModeState] = useState<ThemeMode>('system');

  useEffect(() => {
    AsyncStorage.getItem(KEY).then(value => {
      if (value === 'light' || value === 'dark' || value === 'system') setModeState(value);
    });
  }, []);

  const resolvedMode = mode === 'system' ? (system === 'dark' ? 'dark' : 'light') : mode;

  useEffect(() => {
    Appearance.setColorScheme(mode === 'system' ? 'unspecified' : mode);
  }, [mode]);

  const setMode = (next: ThemeMode) => {
    setModeState(next);
    void AsyncStorage.setItem(KEY, next);
  };

  const value = useMemo(() => ({
    colors: resolvedMode === 'dark' ? darkColors : lightColors,
    mode,
    resolvedMode,
    setMode,
  }), [mode, resolvedMode]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const value = useContext(ThemeContext);
  if (!value) throw new Error('useTheme must be used inside ThemeProvider');
  return value;
}
