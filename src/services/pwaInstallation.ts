export interface InstallManifest {
  id: string; name: string; short_name: string; start_url: string; scope: string;
  theme_color: string; background_color: string;
  icons: Array<{ src: string; sizes: string; type: string }>;
  apple_touch_icon: string;
}
export function installationManifestUrl(api: string, organizationId: string, origin: string) {
  const url = new URL(api.replace(/\/$/, '') + '/church-settings');
  url.search = new URLSearchParams({ organization_id: organizationId, format: 'pwa-manifest', origin }).toString();
  return url.href;
}
export function validateInstallManifest(value: any, organizationId: string, origin: string): InstallManifest {
  const fail = (): never => { throw Error('A identidade de instalação não corresponde à igreja atual.'); };
  if (!value || typeof value !== 'object') return fail();
  const id = new URL(value.id, origin), start = new URL(value.start_url, origin), scope = new URL(value.scope, origin);
  if (id.href !== `${origin}/pwa-installations/${encodeURIComponent(organizationId)}` || start.origin !== origin || scope.href !== start.href
    || start.search || start.hash || !/^\/[a-z0-9][a-z0-9-]*\/$/i.test(start.pathname)) return fail();
  if (typeof value.name !== 'string' || !value.name.trim() || value.name.length > 180 || typeof value.short_name !== 'string') return fail();
  const validIcon = (src: unknown, size: number) => {
    if (typeof src !== 'string') return false;
    const icon = new URL(src, origin);
    return (icon.protocol === 'https:' || icon.origin === origin) && !icon.username && !icon.password
      && icon.searchParams.get('organization_id') === organizationId && icon.searchParams.get('format') === 'pwa-icon'
      && icon.searchParams.get('size') === String(size);
  };
  if (!Array.isArray(value.icons) || ![192, 512].every(size => value.icons.some((icon: any) => icon.sizes === `${size}x${size}` && icon.type === 'image/png' && validIcon(icon.src, size)))
    || !value.icons.some((icon: any) => icon.sizes === '180x180' && icon.type === 'image/png' && validIcon(icon.src, 180))) return fail();
  return { ...value, apple_touch_icon: value.icons.find((icon: any) => icon.sizes === '180x180').src };
}
export function canonicalizeInstallLocation(manifest: InstallManifest) {
  const current = new URL(location.href), start = new URL(manifest.start_url);
  if (start.origin !== current.origin) throw Error('Abra o aplicativo no endereço oficial da igreja.');
  if (!current.pathname.startsWith(start.pathname)) current.pathname = start.pathname;
  for (const alias of ['slug', 'org', 'church', 'organization_id']) current.searchParams.delete(alias);
  if (current.href !== location.href) history.replaceState(history.state, '', current.href);
}
export function preloadInstallIcon(src: string, size: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const fail = () => reject(Error('Não foi possível carregar o ícone da igreja. Tente novamente.'));
    const timer = setTimeout(() => done(false), 15000);
    const done = (ok: boolean) => { clearTimeout(timer); signal.removeEventListener('abort', abort); image.onload = image.onerror = null; ok ? resolve() : fail(); };
    const abort = () => done(false);
    image.onload = () => done(image.naturalWidth === size && image.naturalHeight === size);
    image.onerror = () => done(false);
    signal.addEventListener('abort', abort, { once: true });
    if (signal.aborted) return done(false);
    image.src = src;
  });
}
