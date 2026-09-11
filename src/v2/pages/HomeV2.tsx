import React, { useState, useEffect } from 'react';
import { useBranding } from '../../context/BrandingContext';
import { useAuth } from '../../context/AuthContext';
import { useFeatureFlags } from '../../context/FeatureFlagContext';
import { InstallPwaBanner } from '../../components/InstallPwaBanner';
import { VisitorModal } from '../../components/VisitorModal';
import { KidsPassCard } from '../../components/KidsPassCard';
import { KidsVolunteerPanel } from '../../components/KidsVolunteerPanel';
import { HeroCarousel } from '../../components/HeroCarousel';
import { HighlightNoticeModal } from '../../components/HighlightNoticeModal';
import { triggerHaptic } from '../utils/haptics';
import { swrFetch } from '../services/swrCache';
import { ChevronRightIcon } from '../components/Icons';
import { 
  fetchActiveBroadcast, 
  fetchEvents, 
  fetchTodayDevotional, 
  fetchCampuses, 
  getActiveCampusId, 
  setActiveCampusId 
} from '../../services/api';
import { 
  LiveIcon, 
  BookOpenIcon, 
  UsersGroupIcon, 
  ShoppingBagIcon, 
  GivingHeartIcon, 
  CalendarEventIcon, 
  BibleScriptureIcon, 
  PrayerChatIcon 
} from '../../components/ServiceIcons';
import type { ActiveTab } from '../components/BottomNavV2';

interface HomeV2Props {
  onNavigate: (tab: ActiveTab) => void;
  onOpenLive: () => void;
  onOpenPrayers: () => void;
  onOpenEvents: () => void;
  onOpenBible: () => void;
  onOpenGiving: () => void;
}

