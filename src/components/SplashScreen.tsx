import { useEffect } from 'react';
import { useBranding } from '../context/BrandingContext';
import { useTheme } from '../context/ThemeContext';
import { usePwaExperience } from '../context/PwaExperienceContext';
import { isMonochromeExperience, paletteFor, resolveExperience } from '../config/pwaExperience';

declare global {
  interface Window {
    faithhubBoot?: {
      update: (identity: { name?: string; logoUrl?: string; background?: string; text?: string; muted?: string; monochrome?: boolean; mode?: string }) => void;
      finish: () => void;
      fail: (message?: string) => void;
    };
  }
}

// Coordinates the existing HTML surface; React never mounts a second splash.
export function SplashScreen({ ready, error }: { ready: boolean; error?: string }) {
  const { branding, isResolved } = useBranding();
  const { resolvedTheme, isReady } = useTheme();
  const { config, active } = usePwaExperience();
  useEffect(() => {
    if (!isResolved || isReady === false) return;
    const bootstrap = branding.pwa_experience;
    let identityConfig = active ? config : null;
    if (!identityConfig && bootstrap?.enabled && bootstrap.customized) {
      try { identityConfig = resolveExperience(branding, bootstrap.config); } catch { /* Use legacy identity. */ }
    }
    const palette = identityConfig ? paletteFor(identityConfig, resolvedTheme, 'home') : null;
    window.faithhubBoot?.update({
      name: identityConfig?.identity.name || branding.church_name,
      logoUrl: identityConfig?.identity.logo_url || branding.logo_icon_url || branding.logo_header_url,
      background: palette?.background || (resolvedTheme === 'dark' ? '#090d16' : '#ffffff'),
      text: palette?.text || (resolvedTheme === 'dark' ? '#f8fafc' : '#0f172a'),
      muted: palette?.muted || (resolvedTheme === 'dark' ? '#cbd5e1' : '#475569'),
      monochrome: !!identityConfig && isMonochromeExperience(identityConfig), mode: resolvedTheme,
    });
  }, [branding, isResolved, isReady, resolvedTheme, config, active]);
  useEffect(() => { if (error) window.faithhubBoot?.fail(error); else if (ready) window.faithhubBoot?.finish(); }, [ready, error]);
  return null;
}
