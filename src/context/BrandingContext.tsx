import React, { createContext, useContext, useState, useEffect } from 'react';

export interface ChurchBranding {
  church_name: string;
  tagline: string;
  logo_icon_url: string;
  logo_header_url: string;
  banner_url: string;
  primary_color: string;
  secondary_color: string;
  pwa_short_name: string;
  pwa_slug: string;
  custom_domain: string;
  whatsapp: string;
  instagram: string;
  youtube: string;
}

const DEFAULT_BRANDING: ChurchBranding = {
  church_name: 'Comunidade Faith-Hub',
  tagline: 'Uma igreja viva para um Deus vivo',
  logo_icon_url: '',
  logo_header_url: '',
  banner_url: '',
  primary_color: '#0f766e',
  secondary_color: '#14b8a6',
  pwa_short_name: 'Faith App',
  pwa_slug: 'central',
  custom_domain: '',
  whatsapp: '(11) 98765-4321',
  instagram: '@igrejafaith',
  youtube: 'https://youtube.com/@igrejafaith'
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
        applyTheme(e.detail.primary_color, e.detail.secondary_color);
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
        setBranding(prev => ({ ...prev, ...parsed }));
        applyTheme(parsed.primary_color, parsed.secondary_color);
        return;
      } catch (e) {
        console.error("Erro ao carregar branding PWA", e);
      }
    }
    applyTheme(DEFAULT_BRANDING.primary_color, DEFAULT_BRANDING.secondary_color);
  };

  const applyTheme = (primary?: string, secondary?: string) => {
    const p = primary || '#0f766e';
    const s = secondary || '#14b8a6';
    document.documentElement.style.setProperty('--accent-primary', p);
    document.documentElement.style.setProperty('--accent-secondary', s);
    document.documentElement.style.setProperty('--accent-primary-gradient', `linear-gradient(135deg, ${p} 0%, ${s} 100%)`);
    document.documentElement.style.setProperty('--accent-primary-light', `${p}1f`);
    
    // Atualiza a meta tag de theme-color no HTML
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) {
      metaTheme.setAttribute('content', p);
    }
  };

  const updateBranding = (newBranding: Partial<ChurchBranding>) => {
    const updated = { ...branding, ...newBranding };
    setBranding(updated);
    localStorage.setItem('faithhub_church_branding', JSON.stringify(updated));
    applyTheme(updated.primary_color, updated.secondary_color);
  };

  return (
    <BrandingContext.Provider value={{ branding, updateBranding }}>
      {children}
    </BrandingContext.Provider>
  );
};

export const useBranding = () => useContext(BrandingContext);
