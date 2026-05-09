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
}

export const RouteSelector: React.FC<RouteSelectorProps> = ({
  selectedRouteId,
  onRouteSelect,
  onAutoFill,
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

  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-card p-4">
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
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center gap-3">
          <EmojiBadge emoji="🗺️" className="bg-[#8E8E93]" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-muted-foreground">Aucun itinéraire</p>
            <p className="text-xs text-muted-foreground/70">Créez un itinéraire sur la carte</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          "rounded-xl bg-card border border-border/70 p-2.5 cursor-pointer transition-all",
          isExpanded && "ring-2 ring-primary/30"
        )}
      >
        {selectedRoute ? (
          <div className="flex items-center gap-3">
            <EmojiBadge emoji="🗺️" className="bg-[#0A66D0]" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[14px] font-medium">{selectedRoute.name}</p>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground">
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
            <EmojiBadge emoji="📍" className="bg-[#FF9500]" />
            <div className="min-w-0 flex-1">
              <p className="text-[14px] font-medium">Choisir un itinéraire</p>
              <p className="text-[11px] text-muted-foreground">Auto-remplir distance et D+</p>
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
            <div className="space-y-1 pt-1 max-h-48 overflow-y-auto">
              {routes.map((route) => (
                <button
                  key={route.id}
                  type="button"
                  onClick={() => handleSelect(route)}
                  className={cn(
                    "w-full flex items-center gap-3 p-2.5 rounded-lg transition-colors text-left",
                    selectedRouteId === route.id
                      ? "bg-primary/10 border border-primary/30"
                      : "bg-secondary hover:bg-secondary/80"
                  )}
                >
                  {selectedRouteId === route.id ? (
                    <EmojiBadge emoji="✓" className="bg-primary text-primary-foreground" />
                  ) : (
                    <EmojiBadge emoji="🗺️" className="bg-[#8E8E93]" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{route.name}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
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
