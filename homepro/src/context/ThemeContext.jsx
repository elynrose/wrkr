import { createContext, useContext, useState, useEffect } from 'react';
import { getSettings } from '../services/api';

const themes = {
  blue: {
    name: 'Ocean Blue',
    primary: '#1a6fdb',
    primaryHover: '#1558b0',
    primaryLight: '#e8f1fd',
    accent: '#f97316',
    accentHover: '#ea6c09',
  },
  green: {
    name: 'Forest Green',
    primary: '#16a34a',
    primaryHover: '#148040',
    primaryLight: '#dcfce7',
    accent: '#f59e0b',
    accentHover: '#d97706',
  },
  purple: {
    name: 'Royal Purple',
    primary: '#7c3aed',
    primaryHover: '#6427cc',
    primaryLight: '#ede9fe',
    accent: '#ec4899',
    accentHover: '#db2777',
  },
  red: {
    name: 'Bold Red',
    primary: '#dc2626',
    primaryHover: '#b91c1c',
    primaryLight: '#fee2e2',
    accent: '#f97316',
    accentHover: '#ea6c09',
  },
  teal: {
    name: 'Modern Teal',
    primary: '#0d9488',
    primaryHover: '#0b7a71',
    primaryLight: '#ccfbf1',
    accent: '#6366f1',
    accentHover: '#4f46e5',
  },
  indigo: {
    name: 'Indigo Night',
    primary: '#4f46e5',
    primaryHover: '#4338ca',
    primaryLight: '#e0e7ff',
    accent: '#14b8a6',
    accentHover: '#0d9488',
  },
  amber: {
    name: 'Sunset Amber',
    primary: '#d97706',
    primaryHover: '#b45309',
    primaryLight: '#fef3c7',
    accent: '#2563eb',
    accentHover: '#1d4ed8',
  },
  rose: {
    name: 'Rose Glow',
    primary: '#e11d48',
    primaryHover: '#be123c',
    primaryLight: '#ffe4e6',
    accent: '#8b5cf6',
    accentHover: '#7c3aed',
  },
  cyan: {
    name: 'Arctic Cyan',
    primary: '#0891b2',
    primaryHover: '#0e7490',
    primaryLight: '#cffafe',
    accent: '#f97316',
    accentHover: '#ea580c',
  },
  slate: {
    name: 'Slate Pro',
    primary: '#334155',
    primaryHover: '#1e293b',
    primaryLight: '#e2e8f0',
    accent: '#0ea5e9',
    accentHover: '#0284c7',
  },
  emerald: {
    name: 'Emerald Fresh',
    primary: '#059669',
    primaryHover: '#047857',
    primaryLight: '#d1fae5',
    accent: '#7c3aed',
    accentHover: '#6d28d9',
  },
  magenta: {
    name: 'Magenta Pop',
    primary: '#c026d3',
    primaryHover: '#a21caf',
    primaryLight: '#fae8ff',
    accent: '#0ea5e9',
    accentHover: '#0284c7',
  },
  graphite: {
    name: 'Graphite Orange',
    primary: '#111827',
    primaryHover: '#030712',
    primaryLight: '#e5e7eb',
    accent: '#f97316',
    accentHover: '#ea580c',
  },
  sky: {
    name: 'Skyline Blue',
    primary: '#0284c7',
    primaryHover: '#0369a1',
    primaryLight: '#e0f2fe',
    accent: '#f59e0b',
    accentHover: '#d97706',
  },
  lime: {
    name: 'Lime Punch',
    primary: '#65a30d',
    primaryHover: '#4d7c0f',
    primaryLight: '#ecfccb',
    accent: '#0ea5e9',
    accentHover: '#0284c7',
  },
  violet: {
    name: 'Violet Spark',
    primary: '#6d28d9',
    primaryHover: '#5b21b6',
    primaryLight: '#ede9fe',
    accent: '#f43f5e',
    accentHover: '#e11d48',
  },
  orange: {
    name: 'Orange Burst',
    primary: '#ea580c',
    primaryHover: '#c2410c',
    primaryLight: '#ffedd5',
    accent: '#0ea5e9',
    accentHover: '#0284c7',
  },
  pink: {
    name: 'Pink Neon',
    primary: '#db2777',
    primaryHover: '#be185d',
    primaryLight: '#fce7f3',
    accent: '#6366f1',
    accentHover: '#4f46e5',
  },
  mint: {
    name: 'Mint Breeze',
    primary: '#10b981',
    primaryHover: '#059669',
    primaryLight: '#d1fae5',
    accent: '#3b82f6',
    accentHover: '#2563eb',
  },
  steel: {
    name: 'Steel Blue',
    primary: '#475569',
    primaryHover: '#334155',
    primaryLight: '#e2e8f0',
    accent: '#22c55e',
    accentHover: '#16a34a',
  },
  wine: {
    name: 'Wine Velvet',
    primary: '#9f1239',
    primaryHover: '#881337',
    primaryLight: '#ffe4e6',
    accent: '#f59e0b',
    accentHover: '#d97706',
  },
  ocean: {
    name: 'Ocean Deep',
    primary: '#0369a1',
    primaryHover: '#075985',
    primaryLight: '#e0f2fe',
    accent: '#14b8a6',
    accentHover: '#0d9488',
  },
  royal: {
    name: 'Royal Gold',
    primary: '#4338ca',
    primaryHover: '#3730a3',
    primaryLight: '#e0e7ff',
    accent: '#f59e0b',
    accentHover: '#d97706',
  },
  coffee: {
    name: 'Coffee Copper',
    primary: '#7c2d12',
    primaryHover: '#6b210f',
    primaryLight: '#ffedd5',
    accent: '#0ea5e9',
    accentHover: '#0284c7',
  },
  glacier: {
    name: 'Glacier',
    primary: '#0f766e',
    primaryHover: '#115e59',
    primaryLight: '#ccfbf1',
    accent: '#8b5cf6',
    accentHover: '#7c3aed',
  },
  sunset: {
    name: 'Sunset Coral',
    primary: '#f97316',
    primaryHover: '#ea580c',
    primaryLight: '#ffedd5',
    accent: '#7c3aed',
    accentHover: '#6d28d9',
  },
  carbon: {
    name: 'Carbon Cyan',
    primary: '#1f2937',
    primaryHover: '#111827',
    primaryLight: '#e5e7eb',
    accent: '#06b6d4',
    accentHover: '#0891b2',
  },
  meadow: {
    name: 'Meadow',
    primary: '#15803d',
    primaryHover: '#166534',
    primaryLight: '#dcfce7',
    accent: '#f59e0b',
    accentHover: '#d97706',
  },
  berry: {
    name: 'Berry',
    primary: '#be185d',
    primaryHover: '#9d174d',
    primaryLight: '#fce7f3',
    accent: '#22c55e',
    accentHover: '#16a34a',
  },
  azure: {
    name: 'Azure Mint',
    primary: '#2563eb',
    primaryHover: '#1d4ed8',
    primaryLight: '#dbeafe',
    accent: '#10b981',
    accentHover: '#059669',
  },
  lava: {
    name: 'Lava',
    primary: '#b91c1c',
    primaryHover: '#991b1b',
    primaryLight: '#fee2e2',
    accent: '#f59e0b',
    accentHover: '#d97706',
  },
  plum: {
    name: 'Plum',
    primary: '#7e22ce',
    primaryHover: '#6b21a8',
    primaryLight: '#f3e8ff',
    accent: '#06b6d4',
    accentHover: '#0891b2',
  },
  olive: {
    name: 'Olive Stone',
    primary: '#4d7c0f',
    primaryHover: '#3f6212',
    primaryLight: '#ecfccb',
    accent: '#0284c7',
    accentHover: '#0369a1',
  },
};

