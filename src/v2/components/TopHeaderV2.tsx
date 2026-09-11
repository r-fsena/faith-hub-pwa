import React, { useState, useEffect } from 'react';
import { useBranding } from '../../context/BrandingContext';
import { useAuth } from '../../context/AuthContext';
import { triggerHaptic } from '../utils/haptics';
import { MapPinIcon, ChevronDownIcon, ChevronLeftIcon } from './Icons';

interface TopHeaderV2Props {
  onOpenNotifications?: () => void;
  onOpenProfile?: () => void;
  title?: string;
  onBack?: () => void;
  unreadCount?: number;
  campusName?: string;
  onOpenCampusSelect?: () => void;
}

export const TopHeaderV2: React.FC<TopHeaderV2Props> = ({ 
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
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 15);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleBackClick = () => {
    triggerHaptic('light');
    if (onBack) onBack();
  };

  const handleProfileClick = () => {
    triggerHaptic('selection');
    if (onOpenProfile) onOpenProfile();
  };

  const handleNotifClick = () => {
    triggerHaptic('selection');
    if (onOpenNotifications) onOpenNotifications();
  };

  // Modo Sub-tela (com botão Voltar)
  if (onBack) {
    return (
      <header style={{
        position: 'sticky',
        top: 0,
        zIndex: 90,
        background: isScrolled ? 'rgba(255, 255, 255, 0.92)' : 'rgba(255, 255, 255, 0.82)',
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        borderBottom: isScrolled ? '1px solid rgba(226, 232, 240, 0.9)' : '1px solid transparent',
        boxShadow: isScrolled ? '0 4px 20px rgba(0, 0, 0, 0.04)' : 'none',
        transition: 'all 0.25s ease',
        padding: 'env(safe-area-inset-top, 0px) 14px 0 14px'
      }}>
        <div style={{
          height: '54px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          maxWidth: '460px',
          margin: '0 auto',
          width: '100%'
        }}>
          <button 
            type="button" 
            onClick={handleBackClick}
            className="v2-pressable"
            style={{
              background: 'var(--bg-card-subtle, rgba(241, 245, 249, 0.9))',
              border: '1px solid var(--panel-border, rgba(226, 232, 240, 0.8))',
              borderRadius: '14px',
              color: 'var(--text-main, #0f172a)',
              fontSize: '0.84rem',
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
              padding: '6px 12px 6px 10px',
              minHeight: '36px',
              outline: 'none'
            }}
          >
            <ChevronLeftIcon size={16} color="var(--text-main, #0f172a)" />
            <span>Voltar</span>
          </button>

          <span style={{ 
            fontSize: '0.94rem', 
            fontWeight: 900, 
            color: 'var(--text-main, #0f172a)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            textAlign: 'center',
            flex: 1,
            padding: '0 12px'
          }}>
            {title || branding.church_name}
          </span>

          <div style={{ width: '68px' }} />
        </div>
      </header>
    );
  }

  return (
    <header style={{
      position: 'sticky',
      top: 0,
      zIndex: 90,
      background: 'var(--v2-glass-surface, rgba(255, 255, 255, 0.85))',
      backdropFilter: 'blur(24px) saturate(180%)',
      WebkitBackdropFilter: 'blur(24px) saturate(180%)',
      borderBottom: isScrolled ? '1px solid var(--v2-glass-border, rgba(226, 232, 240, 0.85))' : '1px solid transparent',
      boxShadow: isScrolled ? 'var(--v2-shadow-ambient)' : 'none',
      transition: 'all 0.25s ease',
      padding: 'env(safe-area-inset-top, 0px) 16px 0 16px'
    }}>
      <div style={{
        height: '60px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        maxWidth: '460px',
        margin: '0 auto',
        width: '100%'
      }}>
        {/* Lado Esquerdo: Identidade da Congregação / Saudação do Membro com Respiro Amplo */}
        <div 
          onClick={handleProfileClick} 
          className="v2-pressable"
          title="Ir para o Perfil"
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '10px', 
            minWidth: 0, 
            flex: 1, 
            cursor: 'pointer' 
          }}
        >
          <div style={{ 
            width: '42px',
            height: '42px',
            borderRadius: '14px',
            background: 'var(--accent-primary-light, rgba(255, 255, 255, 0.08))',
            border: '1.5px solid var(--panel-border, rgba(255, 255, 255, 0.20))',
            boxShadow: '0 4px 14px rgba(0, 0, 0, 0.12)',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <img 
              src={branding.logo_icon_url || '/brand/logo-symbol.png'} 
              alt={branding.church_name || 'Faith-Hub'} 
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                if (!target.src.endsWith('/brand/logo-symbol.png')) {
                  target.src = '/brand/logo-symbol.png';
                }
              }}
              style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '2px' }} 
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            <span style={{ 
              fontWeight: 900, 
              fontSize: '0.96rem', 
              color: 'var(--text-main, #0f172a)', 
              lineHeight: 1.2,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              letterSpacing: '-0.01em'
            }}>
              {user?.name ? `Olá, ${user.name.split(' ')[0]}` : (branding.church_name || 'Faith-Hub')}
            </span>
            <span style={{
              fontSize: '0.70rem',
              fontWeight: 700,
              color: 'var(--text-muted, #94a3b8)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              lineHeight: 1.2,
              marginTop: '1px'
            }}>
              {user?.name ? (branding.church_name || 'Membro Oficial') : (branding.tagline || 'Aplicativo Oficial')}
            </span>
          </div>
        </div>

        {/* Lado Direito: Ações Rápidas Ergonômicas (Seletor de Unidade + Sino de Notificações com Alto Contraste) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          {/* Seletor de Campus / Unidade no Lado Direito (Toque confortável com polegar) */}
          <button
            type="button"
            onClick={() => {
              triggerHaptic('light');
              if (onOpenCampusSelect) onOpenCampusSelect();
            }}
            className="v2-pressable v2-campus-pill"
            title="Alterar Unidade / Campus"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              height: '38px',
              background: 'var(--v2-campus-pill-bg, rgba(255, 255, 255, 0.10))',
              border: '1px solid var(--v2-campus-pill-border, rgba(255, 255, 255, 0.18))',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              borderRadius: '999px',
              padding: '0 12px 0 10px',
              cursor: 'pointer',
              outline: 'none',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)'
            }}
          >
            <MapPinIcon size={14} color="var(--v2-campus-pill-icon, #2dd4bf)" />
            <span style={{ 
              fontSize: '0.74rem', 
              fontWeight: 800, 
              color: 'var(--v2-campus-pill-color, var(--text-main, #ffffff))',
              maxWidth: '105px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              lineHeight: 1
            }}>
              {campusName || 'Sede'}
            </span>
            <ChevronDownIcon size={12} color="var(--v2-campus-pill-icon, #2dd4bf)" />
          </button>

          {/* Botão de Notificações com Sino Luminoso e Alto Contraste */}
          <button
            type="button"
            onClick={handleNotifClick}
            title="Notificações e Avisos"
            className="v2-pressable"
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '12px',
              background: 'var(--bg-card-subtle, rgba(255, 255, 255, 0.10))',
              border: '1px solid var(--panel-border, rgba(255, 255, 255, 0.18))',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: unreadCount > 0 ? '#f59e0b' : 'var(--text-main, #ffffff)',
              cursor: 'pointer',
              position: 'relative',
              outline: 'none',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)'
            }}
          >
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              width="20" 
              height="20" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2.3" 
              strokeLinecap="round" 
              strokeLinejoin="round"
              style={{
                filter: unreadCount > 0 ? 'drop-shadow(0 0 6px rgba(245, 158, 11, 0.5))' : 'none'
              }}
            >
              <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
              <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
            </svg>

            {unreadCount > 0 && (
              <span style={{
                position: 'absolute',
                top: '-2px',
                right: '-2px',
                background: '#ef4444',
                color: '#ffffff',
                fontSize: '0.60rem',
                fontWeight: 900,
                minWidth: '17px',
                height: '17px',
                borderRadius: '999px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0 4px',
                border: '2px solid var(--bg-main, #090d16)',
                boxShadow: '0 0 10px rgba(239, 68, 68, 0.8)',
                animation: 'pulse 2s infinite'
              }}>
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
