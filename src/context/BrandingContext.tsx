import React, { createContext, useContext, useState, useEffect } from 'react';

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
  church_name: 'Comunidade Faith-Hub',
  tagline: 'Uma igreja viva e relevante para todas as gerações',
  cnpj: '12.345.678/0001-90',
  address: 'Av. das Nações, 1500',
  city: 'São Paulo',
  state: 'SP',
  whatsapp: '(11) 98765-4321',
  email: 'contato@igreja.com.br',
  instagram: '@igrejafaith',
  youtube: 'https://youtube.com/@igrejafaith',
  website: 'https://minhaigreja.com.br',
  logo_icon_url: '',
  logo_header_url: '',
  banner_url: '',
  primary_color: '#0f766e',
  secondary_color: '#14b8a6',
  theme_mode: 'LIGHT',
  pwa_short_name: 'Faith App',
  pwa_slug: 'central',
  custom_domain: '',
  pwa_description: 'Aplicativo oficial da Comunidade Faith-Hub para membros, células e eventos.',
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

  const loadBranding = () => {
    const saved = localStorage.getItem('faithhub_church_branding');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const merged = { ...DEFAULT_BRANDING, ...parsed };
        setBranding(merged);
        applyTheme(merged);
        return;
      } catch (e) {
        console.error("Erro ao carregar branding PWA", e);
      }
    }
    applyTheme(DEFAULT_BRANDING);
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
