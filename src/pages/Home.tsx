import React, { useState, useEffect } from 'react';
import { useBranding } from '../context/BrandingContext';
import { InstallPwaBanner } from '../components/InstallPwaBanner';
import { VisitorModal } from '../components/VisitorModal';
import { fetchActiveBroadcast, fetchEvents } from '../services/api';
import { 
  LiveIcon, 
  BookOpenIcon, 
  UsersGroupIcon, 
  ShoppingBagIcon, 
  GivingHeartIcon, 
  CalendarEventIcon, 
  BibleScriptureIcon, 
  PrayerChatIcon 
} from '../components/ServiceIcons';
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

  useEffect(() => {
    loadHomeData();
  }, []);

  const loadHomeData = async () => {
    const broadcast = await fetchActiveBroadcast();
    if (broadcast) setActiveBroadcast(broadcast);

    const events = await fetchEvents();
    if (events && Array.isArray(events) && events.length > 0) {
      setFeaturedEvent(events[0]);
    }
  };

  // 8 Serviços & Atalhos com Ícones SVG do Design System
  const quickActions = [
    { 
      label: 'Cultos ao Vivo', 
      icon: <LiveIcon size={22} color="#dc2626" />, 
      bg: 'rgba(239, 68, 68, 0.12)', 
      border: 'rgba(239, 68, 68, 0.25)', 
      action: onOpenLive 
    },
    { 
      label: 'Palavra & Ensino', 
      icon: <BookOpenIcon size={22} color="#0284c7" />, 
      bg: 'rgba(2, 132, 199, 0.12)', 
      border: 'rgba(2, 132, 199, 0.25)', 
      action: () => onNavigate('devotionals') 
    },
    { 
      label: 'Células & Redes', 
      icon: <UsersGroupIcon size={22} color="var(--accent-primary)" />, 
      bg: 'var(--accent-primary-light)', 
      border: 'rgba(15, 118, 110, 0.25)', 
      action: () => onNavigate('cells') 
    },
    { 
      label: 'Cantina & Loja', 
      icon: <ShoppingBagIcon size={22} color="#059669" />, 
      bg: 'rgba(5, 150, 105, 0.12)', 
      border: 'rgba(5, 150, 105, 0.25)', 
      action: () => onNavigate('store') 
    },
    { 
      label: 'Dízimos & Ofertas', 
      icon: <GivingHeartIcon size={22} color="#9333ea" />, 
      bg: 'rgba(147, 51, 234, 0.12)', 
      border: 'rgba(147, 51, 234, 0.25)', 
      action: onOpenGiving 
    },
    { 
      label: 'Eventos & Cursos', 
      icon: <CalendarEventIcon size={22} color="#ea580c" />, 
      bg: 'rgba(234, 88, 12, 0.12)', 
      border: 'rgba(234, 88, 12, 0.25)', 
      action: onOpenEvents 
    },
    { 
      label: 'Bíblia Sagrada', 
      icon: <BibleScriptureIcon size={22} color="#475569" />, 
      bg: 'rgba(71, 85, 105, 0.12)', 
      border: 'rgba(71, 85, 105, 0.25)', 
      action: onOpenBible 
    },
    { 
      label: 'Mural de Oração', 
      icon: <PrayerChatIcon size={22} color="#4f46e5" />, 
      bg: 'rgba(79, 70, 229, 0.12)', 
      border: 'rgba(79, 70, 229, 0.25)', 
      action: onOpenPrayers 
    },
  ];

  return (
    <div className="pwa-content animate-fade-in" style={{ gap: '18px' }}>
      
      {/* Banner de Instalação do PWA */}
      <InstallPwaBanner />

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

          {/* Botões do Hero */}
          <div style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
            <button
              type="button"
              onClick={onOpenLive}
              style={{
                background: '#ffffff',
                color: '#0f172a',
                border: 'none',
                padding: '8px 14px',
                borderRadius: '12px',
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
                borderRadius: '12px',
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

      {/* Grade de Atalhos Rápidos (8 Botões com Ícones SVG do Design System) */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h3 className="section-title" style={{ margin: 0, fontSize: '0.98rem' }}>Serviços & Atalhos</h3>
          <span style={{ fontSize: '0.70rem', color: 'var(--text-muted)', fontWeight: 600 }}>Acesso rápido</span>
        </div>

        <div className="quick-action-grid">
          {quickActions.map((action, i) => (
            <button
              key={i}
              type="button"
              className="quick-action-btn"
              onClick={action.action}
            >
              <div 
                className="quick-action-icon" 
                style={{ 
                  background: action.bg,
                  border: `1px solid ${action.border}`
                }}
              >
                {action.icon}
              </div>
              <span className="quick-action-label">{action.label}</span>
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
            <div style={{ width: '44px', height: '44px', borderRadius: '14px', background: 'rgba(2, 132, 199, 0.12)', border: '1px solid rgba(2, 132, 199, 0.25)', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <BookOpenIcon size={22} color="#0284c7" />
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
            <div style={{ width: '44px', height: '44px', borderRadius: '14px', background: 'rgba(234, 88, 12, 0.12)', border: '1px solid rgba(234, 88, 12, 0.25)', color: '#ea580c', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CalendarEventIcon size={22} color="#ea580c" />
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
