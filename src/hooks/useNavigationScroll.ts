import { useCallback, useLayoutEffect, useState } from 'react';

/** Run after the destination has rendered, including when the active tab is tapped again. */
export function useNavigationScroll() {
  const [request, setRequest] = useState(0);
  useLayoutEffect(() => {
    if (!request) return;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, left: 0, behavior: reducedMotion ? 'instant' : 'smooth' });
  }, [request]);
  return useCallback(() => setRequest(previous => previous + 1), []);
}
