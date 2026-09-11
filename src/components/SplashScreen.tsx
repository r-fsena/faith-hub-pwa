import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useBranding } from '../context/BrandingContext';

interface SplashScreenProps {
  onFinish?: () => void;
  minDurationMs?: number;
}

const FAITHHUB_DEFAULT_LOGO = '/brand/logo-transparent.png';

export const SplashScreen: React.FC<SplashScreenProps> = ({
  onFinish,
  minDurationMs = 400
}) => {
  const { branding } = useBranding();
  const [isVisible, setIsVisible] = useState(true);
  const [isFadingOut, setIsFadingOut] = useState(false);

  useEffect(() => {
    // Remove o placeholder splash estático do HTML inicial se ele ainda existir
    const initialSplash = document.getElementById('initial-splash');
    if (initialSplash) {
      initialSplash.style.transition = 'opacity 0.20s ease';
      initialSplash.style.opacity = '0';
      setTimeout(() => {
        initialSplash.remove();
      }, 200);
    }

    // Tempo de transição suave e ágil
    const timer = setTimeout(() => {
      setIsFadingOut(true);
      const removeTimer = setTimeout(() => {
        setIsVisible(false);
        if (onFinish) onFinish();
      }, 300); // tempo de fade-out

      return () => clearTimeout(removeTimer);
    }, minDurationMs);

    return () => clearTimeout(timer);
  }, [minDurationMs, onFinish]);

  if (!isVisible) return null;

  const primaryColor = branding.primary_color || '#0f766e';
  const secondaryColor = branding.secondary_color || '#14b8a6';
  const churchName = branding.church_name || 'Faith-Hub';
  const tagline = branding.tagline || 'Conectando corações, transformando vidas';
  
  // Se não houver logo customizado na congregação, usa o logo oficial Faith-Hub
  const customLogo = (branding.logo_header_url || branding.logo_icon_url || '').trim();
  const logoUrl = customLogo ? customLogo : FAITHHUB_DEFAULT_LOGO;

  return createPortal(
    <div
      id="faithhub-splash-portal"
      style={{
        position: 'fixed',
        inset: 0,
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: '100dvh',
        minHeight: '100vh',
        zIndex: 999999,
        backgroundColor: '#090d16',
        background: `radial-gradient(circle at 50% 35%, rgba(15, 23, 42, 0.85) 0%, #090d16 80%)`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 'calc(env(safe-area-inset-top, 24px) + 36px) 24px calc(env(safe-area-inset-bottom, 24px) + 28px) 24px',
        boxSizing: 'border-box',
        opacity: isFadingOut ? 0 : 1,
        transform: isFadingOut ? 'scale(1.02)' : 'scale(1)',
        transition: 'opacity 0.35s cubic-bezier(0.4, 0, 0.2, 1), transform 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
        pointerEvents: isFadingOut ? 'none' : 'auto',
        overflow: 'hidden',
        userSelect: 'none'
      }}
    >
      {/* Luz ambiente de fundo (Aura Neon) */}
      <div
        style={{
          position: 'absolute',
          top: '36%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '320px',
          height: '320px',
          borderRadius: '50%',
          background: `radial-gradient(circle, ${primaryColor}40 0%, ${secondaryColor}15 45%, transparent 75%)`,
          filter: 'blur(50px)',
          pointerEvents: 'none',
          animation: 'splash-aura 3s ease-in-out infinite alternate'
        }}
      />

      {/* Espaçador Superior */}
      <div style={{ height: '10px' }} />

      {/* Conteúdo Central: Logo + Nome da Igreja + Slogan */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          position: 'relative',
          zIndex: 2,
          maxWidth: '340px',
          width: '100%',
          animation: 'splash-fade-up 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards'
        }}
      >
        {/* Card do Logo com Reflexo e Sombra Suave */}
        <div
          style={{
            position: 'relative',
            width: '96px',
            height: '96px',
            borderRadius: '26px',
            background: 'linear-gradient(145deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.02) 100%)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: `1.5px solid rgba(255, 255, 255, 0.16)`,
            boxShadow: `0 20px 45px rgba(0, 0, 0, 0.6), 0 0 30px ${primaryColor}40`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '20px',
            padding: '12px',
            boxSizing: 'border-box'
          }}
        >
          <img
            src={logoUrl}
            alt={churchName}
            style={{
              maxWidth: '100%',
              maxHeight: '100%',
              objectFit: 'contain',
              filter: 'drop-shadow(0 4px 14px rgba(0,0,0,0.4))'
            }}
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              if (target.src !== FAITHHUB_DEFAULT_LOGO) {
                target.src = FAITHHUB_DEFAULT_LOGO;
              }
            }}
          />
        </div>

        {/* Nome da Igreja */}
        <h1
          style={{
            fontSize: '1.45rem',
            fontWeight: 900,
            color: '#ffffff',
            margin: '0 0 6px 0',
            letterSpacing: '-0.02em',
            fontFamily: "'Outfit', 'Plus Jakarta Sans', sans-serif",
            textShadow: '0 2px 14px rgba(0,0,0,0.6)',
            lineHeight: 1.25
          }}
        >
          {churchName}
        </h1>

        {/* Tagline / Slogan */}
        <p
          style={{
            fontSize: '0.82rem',
            color: 'rgba(255, 255, 255, 0.68)',
            margin: '0 0 20px 0',
            lineHeight: 1.4,
            fontWeight: 500,
            letterSpacing: '0.01em'
          }}
        >
          {tagline}
        </p>

        {/* Spinner Fluido Minimalista */}
        <div
          style={{
            width: '24px',
            height: '24px',
            borderRadius: '50%',
            border: '2px solid rgba(255, 255, 255, 0.12)',
            borderTopColor: secondaryColor,
            animation: 'splash-spin 0.8s linear infinite'
          }}
        />
      </div>

      {/* Rodapé Oficial: Powered by Faith-Hub */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '3px',
          zIndex: 2,
          opacity: 0.75
        }}
      >
        <span
          style={{
            fontSize: '0.62rem',
            fontWeight: 700,
            color: 'rgba(255, 255, 255, 0.40)',
            letterSpacing: '0.08em',
            textTransform: 'uppercase'
          }}
        >
          Aplicativo Oficial
        </span>
        <span style={{ fontSize: '0.72rem', color: '#ffffff', fontWeight: 800, letterSpacing: '0.02em' }}>
          Faith-Hub Ecosystem
        </span>
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
    </div>,
    document.body
  );
};
