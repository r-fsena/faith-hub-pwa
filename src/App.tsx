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

const AppShell: React.FC = () => {
  const { isFeatureEnabled, isLoading } = useFeatureFlags();

  // Avaliação de versão: Feature Flag por Tenant com suporte a override para testes (?v=2 / localStorage)
  const isV2 = useMemo(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const urlVersion = urlParams.get('v');
      if (urlVersion === '2') {
        localStorage.setItem('faithhub_force_v2', 'true');
        return true;
      }
      if (urlVersion === '1') {
        localStorage.setItem('faithhub_force_v2', 'false');
        return false;
      }

      const localPref = localStorage.getItem('faithhub_force_v2');
      if (localPref === 'true') return true;
      if (localPref === 'false') return false;
    }

    return isFeatureEnabled('pwa.v2_experience', false);
  }, [isFeatureEnabled]);

  if (isLoading) {
    return <SplashScreen />;
  }

  return (
    <Suspense fallback={<SplashScreen />}>
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
