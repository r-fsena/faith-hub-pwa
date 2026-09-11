import React, { createContext, useContext, useState, useEffect } from 'react';
import { useBranding } from './BrandingContext';

export type ThemePreference = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

interface ThemeContextType {
  themePreference: ThemePreference;
  resolvedTheme: ResolvedTheme;
  setThemePreference: (pref: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  themePreference: 'system',
  resolvedTheme: 'light',
  setThemePreference: () => {}
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { branding } = useBranding();

  const [themePreference, setThemePreferenceState] = useState<ThemePreference>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('faithhub_theme_mode') as ThemePreference;
      if (saved === 'light' || saved === 'dark' || saved === 'system') {
        return saved;
      }
      // Fallback para o padrão da igreja se houver
      if (branding?.theme_mode) {
        return branding.theme_mode.toLowerCase() as ThemePreference;
      }
    }
    return 'system';
  });

  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>('light');

  // Aplica o tema visual no DOM
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const computeAndApplyTheme = () => {
      let isDark = false;

      if (themePreference === 'dark') {
        isDark = true;
      } else if (themePreference === 'light') {
        isDark = false;
      } else {
        // 'system'
        isDark = mediaQuery.matches;
      }

      const activeResolved: ResolvedTheme = isDark ? 'dark' : 'light';
      setResolvedTheme(activeResolved);

      const root = document.documentElement;
      const body = document.body;

      if (isDark) {
        root.classList.add('dark', 'dark-theme');
        body.classList.add('dark', 'dark-theme');
        root.setAttribute('data-theme', 'dark');
        body.setAttribute('data-theme', 'dark');

        // Atualiza a barra de status do celular para escuro
        const metaTheme = document.querySelector('meta[name="theme-color"]');
        if (metaTheme) {
          metaTheme.setAttribute('content', '#090d16');
        }
      } else {
        root.classList.remove('dark', 'dark-theme');
        body.classList.remove('dark', 'dark-theme');
        root.setAttribute('data-theme', 'light');
        body.setAttribute('data-theme', 'light');

        // Restaura a cor primária da igreja na barra de status
        const metaTheme = document.querySelector('meta[name="theme-color"]');
        if (metaTheme) {
          metaTheme.setAttribute('content', branding.pwa_theme_color || branding.primary_color || '#0f766e');
        }
      }
    };

    computeAndApplyTheme();

    // Escuta mudanças de horário/tema no sistema operacional do dispositivo
    const handleSystemChange = () => {
      if (themePreference === 'system') {
        computeAndApplyTheme();
      }
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleSystemChange);
    } else {
      mediaQuery.addListener(handleSystemChange);
    }

    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleSystemChange);
      } else {
        mediaQuery.removeListener(handleSystemChange);
      }
    };
  }, [themePreference, branding.pwa_theme_color, branding.primary_color]);

  const setThemePreference = (pref: ThemePreference) => {
    setThemePreferenceState(pref);
    if (typeof window !== 'undefined') {
      localStorage.setItem('faithhub_theme_mode', pref);
    }
  };

  return (
    <ThemeContext.Provider value={{ themePreference, resolvedTheme, setThemePreference }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
