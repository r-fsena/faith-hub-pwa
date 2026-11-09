import React, { Suspense, useMemo, useState, useEffect } from 'react';
import { BrandingProvider, useBranding } from './context/BrandingContext';
import { FeatureFlagProvider, useFeatureFlags } from './context/FeatureFlagContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { UsageProvider } from './context/UsageContext';
import { CartProvider } from './context/CartContext';
import { PwaExperienceProvider, usePwaExperience } from './context/PwaExperienceContext';
import { PwaInstallationProvider } from './context/PwaInstallationContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { SplashScreen } from './components/SplashScreen';

// Code-splitting: Carrega V1 ou V2 dinamicamente sob demanda
const AppContentV1 = React.lazy(() => import('./v1/AppContentV1'));
const AppContentV2 = React.lazy(() => import('./v2/AppContentV2'));

function ShellReady({ onReady }: { onReady: () => void }) {
  useEffect(onReady, [onReady]);
  return null;
}
const AppShell: React.FC = () => {
  const { isFeatureEnabled, isLoading, error: flagsError } = useFeatureFlags();
  const { isResolved, error: brandingError } = useBranding();
  const { isLoading: authLoading } = useAuth();
  const { isReady: themeReady } = useTheme();
  const { isLoading: experienceLoading } = usePwaExperience();
  const [started, setStarted] = useState(false);
  const [shellReady, setShellReady] = useState(false);
  const error = brandingError || flagsError;
  const prepared = !!isResolved && !isLoading && !authLoading && !experienceLoading && themeReady !== false && !error;
  useEffect(() => { if (prepared) setStarted(true); }, [prepared]);
  const markReady = React.useCallback(() => setShellReady(true), []);

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

  return <>
    <SplashScreen ready={prepared && shellReady} error={started ? undefined : error} />
    {(prepared || started) && <Suspense fallback={null}>
      {isV2 ? <AppContentV2 /> : <AppContentV1 />}
      <ShellReady onReady={markReady} />
    </Suspense>}
  </>;
};

export function App() {
  return (
    <BrandingProvider>
      <FeatureFlagProvider>
        <ThemeProvider>
          <PwaExperienceProvider>
            <PwaInstallationProvider>
              <AuthProvider>
                <UsageProvider>
                  <CartProvider>
                    <AppShell />
                  </CartProvider>
                </UsageProvider>
              </AuthProvider>
            </PwaInstallationProvider>
          </PwaExperienceProvider>
        </ThemeProvider>
      </FeatureFlagProvider>
    </BrandingProvider>
  );
}

export default App;