const fontOptions = {
  inter: { name: 'Inter', value: "'Inter', sans-serif" },
  poppins: { name: 'Poppins', value: "'Poppins', sans-serif" },
  roboto: { name: 'Roboto', value: "'Roboto', sans-serif" },
};

const borderRadiusOptions = [
  { key: 'sm', label: 'Sharp' },
  { key: 'md', label: 'Rounded' },
  { key: 'lg', label: 'Pill-ish' },
  { key: 'full', label: 'Full' },
];

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [colorKey, setColorKey] = useState('blue');
  const [darkMode, setDarkMode] = useState(false);
  const [fontKey, setFontKey] = useState('inter');
  const [borderRadius, setBorderRadius] = useState('md');
  const [themeLoaded, setThemeLoaded] = useState(false);

  // Load theme from admin settings (site-wide)
  useEffect(() => {
    getSettings()
      .then((data) => {
        if (data.default_theme && themes[data.default_theme]) setColorKey(data.default_theme);
        if (typeof data.default_dark_mode !== 'undefined') setDarkMode(data.default_dark_mode === true || data.default_dark_mode === 'true' || data.default_dark_mode === '1');
        if (data.default_font && fontOptions[data.default_font]) setFontKey(data.default_font);
        if (data.default_border_radius && borderRadiusOptions.some(r => r.key === data.default_border_radius)) setBorderRadius(data.default_border_radius);
      })
      .catch(() => {})
      .finally(() => setThemeLoaded(true));
  }, []);

  const theme = themes[colorKey] || themes.blue;
  const font = fontOptions[fontKey] || fontOptions.inter;

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--color-primary', theme.primary);
    root.style.setProperty('--color-primary-hover', theme.primaryHover);
    root.style.setProperty('--color-primary-light', theme.primaryLight);
    root.style.setProperty('--color-accent', theme.accent);
    root.style.setProperty('--color-accent-hover', theme.accentHover);
    root.style.setProperty('--font-family', font.value);

    const radii = { sm: '4px', md: '8px', lg: '16px', full: '9999px' };
    root.style.setProperty('--border-radius', radii[borderRadius]);

    if (darkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [colorKey, darkMode, fontKey, borderRadius, theme, font]);

  return (
    <ThemeContext.Provider
      value={{
        colorKey, setColorKey,
        darkMode, setDarkMode,
        fontKey, setFontKey,
        borderRadius, setBorderRadius,
        theme, font,
        themes, fontOptions, borderRadiusOptions,
        themeLoaded,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
export { themes, fontOptions, borderRadiusOptions };
