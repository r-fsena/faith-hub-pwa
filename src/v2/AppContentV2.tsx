import React, { useState, useEffect, useRef } from 'react';
import { useBranding } from '../context/BrandingContext';
import { useAuth } from '../context/AuthContext';

import { TopHeaderV2 } from './components/TopHeaderV2';
import { BottomNavV2, type ActiveTab } from './components/BottomNavV2';
import { CartFloatingButton, CartDrawer } from '../components/CartDrawer';
import { LivePlayerModal } from '../components/LivePlayerModal';
import { NotificationsModal } from '../components/NotificationsModal';
import { AuthGate } from '../components/AuthGate';
import { SplashScreen } from '../components/SplashScreen';

// Estilos e Tokens Nativos da V2
import './styles/v2-theme.css';
import { prefetchV2Data, swrFetch } from './services/swrCache';
import { getActiveCampusId, fetchCampuses, setActiveCampusId } from '../services/api';
import { BottomSheet } from '../components/BottomSheet';
import { triggerHaptic } from './utils/haptics';

// Telas do App
import { HomeV2 } from './pages/HomeV2';
import { Devotionals } from '../pages/Devotionals';
import { CellGroups } from '../pages/CellGroups';
import { Store } from '../pages/Store';
import { Profile } from '../pages/Profile';
import { Prayers } from '../pages/Prayers';
import { Events } from '../pages/Events';
import { Bible } from '../pages/Bible';
import { Giving } from '../pages/Giving';

type SubView = 'none' | 'prayers' | 'events' | 'bible' | 'giving';