export const HomeV2: React.FC<HomeV2Props> = ({
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
    const orgId = branding.organization_id || 'org_default';
    const { data: list } = await swrFetch(`campuses_${orgId}`, () => fetchCampuses(orgId), { persistLocal: true });
    if (list) setCampuses(list);
  };

  const loadHomeData = async (campusId?: string) => {
    const orgId = branding.organization_id || 'org_default';
    const currentCampusId = campusId || activeCampusId;

    // 1. Transmissão Ativa (SWR)
    swrFetch(`broadcast_${orgId}_${currentCampusId || 'all'}`, async () => {
      const broadcast = await fetchActiveBroadcast(orgId, currentCampusId);
      if (broadcast) return broadcast;
      if (branding.youtube_url) {
        return {
          title: `Culto Oficial • ${branding.church_name}`,
          youtube_url: branding.youtube_url
        };
      }
      return null;
    }, { ttlMs: 60 * 1000 }).then(({ data }) => {
      setActiveBroadcast(data);
    });

    // 2. Devocional do Dia (SWR)
    swrFetch(`today_devotional_${orgId}`, () => fetchTodayDevotional(orgId), { persistLocal: true })
      .then(({ data }) => {
        setTodayDevotional(data || null);
      });

    // 3. Eventos em Destaque (SWR)
    swrFetch(`events_${orgId}_${currentCampusId || 'all'}`, () => fetchEvents(orgId, currentCampusId), { persistLocal: true })
      .then(({ data: events }) => {
        if (events && Array.isArray(events) && events.length > 0) {
          const explicitFeatured = events.find((e: any) => e.is_featured === true || e.is_featured === 1 || e.show_as_popup === true || e.show_as_popup === 1);
          setFeaturedEvent(explicitFeatured || events[0] || null);
        } else {
          setFeaturedEvent(null);
        }
      });
  };

  const currentCampus = campuses.find(c => c.id === activeCampusId) || campuses[0];

  // 8 Serviços com Ícones do Design System e Micro-Interação Háptica
  const allQuickActions = [
    { 
      label: 'Cultos ao Vivo', 
      icon: <LiveIcon size={24} color="#ef4444" />, 
      gradient: 'linear-gradient(135deg, rgba(239, 68, 68, 0.16) 0%, rgba(220, 38, 38, 0.08) 100%)',
      border: 'rgba(239, 68, 68, 0.28)', 
      action: () => { triggerHaptic('selection'); onOpenLive(); },
      flag: 'broadcasts.module_enabled',
      isLive: activeBroadcast?.is_available
    },
    { 
      label: 'Palavra & Estudo', 
      icon: <BookOpenIcon size={24} color="#0284c7" />, 
      gradient: 'linear-gradient(135deg, rgba(2, 132, 199, 0.16) 0%, rgba(14, 165, 233, 0.08) 100%)',
      border: 'rgba(2, 132, 199, 0.28)', 
      action: () => { triggerHaptic('selection'); onNavigate('devotionals'); },
      flag: 'devotionals.module_enabled'
    },
    { 
      label: 'Células & Redes', 
      icon: <UsersGroupIcon size={24} color="var(--accent-primary, #0f766e)" />, 
      gradient: 'linear-gradient(135deg, var(--accent-primary-light, rgba(15, 118, 110, 0.16)) 0%, rgba(20, 184, 166, 0.08) 100%)',
      border: 'rgba(15, 118, 110, 0.28)', 
      action: () => { triggerHaptic('selection'); onNavigate('cells'); },
      flag: 'cell_groups.module_enabled'
    },
    { 
      label: branding.store_title || 'Loja Oficial', 
      icon: <ShoppingBagIcon size={24} color="#059669" />, 
      gradient: 'linear-gradient(135deg, rgba(5, 150, 105, 0.16) 0%, rgba(16, 185, 129, 0.08) 100%)',
      border: 'rgba(5, 150, 105, 0.28)', 
      action: () => { triggerHaptic('selection'); onNavigate('store'); },
      flag: 'pdv.module_enabled'
    },
    { 
      label: 'Dízimos & Ofertas', 
      icon: <GivingHeartIcon size={24} color="#9333ea" />, 
      gradient: 'linear-gradient(135deg, rgba(147, 51, 234, 0.16) 0%, rgba(168, 85, 247, 0.08) 100%)',
      border: 'rgba(147, 51, 234, 0.28)', 
      action: () => { triggerHaptic('selection'); onOpenGiving(); },
      flag: 'financial.online_pix_giving'
    },
    { 
      label: 'Eventos & Cursos', 
      icon: <CalendarEventIcon size={24} color="#ea580c" />, 
      gradient: 'linear-gradient(135deg, rgba(234, 88, 12, 0.16) 0%, rgba(249, 115, 22, 0.08) 100%)',
      border: 'rgba(234, 88, 12, 0.28)', 
      action: () => { triggerHaptic('selection'); onOpenEvents(); },
      flag: 'events.module_enabled'
    },
    { 
      label: 'Bíblia Sagrada', 
      icon: <BibleScriptureIcon size={24} color="#334155" />, 
      gradient: 'linear-gradient(135deg, rgba(51, 65, 85, 0.16) 0%, rgba(100, 116, 139, 0.08) 100%)',
      border: 'rgba(51, 65, 85, 0.28)', 
      action: () => { triggerHaptic('selection'); onOpenBible(); },
      isBible: true,
      flag: 'bible.module_enabled'
    },
    { 
      label: 'Mural de Oração', 
      icon: <PrayerChatIcon size={24} color="#4f46e5" />, 
      gradient: 'linear-gradient(135deg, rgba(79, 70, 229, 0.16) 0%, rgba(99, 102, 241, 0.08) 100%)',
      border: 'rgba(79, 70, 229, 0.28)', 
      action: () => { triggerHaptic('selection'); onOpenPrayers(); },
      flag: 'prayers.module_enabled'
    },
  ];

  const quickActions = allQuickActions.filter(qa => !qa.flag || isFeatureEnabled(qa.flag));

  return (
    <div className="v2-animate-fade-up" style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '16px' }}>
      
      {/* Banner de Instalação do PWA */}
      <InstallPwaBanner />

      {/* 1. Carrossel Dinâmico de Destaques */}
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

      {/* 3. Meus Filhos no Kids / Chamador em Tempo Real */}
      <KidsPassCard />

      {/* 4. Grid de Serviços & Comunidade (Squircles Nativos com Spring Press) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 4px' }}>
          <h3 style={{ 
            fontSize: '0.86rem', 
            fontWeight: 900, 
            color: 'var(--text-main, #0f172a)', 
            margin: 0, 
            textTransform: 'uppercase', 
            letterSpacing: '0.05em' 
          }}>
            Serviços & Ministérios
          </h3>
          <span style={{ 
            fontSize: '0.68rem', 
            color: 'var(--accent-primary, #0f766e)', 
            fontWeight: 800, 
            background: 'var(--accent-primary-light, rgba(15, 118, 110, 0.08))',
            padding: '2px 8px',
            borderRadius: '8px'
          }}>
            Acesso Rápido
          </span>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '10px'
        }}>
          {quickActions.map((action, idx) => {
            const isBiblePulse = !user && action.isBible;
            return (
              <button
                key={idx}
                type="button"
                onClick={action.action}
                className={`v2-pressable ${action.isLive ? 'v2-live-pulse' : ''}`}
                style={{
                  background: 'var(--v2-glass-surface, rgba(255, 255, 255, 0.85))',
                  backdropFilter: 'blur(16px)',
                  WebkitBackdropFilter: 'blur(16px)',
                  border: '1px solid var(--v2-glass-border, rgba(255, 255, 255, 0.8))',
                  borderRadius: '20px',
                  padding: '12px 6px 10px 6px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: 'var(--v2-shadow-ambient)',
                  outline: 'none',
                  position: 'relative'
                }}
              >
                {isBiblePulse && (
                  <span style={{
                    position: 'absolute',
                    top: '-4px',
                    right: '-4px',
                    background: 'var(--accent-primary, #0f766e)',
                    color: '#ffffff',
                    fontSize: '0.55rem',
                    fontWeight: 900,
                    padding: '1px 5px',
                    borderRadius: '6px',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                  }}>
                    LIVRE
                  </span>
                )}

                {action.isLive && (
                  <span style={{
                    position: 'absolute',
                    top: '-4px',
                    right: '-4px',
                    background: '#ef4444',
                    color: '#ffffff',
                    fontSize: '0.55rem',
                    fontWeight: 900,
                    padding: '1px 5px',
                    borderRadius: '6px',
                    boxShadow: '0 2px 6px rgba(239, 68, 68, 0.4)'
                  }}>
                    AO VIVO
                  </span>
                )}

                <div style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '15px',
                  background: action.gradient,
                  border: `1px solid ${action.border}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.03)'
                }}>
                  {action.icon}
                </div>

                <span style={{
                  fontSize: '0.70rem',
                  fontWeight: 800,
                  color: isBiblePulse ? 'var(--accent-primary, #0f766e)' : 'var(--text-main, #0f172a)',
                  textAlign: 'center',
                  lineHeight: 1.2,
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden'
                }}>
                  {action.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 5. Destaques Ministeriais / Cards Refinados com Micro-Animações */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        
        {/* Card Palavra Diária */}
        <div 
          onClick={() => {
            triggerHaptic('light');
            onNavigate('devotionals');
          }}
          className="v2-card v2-pressable"
          style={{
            background: 'var(--v2-card-bg, #ffffff)',
            backdropFilter: 'blur(20px)',
            border: '1px solid var(--v2-subtle-border, rgba(2, 132, 199, 0.2))',
            borderRadius: '22px',
            padding: '16px',
            boxShadow: 'var(--v2-shadow-ambient)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: 0 }}>
            <div style={{ 
              width: '46px', 
              height: '46px', 
              borderRadius: '16px', 
              background: 'linear-gradient(135deg, rgba(2, 132, 199, 0.16) 0%, rgba(14, 165, 233, 0.08) 100%)', 
              border: '1px solid rgba(2, 132, 199, 0.25)', 
              color: '#0284c7', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              flexShrink: 0 
            }}>
              <BookOpenIcon size={24} color="#0284c7" />
            </div>
            <div style={{ minWidth: 0 }}>
              <span style={{ 
                fontSize: '0.64rem', 
                fontWeight: 900, 
                color: '#0284c7', 
                textTransform: 'uppercase',
                letterSpacing: '0.04em'
              }}>
                PALAVRA & ESTUDO DIÁRIO
              </span>
              <h4 style={{ 
                fontSize: '0.92rem', 
                fontWeight: 800, 
                color: 'var(--text-main, #0f172a)', 
                margin: '2px 0 0 0',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}>
                {todayDevotional?.title || 'Devocional de Hoje'}
              </h4>
              <p style={{ 
                fontSize: '0.74rem', 
                color: 'var(--text-muted, #64748b)', 
                margin: '2px 0 0 0',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}>
                {todayDevotional?.verse_reference || 'Toque para ler a mensagem bíblica edificante'}
              </p>
            </div>
          </div>

          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '10px',
            background: 'rgba(2, 132, 199, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#0284c7',
            flexShrink: 0
          }}>
            <ChevronRightIcon size={18} color="#0284c7" />
          </div>
        </div>

        {/* Card Próximo Evento / Calendário */}
        <div 
          onClick={() => {
            triggerHaptic('light');
            onOpenEvents();
          }}
          className="v2-card v2-pressable"
          style={{
            background: 'var(--v2-card-bg, #ffffff)',
            backdropFilter: 'blur(20px)',
            border: '1px solid var(--v2-subtle-border, rgba(234, 88, 12, 0.2))',
            borderRadius: '22px',
            padding: '16px',
            boxShadow: 'var(--v2-shadow-ambient)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: 0 }}>
            <div style={{ 
              width: '46px', 
              height: '46px', 
              borderRadius: '16px', 
              background: 'linear-gradient(135deg, rgba(234, 88, 12, 0.16) 0%, rgba(249, 115, 22, 0.08) 100%)', 
              border: '1px solid rgba(234, 88, 12, 0.25)', 
              color: '#ea580c', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              flexShrink: 0 
            }}>
              <CalendarEventIcon size={24} color="#ea580c" />
            </div>
            <div style={{ minWidth: 0 }}>
              <span style={{ 
                fontSize: '0.64rem', 
                fontWeight: 900, 
                color: '#ea580c', 
                textTransform: 'uppercase',
                letterSpacing: '0.04em'
              }}>
                AGENDA & EVENTOS • {currentCampus?.name || 'Local'}
              </span>
              <h4 style={{ 
                fontSize: '0.92rem', 
                fontWeight: 800, 
                color: 'var(--text-main, #0f172a)', 
                margin: '2px 0 0 0',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}>
                {featuredEvent?.title || 'Programação da Comunidade'}
              </h4>
              <p style={{ 
                fontSize: '0.74rem', 
                color: 'var(--text-muted, #64748b)', 
                margin: '2px 0 0 0',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}>
                {featuredEvent?.location ? `${featuredEvent.location} • Inscrições abertas` : 'Toque para conferir cultos e eventos'}
              </p>
            </div>
          </div>

          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '10px',
            background: 'rgba(234, 88, 12, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ea580c',
            flexShrink: 0
          }}>
            <ChevronRightIcon size={18} color="#ea580c" />
          </div>
        </div>

      </div>

      {/* Modal de Visitante */}
      <VisitorModal 
        isOpen={isVisitorModalOpen} 
        onClose={() => setIsVisitorModalOpen(false)} 
      />

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
