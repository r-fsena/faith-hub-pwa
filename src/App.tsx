import React, { useState } from 'react';
import { BrandingProvider } from './context/BrandingContext';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';

import { TopHeader } from './components/TopHeader';
import { BottomNav, type ActiveTab } from './components/BottomNav';
import { CartFloatingButton, CartDrawer } from './components/CartDrawer';
import { LivePlayerModal } from './components/LivePlayerModal';
import { NotificationsModal } from './components/NotificationsModal';

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
        onOpenNotifications={() => setShowNotifications(true)}
        onOpenProfile={() => handleTabChange('profile')}
        title={getSubViewTitle(subView)}
        onBack={subView !== 'none' ? () => setSubView('none') : undefined}
      />

      {/* Main Content */}
      <main style={{ flex: 1 }}>
        {subView === 'prayers' ? (
          <Prayers onBack={() => setSubView('none')} />
        ) : subView === 'events' ? (
          <Events onBack={() => setSubView('none')} />
        ) : subView === 'bible' ? (
          <Bible onBack={() => setSubView('none')} />
        ) : subView === 'giving' ? (
          <Giving />
        ) : (
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
            {activeTab === 'devotionals' && <Devotionals />}
            {activeTab === 'cells' && <CellGroups />}
            {activeTab === 'store' && <Store />}
            {activeTab === 'profile' && <Profile />}
          </>
        )}
      </main>

      {/* Floating Cart Button for Store */}
      <CartFloatingButton />

      {/* Cart Drawer */}
      <CartDrawer />

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
