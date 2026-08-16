import React from 'react';
import { useBranding } from '../context/BrandingContext';
import { useAuth } from '../context/AuthContext';

interface TopHeaderProps {
  onOpenNotifications?: () => void;
  onOpenProfile?: () => void;
  title?: string;
  onBack?: () => void;
}

export const TopHeader: React.FC<TopHeaderProps> = ({ 
  onOpenNotifications, 
  onOpenProfile,
  title,
  onBack
}) => {
  const { branding } = useBranding();
  const { user } = useAuth();

  const getInitials = (name: string) => {
    if (!name) return 'FH';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.substring(0, 2).toUpperCase();
  };

  // Se estiver em uma sub-tela (com botão Voltar)
  if (onBack) {
    return (
      <header className="pwa-topbar" style={{ justifyContent: 'space-between' }}>
        <button 
          type="button" 
          onClick={onBack}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-main)',
            fontSize: '0.86rem',
            fontWeight: 800,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            cursor: 'pointer',
            padding: '4px 0'
          }}
        >
          <span style={{ fontSize: '1.2rem', lineHeight: 1 }}>‹</span>
          <span>Voltar</span>
        </button>

        <span style={{ fontSize: '0.95rem', fontWeight: 900, color: 'var(--text-main)' }}>
          {title || branding.church_name}
        </span>

        <div style={{ width: '48px' }} /> {/* Espaçador para balancear o título ao centro */}
      </header>
    );
  }

  return (
    <header className="pwa-topbar">
      <div className="pwa-topbar-left" onClick={onOpenProfile} style={{ cursor: 'pointer' }}>
        <div className="pwa-church-avatar">
          {branding.logo_icon_url ? (
            <img src={branding.logo_icon_url} alt={branding.church_name} />
          ) : (
            <span>{getInitials(branding.church_name)}</span>
          )}
        </div>
        <div className="pwa-church-title">
          <span className="pwa-church-name">{branding.church_name}</span>
          <span className="pwa-greeting">
            {user?.name ? `Olá, ${user.name.split(' ')[0]}` : 'Bem-vindo(a) à comunidade'}
          </span>
        </div>
      </div>

      <div className="pwa-topbar-right">
        <button 
          className="icon-btn-pill" 
          onClick={onOpenNotifications} 
          title="Notificações e Avisos"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>
          <span className="badge-dot" />
        </button>
      </div>
    </header>
  );
};
