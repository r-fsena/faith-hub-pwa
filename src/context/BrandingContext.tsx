import React, { createContext, useContext, useState, useEffect } from 'react';
import { fetchChurchSettings, setActiveOrganizationId } from '../services/api';

export interface ChurchBranding {
  church_name: string;
  tagline: string;
  cnpj: string;
  address: string;
  city: string;
  state: string;
  whatsapp: string;
  email: string;
  instagram: string;
  youtube: string;
  website: string;
  logo_icon_url: string;
  logo_header_url: string;
  banner_url: string;
  primary_color: string;
  secondary_color: string;
  theme_mode: 'LIGHT' | 'DARK' | 'AUTO';
  pwa_short_name: string;
  pwa_slug: string;
  custom_domain: string;
  pwa_description: string;
  pwa_theme_color: string;
  pwa_splash_bg: string;
  status?: string;
  pix_key?: string;
  pix_key_type?: string;
  store_title?: string;
  store_subtitle?: string;
  store_tab_title?: string;
  store_counter_label?: string;
  store_config?: {
    store_title?: string;
    store_subtitle?: string;
    store_tab_title?: string;
    store_counter_label?: string;
    product_groups?: Array<{ id?: string; name: string; active?: boolean } | string>;
  };
  bible_config?: {
    enabled_versions: string[];
    default_version: string;
    allow_user_version_switch: boolean;
    daily_verse_enabled: boolean;
    reading_history_enabled: boolean;
    highlights_enabled: boolean;
    whatsapp_share_enabled: boolean;
    featured_reading_book?: string;
    pastoral_note?: string;
  };
  welcome_screen_config?: {
    enabled: boolean;
    hero_image_url?: string;
    headline?: string;
    subtitle?: string;
    allow_guest_browse?: boolean;
    slides?: Array<{
      badge: string;
      title: string;
      description: string;
    }>;
  };
  organization_id?: string;
}

export const DEFAULT_WELCOME_SCREEN_CONFIG = {
  enabled: true,
  hero_image_url: 'https://images.unsplash.com/photo-1511632765486-a01980e01a18?auto=format&fit=crop&w=1200&q=80',
  headline: 'Viva o propósito da sua vida em comunidade',
  subtitle: 'Acompanhe devocionais, conecte-se à sua célula e participe de encontros que transformam vidas.',
  allow_guest_browse: true,
  slides: [
    {
      badge: 'CÉLULAS',
      title: 'Conecte-se em um Grupo',
      description: 'Amizades reais e comunhão nos lares da nossa congregação.'
    },
    {
      badge: 'PALAVRA',
      title: 'Devocionais Diários',
      description: 'Mensagens em vídeo e estudos bíblicos preparados pelos pastores.'
    },
    {
      badge: 'EVENTOS',
      title: 'Eventos & Ministério Kids',
      description: 'Inscrições com QR Code express e check-in seguro para seus filhos.'
    }
  ]
};

const DEFAULT_BRANDING: ChurchBranding = {
  organization_id: 'org_default',
  church_name: 'Faith-Hub',
  tagline: '',
  cnpj: '',
  pix_key: '',
  pix_key_type: 'CNPJ',
  address: '',
  city: '',
  state: '',
  whatsapp: '',
  email: '',
  instagram: '',
  youtube: '',
  website: '',
  logo_icon_url: '',
  logo_header_url: '',
  banner_url: '',
  primary_color: '#0f766e',
  secondary_color: '#14b8a6',
  theme_mode: 'LIGHT',
  pwa_short_name: 'Faith-Hub',
  pwa_slug: '',
  custom_domain: '',
  pwa_description: '',
  pwa_theme_color: '#0f766e',
  pwa_splash_bg: '#0f172a',
  store_title: 'Loja Oficial',
  store_subtitle: 'Livros, vestuário, devocionais e itens com retirada expressa',
  store_tab_title: 'Loja',
  store_counter_label: 'Balcão da Loja da Igreja',
  welcome_screen_config: DEFAULT_WELCOME_SCREEN_CONFIG
};

interface BrandingContextType {
  branding: ChurchBranding;
  updateBranding: (newBranding: Partial<ChurchBranding>) => void;
}

const BrandingContext = createContext<BrandingContextType>({
  branding: DEFAULT_BRANDING,
  updateBranding: () => {}
});

