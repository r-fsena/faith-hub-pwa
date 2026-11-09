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
const normalize = (value: unknown): ThemePreference =>
  value === "DARK" || value === "dark"
    ? "dark"
    : value === "LIGHT" || value === "light"
      ? "light"
      : "system";
const valid = (v: string | null): v is ThemePreference =>
  ["light", "dark", "system"].includes(v || "");
interface ThemeContextType {
  themePreference: ThemePreference;
  resolvedTheme: ResolvedTheme;
  isReady?: boolean;
  setThemePreference: (pref: ThemePreference) => void;
}
export const ThemeContext = createContext<ThemeContextType>({
  themePreference: "system",
  resolvedTheme: "light",
  setThemePreference: () => {},
});
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { branding } = useBranding();
  const org = branding.organization_id || branding.pwa_slug || "unresolved";
  const key = `faithhub_theme_mode:${org}`;
  const initial = branding.pwa_experience?.customized
    ? (branding.pwa_experience.config?.theme?.default_mode ?? branding.theme_mode)
    : branding.theme_mode;
  const [themePreference, setPreference] = useState<ThemePreference>(
    normalize(initial),
  );
  const readinessKey = `${key}:${initial || 'system'}`;
  const [resolvedPreferenceKey, setResolvedPreferenceKey] = useState('');
  const [systemDark, setSystemDark] = useState(
    () => window.matchMedia("(prefers-color-scheme: dark)").matches,
  );
  useLayoutEffect(() => {
    const url = new URLSearchParams(location.search).get("theme");
    let saved = localStorage.getItem(key);
    const legacy=localStorage.getItem('faithhub_theme_mode');
    if(!valid(saved)&&valid(legacy)&&!localStorage.getItem('faithhub_theme_legacy_migrated')&&org!=='unresolved'&&localStorage.getItem('faithhub_pwa_active_org_id')===org){
      localStorage.setItem(key,legacy);
      localStorage.setItem('faithhub_theme_legacy_migrated',org);
      saved=legacy;
    }
    setPreference(valid(url) ? url : valid(saved) ? saved : normalize(initial));
    setResolvedPreferenceKey(readinessKey);
  }, [key, initial, readinessKey]);
  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const change = () => setSystemDark(media.matches);
    media.addEventListener("change", change);
    return () => media.removeEventListener("change", change);
  }, []);
  useEffect(() => {
    const update = (event: Event) => {
      const detail = (event as CustomEvent).detail;
      if (
        detail.organizationId === branding.organization_id &&
        !valid(localStorage.getItem(key)) &&
        !valid(new URLSearchParams(location.search).get("theme"))
      )
        setPreference(normalize(detail.mode || branding.theme_mode));
    };
    window.addEventListener("pwa-experience-mode", update);
    return () => window.removeEventListener("pwa-experience-mode", update);
  }, [key, branding.organization_id, branding.theme_mode]);
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
      localStorage.setItem(key, pref);
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
