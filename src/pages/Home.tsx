import React, { useState, useEffect } from 'react';
import { useBranding } from '../context/BrandingContext';
import { InstallPwaBanner } from '../components/InstallPwaBanner';
import { VisitorModal } from '../components/VisitorModal';
import { fetchActiveBroadcast, fetchEvents } from '../services/api';
import { checkPushNotificationSupport, requestPushPermission } from '../services/pushNotifications';
import type { ActiveTab } from '../components/BottomNav';

interface HomeProps {
  onNavigate: (tab: ActiveTab) => void;
  onOpenLive: () => void;
  onOpenPrayers: () => void;
  onOpenEvents: () => void;
  onOpenBible: () => void;
  onOpenGiving: () => void;
}

export const Home: React.FC<HomeProps> = ({
  onNavigate,
  onOpenLive,
  onOpenPrayers,
  onOpenEvents,
  onOpenBible,
  onOpenGiving
}) => {
  const { branding } = useBranding();
  const [activeBroadcast, setActiveBroadcast] = useState<any>(null);
  const [featuredEvent, setFeaturedEvent] = useState<any>(null);
  const [isVisitorModalOpen, setIsVisitorModalOpen] = useState(false);
  const [showPushBanner, setShowPushBanner] = useState(false);

  useEffect(() => {
    loadHomeData();
    checkPushStatus();
  }, []);

  const loadHomeData = async () => {
    const broadcast = await fetchActiveBroadcast();
    if (broadcast) setActiveBroadcast(broadcast);

    const events = await fetchEvents();
    if (events && Array.isArray(events) && events.length > 0) {
      setFeaturedEvent(events[0]);
    }
  };

  const checkPushStatus = () => {
    if (checkPushNotificationSupport() && Notification.permission === 'default') {
      const alreadyDismissed = sessionStorage.getItem('faithhub_push_dismissed');
      if (!alreadyDismissed) {
        setShowPushBanner(true);
      }
    }
  };

  const handleEnablePush = async () => {
    await requestPushPermission();
    setShowPushBanner(false);
  };

  const quickActions = [
    { label: 'Cultos ao Vivo', icon: '🔴', action: onOpenLive, bg: '#fee2e2' },
    { label: 'Palavra & Ensino', icon: '📖', action: () => onNavigate('devotionals'), bg: '#e0f2fe' },
    { label: 'Células & Redes', icon: '📍', action: () => onNavigate('cells'), bg: '#fef3c7' },
    { label: 'Cantina & Loja', icon: '🛒', action: () => onNavigate('store'), bg: '#dcfce7' },
    { label: 'Dízimos & Ofertas', icon: '🕊️', action: onOpenGiving, bg: '#fae8ff' },
    { label: 'Eventos & Cursos', icon: '🎟️', action: onOpenEvents, bg: '#ffedd5' },
    { label: 'Bíblia Digital', icon: '📜', action: onOpenBible, bg: '#e2e8f0' },
    { label: 'Mural de Oração', icon: '🙏', action: onOpenPrayers, bg: '#f1f5f9' },
  ];

  return (
    <div className="pwa-content animate-fade-in" style={{ gap: '18px' }}>
      
      {/* Banner de Instalação do PWA */}
      <InstallPwaBanner />

      {/* Banner Notificações Push Compacto */}
      {showPushBanner && (
        <div style={{ background: '#f0fdfa', border: '1.5px solid var(--accent-primary)', borderRadius: '16px', padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '1.2rem' }}>🔔</span>
            <div style={{ fontSize: '0.76rem', color: 'var(--text-main)', fontWeight: 700 }}>
              Ativar avisos de transmissões e devocionais?
            </div>
          </div>
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            <button 
              type="button" 
              onClick={handleEnablePush}
              style={{ background: 'var(--accent-primary)', color: '#ffffff', border: 'none', padding: '6px 12px', borderRadius: '8px', fontSize: '0.72rem', fontWeight: 800, cursor: 'pointer' }}
            >
              Ativar
            </button>
            <button 
              type="button" 
              onClick={() => { setShowPushBanner(false); sessionStorage.setItem('faithhub_push_dismissed', 'true'); }}
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '0.80rem', cursor: 'pointer' }}
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Hero Banner Inteligente da Igreja */}
      <div className="pwa-hero-card">
        {branding.banner_url ? (
          <img src={branding.banner_url} alt={branding.church_name} className="pwa-hero-bg" />
        ) : (
          <div className="pwa-hero-bg" style={{ background: 'var(--accent-primary-gradient)' }} />
        )}
        <div className="pwa-hero-overlay" />
        <div className="pwa-hero-content">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#93c5fd' }}>
              Comunidade Oficial
            </span>
            {activeBroadcast && (
              <span style={{ background: '#ef4444', color: '#ffffff', padding: '2px 8px', borderRadius: '6px', fontSize: '0.64rem', fontWeight: 800, animation: 'pulse 2s infinite' }}>
                ● AO VIVO
              </span>
            )}
          </div>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 900, marginTop: '2px', lineHeight: 1.2 }}>
            {branding.church_name}
          </h2>
          <p style={{ fontSize: '0.78rem', opacity: 0.9, marginTop: '4px' }}>
            {branding.tagline || 'Conectados pelo mesmo propósito e coração.'}
          </p>

          {/* Botão de Live Integrado ao Hero quando ativo */}
          <div style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
            <button
              type="button"
              onClick={onOpenLive}
              style={{
                background: '#ffffff',
                color: '#0f172a',
                border: 'none',
                padding: '8px 14px',
                borderRadius: '10px',
                fontWeight: 800,
                fontSize: '0.76rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 4px 10px rgba(0,0,0,0.1)'
              }}
            >
              <span>▶</span>
              <span>Assistir Culto ao Vivo</span>
            </button>

            <button
              type="button"
              onClick={() => setIsVisitorModalOpen(true)}
              style={{
                background: 'rgba(255,255,255,0.2)',
                color: '#ffffff',
                border: '1px solid rgba(255,255,255,0.4)',
                backdropFilter: 'blur(8px)',
                padding: '8px 14px',
                borderRadius: '10px',
                fontWeight: 700,
                fontSize: '0.76rem',
                cursor: 'pointer'
              }}
            >
              👋 Sou Visitante
            </button>
          </div>
        </div>
      </div>

      {/* Grade de Atalhos Rápidos (8 Botões com Micro-animação Tátil) */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <h3 className="section-title" style={{ margin: 0, fontSize: '0.95rem' }}>Serviços & Atalhos</h3>
          <span style={{ fontSize: '0.70rem', color: 'var(--text-muted)' }}>Acesso imediato</span>
        </div>

        <div className="quick-grid">
          {quickActions.map((action, i) => (
            <button
              key={i}
              type="button"
              className="quick-card"
              onClick={action.action}
              style={{ transition: 'transform 0.15s ease, box-shadow 0.15s ease' }}
            >
              <div className="quick-icon-box" style={{ background: action.bg }}>
                {action.icon}
              </div>
              <span className="quick-label">{action.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Carrossel / Cards de Destaque da Semana */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        
        {/* Card Devocional do Dia */}
        <div 
          onClick={() => onNavigate('devotionals')}
          style={{
            background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
            border: '1px solid var(--panel-border)',
            borderRadius: '20px',
            padding: '16px',
            boxShadow: 'var(--shadow-sm)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '44px', height: '44px', borderRadius: '14px', background: '#e0f2fe', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem' }}>
              ☀️
            </div>
            <div>
              <span style={{ fontSize: '0.66rem', fontWeight: 800, color: 'var(--accent-primary)', textTransform: 'uppercase' }}>
                DEVOCIONAL DE HOJE
              </span>
              <h4 style={{ fontSize: '0.90rem', fontWeight: 800, color: 'var(--text-main)', margin: '2px 0 0 0' }}>
                Renovando as Forças no Senhor
              </h4>
              <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                Isaías 40:29 • Toque para ler a mensagem
              </p>
            </div>
          </div>

          <span style={{ fontSize: '1.2rem', color: 'var(--text-muted)' }}>›</span>
        </div>

        {/* Card Próximo Evento / Conferência */}
        <div 
          onClick={onOpenEvents}
          style={{
            background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
            border: '1px solid var(--panel-border)',
            borderRadius: '20px',
            padding: '16px',
            boxShadow: 'var(--shadow-sm)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '44px', height: '44px', borderRadius: '14px', background: '#ffedd5', color: '#ea580c', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem' }}>
              🎟️
            </div>
            <div>
              <span style={{ fontSize: '0.66rem', fontWeight: 800, color: '#ea580c', textTransform: 'uppercase' }}>
                PRÓXIMO GRANDE EVENTO
              </span>
              <h4 style={{ fontSize: '0.90rem', fontWeight: 800, color: 'var(--text-main)', margin: '2px 0 0 0' }}>
                {featuredEvent?.title || 'Conferência de Avivamento 2026'}
              </h4>
              <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                {featuredEvent?.location || 'Templo Principal • Inscrições abertas'}
              </p>
            </div>
          </div>

          <span style={{ fontSize: '1.2rem', color: 'var(--text-muted)' }}>›</span>
        </div>

      </div>

      {/* Modal de Visitante */}
      <VisitorModal 
        isOpen={isVisitorModalOpen} 
        onClose={() => setIsVisitorModalOpen(false)} 
      />

    </div>
  );
};
