import React, { useState, useEffect } from 'react';
import { useBranding } from '../context/BrandingContext';
import { useAuth } from '../context/AuthContext';
import { useFeatureFlags } from '../context/FeatureFlagContext';
import { InstallPwaBanner } from '../components/InstallPwaBanner';
import { VisitorModal } from '../components/VisitorModal';
import { BottomSheet } from '../components/BottomSheet';
import { KidsPassCard } from '../components/KidsPassCard';
import { KidsVolunteerPanel } from '../components/KidsVolunteerPanel';
import { HeroCarousel } from '../components/HeroCarousel';
import { HighlightNoticeModal } from '../components/HighlightNoticeModal';
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
  const { isFeatureEnabled } = useFeatureFlags();
  const [activeBroadcast, setActiveBroadcast] = useState<any>(null);
  const [featuredEvent, setFeaturedEvent] = useState<any>(null);
  const [todayDevotional, setTodayDevotional] = useState<any>(null);
  const [isVisitorModalOpen, setIsVisitorModalOpen] = useState(false);
  const [isCampusDrawerOpen, setIsCampusDrawerOpen] = useState(false);
  const [isKidsVolunteerOpen, setIsKidsVolunteerOpen] = useState(false);
  const [campuses, setCampuses] = useState<any[]>([]);
  const [activeCampusId, setSelectedCampusId] = useState<string>(getActiveCampusId());

  useEffect(() => {
    loadHomeData();
    loadCampuses();
  }, [branding.organization_id, branding.pwa_slug, branding.church_name]);

  useEffect(() => {
    const handleCampusChanged = (e: any) => {
      const newCampusId = e.detail?.campusId || getActiveCampusId();
      setSelectedCampusId(newCampusId);
      loadHomeData(newCampusId);
    };

    const handleResume = () => {
      if (document.visibilityState === 'visible') {
        loadHomeData();
        loadCampuses();
      }
    };

    window.addEventListener('pwa-campus-changed', handleCampusChanged);
    document.addEventListener('visibilitychange', handleResume);
    window.addEventListener('focus', handleResume);

    return () => {
      window.removeEventListener('pwa-campus-changed', handleCampusChanged);
      document.removeEventListener('visibilitychange', handleResume);
      window.removeEventListener('focus', handleResume);
    };
  }, [branding.organization_id, activeCampusId]);

  const loadCampuses = async () => {
    const list = await fetchCampuses();
    setCampuses(list);
  };

  const loadHomeData = async (campusId?: string) => {
    const currentCampusId = campusId || activeCampusId;
    const broadcast = await fetchActiveBroadcast(branding.organization_id, currentCampusId);
    if (broadcast) {
      setActiveBroadcast(broadcast);
    } else if (branding.youtube_url) {
      setActiveBroadcast({
        title: `Culto Oficial • ${branding.church_name}`,
        youtube_url: branding.youtube_url
      });
    }

    const dev = await fetchTodayDevotional();
    if (dev) setTodayDevotional(dev);

    const events = await fetchEvents(branding.organization_id, currentCampusId);
    if (events && Array.isArray(events) && events.length > 0) {
      const explicitFeatured = events.find((e: any) => e.is_featured === true || e.is_featured === 1 || e.show_as_popup === true || e.show_as_popup === 1);
      setFeaturedEvent(explicitFeatured || null);
    } else {
      setFeaturedEvent(null);
    }
  };

  const handleSelectCampus = (cId: string) => {
    setActiveCampusId(cId);
    setSelectedCampusId(cId);
    setIsCampusDrawerOpen(false);
  };

  const currentCampus = campuses.find(c => c.id === activeCampusId) || campuses[0];

  // 8 Serviços & Atalhos com Ícones SVG do Design System condicionados a Feature Flags
  const allQuickActions = [
    { 
      label: 'Cultos ao Vivo', 
      icon: <LiveIcon size={22} color="#dc2626" />, 
      bg: 'rgba(239, 68, 68, 0.12)', 
      border: 'rgba(239, 68, 68, 0.25)', 
      action: onOpenLive,
      flag: 'broadcasts.module_enabled'
    },
    { 
      label: 'Palavra & Ensino', 
      icon: <BookOpenIcon size={22} color="#0284c7" />, 
      bg: 'rgba(2, 132, 199, 0.12)', 
      border: 'rgba(2, 132, 199, 0.25)', 
      action: () => onNavigate('devotionals'),
      flag: 'devotionals.module_enabled'
    },
    { 
      label: 'Células & Redes', 
      icon: <UsersGroupIcon size={22} color="var(--accent-primary)" />, 
      bg: 'var(--accent-primary-light)', 
      border: 'rgba(15, 118, 110, 0.25)', 
      action: () => onNavigate('cells'),
      flag: 'cell_groups.module_enabled'
    },
    { 
      label: branding.store_title || 'Loja Oficial', 
      icon: <ShoppingBagIcon size={22} color="#059669" />, 
      bg: 'rgba(5, 150, 105, 0.12)', 
      border: 'rgba(5, 150, 105, 0.25)', 
      action: () => onNavigate('store'),
      flag: 'pdv.module_enabled'
    },
    { 
      label: 'Dízimos & Ofertas', 
      icon: <GivingHeartIcon size={22} color="#9333ea" />, 
      bg: 'rgba(147, 51, 234, 0.12)', 
      border: 'rgba(147, 51, 234, 0.25)', 
      action: onOpenGiving,
      flag: 'financial.online_pix_giving'
    },
    { 
      label: 'Eventos & Cursos', 
      icon: <CalendarEventIcon size={22} color="#ea580c" />, 
      bg: 'rgba(234, 88, 12, 0.12)', 
      border: 'rgba(234, 88, 12, 0.25)', 
      action: onOpenEvents,
      flag: 'events.module_enabled'
    },
    { 
      label: 'Bíblia Sagrada', 
      icon: <BibleScriptureIcon size={22} color="#475569" />, 
      bg: 'rgba(71, 85, 105, 0.12)', 
      border: 'rgba(71, 85, 105, 0.25)', 
      action: onOpenBible,
      isBible: true,
      flag: 'bible.module_enabled'
    },
    { 
      label: 'Mural de Oração', 
      icon: <PrayerChatIcon size={22} color="#4f46e5" />, 
      bg: 'rgba(79, 70, 229, 0.12)', 
      border: 'rgba(79, 70, 229, 0.25)', 
      action: onOpenPrayers,
      flag: 'prayers.module_enabled'
    },
  ];

  const quickActions = allQuickActions.filter(qa => !qa.flag || isFeatureEnabled(qa.flag));

  return (
    <div className="pwa-content animate-fade-in" style={{ gap: '18px' }}>
      
      {/* Banner de Instalação do PWA */}
      <InstallPwaBanner />

      {/* Saudação Personalizada & Seletor de Unidade */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 2px', gap: '8px' }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '1.25rem' }}>{user ? '👋' : '✨'}</span>
            <h2 style={{ fontSize: 'clamp(1.15rem, 4vw, 1.30rem)', fontWeight: 900, color: 'var(--text-main)', letterSpacing: '-0.3px', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user?.name ? `Olá, ${user.name.split(' ')[0]}` : 'Bem-vindo(a)'}!
            </h2>
          </div>
          <p style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', fontWeight: 600, marginTop: '2px' }}>
            {user ? (currentCampus?.name ? `📍 ${currentCampus.name}` : 'Membro Ativo') : 'Explore nossa comunidade'} • {new Date().toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' })}
          </p>
        </div>

        {/* Seletor de Congregação / Unidade */}
        <button
          type="button"
          onClick={() => setIsCampusDrawerOpen(true)}
          style={{
            background: '#ffffff',
            border: '1px solid var(--panel-border)',
            padding: '6px 12px',
            borderRadius: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            cursor: 'pointer',
            boxShadow: 'var(--shadow-sm)',
            flexShrink: 0
          }}
        >
          <span style={{ fontSize: '0.85rem' }}>🏛️</span>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: '0.60rem', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase', lineHeight: 1 }}>Unidade</div>
            <div style={{ fontSize: '0.74rem', fontWeight: 800, color: 'var(--text-main)', maxWidth: '95px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: 1.2 }}>
              {currentCampus?.name || 'Sede'}
            </div>
          </div>
          <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>▾</span>
        </button>
      </div>

      {/* Carrossel Dinâmico de Destaques & Vídeo Inline */}
      <HeroCarousel
        branding={branding}
        activeBroadcast={activeBroadcast}
        featuredEvent={featuredEvent}
        todayDevotional={todayDevotional}
        user={user}
        currentCampus={currentCampus}
        onOpenEvents={onOpenEvents}
        onNavigate={onNavigate}
        onOpenVisitorModal={() => setIsVisitorModalOpen(true)}
        onOpenBible={onOpenBible}
      />

      {/* Meus Filhos no Kids / Chamador de Pais em Tempo Real */}
      <KidsPassCard />

      {/* Grid de 8 Serviços Ministeriais em 4 Colunas */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', padding: '0 2px' }}>
          <h3 style={{ fontSize: '0.90rem', fontWeight: 900, color: 'var(--text-main)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Serviços & Comunidade
          </h3>
          <span style={{ fontSize: '0.70rem', color: 'var(--text-muted)', fontWeight: 600 }}>
            {!user ? 'Acesso Comunitário' : branding.church_name}
          </span>
        </div>

        <div className="quick-action-grid">
          {quickActions.map((action, idx) => {
            const isBiblePulse = !user && action.isBible;
            return (
              <button
                key={idx}
                type="button"
                onClick={action.action}
                className={`quick-action-btn ${isBiblePulse ? 'pulse-bible-free' : ''}`}
                style={{ position: 'relative' }}
              >
                {isBiblePulse && (
                  <span className="free-access-badge">LIVRE</span>
                )}
                <div
                  className="quick-action-icon"
                  style={{
                    background: isBiblePulse ? 'rgba(15, 118, 110, 0.15)' : action.bg,
                    border: `1px solid ${action.border}`
                  }}
                >
                  {action.icon}
                </div>
                <span className="quick-action-label" style={{ color: isBiblePulse ? 'var(--accent-primary)' : 'var(--text-main)', fontWeight: isBiblePulse ? 900 : 800 }}>
                  {action.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Destaques Ministeriais / Banner de Devocional & Eventos */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))', gap: '12px' }}>
        
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
      <BottomSheet 
        isOpen={isCampusDrawerOpen} 
        onClose={() => setIsCampusDrawerOpen(false)}
        maxHeight="65vh"
      >
        <div style={{ textAlign: 'center', marginBottom: '16px' }}>
          <span style={{ fontSize: '1.4rem' }}>🏛️</span>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 900, color: 'var(--text-main)', margin: '4px 0 0 0' }}>
            Escolha sua Congregação
          </h3>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
            Selecione o campus onde você congrega ou está visitando hoje.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '48vh', overflowY: 'auto' }}>
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
      </BottomSheet>

      {/* Painel do Educador / Voluntário Kids Mobile */}
      <KidsVolunteerPanel 
        isOpen={isKidsVolunteerOpen} 
        onClose={() => setIsKidsVolunteerOpen(false)} 
      />

      {/* Pop-up / Modal de Destaque Automático de Entrada */}
      <HighlightNoticeModal
        activeBroadcast={activeBroadcast}
        featuredEvent={featuredEvent}
        branding={branding}
        onOpenLive={onOpenLive}
        onOpenEvents={onOpenEvents}
      />

    </div>
  );
};
