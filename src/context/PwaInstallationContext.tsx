import React, { createContext, useContext, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useBranding } from './BrandingContext';
import { canonicalizeInstallLocation, installationManifestUrl, preloadInstallIcon, validateInstallManifest } from '../services/pwaInstallation';
import type { InstallManifest } from '../services/pwaInstallation';
interface InstallPrompt extends Event { prompt: () => Promise<unknown>; userChoice: Promise<{ outcome: string }>; }
interface InstallationState {
  manifest: InstallManifest | null; ready: boolean; error: string; installed: boolean;
  retry: () => void; prompt: () => Promise<'accepted' | 'dismissed' | 'manual'>;
}
const InstallationContext = createContext<InstallationState | null>(null);
export const usePwaInstallation = () => useContext(InstallationContext);
const API = import.meta.env.VITE_API_URL || 'https://usl72lj2m5.execute-api.us-east-2.amazonaws.com';
function clearHead() { document.querySelectorAll('[data-pwa-installation]').forEach(el => el.remove()); }
function applyHead(manifest: InstallManifest, manifestUrl: string) {
  clearHead();
  for (const rel of ['manifest', 'apple-touch-icon']) document.querySelectorAll(`link[rel="${rel}"]`).forEach(el => el.remove());
  const appleTitle = document.createElement('meta'); appleTitle.name = 'apple-mobile-web-app-title'; appleTitle.content = manifest.short_name; appleTitle.dataset.pwaInstallation = 'true'; document.head.append(appleTitle);
  for (const [rel, href, sizes] of [['apple-touch-icon', manifest.apple_touch_icon, '180x180'], ['icon', manifest.icons.find(i => i.sizes === '192x192')!.src, '192x192']]) {
    const link = rel === 'icon' ? document.querySelector<HTMLLinkElement>('link[rel="icon"]') || document.createElement('link') : document.createElement('link');
    link.rel = rel; link.href = href; link.type = 'image/png'; link.sizes.value = sizes; link.dataset.pwaInstallation = 'true'; document.head.append(link);
  }
  document.title = `${manifest.name} • Aplicativo Oficial`;
  // Append last: browser install checks now see the complete, verified identity.
  const link = document.createElement('link'); link.rel = 'manifest'; link.crossOrigin = 'anonymous'; link.href = manifestUrl; link.dataset.pwaInstallation = 'true'; document.head.append(link);
}
export function PwaInstallationProvider({ children }: { children: React.ReactNode }) {
  const { branding, isResolved } = useBranding();
  const org = branding.organization_id || '';
  const key = [isResolved, org, branding.pwa_slug, branding.logo_icon_url, branding.church_name, branding.pwa_experience?.revision].join(':');
  const [manifest, setManifest] = useState<InstallManifest | null>(null), [readyKey, setReadyKey] = useState(''), [error, setError] = useState(''), [attempt, setAttempt] = useState(0);
  const [installed, setInstalled] = useState(() => window.matchMedia('(display-mode: standalone)').matches || Boolean((navigator as any).standalone));
  const active = useRef<{ key: string; manifestUrl: string; id: string } | null>(null), deferred = useRef<{ event: InstallPrompt; id: string; url: string } | null>(null);
  const currentKey = useRef(key);
  useLayoutEffect(() => {
    currentKey.current = key; active.current = null; deferred.current = null; clearHead();
    document.querySelectorAll('link[rel="manifest"]').forEach(el => el.remove());
  }, [key]);
  const ready = isResolved === true && readyKey === key && !!manifest;
  useEffect(() => {
    const before = (event: Event) => {
      event.preventDefault(); const current = active.current;
      if (current && document.querySelector<HTMLLinkElement>('link[rel="manifest"]')?.href === current.manifestUrl)
        deferred.current = { event: event as InstallPrompt, id: current.id, url: current.manifestUrl };
    };
    const complete = () => { if (active.current) { deferred.current = null; setInstalled(true); } };
    window.addEventListener('beforeinstallprompt', before); window.addEventListener('appinstalled', complete);
    return () => { window.removeEventListener('beforeinstallprompt', before); window.removeEventListener('appinstalled', complete); };
  }, []);
  useEffect(() => {
    const controller = new AbortController(); let live = true;
    active.current = null; deferred.current = null; clearHead(); setManifest(null); setReadyKey(''); setError('');
    document.querySelectorAll('link[rel="manifest"]').forEach(el => el.remove());
    if (!isResolved || !org) return;
    const url = installationManifestUrl(API, org, location.origin);
    const timeout = setTimeout(() => controller.abort(), 20000);
    void (async () => {
      try {
        const response = await fetch(url, { cache: 'no-store', credentials: 'omit', signal: controller.signal });
        if (!response.ok) throw Error('Não foi possível preparar a instalação. Tente novamente.');
        const data = validateInstallManifest(await response.json(), org, location.origin);
        await Promise.all([...data.icons].map(icon => preloadInstallIcon(icon.src, Number(icon.sizes.split('x')[0]), controller.signal)));
        if (!live || currentKey.current !== key) return;
        canonicalizeInstallLocation(data); active.current = { key, manifestUrl: url, id: data.id };
        applyHead(data, url); setManifest(data); setReadyKey(key);
      } catch { if (live && currentKey.current === key) setError('Não foi possível preparar a instalação desta igreja. Tente novamente.'); }
    })().finally(() => clearTimeout(timeout));
    return () => { clearTimeout(timeout); live = false; controller.abort(); active.current = null; deferred.current = null; clearHead(); };
  }, [key, attempt]);
  useEffect(() => { setInstalled(window.matchMedia('(display-mode: standalone)').matches || Boolean((navigator as any).standalone)); }, [org]);
  const prompt = async (): Promise<'accepted' | 'dismissed' | 'manual'> => {
    const current = active.current, pending = deferred.current;
    if (!ready || !current || current.key !== key) return 'manual';
    canonicalizeInstallLocation(manifest!);
    if (!pending || pending.id !== current.id || pending.url !== current.manifestUrl) return 'manual';
    deferred.current = null;
    // Call synchronously under the click gesture; metadata was prepared beforehand.
    try { const shown = pending.event.prompt(); await shown; const choice = await pending.event.userChoice; if (choice.outcome === 'accepted') { setInstalled(true); return 'accepted'; } return 'dismissed'; }
    catch { return 'manual'; }
  };
  return <InstallationContext.Provider value={{ manifest: ready ? manifest : null, ready, error, installed, retry: () => setAttempt(v => v + 1), prompt }}>{children}</InstallationContext.Provider>;
}
