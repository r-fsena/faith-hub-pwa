/**
 * SWR (Stale-While-Revalidate) & In-Memory Fast Cache Engine
 * Permite carregamento instantâneo em 0ms para telas e consultas do PWA V2.
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const memoryCache = new Map<string, CacheEntry<any>>();

// Duração padrão do cache em memória (5 minutos)
const DEFAULT_TTL_MS = 5 * 60 * 1000;

export async function swrFetch<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: { ttlMs?: number; persistLocal?: boolean } = {}
): Promise<{ data: T; isFromCache: boolean }> {
  const ttl = options.ttlMs ?? DEFAULT_TTL_MS;
  const now = Date.now();

  // 1. Tenta recuperar do cache em memória
  const inMemory = memoryCache.get(key);
  if (inMemory && now - inMemory.timestamp < ttl) {
    // Revalidação silenciosa em background se tiver passado mais da metade do TTL
    if (now - inMemory.timestamp > ttl / 2) {
      setTimeout(() => {
        fetcher().then(freshData => {
          if (freshData) {
            memoryCache.set(key, { data: freshData, timestamp: Date.now() });
            if (options.persistLocal) {
              try {
                localStorage.setItem(`v2_swr_${key}`, JSON.stringify({ data: freshData, timestamp: Date.now() }));
              } catch {}
            }
          }
        }).catch(() => {});
      }, 50);
    }
    return { data: inMemory.data, isFromCache: true };
  }

  // 2. Tenta recuperar do localStorage para primeiro carregamento após reload
  if (options.persistLocal && typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem(`v2_swr_${key}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (now - parsed.timestamp < ttl * 3) {
          memoryCache.set(key, { data: parsed.data, timestamp: parsed.timestamp });
          // Dispara revalidação imediata
          fetcher().then(freshData => {
            if (freshData) {
              memoryCache.set(key, { data: freshData, timestamp: Date.now() });
              localStorage.setItem(`v2_swr_${key}`, JSON.stringify({ data: freshData, timestamp: Date.now() }));
            }
          }).catch(() => {});
          return { data: parsed.data, isFromCache: true };
        }
      }
    } catch {}
  }

  // 3. Busca fresca na rede
  const freshData = await fetcher();
  if (freshData) {
    memoryCache.set(key, { data: freshData, timestamp: Date.now() });
    if (options.persistLocal && typeof window !== 'undefined') {
      try {
        localStorage.setItem(`v2_swr_${key}`, JSON.stringify({ data: freshData, timestamp: Date.now() }));
      } catch {}
    }
  }

  return { data: freshData, isFromCache: false };
}

/**
 * Prefetcher de dados essenciais em momento ocioso do navegador
 */
export function prefetchV2Data(orgId: string, campusId?: string) {
  if (typeof window === 'undefined') return;

  const runPrefetch = async () => {
    try {
      const { fetchDevotionals, fetchEvents, fetchCampuses, fetchPdvProducts } = await import('../../services/api');
      
      // Carrega em background silenciosamente
      fetchCampuses(orgId).catch(() => {});
      fetchDevotionals(orgId, campusId).catch(() => {});
      fetchEvents(orgId, campusId).catch(() => {});
      fetchPdvProducts(orgId, campusId).catch(() => {});
    } catch (e) {
      // Falhas silenciosas em prefetch
    }
  };

  if ('requestIdleCallback' in window) {
    (window as any).requestIdleCallback(() => runPrefetch(), { timeout: 2000 });
  } else {
    setTimeout(runPrefetch, 800);
  }
}
