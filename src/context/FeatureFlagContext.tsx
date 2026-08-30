import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useBranding } from './BrandingContext';

const API_URL = import.meta.env.VITE_API_URL || 'https://usl72lj2m5.execute-api.us-east-2.amazonaws.com';

export interface FeatureFlagContextType {
  flags: Record<string, boolean>;
  configs: Record<string, any>;
  isLoading: boolean;
  isFeatureEnabled: (featureKey: string, defaultValue?: boolean) => boolean;
  getFeatureConfig: <T = any>(featureKey: string, defaultValue?: T) => T;
}

const FeatureFlagContext = createContext<FeatureFlagContextType>({
  flags: {},
  configs: {},
  isLoading: true,
  isFeatureEnabled: () => true,
  getFeatureConfig: () => null as any
});

export const FeatureFlagProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { branding } = useBranding();
  const [flags, setFlags] = useState<Record<string, boolean>>({});
  const [configs, setConfigs] = useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchFlags = useCallback(async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      // Resolve org identifier
      const orgParam = branding.pwa_slug || 'org_default';
      params.append('organization_id', orgParam);
      params.append('environment', 'production');

      const res = await fetch(`${API_URL}/feature-flags?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setFlags(data.flags || {});
        setConfigs(data.configs || {});
      }
    } catch (err) {
      console.warn('Erro ao carregar feature flags no PWA:', err);
    } finally {
      setIsLoading(false);
    }
  }, [branding.pwa_slug]);

  useEffect(() => {
    fetchFlags();
  }, [fetchFlags]);

  const isFeatureEnabled = useCallback(
    (featureKey: string, defaultValue: boolean = true): boolean => {
      if (flags[featureKey] !== undefined) {
        return Boolean(flags[featureKey]);
      }
      return defaultValue;
    },
    [flags]
  );

  const getFeatureConfig = useCallback(
    <T = any>(featureKey: string, defaultValue?: T): T => {
      if (configs[featureKey] !== undefined) {
        return configs[featureKey] as T;
      }
      return defaultValue as T;
    },
    [configs]
  );

  return (
    <FeatureFlagContext.Provider
      value={{
        flags,
        configs,
        isLoading,
        isFeatureEnabled,
        getFeatureConfig
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
}> = ({ flag, children, fallback = null, defaultAllowed = true }) => {
  const { isEnabled, isLoading } = useFeatureFlag(flag, defaultAllowed);
  if (isLoading) return null;
  return isEnabled ? <>{children}</> : <>{fallback}</>;
};
