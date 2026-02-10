import { useRef } from 'react';
import { MapPin } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { ActivityIcon } from '@/lib/activityIcons';
import { ACTIVITY_TYPES } from '@/hooks/useDiscoverFeed';
import { cn } from '@/lib/utils';

interface DiscoverFiltersProps {
  maxDistance: number;
  setMaxDistance: (distance: number) => void;
  selectedActivities: string[];
  toggleActivity: (activity: string) => void;
  toggleAllActivities: () => void;
}

export const DiscoverFilters = ({
  maxDistance,
  setMaxDistance,
  selectedActivities,
  toggleActivity,
  toggleAllActivities
}: DiscoverFiltersProps) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  return (
    <div className="bg-card border-b border-border">
      {/* Activity Filter Pills */}
      <div className="px-4 py-3 border-b border-border">
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
                  "flex items-center gap-2 px-3 py-2 rounded-full border text-[13px] font-medium whitespace-nowrap transition-colors",
                  selectedActivities.includes(activity.value)
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card text-muted-foreground border-border"
                )}
              >
                <ActivityIcon activityType={activity.value} size="sm" />
                <span>{activity.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Distance Filter */}
      <div className="px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <span className="text-[15px] font-medium">Distance max</span>
          </div>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              value={maxDistance}
              onChange={(e) => setMaxDistance(parseInt(e.target.value) || 10)}
              className="w-16 h-9 text-[15px] text-right bg-secondary border-border rounded-[8px]"
              min="1"
              max="100"
            />
            <span className="text-[15px] text-muted-foreground">km</span>
          </div>
        </div>
      </div>
    </div>
  );
};
