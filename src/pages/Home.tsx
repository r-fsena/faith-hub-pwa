import React from 'react';
import { useBranding } from '../context/BrandingContext';
import { InstallPwaBanner } from '../components/InstallPwaBanner';
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

      {/* Grade de Acesso Rápido */}
      <div>
        <div className="section-header-row">
          <span className="section-title">Acesso Rápido</span>
        </div>
        <div className="quick-action-grid">
          {quickActions.map((item, i) => (
            <button key={i} type="button" className="quick-action-btn" onClick={item.action}>
              <div className="quick-action-icon" style={{ background: item.bg }}>
                {item.icon}
              </div>
              <span className="quick-action-label">{item.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Culto ao Vivo / Transmissão Destaque */}
      <div 
        onClick={onOpenLive}
        style={{ 
          background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)', 
          color: '#ffffff', 
          borderRadius: '18px', 
          padding: '16px', 
          cursor: 'pointer',
          boxShadow: 'var(--shadow-md)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', boxShadow: '0 0 14px rgba(239, 68, 68, 0.6)' }}>
            ▶
          </div>
          <div>
            <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#f87171', letterSpacing: '0.04em' }}>
              TRANSMISSÃO AO VIVO
            </div>
            <div style={{ fontSize: '0.90rem', fontWeight: 800 }}>
              Culto de Celebração & Louvor
            </div>
            <div style={{ fontSize: '0.72rem', opacity: 0.8 }}>
              Domingo às 10h e 18h30 • Canal Oficial
            </div>
          </div>
        </div>
        <span style={{ fontSize: '1.2rem', opacity: 0.6 }}>›</span>
      </div>

      {/* Devocional do Dia */}
      <div className="devotional-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="devotional-tag">☀️ Devocional do Dia</span>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>Hoje</span>
        </div>
        <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-main)' }}>
          "Renovando as Forças no Senhor"
        </div>
        <p className="devotional-verse">
          "Mas os que esperam no Senhor renovam as suas forças. Voam alto como águias..." — Isaías 40:31
        </p>
        <button 
          type="button" 
          className="btn-pwa-secondary"
          onClick={() => onNavigate('devotionals')}
          style={{ padding: '8px', fontSize: '0.78rem' }}
        >
          Ler reflexão pastoral completa →
        </button>
      </div>

      {/* Próximos Eventos */}
      <div>
        <div className="section-header-row">
          <span className="section-title">Próximos Eventos</span>
          <button type="button" className="section-see-all" onClick={onOpenEvents}>Ver todos</button>
        </div>

        <div style={{ display: 'flex', gap: '12px', overflowX: 'auto', paddingBottom: '4px' }}>
          <div 
            onClick={onOpenEvents}
            style={{ 
              minWidth: '220px', 
              background: '#ffffff', 
              borderRadius: '16px', 
              border: '1px solid var(--panel-border)', 
              overflow: 'hidden',
              boxShadow: 'var(--shadow-sm)',
              cursor: 'pointer' 
            }}
          >
            <div style={{ height: '90px', background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '2rem' }}>
              🔥
            </div>
            <div style={{ padding: '12px' }}>
              <span style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--accent-primary)' }}>24 AGO • 19:30</span>
              <div style={{ fontWeight: 800, fontSize: '0.85rem', color: 'var(--text-main)', marginTop: '2px' }}>Conferência de Avivamento</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Templo Principal</div>
            </div>
          </div>

          <div 
            onClick={onOpenEvents}
            style={{ 
              minWidth: '220px', 
              background: '#ffffff', 
              borderRadius: '16px', 
              border: '1px solid var(--panel-border)', 
              overflow: 'hidden',
              boxShadow: 'var(--shadow-sm)',
              cursor: 'pointer' 
            }}
          >
            <div style={{ height: '90px', background: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '2rem' }}>
              ✨
            </div>
            <div style={{ padding: '12px' }}>
              <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#7c3aed' }}>07 SET • 09:00</span>
              <div style={{ fontWeight: 800, fontSize: '0.85rem', color: 'var(--text-main)', marginTop: '2px' }}>Encontro de Casais</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Auditório B</div>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};
