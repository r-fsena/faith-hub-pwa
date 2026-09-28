import React from 'react';
import { useBranding } from '../context/BrandingContext';
import { useAuth } from '../context/AuthContext';

interface TopHeaderProps {
  onOpenNotifications?: () => void;
  onOpenProfile?: () => void;
  title?: string;
  onBack?: () => void;
  unreadCount?: number;
  campusName?: string;
  onOpenCampusSelect?: () => void;
}

export const TopHeader: React.FC<TopHeaderProps> = ({ 
  onOpenNotifications, 
  onOpenProfile,
  title,
  onBack,
  unreadCount = 0,
  campusName,
  onOpenCampusSelect
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
      <header className="pwa-topbar">
        <div className="pwa-topbar-inner" style={{ justifyContent: 'space-between' }}>
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
              padding: '6px 4px',
              flexShrink: 0,
              minHeight: '40px'
            }}
          >
            <span style={{ fontSize: '1.3rem', lineHeight: 1 }}>‹</span>
            <span>Voltar</span>
          </button>

          <span style={{ 
            fontSize: '0.92rem', 
            fontWeight: 900, 
            color: 'var(--text-main)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            textAlign: 'center',
            flex: 1,
            padding: '0 6px'
          }}>
            {title || branding.church_name}
          </span>

          <div style={{ width: '56px', flexShrink: 0 }} />
        </div>
      </header>
    );
  }

  return (
    <header className="pwa-topbar">
      <div className="pwa-topbar-inner">
        <div className="pwa-topbar-left" onClick={onOpenProfile} style={{ cursor: 'pointer' }}>
          <div className="pwa-church-avatar" title="Ir para o Perfil">
            <img 
              src={branding.logo_icon_url || '/brand/logo-symbol.png'} 
              alt={branding.church_name || 'Faith-Hub'} 
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                if (!target.src.endsWith('/brand/logo-symbol.png')) {
                  target.src = '/brand/logo-symbol.png';
                }
              }}
              style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '2px', boxSizing: 'border-box' }} 
            />
          </div>
          <div className="pwa-church-title">
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span className="pwa-greeting-name">
                {user?.name ? `Olá, ${user.name.split(' ')[0]}` : (branding.tagline || 'Bem-vindo(a)')}
              </span>
              <span style={{ fontSize: '0.88rem', lineHeight: 1 }}>{user ? '👋' : '✨'}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
              <span className="pwa-church-sub">
                {branding.church_name || 'Faith-Hub'}
              </span>
              {campusName && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onOpenCampusSelect) onOpenCampusSelect();
                  }}
                  className="pwa-campus-chip"
                  title="Alternar Congregação / Unidade"
                >
                  <span>📍 {campusName}</span>
                  {onOpenCampusSelect && <span style={{ fontSize: '0.62rem', opacity: 0.7 }}>▾</span>}
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="pwa-topbar-right">
          <button 
            className="icon-btn-pill" 
            onClick={onOpenNotifications} 
            title="Notificações e Avisos"
            style={{ position: 'relative' }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>
            {unreadCount > 0 ? (
              <span className="pwa-badge-count">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            ) : null}
          </button>
        </div>
      </div>
    </header>
  );
};
