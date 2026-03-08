import { useRef, useState } from 'react';
import { MapPin, Route, Star, ChevronDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { ActivityIcon } from '@/lib/activityIcons';
import { ACTIVITY_TYPES } from '@/hooks/useDiscoverFeed';
import { cn } from '@/lib/utils';

interface RoutesFeedFiltersProps {
  maxProximity: number;
  setMaxProximity: (d: number) => void;
  maxRouteDistance: number | null;
  setMaxRouteDistance: (d: number | null) => void;
  minRating: number;
  setMinRating: (r: number) => void;
  selectedActivities: string[];
  toggleActivity: (activity: string) => void;
  toggleAllActivities: () => void;
}

export const RoutesFeedFilters = ({
  maxProximity,
  setMaxProximity,
  maxRouteDistance,
  setMaxRouteDistance,
  minRating,
  setMinRating,
  selectedActivities,
  toggleActivity,
  toggleAllActivities
}: RoutesFeedFiltersProps) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(false);

  // Summary of active filters
  const activeCount = [
    selectedActivities.length < ACTIVITY_TYPES.length,
    maxRouteDistance !== null,
    minRating > 0,
  ].filter(Boolean).length;

  return (
    <div className="bg-card border-b border-border">
      {/* Toggle bar */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-2.5"
      >
        <div className="flex items-center gap-2">
          <span className="text-[14px] font-medium text-foreground">Filtres</span>
          {activeCount > 0 && (
            <span className="text-[11px] font-semibold bg-primary text-primary-foreground rounded-full h-5 min-w-5 flex items-center justify-center px-1.5">
              {activeCount}
            </span>
          )}
        </div>
        <ChevronDown className={cn(
          "h-4 w-4 text-muted-foreground transition-transform duration-200",
          expanded && "rotate-180"
        )} />
      </button>

      {expanded && (
        <>
          {/* Sports pills */}
          <div className="px-4 py-3 border-t border-border">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[13px] font-medium text-muted-foreground uppercase tracking-wide">
                Sports
              </span>
              <button
                onClick={toggleAllActivities}
                className="text-[13px] font-medium text-primary"
              >
                {selectedActivities.length === ACTIVITY_TYPES.length
                  ? "Désélectionner tout"
                  : "Tout sélectionner"}
              </button>
            </div>

            <div
              ref={scrollContainerRef}
              className="overflow-x-auto scrollbar-hide -mx-4 px-4"
            >
              <div className="flex gap-2 pb-1">
                {ACTIVITY_TYPES.map(activity => (
                  <button
                    key={activity.value}
                    onClick={() => toggleActivity(activity.value)}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2.5 rounded-full text-[13px] font-semibold whitespace-nowrap transition-all",
                      selectedActivities.includes(activity.value)
                        ? "bg-primary text-primary-foreground shadow-sm shadow-primary/25"
                        : "bg-primary/8 text-primary"
                    )}
                  >
                    <ActivityIcon activityType={activity.value} size="sm" />
                    <span>{activity.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Proximity filter */}
          <div className="px-4 py-3 border-t border-border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span className="text-[15px] font-medium">Proximité</span>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  value={maxProximity}
                  onChange={(e) => setMaxProximity(parseInt(e.target.value) || 10)}
                  className="w-16 h-9 text-[15px] text-right bg-secondary border-border rounded-[8px]"
                  min="1"
                  max="200"
                />
                <span className="text-[13px] text-muted-foreground">km</span>
              </div>
            </div>
            <p className="text-[12px] text-muted-foreground mt-1">
              Distance entre vous et le point le plus proche de l'itinéraire
            </p>
          </div>

          {/* Route distance filter */}
          <div className="px-4 py-3 border-t border-border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Route className="h-4 w-4 text-muted-foreground" />
                <span className="text-[15px] font-medium">Longueur du parcours</span>
              </div>
              <div className="flex items-center gap-2">
                {maxRouteDistance ? (
                  <>
                    <Input
                      type="number"
                      value={maxRouteDistance}
                      onChange={(e) => {
                        const v = parseInt(e.target.value);
                        setMaxRouteDistance(v > 0 ? v : null);
                      }}
                      className="w-16 h-9 text-[15px] text-right bg-secondary border-border rounded-[8px]"
                      min="1"
                      max="500"
                    />
                    <span className="text-[13px] text-muted-foreground">km</span>
                    <button
                      onClick={() => setMaxRouteDistance(null)}
                      className="text-[12px] text-primary ml-1"
                    >
                      ✕
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setMaxRouteDistance(50)}
                    className="text-[13px] font-medium text-primary bg-primary/10 px-3 py-1.5 rounded-full"
                  >
                    Filtrer
                  </button>
                )}
              </div>
            </div>
            <p className="text-[12px] text-muted-foreground mt-1">
              Distance totale de l'itinéraire
            </p>
          </div>

          {/* Rating filter */}
          <div className="px-4 py-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Star className="h-4 w-4 text-muted-foreground" />
                <span className="text-[15px] font-medium">Note minimum</span>
              </div>
              <span className="text-[15px] font-semibold text-foreground">
                {minRating > 0 ? `${minRating}+` : 'Toutes'}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map(star => (
                  <button
                    key={star}
                    onClick={() => setMinRating(minRating === star ? 0 : star)}
                    className="p-0.5"
                  >
                    <Star
                      className={cn(
                        "h-5 w-5 transition-colors",
                        star <= minRating
                          ? "fill-yellow-400 text-yellow-400"
                          : "text-muted-foreground/30"
                      )}
                    />
                  </button>
                ))}
              </div>
              {minRating > 0 && (
                <button
                  onClick={() => setMinRating(0)}
                  className="text-[12px] text-primary"
                >
                  Réinitialiser
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
