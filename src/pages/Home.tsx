import React, { useState, useEffect } from 'react';
import { useBranding } from '../context/BrandingContext';
import { useAuth } from '../context/AuthContext';
import { InstallPwaBanner } from '../components/InstallPwaBanner';
import { VisitorModal } from '../components/VisitorModal';
import { 
  fetchActiveBroadcast, 
  fetchEvents, 
  fetchTodayDevotional, 
  fetchCampuses, 
  getActiveCampusId, 
  setActiveCampusId 
} from '../services/api';
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
  const { user } = useAuth();
  const [activeBroadcast, setActiveBroadcast] = useState<any>(null);
  const [featuredEvent, setFeaturedEvent] = useState<any>(null);
  const [todayDevotional, setTodayDevotional] = useState<any>(null);
  const [isVisitorModalOpen, setIsVisitorModalOpen] = useState(false);
  const [isCampusDrawerOpen, setIsCampusDrawerOpen] = useState(false);
  const [campuses, setCampuses] = useState<any[]>([]);
  const [activeCampusId, setActiveCampusIdState] = useState<string>(getActiveCampusId());

  useEffect(() => {
    loadHomeData();
    loadCampuses();

    const handleCampusChanged = (e: any) => {
      const newCampusId = e.detail?.campusId || getActiveCampusId();
      setActiveCampusIdState(newCampusId);
      loadHomeData(newCampusId);
    };

    window.addEventListener('pwa-campus-changed', handleCampusChanged);
    return () => window.removeEventListener('pwa-campus-changed', handleCampusChanged);
  }, []);

  const loadCampuses = async () => {
    const list = await fetchCampuses();
    setCampuses(list);
  };

  const loadHomeData = async (campusId?: string) => {
    const broadcast = await fetchActiveBroadcast();
    if (broadcast) setActiveBroadcast(broadcast);

    const dev = await fetchTodayDevotional();
    if (dev) setTodayDevotional(dev);

    const events = await fetchEvents(campusId);
    if (events && Array.isArray(events) && events.length > 0) {
      setFeaturedEvent(events[0]);
    } else {
      setFeaturedEvent(null);
    }
  };

  const handleSelectCampus = (cId: string) => {
    setActiveCampusId(cId);
    setActiveCampusIdState(cId);
    setIsCampusDrawerOpen(false);
  };

  const currentCampus = campuses.find(c => c.id === activeCampusId) || campuses[0];

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

      {/* Saudação Personalizada & Data Atual no Padrão do Web Studio */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '2px 2px', gap: '8px', flexWrap: 'wrap' }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '1.20rem' }}>👋</span>
            <h2 style={{ fontSize: 'clamp(1.10rem, 4vw, 1.30rem)', fontWeight: 900, color: 'var(--text-main)', letterSpacing: '-0.3px', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user?.name ? `Olá, ${user.name.split(' ')[0]}` : 'Seja bem-vindo(a)'}!
            </h2>
          </div>
          <p style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', fontWeight: 600, marginTop: '2px', textTransform: 'capitalize' }}>
            {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'short' })}
          </p>
        </div>

        {/* Seletor de Campus e Badge de Membro */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
          {/* Seletor de Campus / Unidade */}
          <button
            type="button"
            onClick={() => setIsCampusDrawerOpen(true)}
            style={{
              background: '#ffffff',
              border: '1px solid var(--panel-border)',
              padding: '6px 10px',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              cursor: 'pointer',
              boxShadow: 'var(--shadow-sm)'
            }}
          >
            <span style={{ fontSize: '0.80rem' }}>📍</span>
            <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-main)', maxWidth: '110px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {currentCampus?.name || 'Sede Principal'}
            </span>
            <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>▾</span>
          </button>

          {/* Badge de Membro ou Visitante */}
          <div style={{ background: 'var(--accent-primary-light)', border: '1px solid rgba(15, 118, 110, 0.2)', padding: '6px 10px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
            <span style={{ fontSize: '0.70rem', fontWeight: 800, color: 'var(--accent-primary)' }}>
              {user ? 'Membro' : 'Visitante'}
            </span>
          </div>
        </div>
      </div>

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
            <span style={{ fontSize: '0.70rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#93c5fd' }}>
              Comunidade Oficial
            </span>
            {activeBroadcast && (
              <span style={{ background: '#ef4444', color: '#ffffff', padding: '2px 8px', borderRadius: '6px', fontSize: '0.64rem', fontWeight: 800, animation: 'pulse 2s infinite' }}>
                ● AO VIVO
              </span>
            )}
          </div>
          <h2 style={{ fontSize: 'clamp(1.15rem, 4.5vw, 1.35rem)', fontWeight: 900, marginTop: '2px', lineHeight: 1.2 }}>
            {branding.church_name || 'Faith-Hub'}
          </h2>
          <p style={{ fontSize: '0.76rem', opacity: 0.9, marginTop: '4px' }}>
            {branding.tagline || 'Conectados pelo mesmo propósito e coração.'}
          </p>

          {/* Botões do Hero com flex-wrap */}
          <div style={{ marginTop: '12px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={onOpenLive}
              style={{
                background: '#ffffff',
                color: '#0f172a',
                border: 'none',
                padding: '8px 12px',
                borderRadius: '12px',
                fontWeight: 800,
                fontSize: '0.74rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 4px 10px rgba(0,0,0,0.1)',
                minHeight: '36px'
              }}
            >
              <span>▶</span>
              <span>Assistir Culto</span>
            </button>

            <button
              type="button"
              onClick={() => setIsVisitorModalOpen(true)}
              style={{
                background: 'rgba(255,255,255,0.2)',
                color: '#ffffff',
                border: '1px solid rgba(255,255,255,0.4)',
                backdropFilter: 'blur(8px)',
                padding: '8px 12px',
                borderRadius: '12px',
                fontWeight: 700,
                fontSize: '0.74rem',
                cursor: 'pointer',
                minHeight: '36px'
              }}
            >
              👋 Sou Visitante
            </button>
          </div>
        </div>
      </div>

      {/* Grid de 8 Serviços Ministeriais em 4 Colunas */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', padding: '0 2px' }}>
          <h3 style={{ fontSize: '0.90rem', fontWeight: 900, color: 'var(--text-main)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Serviços & Comunidade
          </h3>
          <span style={{ fontSize: '0.70rem', color: 'var(--text-muted)', fontWeight: 600 }}>
            {branding.church_name}
          </span>
        </div>

        <div className="pwa-services-grid">
          {quickActions.map((action, idx) => (
            <button
              key={idx}
              type="button"
              onClick={action.action}
              className="pwa-service-btn"
              style={{
                background: '#ffffff',
                border: '1px solid var(--panel-border)',
                borderRadius: '18px',
                padding: '12px 6px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                cursor: 'pointer',
                boxShadow: 'var(--shadow-sm)',
                transition: 'all var(--transition-fast)'
              }}
            >
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '14px',
                  background: action.bg,
                  border: `1px solid ${action.border}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                {action.icon}
              </div>
              <span
                style={{
                  fontSize: '0.70rem',
                  fontWeight: 800,
                  color: 'var(--text-main)',
                  textAlign: 'center',
                  lineHeight: 1.15,
                  maxWidth: '72px'
                }}
              >
                {action.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Destaques Ministeriais / Banner de Devocional & Eventos */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        
        {/* Card Palavra Diária */}
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
            <div style={{ width: '44px', height: '44px', borderRadius: '14px', background: 'rgba(2, 132, 199, 0.12)', border: '1px solid rgba(2, 132, 199, 0.25)', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <BookOpenIcon size={22} color="#0284c7" />
            </div>
            <div>
              <span style={{ fontSize: '0.66rem', fontWeight: 800, color: 'var(--accent-primary)', textTransform: 'uppercase' }}>
                PALAVRA & ENSINO
              </span>
              <h4 style={{ fontSize: '0.90rem', fontWeight: 800, color: 'var(--text-main)', margin: '2px 0 0 0' }}>
                {todayDevotional?.title || 'Devocional Diário'}
              </h4>
              <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                {todayDevotional?.verse_reference || 'Toque para ler mensagens e estudos bíblicos'}
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
            <div style={{ width: '44px', height: '44px', borderRadius: '14px', background: 'rgba(234, 88, 12, 0.12)', border: '1px solid rgba(234, 88, 12, 0.25)', color: '#ea580c', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <CalendarEventIcon size={22} color="#ea580c" />
            </div>
            <div>
              <span style={{ fontSize: '0.66rem', fontWeight: 800, color: '#ea580c', textTransform: 'uppercase' }}>
                CALENDÁRIO & EVENTOS ({currentCampus?.name || 'Local'})
              </span>
              <h4 style={{ fontSize: '0.90rem', fontWeight: 800, color: 'var(--text-main)', margin: '2px 0 0 0' }}>
                {featuredEvent?.title || 'Eventos & Cursos'}
              </h4>
              <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                {featuredEvent?.location ? `${featuredEvent.location} • Inscrições abertas` : 'Toque para ver a programação da comunidade'}
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

      {/* Drawer de Seleção de Unidade / Campus */}
      {isCampusDrawerOpen && (
        <div className="drawer-overlay animate-fade-in" onClick={() => setIsCampusDrawerOpen(false)}>
          <div className="drawer-container" onClick={e => e.stopPropagation()}>
            <div className="drawer-handle" />
            <div style={{ textAlign: 'center', marginBottom: '16px' }}>
              <span style={{ fontSize: '1.4rem' }}>🏛️</span>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 900, color: 'var(--text-main)', margin: '4px 0 0 0' }}>
                Escolha sua Congregação
              </h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
                Selecione o campus onde você congrega ou está visitando hoje.
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '50vh', overflowY: 'auto' }}>
              {campuses.map(c => {
                const isSelected = c.id === activeCampusId;
                return (
                  <div
                    key={c.id}
                    onClick={() => handleSelectCampus(c.id)}
                    style={{
                      background: isSelected ? 'var(--accent-primary-light)' : '#ffffff',
                      border: isSelected ? '2px solid var(--accent-primary)' : '1px solid var(--panel-border)',
                      borderRadius: '14px',
                      padding: '14px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '0.92rem', fontWeight: 800, color: 'var(--text-main)' }}>
                          {c.name}
                        </span>
                        {Boolean(c.is_headquarters) && (
                          <span style={{ fontSize: '0.62rem', background: '#fef3c7', color: '#92400e', padding: '1px 6px', borderRadius: '4px', fontWeight: 800 }}>
                            SEDE
                          </span>
                        )}
                      </div>
                      <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
                        {c.address ? `${c.address}, ` : ''}{c.city ? `${c.city} - ${c.state}` : 'Endereço no App'}
                      </p>
                      {c.pastor_name && (
                        <p style={{ fontSize: '0.70rem', color: 'var(--accent-primary)', fontWeight: 700, margin: '2px 0 0 0' }}>
                          Pastor Local: {c.pastor_name}
                        </p>
                      )}
                    </div>

                    <div style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      border: isSelected ? '5px solid var(--accent-primary)' : '2px solid #cbd5e1',
                      background: '#ffffff'
                    }} />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
