import React, { Suspense, useMemo } from 'react';
import { BrandingProvider } from './context/BrandingContext';
import { FeatureFlagProvider, useFeatureFlags } from './context/FeatureFlagContext';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { ThemeProvider } from './context/ThemeContext';
import { SplashScreen } from './components/SplashScreen';

// Code-splitting: Carrega V1 ou V2 dinamicamente sob demanda
const AppContentV1 = React.lazy(() => import('./v1/AppContentV1'));
const AppContentV2 = React.lazy(() => import('./v2/AppContentV2'));

const FastBootFallback = () => (
  <div style={{ position: 'fixed', inset: 0, background: '#090d16', zIndex: 999999 }} />
);

const AppShell: React.FC = () => {
  const { isFeatureEnabled, isLoading } = useFeatureFlags();

  // V2 é a versão padrão ativa para todos os tenants e usuários
  const isV2 = useMemo(() => {
    if (typeof window !== 'undefined') {
      // Limpa qualquer preferência legada que forçava v1 no dispositivo
      if (localStorage.getItem('faithhub_force_v2') === 'false') {
        localStorage.removeItem('faithhub_force_v2');
      }
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('v') === '1') {
        return false; // Diagnóstico técnico emergencial via URL
      }
    }

    return isFeatureEnabled('pwa.v2_experience', true);
  }, [isFeatureEnabled]);

  if (isLoading) {
    return <FastBootFallback />;
  }

  return (
    <Suspense fallback={<FastBootFallback />}>
      {isV2 ? <AppContentV2 /> : <AppContentV1 />}
    </Suspense>
  );
};

export function App() {
  return (
    <BrandingProvider>
      <ThemeProvider>
        <FeatureFlagProvider>
          <AuthProvider>
            <CartProvider>
              <AppShell />
            </CartProvider>
          </AuthProvider>
        </FeatureFlagProvider>
      </ThemeProvider>
    </BrandingProvider>
  );
}

export default App;