export const AppContentV2: React.FC = () => {
  const { branding } = useBranding();
  const { isAuthenticated } = useAuth();
  
  const [activeTab, setActiveTab] = useState<ActiveTab>('home');
  const [subView, setSubView] = useState<SubView>('none');
  const [isLiveOpen, setIsLiveOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);

  // Fast-Tab State Retention: Guarda quais abas já foram visitadas para carregamento instantâneo em 0ms
  const [visitedTabs, setVisitedTabs] = useState<Set<ActiveTab>>(new Set(['home']));

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

  // Redireciona para a Home automaticamente ao logar
  const prevAuthRef = useRef(isAuthenticated);
  useEffect(() => {
    if (!prevAuthRef.current && isAuthenticated && activeTab === 'profile') {
      setActiveTab('home');
      setSubView('none');
    }
    prevAuthRef.current = isAuthenticated;
  }, [isAuthenticated, activeTab]);

  // Prefetch de dados da V2 e carregamento de filiais/campuses
  useEffect(() => {
    if (branding.organization_id) {
      prefetchV2Data(branding.organization_id, getActiveCampusId());
      swrFetch(`campuses_${branding.organization_id}`, () => fetchCampuses(branding.organization_id), { persistLocal: true })
        .then(({ data }) => {
          if (data && Array.isArray(data)) setCampuses(data);
        });
    }
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
    setSubView('none');
  };

  const getSubViewTitle = (view: SubView) => {
    switch (view) {
      case 'prayers': return 'Mural de Oração';
      case 'events': return 'Eventos & Cursos';
      case 'bible': return 'Bíblia Sagrada';
      case 'giving': return 'Contribuições & Dízimos';
      default: return undefined;
    }
  };

  // Se o ambiente da congregação foi inativado pela administração
  if ((branding.status || '').toUpperCase() === 'INACTIVE') {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f8fafc',
        padding: '24px'
      }}>
        <div style={{
          background: '#ffffff',
          borderRadius: '28px',
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
            borderRadius: '20px',
            background: '#fee2e2',
            color: '#ef4444',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.8rem',
            margin: '0 auto 16px auto'
          }}>
            ✝️
          </div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 900, color: '#0f172a', margin: '0 0 8px 0' }}>
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
          <p style={{ color: '#64748b', fontSize: '0.88rem', lineHeight: 1.5, margin: 0 }}>
            O aplicativo da nossa comunidade está temporariamente indisponível no momento.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="v2-shell">
      {/* Splash Screen */}
      <SplashScreen />

      {/* Top Header V2 com Saudação, Logo, V2 e Seletor de Campus Unificados */}
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

      {/* Main Content */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        
        {/* SUBVIEWS (Quando ativas) */}
        {subView !== 'none' ? (
          <div className="animate-fade-in" style={{ flex: 1 }}>
            {subView === 'bible' && (
              <Bible onBack={() => setSubView('none')} />
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
                <Prayers onBack={() => setSubView('none')} />
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
                <Events onBack={() => setSubView('none')} />
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
                <Giving />
              )
            )}
          </div>
        ) : (
          /* ========================================================
             ABAS PRINCIPAIS COM FAST-TAB STATE RETENTION (0ms SWITCH)
             ======================================================== */
          <div style={{ flex: 1, position: 'relative' }}>
            
            {/* 1. HOME V2 */}
            <div style={{ display: activeTab === 'home' ? 'block' : 'none' }}>
              <HomeV2 
                onNavigate={handleTabChange}
                onOpenLive={() => setIsLiveOpen(true)}
                onOpenPrayers={() => setSubView('prayers')}
                onOpenEvents={() => setSubView('events')}
                onOpenBible={() => setSubView('bible')}
                onOpenGiving={() => setSubView('giving')}
              />
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
                  <Devotionals />
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
                  <CellGroups />
                )}
              </div>
            )}

            {/* 4. LOJA / PDV (Renderizado sob demanda e preservado) */}
            {visitedTabs.has('store') && (
              <div style={{ display: activeTab === 'store' ? 'block' : 'none' }}>
                {!isAuthenticated ? (
                  <AuthGate 
                    featureName="Loja Oficial"
                    featureDescription="Compre livros, devocionais, vestuário e itens com retirada expressa."
                    onGoToLogin={() => handleTabChange('profile')}
                    onGoToBible={() => setSubView('bible')}
                    onBack={() => handleTabChange('home')}
                  />
                ) : (
                  <Store />
                )}
              </div>
            )}

            {/* 5. PERFIL (Renderizado sob demanda e preservado) */}
            {visitedTabs.has('profile') && (
              <div style={{ display: activeTab === 'profile' ? 'block' : 'none' }}>
                <Profile
                  onLoginSuccess={() => {
                    setActiveTab('home');
                    setSubView('none');
                  }}
                />
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
      <BottomNavV2 activeTab={activeTab} onChangeTab={handleTabChange} />

      {/* Drawer Global de Seleção de Unidade / Campus */}
      <BottomSheet 
        isOpen={isCampusDrawerOpen} 
        onClose={() => setIsCampusDrawerOpen(false)}
        maxHeight="65vh"
      >
        <div style={{ textAlign: 'center', marginBottom: '16px' }}>
          <span style={{ fontSize: '1.5rem' }}>🏛️</span>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 900, color: 'var(--text-main, #0f172a)', margin: '4px 0 0 0' }}>
            Escolha sua Congregação
          </h3>
          <p style={{ fontSize: '0.76rem', color: 'var(--text-muted, #64748b)', margin: '4px 0 0 0' }}>
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
                className="v2-pressable"
                style={{
                  background: isSelected ? 'var(--accent-primary-light, rgba(15, 118, 110, 0.12))' : '#ffffff',
                  border: isSelected ? '2px solid var(--accent-primary, #0f766e)' : '1px solid rgba(226, 232, 240, 0.8)',
                  borderRadius: '18px',
                  padding: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  boxShadow: '0 4px 12px -2px rgba(15, 23, 42, 0.04)'
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '0.94rem', fontWeight: 800, color: 'var(--text-main, #0f172a)' }}>
                      {c.name}
                    </span>
                    {Boolean(c.is_headquarters) && (
                      <span style={{ 
                        fontSize: '0.62rem', 
                        background: '#fef3c7', 
                        color: '#92400e', 
                        padding: '2px 6px', 
                        borderRadius: '6px', 
                        fontWeight: 900 
                      }}>
                        SEDE
                      </span>
                    )}
                  </div>
                  <p style={{ fontSize: '0.74rem', color: 'var(--text-muted, #64748b)', margin: '4px 0 0 0' }}>
                    {c.address ? `${c.address}, ` : ''}{c.city ? `${c.city} - ${c.state}` : 'Endereço no App'}
                  </p>
                  {c.pastor_name && (
                    <p style={{ fontSize: '0.72rem', color: 'var(--accent-primary, #0f766e)', fontWeight: 700, margin: '2px 0 0 0' }}>
                      Pastor Local: {c.pastor_name}
                    </p>
                  )}
                </div>

                <div style={{
                  width: '22px',
                  height: '22px',
                  borderRadius: '50%',
                  border: isSelected ? '6px solid var(--accent-primary, #0f766e)' : '2px solid #cbd5e1',
                  background: '#ffffff'
                }} />
              </div>
            );
          })}
        </div>
      </BottomSheet>
    </div>
  );
};

export default AppContentV2;
