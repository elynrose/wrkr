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

  const theme = themes[colorKey];
  const font = fontOptions[fontKey];

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
