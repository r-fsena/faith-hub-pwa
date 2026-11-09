import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useLayoutEffect,
  useCallback,
} from "react";
import { useBranding } from "./BrandingContext";
export type ThemePreference = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";
const valid = (v: string | null): v is ThemePreference =>
  ["light", "dark", "system"].includes(v || "");
interface ThemeContextType {
  themePreference: ThemePreference;
  resolvedTheme: ResolvedTheme;
  isReady?: boolean;
  setThemePreference: (pref: ThemePreference) => void;
}
export const ThemeContext = createContext<ThemeContextType>({
  themePreference: "dark",
  resolvedTheme: "dark",
  setThemePreference: () => {},
});
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { branding } = useBranding();
  const org = branding.organization_id || branding.pwa_slug || "unresolved";
  const key = `faithhub_theme_mode:${org}`;
  // Church palettes still define both themes; the visitor's initial preference is always dark.
  const [themePreference, setPreference] = useState<ThemePreference>('dark');
  const readinessKey = key;
  const [resolvedPreferenceKey, setResolvedPreferenceKey] = useState('');
  const [systemDark, setSystemDark] = useState(
    () => window.matchMedia("(prefers-color-scheme: dark)").matches,
  );
  useLayoutEffect(() => {
    const url = new URLSearchParams(location.search).get('theme');
    let saved: string | null = null;
    try {
      saved = localStorage.getItem(key);
      const legacy = localStorage.getItem('faithhub_theme_mode');
      if (!valid(saved) && valid(legacy) && !localStorage.getItem('faithhub_theme_legacy_migrated') && org !== 'unresolved' && localStorage.getItem('faithhub_pwa_active_org_id') === org) {
        localStorage.setItem(key, legacy);
        localStorage.setItem('faithhub_theme_legacy_migrated', org);
        saved = legacy;
      }
    } catch { /* The default remains usable when browser storage is unavailable. */ }
    setPreference(valid(url) ? url : valid(saved) ? saved : 'dark');
    setResolvedPreferenceKey(readinessKey);
  }, [key, org, readinessKey]);
  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const change = () => setSystemDark(media.matches);
    media.addEventListener("change", change);
    return () => media.removeEventListener("change", change);
  }, []);
  const resolvedTheme: ResolvedTheme =
    themePreference === "dark" || (themePreference === "system" && systemDark)
      ? "dark"
      : "light";
  useLayoutEffect(() => {
    for (const el of [document.documentElement, document.body]) {
      el.classList.toggle("dark", resolvedTheme === "dark");
      el.classList.toggle("dark-theme", resolvedTheme === "dark");
      el.dataset.theme = resolvedTheme;
    }
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute(
        "content",
        resolvedTheme === "dark"
          ? "#090d16"
          : branding.pwa_theme_color || branding.primary_color || "#0f766e",
      );
  }, [resolvedTheme, branding.pwa_theme_color, branding.primary_color]);
  const setThemePreference = useCallback(
    (pref: ThemePreference) => {
      if (!valid(pref)) return;
      setPreference(pref);
      try { localStorage.setItem(key, pref); } catch { /* Keep the choice for this session. */ }
      // An explicit user choice supersedes a theme supplied by a preview/test link.
      const url = new URL(location.href);
      if (url.searchParams.has('theme')) {
        url.searchParams.delete('theme');
        history.replaceState(history.state, '', url.href);
      }
    },
    [key],
  );
  return (
    <ThemeContext.Provider
      value={{ themePreference, resolvedTheme, isReady: resolvedPreferenceKey === readinessKey, setThemePreference }}
    >
      {children}
    </ThemeContext.Provider>
  );
}
export const useTheme = () => useContext(ThemeContext);
