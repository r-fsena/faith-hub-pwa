import { CampusPicker } from '../components/CampusPicker';
import {useUsageScreen} from '../context/UsageContext';
import {ExperienceScreen} from '../context/PwaExperienceContext';
import { usePwaExperience } from '../context/PwaExperienceContext';
import { FeatureGate } from '../context/FeatureFlagContext';
import React, { useState, useEffect, useRef } from 'react';
import { useBranding } from '../context/BrandingContext';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

import { TopHeaderV2 } from './components/TopHeaderV2';
import { BottomNavV2, type ActiveTab } from './components/BottomNavV2';
import { CartFloatingButton, CartDrawer } from '../components/CartDrawer';
import { LivePlayerModal } from '../components/LivePlayerModal';
import { NotificationsModal } from '../components/NotificationsModal';
import { AuthGate } from '../components/AuthGate';

// Estilos e Tokens Nativos da V2
import './styles/v2-theme.css';
import { prefetchV2Data } from './services/swrCache';
import { getActiveCampusId, fetchCampuses, setActiveCampusId } from '../services/api';
import { BottomSheet } from '../components/BottomSheet';
import { triggerHaptic } from './utils/haptics';
import { CrossIcon } from './components/Icons';

// Telas do App
import { HomeV2 } from './pages/HomeV2';
import { Devotionals } from '../pages/Devotionals';
import { CellGroups } from '../pages/CellGroups';
import { Store } from '../pages/Store';
import { Profile } from '../pages/Profile';
import { WelcomeLoginScreenV2 } from './components/WelcomeLoginScreenV2';
import { Prayers } from '../pages/Prayers';
import { Events } from '../pages/Events';
import { Bible } from '../pages/Bible';
import { Giving } from '../pages/Giving';
import { VolunteerSchedules } from '../pages/VolunteerSchedules';
import { WelcomeVisitor } from '../pages/WelcomeVisitor';
import { ErrorBoundary } from '../components/ErrorBoundary';

type SubView = 'none' | 'prayers' | 'events' | 'bible' | 'giving' | 'volunteers' | 'welcome';

