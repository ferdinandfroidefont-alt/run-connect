import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { analytics } from '@/lib/analytics';

/** Envoie un « screen » à chaque navigation (si analytics activé). */
export function RouteAnalytics() {
  const location = useLocation();

  useEffect(() => {
    const path = `${location.pathname}${location.search}`;
    analytics.screen(path);
  }, [location.pathname, location.search]);

  return null;
}
