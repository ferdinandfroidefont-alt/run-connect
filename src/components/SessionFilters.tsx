import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { SlidersHorizontal, X } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface Filter {
  activity_types: string[];
  session_types: string[];
  search_query: string;
  selected_date: Date;
  friends_only: boolean;
  selected_club_id: string | null;
}

interface SessionFiltersProps {
  filters: Filter;
  onFiltersChange: (filters: Filter) => void;
}

const activityTypes = [
  { id: 'course', label: 'Course', emoji: '🏃' },
  { id: 'velo', label: 'Vélo', emoji: '🚴' },
  { id: 'natation', label: 'Natation', emoji: '🏊' },
  { id: 'marche', label: 'Marche', emoji: '🚶' },
];

const sessionTypes = [
  { id: 'footing', label: 'Footing' },
  { id: 'sortie_longue', label: 'Sortie longue' },
  { id: 'fractionne', label: 'Fractionné' },
  { id: 'competition', label: 'Compétition' },
];

export const SessionFilters = ({ filters, onFiltersChange }: SessionFiltersProps) => {
  const [isOpen, setIsOpen] = useState(false);

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
      selected_club_id: null
    });
  };

  const activeFiltersCount = filters.activity_types.length + filters.session_types.length + (filters.friends_only ? 1 : 0);

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <button className="relative w-12 h-12 bg-card rounded-2xl shadow-medium flex items-center justify-center active:scale-95 transition-transform">
          <SlidersHorizontal size={20} className="text-foreground" />
          {activeFiltersCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-primary-foreground text-xs font-semibold rounded-full flex items-center justify-center">
              {activeFiltersCount}
            </span>
          )}
        </button>
      </SheetTrigger>
      
      <SheetContent side="bottom" className="h-auto max-h-[70vh] rounded-t-3xl px-6 pb-8">
        <SheetHeader className="pb-6">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-xl font-semibold">Filtres</SheetTitle>
            {activeFiltersCount > 0 && (
              <Button 
                onClick={clearAllFilters}
                variant="ghost" 
                size="sm"
                className="text-primary"
              >
                Effacer tout
              </Button>
            )}
          </div>
        </SheetHeader>

        <div className="space-y-8">
          {/* Activity Types */}
          <div>
            <h4 className="text-sm font-medium text-muted-foreground mb-4">Activité</h4>
            <div className="flex flex-wrap gap-3">
              {activityTypes.map((activity) => (
                <button
                  key={activity.id}
                  onClick={() => toggleActivityType(activity.id)}
                  className={cn(
                    "px-4 py-2.5 rounded-full text-sm font-medium transition-colors",
                    filters.activity_types.includes(activity.id)
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-foreground"
                  )}
                >
                  {activity.emoji} {activity.label}
                </button>
              ))}
            </div>
          </div>

          {/* Session Types */}
          <div>
            <h4 className="text-sm font-medium text-muted-foreground mb-4">Type de séance</h4>
            <div className="flex flex-wrap gap-3">
              {sessionTypes.map((sessionType) => (
                <button
                  key={sessionType.id}
                  onClick={() => toggleSessionType(sessionType.id)}
                  className={cn(
                    "px-4 py-2.5 rounded-full text-sm font-medium transition-colors",
                    filters.session_types.includes(sessionType.id)
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-foreground"
                  )}
                >
                  {sessionType.label}
                </button>
              ))}
            </div>
          </div>

          {/* Friends Only */}
          <div>
            <h4 className="text-sm font-medium text-muted-foreground mb-4">Visibilité</h4>
            <button
              onClick={() => onFiltersChange({ ...filters, friends_only: !filters.friends_only })}
              className={cn(
                "px-4 py-2.5 rounded-full text-sm font-medium transition-colors",
                filters.friends_only
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-foreground"
              )}
            >
              👥 Amis uniquement
            </button>
          </div>
        </div>

        <Button 
          onClick={() => setIsOpen(false)}
          className="w-full mt-8 h-12 rounded-2xl text-base font-medium"
        >
          Appliquer
        </Button>
      </SheetContent>
    </Sheet>
  );
};
