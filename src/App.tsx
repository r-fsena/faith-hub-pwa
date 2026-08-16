import React, { useState } from 'react';
import { BrandingProvider } from './context/BrandingContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CartProvider } from './context/CartContext';

import { TopHeader } from './components/TopHeader';
import { BottomNav, type ActiveTab } from './components/BottomNav';
import { CartFloatingButton, CartDrawer } from './components/CartDrawer';
import { LivePlayerModal } from './components/LivePlayerModal';
import { NotificationsModal } from './components/NotificationsModal';
import { AuthGate } from './components/AuthGate';

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
  const { isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState<ActiveTab>('home');
  const [subView, setSubView] = useState<SubView>('none');
  const [isLiveOpen, setIsLiveOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

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

  return (
    <div className="pwa-app-shell">
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
                  featureName="Cantina & Loja"
                  featureDescription="Faça pedidos com retirada expressa no balcão e acompanhe o status de preparo dos seus lanches."
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

export function App() {
  return (
    <BrandingProvider>
      <AuthProvider>
        <CartProvider>
          <AppContent />
        </CartProvider>
      </AuthProvider>
    </BrandingProvider>
  );
}

export default App;