export function getChurchSlugFromUrl(): string | null {
  try {
    // 1. Prioridade: Parâmetros de Query String (?slug=... ou ?org=... ou ?church=... ou ?organization_id=...)
    const searchParams = new URLSearchParams(window.location.search);
    const querySlug = searchParams.get('slug') || searchParams.get('org') || searchParams.get('church') || searchParams.get('organization_id');
    if (querySlug && querySlug.trim()) {
      return querySlug.trim().toLowerCase();
    }

    // 2. Subdomínio (ex: igreja-renovada.faithhub.app ou igreja-renovada.localhost)
    const hostname = window.location.hostname.toLowerCase();
    const parts = hostname.split('.');
    if (parts.length >= 2) {
      const sub = parts[0];
      const ignoredSubs = ['app', 'www', 'api', 'admin', 'studio', 'faithhub', 'localhost', '127', 'ecossistema-faith-hub'];
      if (!ignoredSubs.includes(sub) && !hostname.includes('vercel.app')) {
        return sub;
      }
    }

    // 3. Primeiro segmento do pathname (/igreja-renovada)
    const rawPath = window.location.pathname.replace(/^\/+|\/+$/g, '');
    if (!rawPath) return null;
    const decoded = decodeURIComponent(rawPath);
    const segments = decoded.split('/');
    const firstSegment = segments[0]?.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
    
    // Ignora rotas internas do app que não são slugs de igrejas
    const internalRoutes = ['login', 'signup', 'auth', 'profile', 'bible', 'devotionals', 'events', 'store', 'prayers', 'cells', 'live', 'admin'];
    if (internalRoutes.includes(firstSegment)) return null;
    
    return firstSegment;
  } catch {
    return null;
  }
}

