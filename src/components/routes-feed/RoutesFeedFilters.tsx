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

  const summaryParts: string[] = [];
  summaryParts.push(`≤ ${maxProximity} km`);
  if (selectedActivities.length < ACTIVITY_TYPES.length) {
    summaryParts.push(`${selectedActivities.length}/${ACTIVITY_TYPES.length} sports`);
  }
  if (maxRouteDistance !== null) {
    summaryParts.push(`parcours ≤ ${maxRouteDistance} km`);
  }
  if (minRating > 0) {
    summaryParts.push(`note ${minRating}+`);
  }
  const collapsedSummary = summaryParts.join(' · ');

  return (
    <div className="ios-card rounded-ios-lg border border-border overflow-hidden shadow-sm">
      {/* Toggle bar */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-ios-4 py-ios-3 active:bg-secondary/60 transition-colors"
      >
        <div className="flex items-center gap-ios-2">
          <span className="text-ios-subheadline font-semibold text-foreground">Filtres</span>
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

      {!expanded && (
        <div className="px-ios-4 pb-ios-3 -mt-ios-1">
          <p className="text-ios-footnote text-muted-foreground leading-snug line-clamp-2">
            {activeCount === 0
              ? `Rayon ${maxProximity} km · tous les sports · parcours sans limite`
              : `${activeCount} réglage${activeCount > 1 ? 's' : ''} actif${activeCount > 1 ? 's' : ''} — ${collapsedSummary}`}
          </p>
        </div>
      )}

      {expanded && (
        <>
          {/* Sports pills */}
          <div className="px-ios-4 py-ios-3 border-t border-border/60">
            <div className="flex items-center justify-between mb-ios-3">
              <span className="text-ios-footnote font-semibold text-muted-foreground uppercase tracking-wide">
                Sports
              </span>
              <button
                type="button"
                onClick={toggleAllActivities}
                className="text-ios-footnote font-medium text-primary"
              >
                {selectedActivities.length === ACTIVITY_TYPES.length
                  ? "Désélectionner tout"
                  : "Tout sélectionner"}
              </button>
            </div>

            <div
              ref={scrollContainerRef}
              className="overflow-x-auto scrollbar-hide -mx-ios-4 px-ios-4"
            >
              <div className="flex gap-ios-2 pb-ios-1">
                {ACTIVITY_TYPES.map(activity => (
                  <button
                    type="button"
                    key={activity.value}
                    onClick={() => toggleActivity(activity.value)}
                    className={cn(
                      "flex items-center gap-ios-2 px-ios-4 py-ios-2 rounded-full text-ios-footnote font-semibold whitespace-nowrap transition-all min-h-[36px]",
                      selectedActivities.includes(activity.value)
                        ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20"
                        : "bg-secondary text-foreground"
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
          <div className="px-ios-4 py-ios-3 border-t border-border/60">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-ios-2">
                <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-ios-headline font-medium">Proximité</span>
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
                <span className="text-ios-footnote text-muted-foreground">km</span>
              </div>
            </div>
            <p className="text-ios-caption1 text-muted-foreground mt-ios-1">
              Distance entre vous et le point le plus proche de l'itinéraire
            </p>
          </div>

          {/* Route distance filter */}
          <div className="px-ios-4 py-ios-3 border-t border-border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-ios-2 min-w-0">
                <Route className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-ios-headline font-medium truncate">Longueur du parcours</span>
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
                    <span className="text-ios-footnote text-muted-foreground">km</span>
                    <button
                      type="button"
                      onClick={() => setMaxRouteDistance(null)}
                      className="text-ios-caption1 text-primary ml-ios-1"
                    >
                      ✕
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => setMaxRouteDistance(50)}
                    className="text-ios-footnote font-medium text-primary bg-primary/10 px-ios-3 py-ios-1.5 rounded-full"
                  >
                    Filtrer
                  </button>
                )}
              </div>
            </div>
            <p className="text-ios-caption1 text-muted-foreground mt-ios-1">
              Distance totale de l'itinéraire
            </p>
          </div>

          {/* Rating filter */}
          <div className="px-ios-4 py-ios-3 border-t border-border/60">
            <div className="flex items-center justify-between mb-ios-2">
              <div className="flex items-center gap-ios-2">
                <Star className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-ios-headline font-medium">Note minimum</span>
              </div>
              <span className="text-ios-headline font-semibold text-foreground">
                {minRating > 0 ? `${minRating}+` : 'Toutes'}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map(star => (
                  <button
                    type="button"
                    key={star}
                    onClick={() => setMinRating(minRating === star ? 0 : star)}
                    className="p-0.5 min-w-[36px] min-h-[36px] flex items-center justify-center"
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
                  type="button"
                  onClick={() => setMinRating(0)}
                  className="text-ios-caption1 text-primary font-medium"
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
