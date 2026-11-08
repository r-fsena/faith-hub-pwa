import React, { useState, useEffect } from "react";
import { BrandingContext } from "../context/BrandingContext";
import { FeatureFlagContext } from "../context/FeatureFlagContext";
import { AuthContext } from "../context/AuthContext";
import { ThemeContext } from "../context/ThemeContext";
import { CartProvider } from "../context/CartContext";
import {
  PwaExperienceProvider,
  ExperienceScreen,
} from "../context/PwaExperienceContext";
import {
  resolveExperience,
  validatePatch,
  SCREEN_LABELS,
  PALETTE_LABELS,
} from "../config/pwaExperience";
import type { ScreenId } from "../config/pwaExperience";
import { Home } from "../pages/Home";
import { HomeV2 } from "../v2/pages/HomeV2";
import { TopHeader } from "../components/TopHeader";
import { TopHeaderV2 } from "../v2/components/TopHeaderV2";
import { BottomNav } from "../components/BottomNav";
import { BottomNavV2 } from "../v2/components/BottomNavV2";
import { Bible } from "../pages/Bible";
import { Devotionals } from "../pages/Devotionals";
import { CellGroups } from "../pages/CellGroups";
import { Prayers } from "../pages/Prayers";
import { Events } from "../pages/Events";
import { Store } from "../pages/Store";
import { Giving } from "../pages/Giving";
import { VolunteerSchedules } from "../pages/VolunteerSchedules";
import { Profile } from "../pages/Profile";
import { WelcomeLoginScreenV1 } from "../v1/components/WelcomeLoginScreenV1";
import { WelcomeLoginScreenV2 } from "../v2/components/WelcomeLoginScreenV2";
import { KidsVolunteerPanel } from "../components/KidsVolunteerPanel";
import "../v2/styles/v2-theme.css";
const noop = () => {};
export default function PwaPreview() {
  const [message, setMessage] = useState<any>(null);
  const [ready, setReady] = useState(false);
  const params = new URLSearchParams(location.search),
    nonce = params.get("nonce"),
    parentOrigin = params.get("parent_origin") || "";
  const allowed = [
    "https://studio.faithhubs.com",
    "https://admin.faithhubs.com",
    "https://main.d2lyt83fsceg0b.amplifyapp.com",
  ];
  const trusted =
    allowed.includes(parentOrigin) ||
    (import.meta.env.DEV &&
      /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(parentOrigin));
  const send = (data: any) => {
    if (trusted && window.parent !== window)
      window.parent.postMessage({ ...data, nonce, protocol: 1 }, parentOrigin);
  };
  useEffect(() => {
    if (!trusted || !nonce) return;
    document.documentElement.dataset.pwaPreview = "true";
    const receive = (event: MessageEvent) => {
      if (
        event.source !== window.parent ||
        event.origin !== parentOrigin ||
        event.data?.nonce !== nonce ||
        event.data?.protocol !== 1 ||
        event.data?.type !== "PWA_PREVIEW_CONFIG"
      )
        return;
      try {
        const data = event.data;
        if (
          !Object.keys(SCREEN_LABELS).includes(data.screen) ||
          !["light", "dark"].includes(data.mode) ||
          !["v1", "v2"].includes(data.version) ||
          !["member", "visitor"].includes(data.persona)
        )
          return;
        validatePatch(data.config, true);
        const config = resolveExperience({}, data.config);
        const flags = Object.fromEntries(
          Object.entries(data.flags || {}).filter(
            ([k, v]) => k.length < 100 && typeof v === "boolean",
          ),
        );
        setMessage({ ...data, config, flags });
        setReady(true);
        send({ type: "PWA_PREVIEW_APPLIED", sequence: data.sequence });
      } catch {
        send({
          type: "PWA_PREVIEW_ERROR",
          message: "Configuração inválida para prévia.",
        });
      }
    };
    window.addEventListener("message", receive);
    send({ type: "PWA_PREVIEW_READY" });
    return () => {
      window.removeEventListener("message", receive);
      delete document.documentElement.dataset.pwaPreview;
    };
  }, [trusted, nonce, parentOrigin]);
  useEffect(() => {
    if (!message) return;
    for (const el of [document.documentElement, document.body]) {
      el.classList.toggle("dark", message.mode === "dark");
      el.classList.toggle("dark-theme", message.mode === "dark");
      el.dataset.theme = message.mode;
    }
    document
      .querySelectorAll("[data-experience-selected]")
      .forEach((el) => el.removeAttribute("data-experience-selected"));
    const selected = message.selected || "background";
    const selector =
      selected === "header" || selected === "headerText"
        ? ".experience-top-header,.pwa-topbar"
        : selected.startsWith("navigation")
          ? "nav"
          : selected === "surface" || selected === "border"
            ? '[data-experience-region="surface"],.v2-card,.card'
            : selected === "primary" || selected === "onPrimary"
              ? "button"
              : selected === "text" || selected === "muted"
                ? "h1,h2,h3,p"
                : "[data-experience-screen]";
    const target = document.querySelector(selector);
    target?.setAttribute("data-experience-selected", "true");
    target?.setAttribute(
      "data-experience-label",
      (PALETTE_LABELS as any)[selected] || "Prévia",
    );
  }, [message]);
  if (!ready || !message)
    return (
      <div style={{ padding: 30, fontFamily: "system-ui" }}>
        Preparando prévia do PWA…
      </div>
    );
  const { config, mode, version, persona, flags } = message;
  const screen = message.screen as ScreenId;
  const branding: any = {
    organization_id: "org_preview",
    church_name: config.identity.name || "Sua igreja",
    tagline: config.identity.tagline,
    logo_icon_url: config.identity.logo_url,
    banner_url: config.identity.banner_url,
    primary_color: config.theme[mode as "light" | "dark"].primary,
    theme_mode: mode.toUpperCase(),
    pwa_slug: "preview",
    welcome_screen_config: {
      enabled: screen !== "auth",
      headline: config.copy["welcome.title"],
      subtitle: config.copy["welcome.subtitle"],
      hero_image_url: config.identity.banner_url,
      allow_guest_browse: true,
    },
    store_title: config.copy["store.title"] || "Loja Oficial",
  };
  const nav = (id: any) => send({ type: "PWA_PREVIEW_SCREEN", screen: id });
  const homeProps = {
    onNavigate: nav,
    onOpenLive: noop,
    onOpenPrayers: () => nav("prayers"),
    onOpenEvents: () => nav("events"),
    onOpenBible: () => nav("bible"),
    onOpenGiving: () => nav("giving"),
    onOpenVolunteers: () => nav("volunteers"),
  };
  const isEntry = ["welcome", "auth"].includes(screen);
  const hasBack = [
    "bible",
    "events",
    "prayers",
    "giving",
    "volunteers",
  ].includes(screen);
  const Header = version === "v2" ? TopHeaderV2 : TopHeader,
    Nav = version === "v2" ? BottomNavV2 : BottomNav;
  const pages: Record<ScreenId, React.ReactNode> = {
    home:
      version === "v2" ? <HomeV2 {...homeProps} /> : <Home {...homeProps} />,
    welcome:
      version === "v2" ? (
        <WelcomeLoginScreenV2
          onContinueAsGuest={noop}
        />
      ) : (
        <WelcomeLoginScreenV1 onContinueAsGuest={noop} />
      ),
    auth: <Profile />,
    profile: <Profile />,
    bible: <Bible />,
    devotionals: <Devotionals />,
    cells: <CellGroups />,
    prayers: <Prayers />,
    events: <Events />,
    store: <Store />,
    giving: <Giving />,
    volunteers: <VolunteerSchedules />,
    kids: <KidsVolunteerPanel isOpen onClose={noop} />,
  };
  const inspect = (event: React.MouseEvent) => {
    const element = event.target as HTMLElement;
    const region =
      element
        .closest("[data-experience-region]")
        ?.getAttribute("data-experience-region") ||
      (element.closest("nav")
        ? "navigation"
        : element.closest("button")
          ? "primary"
          : element.closest("h1,h2,h3,p")
            ? "text"
            : "background");
    event.preventDefault();
    event.stopPropagation();
    send({ type: "PWA_PREVIEW_SELECT", region });
  };
  return (
    <BrandingContext.Provider
      value={{
        branding,
        selectedCampus: { id: "campus_preview", name: "Sede" },
        updateBranding: noop,
      }}
    >
      <FeatureFlagContext.Provider
        value={{
          flags,
          configs: {},
          isLoading: false,
          isFeatureEnabled: (key: string, fallback = false) =>
            flags[key] ?? fallback,
          getFeatureConfig: (_key: string, fallback: any) => fallback,
          refreshFlags: async () => {},
        }}
      >
        <ThemeContext.Provider
          value={{
            themePreference: mode,
            resolvedTheme: mode,
            setThemePreference: noop,
          }}
        >
          <AuthContext.Provider
            value={{
              user:
                persona === "member" && !["auth", "welcome"].includes(screen)
                  ? {
                      userId: "preview-member",
                      name: "Pessoa de demonstração",
                      email: "demonstracao@example.test",
                    }
                  : null,
              isAuthenticated:
                persona === "member" && !["auth", "welcome"].includes(screen),
              isLoading: false,
              signOut: async () => {},
              checkAuth: async () => {},
            }}
          >
            <CartProvider>
              <PwaExperienceProvider preview={config} previewScreen={screen}>
                <div
                  onClickCapture={inspect}
                  onSubmitCapture={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  className={version === "v2" ? "v2-shell" : "pwa-shell"}
                >
                  {!isEntry && (
                    <Header
                      {...({
                        title: hasBack
                          ? (config.copy[screen + ".title"] ??
                            SCREEN_LABELS[screen])
                          : undefined,
                        onBack: hasBack ? noop : undefined,
                        onOpenNotifications: noop,
                      } as any)}
                    />
                  )}
                  <ExperienceScreen screen={screen}>
                    <React.Fragment key={`${screen}:${version}:${persona}`}>
                      {pages[screen]}
                    </React.Fragment>
                  </ExperienceScreen>
                  {!isEntry && (
                    <Nav
                      activeTab={
                        [
                          "home",
                          "devotionals",
                          "cells",
                          "store",
                          "profile",
                        ].includes(screen)
                          ? (screen as any)
                          : "home"
                      }
                      onChangeTab={nav}
                    />
                  )}
                </div>
              </PwaExperienceProvider>
            </CartProvider>
          </AuthContext.Provider>
        </ThemeContext.Provider>
      </FeatureFlagContext.Provider>
    </BrandingContext.Provider>
  );
}
