import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

export type ThemeId = 'gold' | 'sapphire' | 'emerald' | 'rose' | 'slate';

export interface Theme {
  id: ThemeId;
  name: string;
  swatch: string; // hex for the UI swatch
  vars: Record<string, string>; // CSS variable name → space-separated RGB channels
}

export const THEMES: Theme[] = [
  {
    id: 'gold',
    name: 'Gold',
    swatch: '#c8940f',
    vars: {
      '--color-background':           '245 242 237',
      '--color-foreground':           '28 25 23',
      '--color-card':                 '255 255 255',
      '--color-card-foreground':      '28 25 23',
      '--color-secondary':            '247 243 238',
      '--color-secondary-foreground': '68 64 60',
      '--color-muted':                '237 233 227',
      '--color-muted-foreground':     '120 113 108',
      '--color-border':               '221 215 207',
      '--color-input':                '201 193 183',
      '--color-primary':              '200 148 15',
      '--color-primary-light':        '232 168 32',
      '--color-primary-foreground':   '255 255 255',
      '--color-ring':                 '200 148 15',
      '--color-cream':                '250 246 240',
      '--color-cream-dark':           '240 235 226',
    },
  },
  {
    id: 'sapphire',
    name: 'Sapphire',
    swatch: '#2563eb',
    vars: {
      '--color-background':           '240 245 255',
      '--color-foreground':           '15 23 42',
      '--color-card':                 '255 255 255',
      '--color-card-foreground':      '15 23 42',
      '--color-secondary':            '239 246 255',
      '--color-secondary-foreground': '30 64 175',
      '--color-muted':                '219 234 254',
      '--color-muted-foreground':     '71 85 105',
      '--color-border':               '191 219 254',
      '--color-input':                '147 197 253',
      '--color-primary':              '37 99 235',
      '--color-primary-light':        '59 130 246',
      '--color-primary-foreground':   '255 255 255',
      '--color-ring':                 '37 99 235',
      '--color-cream':                '239 246 255',
      '--color-cream-dark':           '219 234 254',
    },
  },
  {
    id: 'emerald',
    name: 'Emerald',
    swatch: '#059669',
    vars: {
      '--color-background':           '240 253 249',
      '--color-foreground':           '6 30 22',
      '--color-card':                 '255 255 255',
      '--color-card-foreground':      '6 30 22',
      '--color-secondary':            '236 253 245',
      '--color-secondary-foreground': '6 78 59',
      '--color-muted':                '209 250 229',
      '--color-muted-foreground':     '52 78 65',
      '--color-border':               '167 243 208',
      '--color-input':                '110 231 183',
      '--color-primary':              '5 150 105',
      '--color-primary-light':        '16 185 129',
      '--color-primary-foreground':   '255 255 255',
      '--color-ring':                 '5 150 105',
      '--color-cream':                '236 253 245',
      '--color-cream-dark':           '209 250 229',
    },
  },
  {
    id: 'rose',
    name: 'Rose',
    swatch: '#e11d48',
    vars: {
      '--color-background':           '255 241 244',
      '--color-foreground':           '28 5 12',
      '--color-card':                 '255 255 255',
      '--color-card-foreground':      '28 5 12',
      '--color-secondary':            '255 228 234',
      '--color-secondary-foreground': '136 19 55',
      '--color-muted':                '254 205 215',
      '--color-muted-foreground':     '113 63 78',
      '--color-border':               '253 164 175',
      '--color-input':                '251 113 133',
      '--color-primary':              '225 29 72',
      '--color-primary-light':        '244 63 94',
      '--color-primary-foreground':   '255 255 255',
      '--color-ring':                 '225 29 72',
      '--color-cream':                '255 228 234',
      '--color-cream-dark':           '254 205 215',
    },
  },
  {
    id: 'slate',
    name: 'Slate',
    swatch: '#475569',
    vars: {
      '--color-background':           '248 250 252',
      '--color-foreground':           '15 23 42',
      '--color-card':                 '255 255 255',
      '--color-card-foreground':      '15 23 42',
      '--color-secondary':            '241 245 249',
      '--color-secondary-foreground': '30 41 59',
      '--color-muted':                '226 232 240',
      '--color-muted-foreground':     '100 116 139',
      '--color-border':               '203 213 225',
      '--color-input':                '148 163 184',
      '--color-primary':              '71 85 105',
      '--color-primary-light':        '100 116 139',
      '--color-primary-foreground':   '255 255 255',
      '--color-ring':                 '71 85 105',
      '--color-cream':                '241 245 249',
      '--color-cream-dark':           '226 232 240',
    },
  },
];

const STORAGE_KEY = 'sfoacc-theme';

interface ThemeContextValue {
  themeId: ThemeId;
  theme: Theme;
  setTheme: (id: ThemeId) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  for (const [key, value] of Object.entries(theme.vars)) {
    root.style.setProperty(key, value);
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [themeId, setThemeId] = useState<ThemeId>(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as ThemeId | null;
    return saved && THEMES.some(t => t.id === saved) ? saved : 'gold';
  });

  const theme = THEMES.find(t => t.id === themeId) ?? THEMES[0];

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const setTheme = (id: ThemeId) => {
    setThemeId(id);
    localStorage.setItem(STORAGE_KEY, id);
  };

  return (
    <ThemeContext.Provider value={{ themeId, theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider');
  return ctx;
}
