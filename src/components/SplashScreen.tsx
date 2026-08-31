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
  minDurationMs = 1800
}) => {
  const { branding } = useBranding();
  const [isVisible, setIsVisible] = useState(true);
  const [isFadingOut, setIsFadingOut] = useState(false);

  useEffect(() => {
    // Remove o placeholder splash estático do HTML inicial se ele ainda existir
    const initialSplash = document.getElementById('initial-splash');
    if (initialSplash) {
      initialSplash.style.transition = 'opacity 0.25s ease';
      initialSplash.style.opacity = '0';
      setTimeout(() => {
        initialSplash.remove();
      }, 250);
    }

    // Exibe o splash pelo tempo mínimo agradável para fixar a marca
    const timer = setTimeout(() => {
      setIsFadingOut(true);
      const removeTimer = setTimeout(() => {
        setIsVisible(false);
        if (onFinish) onFinish();
      }, 450); // tempo de fade-out

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
        backgroundColor: '#0f172a',
        background: `radial-gradient(circle at 50% 35%, #1e293b 0%, #0f172a 60%, #020617 100%)`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 'calc(env(safe-area-inset-top, 24px) + 36px) 24px calc(env(safe-area-inset-bottom, 24px) + 28px) 24px',
        boxSizing: 'border-box',
        opacity: isFadingOut ? 0 : 1,
        transform: isFadingOut ? 'scale(1.03)' : 'scale(1)',
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
          top: '32%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '340px',
          height: '340px',
          borderRadius: '50%',
          background: `radial-gradient(circle, ${primaryColor}45 0%, ${secondaryColor}20 45%, transparent 75%)`,
          filter: 'blur(45px)',
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
          animation: 'splash-fade-up 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards'
        }}
      >
        {/* Card do Logo com Reflexo e Sombra Suave */}
        <div
          style={{
            position: 'relative',
            width: '110px',
            height: '110px',
            borderRadius: '28px',
            background: 'linear-gradient(145deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.03) 100%)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: `1.5px solid rgba(255, 255, 255, 0.20)`,
            boxShadow: `0 20px 45px rgba(0, 0, 0, 0.5), 0 0 35px ${primaryColor}55`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '22px',
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
              filter: 'drop-shadow(0 4px 14px rgba(0,0,0,0.35))'
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
            fontSize: '1.65rem',
            fontWeight: 900,
            color: '#ffffff',
            margin: '0 0 6px 0',
            letterSpacing: '-0.5px',
            fontFamily: "'Outfit', 'Plus Jakarta Sans', sans-serif",
            textShadow: '0 2px 14px rgba(0,0,0,0.5)',
            lineHeight: 1.25
          }}
        >
          {churchName}
        </h1>

        {/* Tagline / Slogan */}
        <p
          style={{
            fontSize: '0.84rem',
            color: 'rgba(255, 255, 255, 0.72)',
            margin: '0 0 26px 0',
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
            width: '130px',
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

      {/* Rodapé Oficial: Powered by Faith-Hub */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '4px',
          zIndex: 2,
          opacity: 0.85
        }}
      >
        <span
          style={{
            fontSize: '0.65rem',
            fontWeight: 700,
            color: 'rgba(255, 255, 255, 0.45)',
            letterSpacing: '0.08em',
            textTransform: 'uppercase'
          }}
        >
          Aplicativo Oficial
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '0.74rem', color: '#ffffff', fontWeight: 800, letterSpacing: '0.02em' }}>
            Faith-Hub Ecosystem
          </span>
          <span style={{ fontSize: '0.60rem', background: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.9)', padding: '2px 6px', borderRadius: '4px', fontWeight: 800 }}>
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
    </div>,
    document.body
  );
};
