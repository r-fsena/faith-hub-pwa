import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useBranding } from './BrandingContext';
import { getActiveCampusId } from '../services/api';

const API_URL = import.meta.env.VITE_API_URL || 'https://566n5qz7te.execute-api.us-east-2.amazonaws.com';

export interface FeatureFlagContextType {
  flags: Record<string, boolean>;
  configs: Record<string, any>;
  isLoading: boolean;
  error?: string;
  isFeatureEnabled: (featureKey: string, defaultValue?: boolean) => boolean;
  getFeatureConfig: <T = any>(featureKey: string, defaultValue?: T) => T;
  refreshFlags: () => Promise<void>;
}

export const FeatureFlagContext = createContext<FeatureFlagContextType>({
  flags: {},
  configs: {},
  isLoading: true,
  isFeatureEnabled: () => false,
  getFeatureConfig: () => null as any,
  refreshFlags: async () => {}
});

export const FeatureFlagProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { branding, isResolved } = useBranding();
  const [flags, setFlags] = useState<Record<string, boolean>>({});
  const [configs, setConfigs] = useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadedOrganization, setLoadedOrganization] = useState('');
  const [error, setError] = useState('');
  const requestId = useRef(0);
  const organization = branding.organization_id || '';


  const fetchFlags = useCallback(async (campusOverride?: string) => {
    const currentRequest = ++requestId.current;
    if (!isResolved || !organization) { setIsLoading(true); return; }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      setIsLoading(true); setError('');
      const params = new URLSearchParams();
      // Resolve org identifier
      const orgParam = organization;
      params.append('organization_id', orgParam);
      params.append('environment', 'production');

      const activeCampus = campusOverride || getActiveCampusId();
      if (activeCampus && activeCampus !== 'all') {
        params.append('campus_id', activeCampus);
      }

      const res = await fetch(`${API_URL}/feature-flags?${params.toString()}`, { signal: controller.signal });
      if (!res.ok) throw new Error(`FEATURE_FLAGS_HTTP_${res.status}`);
      const data = await res.json();
      if (currentRequest !== requestId.current) return;
      setFlags(data.flags || {});
      setConfigs(data.configs || {});
      setLoadedOrganization(organization);
    } catch (err) {
      if (currentRequest === requestId.current) setError('Não foi possível preparar os recursos da igreja. Tente novamente.');
      console.warn('Erro ao carregar feature flags no PWA:', err);
    } finally {
      clearTimeout(timeout);
      if (currentRequest === requestId.current) setIsLoading(false);
    }
  }, [organization, isResolved]);

  useEffect(() => {
    void fetchFlags();
    return () => { requestId.current++; };
  }, [fetchFlags]);

  useEffect(() => {
    const handleCampusChanged = (e: any) => {
      const newCampus = e.detail?.campusId || getActiveCampusId();
      fetchFlags(newCampus);
    };

    window.addEventListener('pwa-campus-changed', handleCampusChanged);
    return () => {
      window.removeEventListener('pwa-campus-changed', handleCampusChanged);
    };
  }, [fetchFlags]);

  const isFeatureEnabled = useCallback(
    (featureKey: string, defaultValue: boolean = true): boolean => {
      if (!isResolved || loadedOrganization !== organization) return false;
      if (flags[featureKey] !== undefined) {
        return Boolean(flags[featureKey]);
      }
      return defaultValue;
    },
    [flags, loadedOrganization, organization, isResolved]
  );

  const getFeatureConfig = useCallback(
    <T = any>(featureKey: string, defaultValue?: T): T => {
      if (!isResolved || loadedOrganization !== organization) return defaultValue as T;
      if (configs[featureKey] !== undefined) {
        return configs[featureKey] as T;
      }
      return defaultValue as T;
    },
    [configs, isResolved, loadedOrganization, organization]
  );

  return (
    <FeatureFlagContext.Provider
      value={{
        flags,
        configs,
        isLoading: !isResolved || isLoading,
        error: loadedOrganization === organization ? '' : error,
        isFeatureEnabled,
        getFeatureConfig,
        refreshFlags: fetchFlags
      }}
    >
      {children}
    </FeatureFlagContext.Provider>
  );
};

export function useFeatureFlags(): FeatureFlagContextType {
  return useContext(FeatureFlagContext);
}

export function useFeatureFlag(featureKey: string, defaultValue: boolean = true) {
  const { isFeatureEnabled, getFeatureConfig, isLoading } = useFeatureFlags();
  return {
    isEnabled: isFeatureEnabled(featureKey, defaultValue),
    config: getFeatureConfig(featureKey),
    isLoading
  };
}

export const FeatureGate: React.FC<{
  flag: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  defaultAllowed?: boolean;
}> = ({ flag, children, fallback = null, defaultAllowed = false }) => {
  const { isEnabled, isLoading } = useFeatureFlag(flag, defaultAllowed);
  if (isLoading) return null;
  return isEnabled ? <>{children}</> : <>{fallback}</>;
};
