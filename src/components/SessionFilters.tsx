import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Filter, Sunrise, Sun, Moon } from "lucide-react";
import { useState } from "react";
import { ClubSelector } from "./ClubSelector";
import { cn } from "@/lib/utils";

interface Filter {
  activity_types: string[];
  session_types: string[];
  search_query: string;
  selected_date: Date;
  friends_only: boolean;
  selected_club_id: string | null;
  time_slot: 'morning' | 'afternoon' | 'evening' | null;
  level: number | null;
}

interface SessionFiltersProps {
  filters: Filter;
  onFiltersChange: (filters: Filter) => void;
  className?: string;
  onOpenChange?: (isOpen: boolean) => void;
}

const activityTypes = [
  { id: 'course', label: '🏃 Course à pied', color: 'bg-red-500' },
  { id: 'velo', label: '🚴 Vélo', color: 'bg-blue-500' },
  { id: 'natation', label: '🏊 Natation', color: 'bg-cyan-500' },
  { id: 'marche', label: '🚶 Marche', color: 'bg-green-500' },
];

const sessionTypes = [
  { id: 'footing', label: 'Footing' },
  { id: 'sortie_longue', label: 'Sortie longue' },
  { id: 'fractionne', label: 'Fractionné' },
  { id: 'competition', label: 'Compétition' },
];

// Time slot definitions for filtering sessions by time of day
const TIME_SLOTS = [
  { id: 'morning' as const, icon: Sunrise, label: 'Matin', startHour: 6, endHour: 12, color: 'text-amber-500' },
  { id: 'afternoon' as const, icon: Sun, label: 'Après-midi', startHour: 12, endHour: 18, color: 'text-yellow-500' },
  { id: 'evening' as const, icon: Moon, label: 'Soir', startHour: 18, endHour: 23, color: 'text-indigo-500' },
];

export const SessionFilters = ({ filters, onFiltersChange, className, onOpenChange }: SessionFiltersProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleToggleOpen = () => {
    const newOpen = !isOpen;
    setIsOpen(newOpen);
    onOpenChange?.(newOpen);
  };

  const toggleActivityType = (activityId: string) => {
    const newActivityTypes = filters.activity_types.includes(activityId)
      ? filters.activity_types.filter(id => id !== activityId)
      : [...filters.activity_types, activityId];
    
    onFiltersChange({ ...filters, activity_types: newActivityTypes });
  };

  const toggleSessionType = (sessionTypeId: string) => {
    const newSessionTypes = filters.session_types.includes(sessionTypeId)
      ? filters.session_types.filter(id => id !== sessionTypeId)
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
      level: null
    });
  };

  const activeFiltersCount = filters.activity_types.length + filters.session_types.length;

  const getActiveFilterLabel = () => {
    const labels = [];
    
    if (filters.friends_only) {
      labels.push("Amis uniquement");
    }
    
    if (filters.selected_club_id) {
      labels.push("Clubs sélectionnés");
    }
    
    return labels.join(" • ");
  };

  const activeFilterLabel = getActiveFilterLabel();

  return (
    <Card
      className={cn(
        isOpen ? 'w-[calc(100vw-2rem)] max-w-80' : 'w-auto',
        'relative z-50 overflow-hidden rounded-ios-md border border-border bg-card shadow-[var(--shadow-card)]',
        className
      )}
    >
      {/* Header cliquable - toujours visible */}
      <div
        onClick={handleToggleOpen}
        className="flex cursor-pointer items-center justify-between rounded-t-ios-md p-ios-2 transition-colors hover:bg-secondary/50"
      >
        {isOpen ? (
          <>
            <h3 className="font-semibold leading-none pt-0.5">Filtres</h3>
            <div className="flex items-center gap-2">
              {activeFiltersCount > 0 && (
                <Button 
                  onClick={(e) => {
                    e.stopPropagation();
                    clearAllFilters();
                  }}
                  size="sm" 
                  variant="ghost" 
                  className="text-xs h-6 px-2"
                >
                  Effacer
                </Button>
              )}
              <Filter className="h-4 w-4" />
            </div>
          </>
        ) : (
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 mt-0.5" />
            
            {/* Texte descriptif si filtres avancés actifs */}
            {activeFilterLabel && (
              <span className="text-xs font-medium text-foreground">
                {activeFilterLabel}
              </span>
            )}
            
            {/* Badge nombre de filtres (types activité + types sortie) */}
            {activeFiltersCount > 0 && (
              <Badge variant="secondary" className="h-5 px-1 text-xs">
                {activeFiltersCount}
              </Badge>
            )}
          </div>
        )}
      </div>

      {/* Contenu qui apparaît au clic */}
      {isOpen && (
        <CardContent className="p-4 pt-0 max-h-[60dvh] overflow-y-auto">
          <Separator className="mb-4" />

          <div className="space-y-4">
            {/* Activity Types */}
            <div>
              <h4 className="text-sm font-medium mb-2">Type d'activité</h4>
              <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
                {activityTypes.map((activity) => (
                  <Button
                    key={activity.id}
                    onClick={() => toggleActivityType(activity.id)}
                    variant={filters.activity_types.includes(activity.id) ? "default" : "outline"}
                    size="sm"
                    className="justify-start text-xs h-8"
                  >
                    <div className={`w-2 h-2 rounded-full mr-2 ${activity.color}`} />
                    {activity.label}
                  </Button>
                ))}
              </div>
            </div>

            <Separator />

            {/* Session Types */}
            <div>
              <h4 className="text-sm font-medium mb-2">Type de sortie</h4>
              <div className="grid grid-cols-1 gap-2">
                {sessionTypes.map((sessionType) => (
                  <Button
                    key={sessionType.id}
                    onClick={() => toggleSessionType(sessionType.id)}
                    variant={filters.session_types.includes(sessionType.id) ? "default" : "outline"}
                    size="sm"
                    className="justify-start text-xs h-8"
                  >
                    {sessionType.label}
                  </Button>
                ))}
              </div>
            </div>

            <Separator />

            {/* Time Slot Filters */}
            <div>
              <h4 className="text-sm font-medium mb-2">Créneau horaire</h4>
              <div className="grid grid-cols-3 gap-2">
                {TIME_SLOTS.map((slot) => (
                  <Button
                    key={slot.id}
                    onClick={() => onFiltersChange({ 
                      ...filters, 
                      time_slot: filters.time_slot === slot.id ? null : slot.id 
                    })}
                    variant={filters.time_slot === slot.id ? "default" : "outline"}
                    size="sm"
                    className="flex flex-col items-center justify-center h-14 text-xs gap-0.5"
                  >
                    <slot.icon className={`h-5 w-5 ${filters.time_slot === slot.id ? '' : slot.color}`} />
                    <span className="text-[10px]">{slot.label}</span>
                  </Button>
                ))}
              </div>
            </div>

            <Separator />

            {/* Filtres avancés */}
            <div>
              <h4 className="text-sm font-medium mb-2">Filtres avancés</h4>
              
              {/* Bouton Amis uniquement */}
              <Button
                onClick={() => onFiltersChange({ ...filters, friends_only: !filters.friends_only })}
                variant={filters.friends_only ? "default" : "outline"}
                size="sm"
                className="justify-start text-xs h-8 w-full mb-2"
              >
                👥 Amis uniquement
              </Button>
              
              {/* Club Selector */}
              <ClubSelector
                triggerMode="filterRow"
                selectedClubId={filters.selected_club_id}
                onClubSelect={(clubId) => onFiltersChange({ ...filters, selected_club_id: clubId })}
              />
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
};