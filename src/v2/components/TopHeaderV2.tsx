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
              background: 'rgba(241, 245, 249, 0.9)',
              border: '1px solid rgba(226, 232, 240, 0.8)',
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
        {/* Lado Esquerdo: Identidade, Saudação & Seletor de Campus */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
          <div 
            onClick={handleProfileClick} 
            className="v2-pressable"
            title="Ir para o Perfil"
            style={{ 
              width: '42px',
              height: '42px',
              borderRadius: '14px',
              background: 'var(--accent-primary-light, #f1f5f9)',
              border: '2px solid rgba(255,255,255,0.95)',
              boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              cursor: 'pointer'
            }}
          >
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
            {/* Linha 1: Saudação Personalizada + Badge V2 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ 
                fontWeight: 900, 
                fontSize: '0.94rem', 
                color: 'var(--text-main, #0f172a)', 
                lineHeight: 1.2,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}>
                {user?.name ? `Olá, ${user.name.split(' ')[0]}` : (branding.church_name || 'Faith-Hub')}
              </span>
              <span style={{
                fontSize: '0.58rem',
                fontWeight: 900,
                color: '#ffffff',
                background: 'var(--accent-primary, #0f766e)',
                padding: '1px 6px',
                borderRadius: '6px',
                letterSpacing: '0.04em',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                flexShrink: 0
              }}>
                V2
              </span>
            </div>

            {/* Linha 2: Seletor de Campus / Unidade Integrado */}
            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                if (onOpenCampusSelect) onOpenCampusSelect();
              }}
              className="v2-pressable"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                background: 'rgba(15, 118, 110, 0.08)',
                border: '1px solid rgba(15, 118, 110, 0.20)',
                borderRadius: '999px',
                padding: '3px 8px 3px 7px',
                cursor: 'pointer',
                marginTop: '3px',
                width: 'fit-content',
                outline: 'none'
              }}
            >
              <MapPinIcon size={12} color="var(--accent-primary, #0f766e)" />
              <span style={{ 
                fontSize: '0.68rem', 
                fontWeight: 800, 
                color: 'var(--accent-primary, #0f766e)',
                maxWidth: '130px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                lineHeight: 1.2
              }}>
                {campusName || 'Sede'}
              </span>
              <ChevronDownIcon size={11} color="var(--accent-primary, #0f766e)" />
            </button>
          </div>
        </div>

        {/* Lado Direito: Notificações com sino e indicador */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            onClick={handleNotifClick}
            title="Notificações e Avisos"
            className="v2-pressable"
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '14px',
              background: 'rgba(241, 245, 249, 0.9)',
              border: '1px solid rgba(226, 232, 240, 0.7)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: unreadCount > 0 ? 'var(--accent-primary, #0f766e)' : '#64748b',
              cursor: 'pointer',
              position: 'relative',
              outline: 'none'
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
              <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
            </svg>

            {unreadCount > 0 && (
              <span style={{
                position: 'absolute',
                top: '5px',
                right: '5px',
                width: '9px',
                height: '9px',
                borderRadius: '50%',
                background: '#ef4444',
                boxShadow: '0 0 0 2px #ffffff',
                animation: 'pulse 2s infinite'
              }} />
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