export const AppContentV2: React.FC = () => {
  const { branding } = useBranding();
  const { setScreen,t } = usePwaExperience();
  const { isAuthenticated } = useAuth();
  const { resolvedTheme } = useTheme();
  
  // Suporte a rotas diretas via query params para navegação instantânea e capturas
  const urlTab = typeof window !== 'undefined' ? (new URLSearchParams(window.location.search).get('tab') as ActiveTab) : null;
  const urlView = typeof window !== 'undefined' ? (new URLSearchParams(window.location.search).get('view') as SubView) : null;
  const urlLive = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('live') === 'true';

  const [activeTab, setActiveTab] = useState<ActiveTab>(() => {
    if (urlTab && ['home', 'devotionals', 'cells', 'store', 'profile'].includes(urlTab)) {
      return urlTab;
    }
    if (typeof window !== 'undefined' && sessionStorage.getItem('faithhub_guest_explored') === 'true') {
      return 'home';
    }
    return isAuthenticated ? 'home' : 'profile';
  });

  const [subView, setSubView] = useState<SubView>(() => {
    if (urlView && ['prayers', 'events', 'bible', 'giving', 'volunteers', 'welcome'].includes(urlView)) {
      return urlView;
    }
    return 'none';
  });

  const [isLiveOpen, setIsLiveOpen] = useState(urlLive);
  const [showNotifications, setShowNotifications] = useState(false);
  useUsageScreen(isLiveOpen ? 'home' : subView !== 'none' ? (subView === 'welcome' ? 'welcome' : subView) : activeTab, 'v2');
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);

  // Fast-Tab State Retention: Guarda quais abas já foram visitadas para carregamento instantâneo em 0ms
  const [visitedTabs, setVisitedTabs] = useState<Set<ActiveTab>>(() => {
    const initialTab: ActiveTab = urlTab || ((isAuthenticated || (typeof window !== 'undefined' && sessionStorage.getItem('faithhub_guest_explored') === 'true')) ? 'home' : 'profile');
    return new Set([initialTab, 'home', 'devotionals', 'cells', 'store', 'profile']);
  });

  // Estado Global de Campus / Unidade no Shell V2
  const [campuses, setCampuses] = useState<any[]>([]);
  const [activeCampusId, setSelectedCampusId] = useState<string>(() => getActiveCampusId());
  const [isCampusDrawerOpen, setIsCampusDrawerOpen] = useState(false);

  useEffect(() => {
    setVisitedTabs(prev => {
      if (!prev.has(activeTab)) {
        const next = new Set(prev);
        next.add(activeTab);
        return next;
      }
      return prev;
    });
  }, [activeTab]);

  // Redireciona de acordo com o estado de autenticação
  const prevAuthRef = useRef(isAuthenticated);
  useEffect(() => {
    // Ao logar estando em profile: vai para a Home
    if (!prevAuthRef.current && isAuthenticated && activeTab === 'profile') {
      setActiveTab('home');
      setSubView('none');
    }
    // Ao deslogar / sair da conta: redireciona IMEDIATAMENTE para a tela inicial de login
    if (prevAuthRef.current && !isAuthenticated) {
      sessionStorage.removeItem('faithhub_guest_explored');
      setActiveTab('profile');
      setSubView('none');
    }
    prevAuthRef.current = isAuthenticated;
  }, [isAuthenticated, activeTab]);

  // Prefetch de dados da V2 e carregamento de filiais/campuses
  useEffect(() => {
    let current = true;
    setCampuses([]);
    if (branding.organization_id) {
      prefetchV2Data(branding.organization_id, getActiveCampusId());
      fetchCampuses(branding.organization_id).then(data => {
        if (current) setCampuses(data);
      });
    }
    return () => { current = false; };
  }, [branding.organization_id]);

  useEffect(() => {
    const handleCampusChanged = (e: any) => {
      const newCampusId = e.detail?.campusId || getActiveCampusId();
      setSelectedCampusId(newCampusId);
    };
    window.addEventListener('pwa-campus-changed', handleCampusChanged);
    return () => window.removeEventListener('pwa-campus-changed', handleCampusChanged);
  }, []);

  const handleSelectCampus = (cId: string) => {
    triggerHaptic('selection');
    setActiveCampusId(cId);
    setSelectedCampusId(cId);
    setIsCampusDrawerOpen(false);
  };

  const currentCampus = campuses.find(c => c.id === activeCampusId) || campuses[0];

  const handleTabChange = (tab: ActiveTab) => {
    setActiveTab(tab);
    setVisitedTabs(prev => {
      if (!prev.has(tab)) {
        const next = new Set(prev);
        next.add(tab);
        return next;
      }
      return prev;
    });
    setSubView('none');
  };

  const getSubViewTitle = (view: SubView) => {
    switch (view) {
      case 'prayers': return t('prayers.title','Mural de Oração');
      case 'events': return t('events.title','Eventos & Cursos');
      case 'bible': return t('bible.title','Bíblia Sagrada');
      case 'giving': return t('giving.title','Contribuições & Dízimos');
      case 'volunteers': return t('volunteers.title','Escalas & Voluntariado');
      default: return undefined;
    }
  };

  useEffect(()=>{setScreen((subView !== 'none' ? (subView === 'welcome' ? 'welcome' : subView) : activeTab==='profile'&&!isAuthenticated?'welcome':activeTab) as any);},[activeTab,subView,setScreen,isAuthenticated]);

  // Se o ambiente da congregação foi inativado pela administração
  if ((branding.status || '').toUpperCase() === 'INACTIVE') {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--exp-background, #f8fafc)',
        padding: '24px'
      }}>
        <div style={{
          background: 'var(--exp-surface, #ffffff)',
          borderRadius: 'var(--exp-radius, 28px)',
          padding: '36px 24px',
          maxWidth: '420px',
          width: '100%',
          textAlign: 'center',
          boxShadow: '0 20px 40px rgba(0,0,0,0.06)',
          border: '1px solid #e2e8f0'
        }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: 'var(--exp-radius, 20px)',
            background: '#fee2e2',
            color: '#ef4444',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px auto'
          }}>
            <CrossIcon size={32} color="#ef4444" />
          </div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--exp-text, #0f172a)', margin: '0 0 8px 0' }}>
            {branding.church_name}
          </h2>
          <span style={{
            display: 'inline-block',
            background: '#fee2e2',
            color: '#b91c1c',
            fontSize: '0.72rem',
            fontWeight: 800,
            padding: '3px 10px',
            borderRadius: 999,
            marginBottom: '16px'
          }}>
            Aplicativo Temporariamente Indisponível
          </span>
          <p style={{ color: 'var(--exp-muted, #64748b)', fontSize: '0.88rem', lineHeight: 1.5, margin: 0 }}>
            O aplicativo da nossa comunidade está temporariamente indisponível no momento.
          </p>
        </div>
      </div>
    );
  }

  const isAuthScreen = !isAuthenticated && activeTab === 'profile' && subView === 'none';

  return (
    <div className={`v2-shell ${isAuthScreen ? 'v2-auth-shell' : ''} ${resolvedTheme === 'dark' ? 'dark' : ''}`}>
      {/* Top Header V2 com Saudação, Logo, V2 e Seletor de Campus Unificados */}
      {!isAuthScreen && (
        <TopHeaderV2 
          onOpenNotifications={() => {
            if (!isAuthenticated) {
              handleTabChange('profile');
            } else {
              setShowNotifications(true);
            }
          }}
          onOpenProfile={() => handleTabChange('profile')}
          title={getSubViewTitle(subView)}
          onBack={subView !== 'none' ? () => setSubView('none') : undefined}
          unreadCount={unreadNotificationsCount}
          campusName={currentCampus?.name || 'Sede'}
          onOpenCampusSelect={() => setIsCampusDrawerOpen(true)}
        />
      )}

      {/* Main Content */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        
        {/* SUBVIEWS (Quando ativas) */}
        {subView !== 'none' ? (
          <div className="animate-fade-in" style={{ flex: 1 }}>
            {subView === 'bible' && (
              <ExperienceScreen screen="bible"><Bible onBack={() => setSubView('none')} /></ExperienceScreen>
            )}

            {subView === 'prayers' && (
              !isAuthenticated ? (
                <AuthGate 
                  featureName="Mural de Oração"
                  featureDescription="Para publicar pedidos de oração e interceder pela comunidade, acesse sua conta."
                  onGoToLogin={() => handleTabChange('profile')}
                  onGoToBible={() => setSubView('bible')}
                  onBack={() => setSubView('none')}
                />
              ) : (
                <ExperienceScreen screen="prayers"><Prayers onBack={() => setSubView('none')} /></ExperienceScreen>
              )
            )}

            {subView === 'events' && (
              !isAuthenticated ? (
                <AuthGate 
                  featureName="Eventos & Cursos"
                  featureDescription="Para se inscrever em eventos e emitir ingressos com QR Code, acesse sua conta."
                  onGoToLogin={() => handleTabChange('profile')}
                  onGoToBible={() => setSubView('bible')}
                  onBack={() => setSubView('none')}
                />
              ) : (
                <FeatureGate flag="events.module_enabled" fallback={<p>Este módulo não está disponível para esta igreja.</p>}>
<ExperienceScreen screen="events"><Events onBack={() => setSubView('none')} /></ExperienceScreen>
</FeatureGate>
              )
            )}

            {subView === 'giving' && (
              !isAuthenticated ? (
                <AuthGate 
                  featureName="Contribuições & Dízimos"
                  featureDescription="Para semear na obra com segurança e anexar comprovantes, acesse sua conta."
                  onGoToLogin={() => handleTabChange('profile')}
                  onGoToBible={() => setSubView('bible')}
                  onBack={() => setSubView('none')}
                />
              ) : (
                <ExperienceScreen screen="giving"><Giving /></ExperienceScreen>
              )
            )}

            {subView === 'volunteers' && (
              !isAuthenticated ? (
                <AuthGate 
                  featureName="Escalas & Voluntariado"
                  featureDescription="Para consultar suas escalas de serviço, confirmar presença ou ingressar em um ministério, acesse sua conta."
                  onGoToLogin={() => handleTabChange('profile')}
                  onGoToBible={() => setSubView('bible')}
                  onBack={() => setSubView('none')}
                />
              ) : (
                <FeatureGate flag="volunteers.module_enabled" fallback={<p>Este módulo não está disponível para esta igreja.</p>}>
<ExperienceScreen screen="volunteers"><VolunteerSchedules onBack={() => setSubView('none')} /></ExperienceScreen>
</FeatureGate>
              )
            )}

            {/* Sub-tela: Recepção & Acolhimento de Visitantes (QR Code do Culto) */}
            {subView === 'welcome' && (
              <FeatureGate flag="visitors.module_enabled" fallback={<p>Este módulo não está disponível para esta igreja.</p>}>
<ExperienceScreen screen="welcome"><WelcomeVisitor
                onBack={() => setSubView('none')}
                onExploreApp={() => {
                  sessionStorage.setItem('faithhub_guest_explored', 'true');
                  setActiveTab('home');
                  setSubView('none');
                }}
              /></ExperienceScreen>
</FeatureGate>
            )}
          </div>
        ) : (
          /* ========================================================
             ABAS PRINCIPAIS COM FAST-TAB STATE RETENTION (0ms SWITCH)
             ======================================================== */
          <div style={{ flex: 1, position: 'relative' }}>
            
            {/* 1. HOME V2 */}
            <div style={{ display: activeTab === 'home' ? 'block' : 'none' }}>
              <ExperienceScreen screen="home"><HomeV2
                onNavigate={handleTabChange}
                onOpenLive={() => setIsLiveOpen(true)}
                onOpenPrayers={() => setSubView('prayers')}
                onOpenEvents={() => setSubView('events')}
                onOpenBible={() => setSubView('bible')}
                onOpenGiving={() => setSubView('giving')}
                onOpenVolunteers={() => setSubView('volunteers')}
              /></ExperienceScreen>
            </div>

            {/* 2. DEVOCIONAIS (Renderizado sob demanda e preservado) */}
            {visitedTabs.has('devotionals') && (
              <div style={{ display: activeTab === 'devotionals' ? 'block' : 'none' }}>
                {!isAuthenticated ? (
                  <AuthGate 
                    featureName="Palavra & Devocionais"
                    featureDescription="Acesse mensagens edificantes diárias e estudos bíblicos dos pastores."
                    onGoToLogin={() => handleTabChange('profile')}
                    onGoToBible={() => setSubView('bible')}
                    onBack={() => handleTabChange('home')}
                  />
                ) : (
                  <ExperienceScreen screen="devotionals"><Devotionals /></ExperienceScreen>
                )}
              </div>
            )}

            {/* 3. CÉLULAS (Renderizado sob demanda e preservado) */}
            {visitedTabs.has('cells') && (
              <div style={{ display: activeTab === 'cells' ? 'block' : 'none' }}>
                {!isAuthenticated ? (
                  <AuthGate 
                    featureName="Células & Redes"
                    featureDescription="Conecte-se à sua célula, participe dos murais de avisos e estudos semanais."
                    onGoToLogin={() => handleTabChange('profile')}
                    onGoToBible={() => setSubView('bible')}
                    onBack={() => handleTabChange('home')}
                  />
                ) : (
                  <ExperienceScreen screen="cells"><CellGroups /></ExperienceScreen>
                )}
              </div>
            )}

            {/* 4. LOJA / PDV (Renderizado sob demanda e preservado) */}
            {(visitedTabs.has('store') || activeTab === 'store') && (
              <div style={{ display: activeTab === 'store' ? 'block' : 'none' }}>
                <ErrorBoundary fallbackTitle="Erro ao carregar a Loja Oficial">
                  <FeatureGate flag="pdv.module_enabled" fallback={<p>Este módulo não está disponível para esta igreja.</p>}>
<ExperienceScreen screen="store"><Store /></ExperienceScreen>
</FeatureGate>
                </ErrorBoundary>
              </div>
            )}

            {/* 5. PERFIL & BOAS-VINDAS V2 (Renderizado sob demanda e preservado) */}
            {visitedTabs.has('profile') && (
              <div style={{ display: activeTab === 'profile' ? 'block' : 'none' }}>
                {!isAuthenticated ? (
                  <ExperienceScreen screen="welcome"><WelcomeLoginScreenV2
                    onLoginSuccess={() => {
                      sessionStorage.removeItem('faithhub_guest_explored');
                      setActiveTab('home');
                      setSubView('none');
                    }}
                    onContinueAsGuest={() => {
                      sessionStorage.setItem('faithhub_guest_explored', 'true');
                      setActiveTab('home');
                      setSubView('none');
                    }}
                  /></ExperienceScreen>
                ) : (
                  <ExperienceScreen screen="profile"><Profile
                    onLoginSuccess={() => {
                      sessionStorage.removeItem('faithhub_guest_explored');
                      setActiveTab('home');
                      setSubView('none');
                    }}
                    onLogout={() => {
                      sessionStorage.removeItem('faithhub_guest_explored');
                      setActiveTab('profile');
                      setSubView('none');
                    }}
                    onContinueAsGuest={() => {
                      sessionStorage.setItem('faithhub_guest_explored', 'true');
                      setActiveTab('home');
                      setSubView('none');
                    }}
                    onOpenVolunteers={() => setSubView('volunteers')}
                  /></ExperienceScreen>
                )}
              </div>
            )}

          </div>
        )}
      </main>

      {/* Floating Cart Button */}
      {isAuthenticated && activeTab === 'store' && subView === 'none' && <CartFloatingButton />}

      {/* Cart Drawer */}
      {isAuthenticated && <CartDrawer />}

      {/* Live Stream Player Modal */}
      <LivePlayerModal isOpen={isLiveOpen} onClose={() => setIsLiveOpen(false)} />

      {/* Modal de Notificações */}
      <NotificationsModal 
        isOpen={showNotifications} 
        onClose={() => setShowNotifications(false)}
        onNavigate={(tab, sub) => {
          if (sub) {
            setSubView(sub);
          } else {
            handleTabChange(tab);
          }
        }}
        onOpenLive={() => setIsLiveOpen(true)}
        onUnreadCountChange={(count) => setUnreadNotificationsCount(count)}
      />

      {/* Bottom Navigation V2 (Dock Flutuante com Feedback Háptico) */}
      {!isAuthScreen && (
        <BottomNavV2 activeTab={activeTab} onChangeTab={handleTabChange} />
      )}

      {/* Drawer Global de Seleção de Unidade / Campus */}
      <BottomSheet 
        isOpen={isCampusDrawerOpen} 
        onClose={() => setIsCampusDrawerOpen(false)}
        maxHeight="75vh"
        title="Escolha sua unidade"
      >
        <CampusPicker campuses={campuses} organizationId={branding.organization_id || ''} selectedId={activeCampusId} isOpen={isCampusDrawerOpen} onSelect={handleSelectCampus} />
      </BottomSheet>
    </div>
  );
};

export default AppContentV2;
