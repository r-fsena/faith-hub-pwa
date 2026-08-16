import React, { createContext, useContext, useState, useEffect } from 'react';
import { fetchChurchSettings } from '../services/api';

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
}

const DEFAULT_BRANDING: ChurchBranding = {
  church_name: 'Faith-Hub',
  tagline: '',
  cnpj: '',
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
  pwa_splash_bg: '#0f172a'
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
    const path = window.location.pathname.replace(/^\/+|\/+$/g, '');
    if (!path) return null;
    const segments = path.split('/');
    const firstSegment = segments[0]?.toLowerCase();
    
    // Ignora rotas do app que não são slugs de igrejas
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
      }
    };

    window.addEventListener('church-branding-updated', handleUpdate);
    return () => window.removeEventListener('church-branding-updated', handleUpdate);
  }, []);

  const loadBranding = async () => {
    const urlSlug = getChurchSlugFromUrl();
    const activeSlug = urlSlug || localStorage.getItem('faithhub_active_church_slug') || undefined;

    if (urlSlug) {
      localStorage.setItem('faithhub_active_church_slug', urlSlug);
    }

    // 1. Carrega do localStorage imediato para não piscar
    const saved = localStorage.getItem('faithhub_church_branding');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const merged = { ...DEFAULT_BRANDING, ...parsed };
        setBranding(merged);
        applyTheme(merged);
      } catch (e) {
        console.error("Erro ao carregar branding PWA do cache", e);
      }
    } else {
      applyTheme(DEFAULT_BRANDING);
    }

    // 2. Busca do backend a versão mais recente em nuvem (usando o slug da igreja se presente)
    try {
      const backendSettings = await fetchChurchSettings(activeSlug);
      if (backendSettings && backendSettings.church_name) {
        const mapped: Partial<ChurchBranding> = {
          church_name: backendSettings.church_name,
          tagline: backendSettings.slogan || DEFAULT_BRANDING.tagline,
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
          pwa_theme_color: backendSettings.pwa_theme_color || backendSettings.primary_color || DEFAULT_BRANDING.pwa_theme_color
        };
        const updated = { ...DEFAULT_BRANDING, ...mapped };
        setBranding(updated);
        localStorage.setItem('faithhub_church_branding', JSON.stringify(updated));
        applyTheme(updated);
      }
    } catch (err) {
      console.log("Usando branding em cache local offline", err);
    }
  };

  const applyTheme = (data: Partial<ChurchBranding>) => {
    const p = data.primary_color || '#0f766e';
    const s = data.secondary_color || '#14b8a6';
    
    document.documentElement.style.setProperty('--accent-primary', p);
    document.documentElement.style.setProperty('--accent-secondary', s);
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
    localStorage.setItem('faithhub_church_branding', JSON.stringify(updated));
    applyTheme(updated);
  };

  return (
    <BrandingContext.Provider value={{ branding, updateBranding }}>
      {children}
    </BrandingContext.Provider>
  );
};

export const useBranding = () => useContext(BrandingContext);
