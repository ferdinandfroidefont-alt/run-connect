import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Filter, Sunrise, Sun, Moon } from "lucide-react";
import { useState } from "react";
import { ClubSelector } from "./ClubSelector";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { MapIosColoredFab } from "@/components/map/MapIosColoredFab";
import { cn } from "@/lib/utils";

interface Filter {
  activity_types: string[];
  session_types: string[];
  search_query: string;
  selected_date: Date;
  friends_only: boolean;
  selected_club_id: string | null;
  time_slot: "morning" | "afternoon" | "evening" | null;
  level: number | null;
}

interface SessionFiltersProps {
  filters: Filter;
  onFiltersChange: (filters: Filter) => void;
  className?: string;
  onOpenChange?: (isOpen: boolean) => void;
}

const activityTypes = [
  { id: "course", label: "🏃 Course à pied", color: "bg-red-500" },
  { id: "velo", label: "🚴 Vélo", color: "bg-blue-500" },
  { id: "natation", label: "🏊 Natation", color: "bg-cyan-500" },
  { id: "marche", label: "🚶 Marche", color: "bg-green-500" },
];

const sessionTypes = [
  { id: "footing", label: "Footing" },
  { id: "sortie_longue", label: "Sortie longue" },
  { id: "fractionne", label: "Fractionné" },
  { id: "competition", label: "Compétition" },
];

const TIME_SLOTS = [
  { id: "morning" as const, icon: Sunrise, label: "Matin", startHour: 6, endHour: 12, color: "text-amber-500" },
  { id: "afternoon" as const, icon: Sun, label: "Après-midi", startHour: 12, endHour: 18, color: "text-yellow-500" },
  { id: "evening" as const, icon: Moon, label: "Soir", startHour: 18, endHour: 23, color: "text-indigo-500" },
];

export const SessionFilters = ({ filters, onFiltersChange, className, onOpenChange }: SessionFiltersProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const setOpen = (v: boolean) => {
    setIsOpen(v);
    onOpenChange?.(v);
  };

  const toggleActivityType = (activityId: string) => {
    const newActivityTypes = filters.activity_types.includes(activityId)
      ? filters.activity_types.filter((id) => id !== activityId)
      : [...filters.activity_types, activityId];

    onFiltersChange({ ...filters, activity_types: newActivityTypes });
  };

  const toggleSessionType = (sessionTypeId: string) => {
    const newSessionTypes = filters.session_types.includes(sessionTypeId)
      ? filters.session_types.filter((id) => id !== sessionTypeId)
      : [...filters.session_types, sessionTypeId];

    onFiltersChange({ ...filters, session_types: newSessionTypes });
  };

  const clearAllFilters = () => {
    onFiltersChange({
      activity_types: [],
      session_types: [],
      search_query: filters.search_query,
      selected_date: filters.selected_date,
      friends_only: false,
      selected_club_id: null,
      time_slot: null,
      level: null,
    });
  };

  const activeFiltersCount = filters.activity_types.length + filters.session_types.length;

  const advancedActive =
    !!filters.friends_only || !!filters.selected_club_id || !!filters.time_slot;

  return (
    <Popover open={isOpen} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <MapIosColoredFab
          tone="purple"
          title="Filtres des séances"
          active={activeFiltersCount > 0 || advancedActive}
          badgeCount={activeFiltersCount}
          aria-expanded={isOpen}
          className={cn(className)}
        >
          <Filter className="h-[18px] w-[18px]" strokeWidth={2.25} />
        </MapIosColoredFab>
      </PopoverTrigger>
      <PopoverContent
        className="max-h-[min(60dvh,520px)] w-[calc(100vw-2rem)] max-w-80 overflow-y-auto p-4 ios-surface"
        align="end"
        side="left"
        sideOffset={10}
        collisionPadding={12}
      >
        <div className="mb-3 flex items-center justify-between gap-2">
          <h3 className="text-[15px] font-semibold leading-tight">Filtres</h3>
          {activeFiltersCount > 0 && (
            <Button variant="ghost" size="sm" className="h-7 shrink-0 text-xs" onClick={clearAllFilters}>
              Effacer
            </Button>
          )}
        </div>
        <Separator className="mb-4" />

        <div className="space-y-4">
          <div>
            <h4 className="mb-2 text-sm font-medium">Type d&apos;activité</h4>
            <div className="grid max-h-64 grid-cols-2 gap-2 overflow-y-auto">
              {activityTypes.map((activity) => (
                <Button
                  key={activity.id}
                  onClick={() => toggleActivityType(activity.id)}
                  variant={filters.activity_types.includes(activity.id) ? "default" : "outline"}
                  size="sm"
                  className="h-8 justify-start text-xs"
                >
                  <div className={`mr-2 h-2 w-2 rounded-full ${activity.color}`} />
                  {activity.label}
                </Button>
              ))}
            </div>
          </div>

          <Separator />

          <div>
            <h4 className="mb-2 text-sm font-medium">Type de sortie</h4>
            <div className="grid grid-cols-1 gap-2">
              {sessionTypes.map((sessionType) => (
                <Button
                  key={sessionType.id}
                  onClick={() => toggleSessionType(sessionType.id)}
                  variant={filters.session_types.includes(sessionType.id) ? "default" : "outline"}
                  size="sm"
                  className="h-8 justify-start text-xs"
                >
                  {sessionType.label}
                </Button>
              ))}
            </div>
          </div>

          <Separator />

          <div>
            <h4 className="mb-2 text-sm font-medium">Créneau horaire</h4>
            <div className="grid grid-cols-3 gap-2">
              {TIME_SLOTS.map((slot) => (
                <Button
                  key={slot.id}
                  onClick={() =>
                    onFiltersChange({
                      ...filters,
                      time_slot: filters.time_slot === slot.id ? null : slot.id,
                    })
                  }
                  variant={filters.time_slot === slot.id ? "default" : "outline"}
                  size="sm"
                  className="flex h-14 flex-col items-center justify-center gap-0.5 text-xs"
                >
                  <slot.icon className={`h-5 w-5 ${filters.time_slot === slot.id ? "" : slot.color}`} />
                  <span className="text-[10px]">{slot.label}</span>
                </Button>
              ))}
            </div>
          </div>

          <Separator />

          <div>
            <h4 className="mb-2 text-sm font-medium">Filtres avancés</h4>
            <Button
              onClick={() => onFiltersChange({ ...filters, friends_only: !filters.friends_only })}
              variant={filters.friends_only ? "default" : "outline"}
              size="sm"
              className="mb-2 h-8 w-full justify-start text-xs"
            >
              Amis uniquement
            </Button>
            <ClubSelector
              triggerMode="filterRow"
              selectedClubId={filters.selected_club_id}
              onClubSelect={(clubId) => onFiltersChange({ ...filters, selected_club_id: clubId })}
            />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};
