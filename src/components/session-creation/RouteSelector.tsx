import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { EmojiBadge } from '@/components/apple';

interface RouteData {
  id: string;
  name: string;
  total_distance: number | null;
  total_elevation_gain: number | null;
  description: string | null;
}

interface RouteSelectorProps {
  selectedRouteId: string | null;
  onRouteSelect: (route: RouteData | null) => void;
  onAutoFill?: (data: { distance_km: string; elevation_gain: string }) => void;
  /** Intègre le sélecteur dans un bloc continu (pas de carte/bord externe dédiée). */
  embedded?: boolean;
}

export const RouteSelector: React.FC<RouteSelectorProps> = ({
  selectedRouteId,
  onRouteSelect,
  onAutoFill,
  embedded = false,
}) => {
  const { user } = useAuth();
  const [routes, setRoutes] = useState<RouteData[]>([]);
  const [loading, setLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);
  const selectedRoute = routes.find(r => r.id === selectedRouteId);

  useEffect(() => {
    if (user) {
      loadRoutes();
    }
  }, [user]);

  const loadRoutes = async () => {
    try {
      const { data, error } = await supabase
        .from('routes')
        .select('id, name, total_distance, total_elevation_gain, description')
        .eq('created_by', user?.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setRoutes(data || []);
    } catch (error) {
      console.error('Error loading routes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (route: RouteData) => {
    onRouteSelect(route);
    setIsExpanded(false);
    
    // Auto-fill distance and elevation
    if (onAutoFill && (route.total_distance || route.total_elevation_gain)) {
      onAutoFill({
        distance_km: route.total_distance ? (route.total_distance / 1000).toFixed(1) : '',
        elevation_gain: route.total_elevation_gain?.toString() || '',
      });
    }
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onRouteSelect(null);
  };

  const outerCard = cn(
    embedded ? 'rounded-none border-0 bg-transparent p-0' : 'rounded-xl border border-border bg-card p-4',
  );

  if (loading) {
    return (
      <div className={outerCard}>
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 shrink-0 animate-pulse rounded-[7px] bg-secondary" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-24 animate-pulse rounded bg-secondary" />
            <div className="h-3 w-32 animate-pulse rounded bg-secondary" />
          </div>
        </div>
      </div>
    );
  }

  if (routes.length === 0) {
    return (
      <div className={outerCard}>
        <div className="flex items-center gap-3">
          <EmojiBadge emoji="🗺️" className="bg-[#8E8E93]" />
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-medium text-muted-foreground">Aucun itinéraire</p>
            <p className="text-[13px] text-muted-foreground/80">Créez un itinéraire sur la carte</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn(!embedded && 'space-y-2')}>
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          embedded
            ? 'min-h-[48px] cursor-pointer px-4 py-3 transition-all active:bg-secondary/55'
            : 'cursor-pointer p-2.5 transition-all active:bg-secondary/50',
          embedded
            ? 'rounded-lg bg-secondary/35 ring-inset ring-1 ring-border/40 hover:bg-secondary/45'
            : 'rounded-xl border border-border/70 bg-card hover:bg-muted/40',
          isExpanded && embedded && 'bg-secondary/55 ring-primary/35',
          isExpanded && !embedded && 'ring-2 ring-primary/30'
        )}
      >
        {selectedRoute ? (
          <div className="flex items-center gap-3">
            <EmojiBadge emoji="🗺️" className="bg-[#0A66D0]" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[17px] font-normal tracking-[-0.4px] text-foreground">
                {selectedRoute.name}
              </p>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[13px] text-muted-foreground">
                {selectedRoute.total_distance && (
                  <span>{(selectedRoute.total_distance / 1000).toFixed(1)} km</span>
                )}
                {selectedRoute.total_elevation_gain && (
                  <span>D+ {selectedRoute.total_elevation_gain} m</span>
                )}
                <span className="text-primary">✨ Auto</span>
              </div>
            </div>
            <button
              onClick={handleClear}
              className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <EmojiBadge emoji="📍" className="bg-[#5E5CE6]" />
            <div className="min-w-0 flex-1">
              <p className="text-[17px] font-normal tracking-[-0.4px] text-foreground">
                Choisir un itinéraire
              </p>
              <p className="text-[13px] text-muted-foreground">Auto-remplir distance et D+</p>
            </div>
            <ChevronRight className={cn(
              "w-4 h-4 text-muted-foreground transition-transform",
              isExpanded && "rotate-90"
            )} />
          </div>
        )}
      </div>

      {/* Routes List */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="max-h-48 space-y-0 overflow-y-auto pt-1">
              {routes.map((route) => (
                <button
                  key={route.id}
                  type="button"
                  onClick={() => handleSelect(route)}
                  className={cn(
                    'w-full text-left transition-colors',
                    embedded
                      ? 'flex items-center gap-3 border-border/55 border-t px-2 py-2.5 first:border-t-0 first:pt-0 hover:bg-secondary/40'
                      : 'flex items-center gap-3 rounded-lg p-2.5',
                    !embedded &&
                      (selectedRouteId === route.id
                        ? 'border border-primary/30 bg-primary/10 hover:bg-primary/15'
                        : 'bg-secondary hover:bg-secondary/80'),
                    embedded &&
                      (selectedRouteId === route.id
                        ? 'bg-primary/12'
                        : 'bg-transparent')
                  )}
                >
                  {selectedRouteId === route.id ? (
                    <EmojiBadge emoji="✓" className="bg-primary text-primary-foreground" />
                  ) : (
                    <EmojiBadge emoji="🗺️" className="bg-[#8E8E93]" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[15px] font-medium">{route.name}</p>
                    <div className="flex items-center gap-2 text-[13px] text-muted-foreground">
                      {route.total_distance && (
                        <span>{(route.total_distance / 1000).toFixed(1)} km</span>
                      )}
                      {route.total_elevation_gain && (
                        <span>D+ {route.total_elevation_gain}m</span>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
