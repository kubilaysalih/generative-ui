// Design tokens + theming. `space`/`radius` are static; colors and text styles
// come from the active palette (dark or light), resolved from the user's theme
// preference and the system scheme. Components read the live palette via
// useTheme(); the static `colors`/`textStyles` exports are the dark defaults,
// kept for non-component code (e.g. the navigation container theme).

import { createContext, useContext } from 'react';
import { useColorScheme, type TextStyle } from 'react-native';
import { useSettingsStore, type ThemePref } from './state/settings';

export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 18,
  pill: 999,
} as const;

export interface Palette {
  bg: string;
  surface: string;
  surfaceAlt: string;
  border: string;
  text: string;
  textMuted: string;
  textFaint: string;
  primary: string;
  primaryText: string;
  accent: string;
  skeleton: string;
  danger: string;
}

export const darkColors: Palette = {
  bg: '#0B0B0F',
  surface: '#16161D',
  surfaceAlt: '#1E1E27',
  border: '#2A2A35',
  text: '#F5F5F7',
  textMuted: '#9A9AA8',
  textFaint: '#6A6A78',
  primary: '#6C8BFF',
  primaryText: '#FFFFFF',
  accent: '#FFB020',
  skeleton: '#22222C',
  danger: '#FF6B6B',
};

export const lightColors: Palette = {
  bg: '#FFFFFF',
  surface: '#F6F6F8',
  surfaceAlt: '#ECECF1',
  border: '#DEDEE5',
  text: '#121217',
  textMuted: '#5B5B66',
  textFaint: '#9A9AA8',
  primary: '#4C6BFF',
  primaryText: '#FFFFFF',
  accent: '#C77A0A',
  skeleton: '#E6E6EC',
  danger: '#D64545',
};

export type TextVariant =
  | 'large-heavy'
  | 'large'
  | 'title'
  | 'body'
  | 'caption'
  | 'label';

export type TextStyles = Record<TextVariant, TextStyle>;

export function makeTextStyles(c: Palette): TextStyles {
  return {
    'large-heavy': { fontSize: 24, fontWeight: '700', color: c.text, lineHeight: 30 },
    large: { fontSize: 22, fontWeight: '600', color: c.text, lineHeight: 28 },
    title: { fontSize: 17, fontWeight: '600', color: c.text, lineHeight: 22 },
    body: { fontSize: 15, fontWeight: '400', color: c.text, lineHeight: 21 },
    caption: { fontSize: 13, fontWeight: '400', color: c.textMuted, lineHeight: 18 },
    label: { fontSize: 12, fontWeight: '600', color: c.textFaint, lineHeight: 16 },
  };
}

export interface Theme {
  scheme: 'light' | 'dark';
  colors: Palette;
  text: TextStyles;
}

export const darkTheme: Theme = {
  scheme: 'dark',
  colors: darkColors,
  text: makeTextStyles(darkColors),
};

export const lightTheme: Theme = {
  scheme: 'light',
  colors: lightColors,
  text: makeTextStyles(lightColors),
};

const ThemeContext = createContext<Theme>(darkTheme);
export { ThemeContext };

/** The active theme, provided at the app root. */
export function useTheme(): Theme {
  return useContext(ThemeContext);
}

/** Resolve the theme from the user's preference + the OS color scheme. */
export function useResolvedTheme(): Theme {
  const pref: ThemePref = useSettingsStore((s) => s.theme);
  const system = useColorScheme();
  const scheme = pref === 'system' ? system ?? 'dark' : pref;
  return scheme === 'light' ? lightTheme : darkTheme;
}

// Dark defaults for non-component code (navigation theme, etc.).
export const colors = darkColors;
export const textStyles = makeTextStyles(darkColors);
