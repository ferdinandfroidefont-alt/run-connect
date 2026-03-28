import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export type MyRouteRow = {
  id: string;
  name: string;
  description: string | null;
  total_distance: number | null;
  total_elevation_gain: number | null;
  total_elevation_loss: number | null;
  min_elevation: number | null;
  max_elevation: number | null;
  created_at: string;
  coordinates: unknown;
  is_public?: boolean;
};

export function useMyRoutesList() {
  const { user } = useAuth();
  const [routes, setRoutes] = useState<MyRouteRow[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!user) {
      setRoutes([]);
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('routes')
        .select('*')
        .eq('created_by', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setRoutes((data || []) as MyRouteRow[]);
    } catch (e) {
      console.error('useMyRoutesList:', e);
      setRoutes([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { routes, loading, refresh };
}
