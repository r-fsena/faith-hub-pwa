import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useLayoutEffect,
  useCallback,
  useMemo,
} from "react";
import { useBranding, BrandingContext } from "./BrandingContext";
import { useFeatureFlags } from "./FeatureFlagContext";
import { useTheme } from "./ThemeContext";
import { getActiveCampusId } from "../services/api";
import {
  EXPERIENCE_FLAG,
  isMonochromeExperience,
  resolveExperience,
  paletteFor,
  defaultExperience,
} from "../config/pwaExperience";
import type {
  ExperienceConfig,
  ExperiencePatch,
  ScreenId,
} from "../config/pwaExperience";
import "../experience/experience.css";
interface ExperienceContextValue {
  config: ExperienceConfig;
  active: boolean;
  isLoading?: boolean;
  screen: ScreenId;
  setScreen: (screen: ScreenId) => void;
  t: (key: string, fallback: string) => string;
}
const ExperienceContext = createContext<ExperienceContextValue>({
  config: defaultExperience(),
  active: false,
  screen: "home",
  setScreen: () => {},
  t: (_k, f) => f,
});
export const usePwaExperience = () => useContext(ExperienceContext);
const API =
  import.meta.env.VITE_API_URL ||
  "https://usl72lj2m5.execute-api.us-east-2.amazonaws.com";