export const BrandingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [branding, setBranding] = useState<ChurchBranding>(DEFAULT_BRANDING);

  useEffect(() => {
    loadBranding();

    const handleUpdate = (e: any) => {
      if (e.detail) {
        setBranding(prev => ({ ...prev, ...e.detail }));
        applyTheme(e.detail);
        if (e.detail.organization_id) {
          setActiveOrganizationId(e.detail.organization_id);
        }
      }
    };

    window.addEventListener('church-branding-updated', handleUpdate);
    return () => window.removeEventListener('church-branding-updated', handleUpdate);
  }, []);

  const loadBranding = async () => {
    const urlSlug = getChurchSlugFromUrl();
    const previousSavedSlug = localStorage.getItem('faithhub_active_church_slug');
    const activeSlug = urlSlug || previousSavedSlug || undefined;

    // Se o slug mudou em relação à sessão anterior, atualiza o storage
    if (urlSlug && urlSlug !== previousSavedSlug) {
      localStorage.setItem('faithhub_active_church_slug', urlSlug);
    }

    const cacheKey = `faithhub_church_branding_${activeSlug || 'default'}`;

    // 1. Carrega do localStorage imediato correspondente a este slug específico
    const saved = localStorage.getItem(cacheKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const merged = { ...DEFAULT_BRANDING, ...parsed };
        setBranding(merged);
        applyTheme(merged);
        if (merged.organization_id) {
          setActiveOrganizationId(merged.organization_id);
        }
      } catch (e) {
        console.error("Erro ao carregar branding PWA do cache", e);
      }
    } else if (!activeSlug) {
      applyTheme(DEFAULT_BRANDING);
      setActiveOrganizationId(DEFAULT_BRANDING.organization_id!);
    }

    // 2. Busca do backend a versão mais recente em nuvem para este slug específico
    try {
      const backendSettings = await fetchChurchSettings(activeSlug);
      if (backendSettings && backendSettings.church_name) {
        const resolvedOrgId = backendSettings.organization_id || (activeSlug?.startsWith('org_') ? activeSlug : 'org_default');
        const mapped: Partial<ChurchBranding> = {
          organization_id: resolvedOrgId,
          church_name: backendSettings.church_name,
          tagline: backendSettings.slogan !== undefined ? (backendSettings.slogan || '') : (backendSettings.tagline || ''),
          cnpj: backendSettings.cnpj || '',
          address: `${backendSettings.address_street || ''} ${backendSettings.address_number || ''}`.trim() || DEFAULT_BRANDING.address,
          city: backendSettings.address_city || DEFAULT_BRANDING.city,
          state: backendSettings.address_state || DEFAULT_BRANDING.state,
          whatsapp: backendSettings.whatsapp || '',
          email: backendSettings.email || '',
          instagram: backendSettings.instagram_url || '',
          youtube: backendSettings.youtube_url || '',
          website: backendSettings.website_url || '',
          logo_icon_url: backendSettings.logo_icon_url || '',
          logo_header_url: backendSettings.logo_header_url || '',
          banner_url: backendSettings.banner_url || '',
          primary_color: backendSettings.primary_color || DEFAULT_BRANDING.primary_color,
          secondary_color: backendSettings.secondary_color || DEFAULT_BRANDING.secondary_color,
          pwa_short_name: backendSettings.pwa_short_name || DEFAULT_BRANDING.pwa_short_name,
          pwa_slug: backendSettings.pwa_slug || DEFAULT_BRANDING.pwa_slug,
          pwa_theme_color: backendSettings.pwa_theme_color || backendSettings.primary_color || DEFAULT_BRANDING.pwa_theme_color,
          status: backendSettings.status || 'ACTIVE',
          bible_config: backendSettings.bible_config || undefined,
          store_config: backendSettings.store_config || undefined,
          store_title: backendSettings.store_config?.store_title || backendSettings.store_title || DEFAULT_BRANDING.store_title,
          store_subtitle: backendSettings.store_config?.store_subtitle || backendSettings.store_subtitle || DEFAULT_BRANDING.store_subtitle,
          store_tab_title: backendSettings.store_config?.store_tab_title || backendSettings.store_tab_title || DEFAULT_BRANDING.store_tab_title,
          store_counter_label: backendSettings.store_config?.store_counter_label || backendSettings.store_counter_label || DEFAULT_BRANDING.store_counter_label,
          welcome_screen_config: backendSettings.welcome_screen_config || DEFAULT_WELCOME_SCREEN_CONFIG
        };
        const updated = { ...DEFAULT_BRANDING, ...mapped };
        setBranding(updated);
        localStorage.setItem(cacheKey, JSON.stringify(updated));
        applyTheme(updated);
        setActiveOrganizationId(resolvedOrgId);
      }
    } catch (err) {
      console.log("Usando branding em cache local offline", err);
    }
  };

  function computeBrightAccent(hex: string): string {
    try {
      const cleanHex = hex.replace('#', '');
      if (cleanHex.length !== 6) return '#2dd4bf';
      const r = parseInt(cleanHex.substring(0, 2), 16) / 255;
      const g = parseInt(cleanHex.substring(2, 4), 16) / 255;
      const b = parseInt(cleanHex.substring(4, 6), 16) / 255;

      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      let h = 0, s = 0;
      const l = (max + min) / 2;

      if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
          case r: h = (g - b) / d + (g < b ? 6 : 0); break;
          case g: h = (b - r) / d + 2; break;
          case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
      }

      // Se a cor for escura, clareia para 68% de luminosidade com saturação viva (mínimo 65%)
      const targetL = Math.max(l, 0.68);
      const targetS = Math.min(Math.max(s, 0.65), 0.90);

      const hue2rgb = (p: number, q: number, t: number) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1/6) return p + (q - p) * 6 * t;
        if (t < 1/2) return q;
        if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
        return p;
      };

      const q = targetL < 0.5 ? targetL * (1 + targetS) : targetL + targetS - targetL * targetS;
      const pVal = 2 * targetL - q;
      const rOut = Math.round(hue2rgb(pVal, q, h + 1/3) * 255);
      const gOut = Math.round(hue2rgb(pVal, q, h) * 255);
      const bOut = Math.round(hue2rgb(pVal, q, h - 1/3) * 255);

      return `#${((1 << 24) + (rOut << 16) + (gOut << 8) + bOut).toString(16).slice(1)}`;
    } catch {
      return '#2dd4bf';
    }
  }

  const applyTheme = (data: Partial<ChurchBranding>) => {
    const p = data.primary_color || '#0f766e';
    const s = data.secondary_color || '#14b8a6';
    const bright = computeBrightAccent(p);
    
    document.documentElement.style.setProperty('--accent-primary', p);
    document.documentElement.style.setProperty('--accent-secondary', s);
    document.documentElement.style.setProperty('--accent-bright', bright);
    document.documentElement.style.setProperty('--accent-glow', `${bright}40`);
    document.documentElement.style.setProperty('--accent-primary-gradient', `linear-gradient(135deg, ${p} 0%, ${s} 100%)`);
    document.documentElement.style.setProperty('--accent-primary-light', `${p}1f`);
    
    // Atualiza a meta tag de theme-color no HTML
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) {
      metaTheme.setAttribute('content', data.pwa_theme_color || p);
    }

    // Atualiza o título da página
    if (data.church_name) {
      document.title = `${data.church_name} • Aplicativo Oficial`;
    }

    // Atualiza o favicon se houver logo_icon_url
    if (data.logo_icon_url) {
      const link: HTMLLinkElement | null = document.querySelector("link[rel*='icon']");
      if (link) {
        link.href = data.logo_icon_url;
      }
    }
  };

  const updateBranding = (newBranding: Partial<ChurchBranding>) => {
    const updated = { ...branding, ...newBranding };
    setBranding(updated);
    const activeSlug = updated.pwa_slug || updated.organization_id || 'default';
    localStorage.setItem(`faithhub_church_branding_${activeSlug}`, JSON.stringify(updated));
    if (updated.organization_id) {
      setActiveOrganizationId(updated.organization_id);
    }
    applyTheme(updated);
  };

  return (
    <BrandingContext.Provider value={{ branding, updateBranding }}>
      {children}
    </BrandingContext.Provider>
  );
};

export const useBranding = () => useContext(BrandingContext);
