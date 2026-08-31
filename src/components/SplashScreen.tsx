import React, { useState, useEffect } from 'react';
import { useBranding } from '../context/BrandingContext';

interface SplashScreenProps {
  onFinish?: () => void;
  minDurationMs?: number;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({
  onFinish,
  minDurationMs = 1800
}) => {
  const { branding } = useBranding();
  const [isVisible, setIsVisible] = useState(true);
  const [isFadingOut, setIsFadingOut] = useState(false);

  useEffect(() => {
    // Garante que o splash seja exibido pelo tempo mínimo agradável (1.8s)
    const timer = setTimeout(() => {
      setIsFadingOut(true);
      const removeTimer = setTimeout(() => {
        setIsVisible(false);
        if (onFinish) onFinish();
      }, 500); // tempo da animação de fade-out

      return () => clearTimeout(removeTimer);
    }, minDurationMs);

    return () => clearTimeout(timer);
  }, [minDurationMs, onFinish]);

  if (!isVisible) return null;

  const primaryColor = branding.primary_color || '#0f766e';
  const secondaryColor = branding.secondary_color || '#14b8a6';
  const churchName = branding.church_name || 'Comunidade Viva';
  const tagline = branding.tagline || 'Conectando corações, transformando vidas';
  const logoUrl = branding.logo_header_url || branding.logo_icon_url || '/brand/logo-white.png';

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 99999,
        background: `radial-gradient(circle at 50% 35%, #1e293b 0%, #0f172a 60%, #020617 100%)`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 'calc(env(safe-area-inset-top, 24px) + 32px) 24px calc(env(safe-area-inset-bottom, 24px) + 24px) 24px',
        opacity: isFadingOut ? 0 : 1,
        transform: isFadingOut ? 'scale(1.04)' : 'scale(1)',
        transition: 'opacity 0.45s cubic-bezier(0.4, 0, 0.2, 1), transform 0.45s cubic-bezier(0.4, 0, 0.2, 1)',
        pointerEvents: isFadingOut ? 'none' : 'auto',
        overflow: 'hidden',
        userSelect: 'none'
      }}
    >
      {/* Luz ambiente de fundo (Aura Neon) */}
      <div
        style={{
          position: 'absolute',
          top: '30%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '320px',
          height: '320px',
          borderRadius: '50%',
          background: `radial-gradient(circle, ${primaryColor}40 0%, ${secondaryColor}15 50%, transparent 75%)`,
          filter: 'blur(45px)',
          pointerEvents: 'none',
          animation: 'splash-aura 3s ease-in-out infinite alternate'
        }}
      />

      {/* Top Space */}
      <div style={{ height: '20px' }} />

      {/* Conteúdo Central: Logo + Nome + Slogan */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          position: 'relative',
          zIndex: 2,
          maxWidth: '340px',
          animation: 'splash-fade-up 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards'
        }}
      >
        {/* Container do Logo com Anel Luminoso */}
        <div
          style={{
            position: 'relative',
            width: '104px',
            height: '104px',
            borderRadius: '28px',
            background: 'linear-gradient(145deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.03) 100%)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: `1.5px solid rgba(255, 255, 255, 0.18)`,
            boxShadow: `0 20px 40px rgba(0, 0, 0, 0.4), 0 0 30px ${primaryColor}44`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '24px',
            overflow: 'hidden'
          }}
        >
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={churchName}
              style={{
                maxWidth: '72%',
                maxHeight: '72%',
                objectFit: 'contain',
                filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.3))'
              }}
              onError={(e) => {
                // Fallback para ícone padrão se der erro ao carregar logo
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
          ) : (
            <span style={{ fontSize: '2.6rem' }}>✝️</span>
          )}
        </div>

        {/* Nome da Igreja */}
        <h1
          style={{
            fontSize: '1.65rem',
            fontWeight: 900,
            color: '#ffffff',
            margin: '0 0 6px 0',
            letterSpacing: '-0.5px',
            fontFamily: "'Outfit', 'Plus Jakarta Sans', sans-serif",
            textShadow: '0 2px 14px rgba(0,0,0,0.5)'
          }}
        >
          {churchName}
        </h1>

        {/* Tagline / Slogan */}
        <p
          style={{
            fontSize: '0.84rem',
            color: 'rgba(255, 255, 255, 0.72)',
            margin: '0 0 28px 0',
            lineHeight: 1.4,
            fontWeight: 500,
            letterSpacing: '0.01em'
          }}
        >
          {tagline}
        </p>

        {/* Barra de Progresso / Loading Shimmer */}
        <div
          style={{
            width: '140px',
            height: '4px',
            borderRadius: '999px',
            background: 'rgba(255, 255, 255, 0.12)',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              height: '100%',
              width: '45%',
              borderRadius: '999px',
              background: `linear-gradient(90deg, transparent 0%, ${secondaryColor} 50%, #ffffff 100%)`,
              animation: 'splash-loading-bar 1.2s infinite ease-in-out'
            }}
          />
        </div>
      </div>

      {/* Rodapé: Powered by Faith-Hub */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '4px',
          zIndex: 2,
          opacity: 0.8
        }}
      >
        <span
          style={{
            fontSize: '0.66rem',
            fontWeight: 700,
            color: 'rgba(255, 255, 255, 0.5)',
            letterSpacing: '0.08em',
            textTransform: 'uppercase'
          }}
        >
          Aplicativo Oficial
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '0.72rem', color: '#ffffff', fontWeight: 800, letterSpacing: '0.02em' }}>
            Faith-Hub Ecosystem
          </span>
          <span style={{ fontSize: '0.62rem', background: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.9)', padding: '2px 6px', borderRadius: '4px', fontWeight: 800 }}>
            v2.4
          </span>
        </div>
      </div>

      {/* Keyframes CSS embutidos */}
      <style>{`
        @keyframes splash-aura {
          0% { transform: translate(-50%, -50%) scale(0.9); opacity: 0.7; }
          100% { transform: translate(-50%, -50%) scale(1.15); opacity: 1; }
        }
        @keyframes splash-fade-up {
          0% { opacity: 0; transform: translateY(16px) scale(0.96); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes splash-loading-bar {
          0% { left: -45%; }
          100% { left: 100%; }
        }
      `}</style>
    </div>
  );
};