export function PwaExperienceProvider({
  children,
  preview,
  previewScreen,
}: {
  children: React.ReactNode;
  preview?: ExperiencePatch;
  previewScreen?: ScreenId;
}) {
  const brandingState = useBranding();
  const { branding } = brandingState;
  const { isFeatureEnabled } = useFeatureFlags();
  const { resolvedTheme } = useTheme();
  const [screen, setScreen] = useState<ScreenId>("home");
  const [published, setPublished] = useState<any>(null);
  const [settledScope, setSettledScope] = useState('');
  const [campus, setCampus] = useState(getActiveCampusId());
  const org = branding.organization_id || "org_default";
  const enabled = !!preview || isFeatureEnabled(EXPERIENCE_FLAG, false);
  const scope = `${org}:${campus || "organization"}`;
  useEffect(() => {
    const change = () => setCampus(getActiveCampusId());
    window.addEventListener("pwa-campus-changed", change);
    return () => window.removeEventListener("pwa-campus-changed", change);
  }, []);
  useEffect(() => {
    if (preview) return;
    let live = true;
    let refreshing = false;
    const controller = new AbortController();
    const key = `faithhub_pwa_experience_v1:${scope}`;
    setPublished(null);
    if (!enabled) return;
    try {
      const cached = JSON.parse(localStorage.getItem(key) || "null");
      if (cached?.scope === scope) setPublished(cached);
    } catch {}
    async function refresh() {
      if (refreshing || document.visibilityState === "hidden") return;
      refreshing = true;
      try {
        const response = await fetch(
          `${API}/pwa-experience/published?organization_id=${encodeURIComponent(org)}${campus && campus !== "all" ? `&campus_id=${encodeURIComponent(campus)}` : ""}`,
          { signal: controller.signal, cache: "no-store" },
        );
        if (!response.ok) throw Error("EXPERIENCE_UNAVAILABLE");
        const data = await response.json();
        if (data.config) resolveExperience(branding, data.config);
        if (live) {
          const value = { ...data, scope };
          setPublished(value);
          localStorage.setItem(key, JSON.stringify(value));
          window.dispatchEvent(
            new CustomEvent("pwa-experience-mode", {
              detail: {
                organizationId: org,
                mode: data.config?.theme?.default_mode,
              },
            }),
          );
        }
      } catch {
      } finally {
        refreshing = false;
        if (live) setSettledScope(scope);
      }
    }
    void refresh();
    const timer = setInterval(() => void refresh(), 60000);
    const focus = () => void refresh();
    window.addEventListener("focus", focus);
    document.addEventListener("visibilitychange", focus);
    return () => {
      live = false;
      controller.abort();
      clearInterval(timer);
      window.removeEventListener("focus", focus);
      document.removeEventListener("visibilitychange", focus);
    };
  }, [scope, enabled, preview]);
  const scoped = published?.scope === scope ? published : null;
  const bootstrap = branding.pwa_experience;
  const data =
    preview ||
    (scoped?.enabled && scoped?.customized
      ? scoped.config
      : (!campus || campus === "all") && bootstrap?.customized
        ? bootstrap.config
        : null);
  const active = enabled && !!data;
  const config = useMemo(() => {
    try {
      return resolveExperience(branding, data);
    } catch {
      return defaultExperience(branding);
    }
  }, [branding, data]);
  const currentScreen = previewScreen || screen;
  useLayoutEffect(() => {
    const root = document.documentElement;
    const names: string[] = [];
    const set = (name: string, value: string) => {
      root.style.setProperty(name, value);
      names.push(name);
    };
    if (active) {
      root.dataset.pwaExperience = "custom";
      if (isMonochromeExperience(config)) root.dataset.pwaColorMode = "monochrome";
      const p = paletteFor(config, resolvedTheme, currentScreen);
      for (const [key, value] of Object.entries(p))
        set(
          `--exp-${key.replace(/[A-Z]/g, (c) => "-" + c.toLowerCase())}`,
          value,
        );
      const components = config.theme.components;
      set("--exp-home-columns", String(config.home.columns));
      set("--exp-radius", `${components.radius}px`);
      set("--exp-spacing", `${components.spacing}px`);
      set("--exp-font-scale", String(config.theme.typography.scale));
      set(
        "--exp-font",
        config.theme.typography.font === "serif"
          ? "Georgia, serif"
          : config.theme.typography.font === "system"
            ? "system-ui, sans-serif"
            : "'Plus Jakarta Sans', system-ui, sans-serif",
      );
      set(
        "--exp-shadow",
        components.shadow === "none"
          ? "none"
          : components.shadow === "strong"
            ? "0 12px 30px #00000025"
            : "0 5px 18px #00000010",
      );
      const aliases: Record<string, string> = {
        "--accent-primary": p.primary,
        "--accent-secondary": p.secondary,
        "--accent-bright": p.primary,
        "--accent-primary-gradient": `linear-gradient(135deg,${p.primary},${p.secondary})`,
        "--accent-primary-light": `${p.primary}1f`,
        "--bg-app": p.background,
        "--bg-main": p.background,
        "--bg-card": p.surface,
        "--panel-bg": p.surface,
        "--bg-card-subtle": p.surfaceMuted,
        "--panel-border": p.border,
        "--text-main": p.text,
        "--text-secondary": p.muted,
        "--text-muted": p.muted,
        "--exp-module-accent": p.primary,
        "--exp-module-soft": `${p.primary}1f`,
      };
      for (const [k, v] of Object.entries(aliases)) set(k, v);
      const region = config.screens[currentScreen];
      if (region?.overlay !== undefined) set('--exp-welcome-overlay', `linear-gradient(180deg,rgba(0,0,0,${region.overlay}),rgba(0,0,0,${region.overlay}))`);
      if (region?.image_url)
        set(
          "--exp-screen-image",
          `linear-gradient(#000000${Math.round((region.overlay ?? 0.35) * 255)
            .toString(16)
            .padStart(2, "0")},#000000${Math.round(
            (region.overlay ?? 0.35) * 255,
          )
            .toString(16)
            .padStart(2, "0")}),url(${JSON.stringify(region.image_url)})`,
        );
      const meta = document.querySelector('meta[name="theme-color"]');
      meta?.setAttribute("content", p.header);
    }
    if (!active) {
      root.style.setProperty(
        "--accent-primary",
        branding.primary_color || "#0f766e",
      );
      root.style.setProperty(
        "--accent-secondary",
        branding.secondary_color || "#14b8a6",
      );
      root.style.setProperty(
        "--accent-primary-gradient",
        `linear-gradient(135deg,${branding.primary_color || "#0f766e"},${branding.secondary_color || "#14b8a6"})`,
      );
    }
    return () => {
      delete root.dataset.pwaExperience;
      delete root.dataset.pwaColorMode;
      for (const name of names) root.style.removeProperty(name);
    };
  }, [config, active, currentScreen, resolvedTheme]);
  const t = useCallback(
    (key: string, fallback: string) =>
      active ? (config.copy[key] ?? fallback) : fallback,
    [config, active],
  );
  const presentedBranding = active
    ? {
        ...branding,
        church_name: config.identity.name || branding.church_name,
        tagline: config.identity.tagline,
        logo_icon_url: config.identity.logo_url,
        logo_header_url: config.identity.logo_url || branding.logo_header_url,
        banner_url: config.identity.banner_url,
        store_title: config.copy["store.title"] ?? branding.store_title,
        store_subtitle:
          config.copy["store.subtitle"] ?? branding.store_subtitle,
        welcome_screen_config: {
          ...branding.welcome_screen_config,
          enabled: branding.welcome_screen_config?.enabled !== false,
          hero_image_url: config.screens.welcome?.image_url || branding.welcome_screen_config?.hero_image_url || config.identity.banner_url,
          headline:
            config.copy["welcome.title"] ??
            branding.welcome_screen_config?.headline,
          subtitle:
            config.copy["welcome.subtitle"] ??
            branding.welcome_screen_config?.subtitle,
        },
      }
    : branding;
  return (
    <ExperienceContext.Provider
      value={{ config, active, isLoading: enabled && !preview && settledScope !== scope && !scoped && !((!campus || campus === "all") && bootstrap?.customized), screen: currentScreen, setScreen, t }}
    >
      <BrandingContext.Provider
        value={{ ...brandingState, branding: presentedBranding }}
      >
        {children}
      </BrandingContext.Provider>
    </ExperienceContext.Provider>
  );
}
export function ExperienceScreen({
  screen,
  children,
}: {
  screen: ScreenId;
  children: React.ReactNode;
}) {
  const { t, active } = usePwaExperience();
  return (
    <section data-experience-screen={screen} className="experience-screen">
      {active &&
        screen === "home" &&
        (t(`${screen}.title`, "") || t(`${screen}.subtitle`, "")) && (
          <header
            className="experience-screen-heading"
            data-experience-region="text"
          >
            <h1>{t(`${screen}.title`, "")}</h1>
            <p>{t(`${screen}.subtitle`, "")}</p>
          </header>
        )}
      {children}
    </section>
  );
}
