import React, { useState, useEffect } from 'react';
import { BrandingProvider, useBranding } from './context/BrandingContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CartProvider } from './context/CartContext';

import { TopHeader } from './components/TopHeader';
import { BottomNav, type ActiveTab } from './components/BottomNav';
import { CartFloatingButton, CartDrawer } from './components/CartDrawer';
import { LivePlayerModal } from './components/LivePlayerModal';
import { NotificationsModal } from './components/NotificationsModal';
import { AuthGate } from './components/AuthGate';
import { SplashScreen } from './components/SplashScreen';

import { Home } from './pages/Home';
import { Devotionals } from './pages/Devotionals';
import { CellGroups } from './pages/CellGroups';
import { Store } from './pages/Store';
import { Profile } from './pages/Profile';
import { Prayers } from './pages/Prayers';
import { Events } from './pages/Events';
import { Bible } from './pages/Bible';
import { Giving } from './pages/Giving';

type SubView = 'none' | 'prayers' | 'events' | 'bible' | 'giving';

const AppContent: React.FC = () => {
  const { branding } = useBranding();
  const { isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState<ActiveTab>('home');
  const [subView, setSubView] = useState<SubView>('none');
  const [isLiveOpen, setIsLiveOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  // Redirecionamento da Raiz para o Site Institucional se não houver /nomedaigreja
  useEffect(() => {
    const path = window.location.pathname.replace(/^\/+|\/+$/g, '');
    const isRoot = !path;
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

    if (isRoot) {
      if (isLocalhost) {
        window.location.replace('/demonstracao');
      } else {
        window.location.replace('https://faithhubs.com');
      }
    }
  }, []);

  const handleTabChange = (tab: ActiveTab) => {
    setActiveTab(tab);
    setSubView('none');
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
        padding: '24px',
        fontFamily: 'inherit'
      }}>
        <div style={{
          background: '#ffffff',
          borderRadius: '24px',
          padding: '36px 24px',
          maxWidth: '420px',
          width: '100%',
          textAlign: 'center',
          boxShadow: '0 20px 40px rgba(0,0,0,0.06)',
          border: '1px solid #e2e8f0'
        }}>
          <div style={{
            width: '60px',
            height: '60px',
            borderRadius: '18px',
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
            O aplicativo da nossa comunidade está temporariamente indisponível no momento. Para informações sobre cultos, eventos e pedidos de oração, consulte a secretaria da igreja.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="pwa-app-shell">
      {/* Splash Screen Dinâmico com Identidade Visual da Igreja */}
      <SplashScreen />

      {/* Top Header com suporte a navegação e botão Voltar */}
      <TopHeader 
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
      />

      {/* Main Content */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* SUBVIEWS */}
        {subView === 'bible' ? (
          /* Bíblia Sagrada: 100% Livre para qualquer visitante sem login */
          <Bible onBack={() => setSubView('none')} />
        ) : subView === 'prayers' ? (
          !isAuthenticated ? (
            <AuthGate 
              featureName="Mural de Oração"
              featureDescription="Para publicar pedidos de oração, interceder pela comunidade e receber apoio pastoral, entre com sua conta."
              onGoToLogin={() => handleTabChange('profile')}
              onGoToBible={() => setSubView('bible')}
              onBack={() => setSubView('none')}
            />
          ) : (
            <Prayers onBack={() => setSubView('none')} />
          )
        ) : subView === 'events' ? (
          !isAuthenticated ? (
            <AuthGate 
              featureName="Eventos & Cursos"
              featureDescription="Para se inscrever em conferências, cursos e emitir seu passaporte com QR Code, entre ou crie seu cadastro grátis."
              onGoToLogin={() => handleTabChange('profile')}
              onGoToBible={() => setSubView('bible')}
              onBack={() => setSubView('none')}
            />
          ) : (
            <Events onBack={() => setSubView('none')} />
          )
        ) : subView === 'giving' ? (
          !isAuthenticated ? (
            <AuthGate 
              featureName="Contribuições & Dízimos"
              featureDescription="Para semear na obra com segurança e anexar seus comprovantes à tesouraria, faça login na sua conta."
              onGoToLogin={() => handleTabChange('profile')}
              onGoToBible={() => setSubView('bible')}
              onBack={() => setSubView('none')}
            />
          ) : (
            <Giving />
          )
        ) : (
          /* ABAS PRINCIPAIS DO BOTTOM NAV */
          <>
            {activeTab === 'home' && (
              <Home 
                onNavigate={handleTabChange}
                onOpenLive={() => setIsLiveOpen(true)}
                onOpenPrayers={() => setSubView('prayers')}
                onOpenEvents={() => setSubView('events')}
                onOpenBible={() => setSubView('bible')}
                onOpenGiving={() => setSubView('giving')}
              />
            )}

            {activeTab === 'devotionals' && (
              !isAuthenticated ? (
                <AuthGate 
                  featureName="Palavra & Devocionais"
                  featureDescription="Acesse mensagens edificantes diárias e estudos bíblicos preparados pelos pastores da comunidade."
                  onGoToLogin={() => handleTabChange('profile')}
                  onGoToBible={() => setSubView('bible')}
                  onBack={() => handleTabChange('home')}
                />
              ) : (
                <Devotionals />
              )
            )}

            {activeTab === 'cells' && (
              !isAuthenticated ? (
                <AuthGate 
                  featureName="Células & Redes"
                  featureDescription="Conecte-se à sua célula, participe dos murais de avisos, estudos semanais e escalas de partilha."
                  onGoToLogin={() => handleTabChange('profile')}
                  onGoToBible={() => setSubView('bible')}
                  onBack={() => handleTabChange('home')}
                />
              ) : (
                <CellGroups />
              )
            )}

            {activeTab === 'store' && (
              !isAuthenticated ? (
                <AuthGate 
                  featureName="Loja Oficial"
                  featureDescription="Compre livros, devocionais, vestuário e itens com retirada expressa no balcão da igreja."
                  onGoToLogin={() => handleTabChange('profile')}
                  onGoToBible={() => setSubView('bible')}
                  onBack={() => handleTabChange('home')}
                />
              ) : (
                <Store />
              )
            )}

            {/* Perfil: sempre acessível para permitir login/cadastro/recuperação de senha */}
            {activeTab === 'profile' && <Profile />}
          </>
        )}
      </main>

      {/* Floating Cart Button for Store (Somente para usuários autenticados) */}
      {isAuthenticated && <CartFloatingButton />}

      {/* Cart Drawer */}
      {isAuthenticated && <CartDrawer />}

      {/* Live Stream Player Modal */}
      <LivePlayerModal isOpen={isLiveOpen} onClose={() => setIsLiveOpen(false)} />

      {/* Modal de Notificações & Avisos com Push Integrado */}
      <NotificationsModal 
        isOpen={showNotifications} 
        onClose={() => setShowNotifications(false)} 
      />

      {/* Bottom Navigation */}
      <BottomNav activeTab={activeTab} onChangeTab={handleTabChange} />
    </div>
  );
};

import { FeatureFlagProvider } from './context/FeatureFlagContext';

export function App() {
  return (
    <BrandingProvider>
      <FeatureFlagProvider>
        <AuthProvider>
          <CartProvider>
            <AppContent />
          </CartProvider>
        </AuthProvider>
      </FeatureFlagProvider>
    </BrandingProvider>
  );
}

export default App;
