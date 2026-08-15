import React, { useState, useEffect } from 'react';
import { useBranding } from '../context/BrandingContext';
import { InstallPwaBanner } from '../components/InstallPwaBanner';
import { fetchActiveBroadcast, fetchEvents } from '../services/api';
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
    <div className="pwa-content animate-fade-in">
      
      {/* Banner de Instalação do PWA */}
      <InstallPwaBanner />

      {/* Hero Banner da Igreja */}
      <div className="pwa-hero-card">
        {branding.banner_url ? (
          <img src={branding.banner_url} alt={branding.church_name} className="pwa-hero-bg" />
        ) : (
          <div className="pwa-hero-bg" style={{ background: 'var(--accent-primary-gradient)' }} />
        )}
        <div className="pwa-hero-overlay" />
        <div className="pwa-hero-content">
          <span style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#93c5fd' }}>
            Comunidade de Fé
          </span>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 900, marginTop: '2px', lineHeight: 1.2 }}>
            {branding.church_name}
          </h2>
          <p style={{ fontSize: '0.78rem', opacity: 0.9, marginTop: '4px' }}>
            {branding.tagline || 'Conectados pelo mesmo propósito e coração.'}
          </p>
        </div>
      </div>

      {/* Grade de Atalhos Rápidos (8 Botões) */}
      <div>
        <h3 className="section-title">Acesso Rápido</h3>
        <div className="quick-grid">
          {quickActions.map((action, i) => (
            <button
              key={i}
              type="button"
              className="quick-card"
              onClick={action.action}
            >
              <div className="quick-icon-box" style={{ background: action.bg }}>
                {action.icon}
              </div>
              <span className="quick-label">{action.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Card Culto ao Vivo / Transmissão Ativa */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <h3 className="section-title" style={{ margin: 0 }}>Transmissão em Destaque</h3>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', fontWeight: 800, color: '#ef4444' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444', display: 'inline-block' }} />
            {activeBroadcast ? 'AO VIVO' : 'DISPONÍVEL'}
          </span>
        </div>

        <div 
          onClick={onOpenLive}
          style={{
            background: '#ffffff',
            borderRadius: '18px',
            overflow: 'hidden',
            border: '1px solid var(--panel-border)',
            boxShadow: 'var(--shadow-sm)',
            cursor: 'pointer'
          }}
        >
          <div style={{ height: '140px', background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
            <div style={{ width: '54px', height: '54px', borderRadius: '50%', background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', color: '#ffffff' }}>
              ▶
            </div>
            <span style={{ position: 'absolute', bottom: '10px', left: '12px', background: 'rgba(0,0,0,0.6)', color: '#ffffff', padding: '3px 8px', borderRadius: '6px', fontSize: '0.68rem', fontWeight: 700 }}>
              Culto Oficial da Igreja
            </span>
          </div>

          <div style={{ padding: '14px' }}>
            <h4 style={{ fontSize: '0.92rem', fontWeight: 800, color: 'var(--text-main)' }}>
              {activeBroadcast?.title || 'Culto da Família & Celebração'}
            </h4>
            <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: '2px' }}>
              Toque para assistir ao vivo e abrir o caderno de notas do sermão.
            </p>
          </div>
        </div>
      </div>

      {/* Devocional do Dia Teaser */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <h3 className="section-title" style={{ margin: 0 }}>Palavra do Dia</h3>
          <button 
            type="button" 
            onClick={() => onNavigate('devotionals')}
            style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', fontSize: '0.74rem', fontWeight: 800, cursor: 'pointer' }}
          >
            Ver mais ›
          </button>
        </div>

        <div 
          onClick={() => onNavigate('devotionals')}
          style={{
            background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
            border: '1px solid var(--panel-border)',
            borderRadius: '18px',
            padding: '16px',
            cursor: 'pointer'
          }}
        >
          <span style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--accent-primary)', textTransform: 'uppercase' }}>
            ☀️ Edificação Diária
          </span>
          <h4 style={{ fontSize: '0.98rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '4px' }}>
            Renovando as Forças no Senhor
          </h4>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '4px', fontStyle: 'italic', lineHeight: 1.4 }}>
            "Ele fortalece o cansado e multiplica as forças ao que não tem nenhum vigor." — Isaías 40:29
          </p>
        </div>
      </div>

      {/* Próximos Eventos */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <h3 className="section-title" style={{ margin: 0 }}>Próximos Eventos</h3>
          <button 
            type="button" 
            onClick={onOpenEvents}
            style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', fontSize: '0.74rem', fontWeight: 800, cursor: 'pointer' }}
          >
            Calendário ›
          </button>
        </div>

        <div 
          onClick={onOpenEvents}
          style={{
            background: '#ffffff',
            borderRadius: '16px',
            padding: '14px',
            border: '1px solid var(--panel-border)',
            boxShadow: 'var(--shadow-sm)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ background: 'var(--accent-primary-light)', color: 'var(--accent-primary)', borderRadius: '12px', padding: '8px 12px', textAlign: 'center' }}>
              <div style={{ fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase' }}>AGO</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 900, lineHeight: 1 }}>24</div>
            </div>
            <div>
              <h4 style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--text-main)' }}>
                {featuredEvent?.title || 'Conferência de Avivamento 2026'}
              </h4>
              <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                {featuredEvent?.location || 'Templo Principal • 19:30'}
              </p>
            </div>
          </div>
          <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--accent-primary)' }}>Inscrição ›</span>
        </div>
      </div>

    </div>
  );
};
