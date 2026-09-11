import React from 'react';
import { useFeatureFlags } from '../../context/FeatureFlagContext';
import { useBranding } from '../../context/BrandingContext';
import { useCart } from '../../context/CartContext';
import { triggerHaptic } from '../utils/haptics';

// SVG Icons Otimizados com traço moderno
const HomeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
);
const BookIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"/><path d="M6 6h10"/><path d="M6 10h10"/></svg>
);
const UsersIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
);
const StoreIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
);
const UserIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="5"/><path d="M20 21a8 8 0 0 0-16 0"/></svg>
);

export type ActiveTab = 'home' | 'devotionals' | 'cells' | 'store' | 'profile';

interface BottomNavV2Props {
  activeTab: ActiveTab;
  onChangeTab: (tab: ActiveTab) => void;
}

export const BottomNavV2: React.FC<BottomNavV2Props> = ({ activeTab, onChangeTab }) => {
  const { isFeatureEnabled } = useFeatureFlags();
  const { branding } = useBranding();
  const { totalItemsCount } = useCart();

  const allTabs: Array<{ id: ActiveTab; label: string; icon: React.ComponentType; flag?: string }> = [
    { id: 'home', label: 'Início', icon: HomeIcon },
    { id: 'devotionals', label: 'Palavra', icon: BookIcon, flag: 'devotionals.module_enabled' },
    { id: 'cells', label: 'Células', icon: UsersIcon, flag: 'cell_groups.module_enabled' },
    { id: 'store', label: branding.store_tab_title || 'Loja', icon: StoreIcon, flag: 'pdv.module_enabled' },
    { id: 'profile', label: 'Perfil', icon: UserIcon },
  ];

  const visibleTabs = allTabs.filter(tab => !tab.flag || isFeatureEnabled(tab.flag));

  const handleTabClick = (tabId: ActiveTab) => {
    if (activeTab !== tabId) {
      triggerHaptic('selection');
      onChangeTab(tabId);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      bottom: 'env(safe-area-inset-bottom, 12px)',
      left: 0,
      right: 0,
      display: 'flex',
      justifyContent: 'center',
      padding: '0 14px 8px 14px',
      zIndex: 100,
      pointerEvents: 'none'
    }}>
      <nav style={{
        pointerEvents: 'auto',
        maxWidth: '460px',
        width: '100%',
        background: 'rgba(255, 255, 255, 0.88)',
        backdropFilter: 'blur(24px) saturate(190%)',
        WebkitBackdropFilter: 'blur(24px) saturate(190%)',
        borderRadius: '32px',
        padding: '6px 8px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-around',
        boxShadow: '0 12px 36px rgba(0, 0, 0, 0.08), 0 2px 6px rgba(0, 0, 0, 0.03), inset 0 1px 1px rgba(255, 255, 255, 0.8)',
        border: '1px solid rgba(226, 232, 240, 0.75)'
      }}>
        {visibleTabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleTabClick(tab.id)}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                background: isActive ? 'var(--accent-primary-light, rgba(99, 102, 241, 0.12))' : 'transparent',
                border: 'none',
                borderRadius: '24px',
                padding: '6px 4px',
                cursor: 'pointer',
                color: isActive ? 'var(--accent-primary, #6366f1)' : '#64748b',
                transition: 'all 0.22s cubic-bezier(0.34, 1.56, 0.64, 1)',
                transform: isActive ? 'scale(1.03)' : 'scale(1)',
                position: 'relative',
                outline: 'none',
                WebkitTapHighlightColor: 'transparent'
              }}
            >
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon />
                
                {/* Badge do Carrinho */}
                {tab.id === 'store' && totalItemsCount > 0 && (
                  <span style={{
                    position: 'absolute',
                    top: '-6px',
                    right: '-10px',
                    background: 'var(--accent-primary, #6366f1)',
                    color: '#ffffff',
                    fontSize: '0.60rem',
                    fontWeight: 900,
                    minWidth: '17px',
                    height: '17px',
                    borderRadius: '999px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '0 4px',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.25)',
                    border: '1.5px solid #ffffff'
                  }}>
                    {totalItemsCount}
                  </span>
                )}
              </div>

              <span style={{
                fontSize: '0.68rem',
                fontWeight: isActive ? 800 : 600,
                marginTop: '3px',
                letterSpacing: '-0.01em',
                transition: 'color 0.15s ease'
              }}>
                {tab.label}
              </span>

              {/* Indicador de Barra Ativa Luminosa */}
              {isActive && (
                <div style={{
                  position: 'absolute',
                  bottom: '2px',
                  width: '14px',
                  height: '3px',
                  borderRadius: '999px',
                  background: 'var(--accent-primary, #6366f1)',
                  boxShadow: '0 0 8px var(--accent-primary, #6366f1)'
                }} />
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
};
