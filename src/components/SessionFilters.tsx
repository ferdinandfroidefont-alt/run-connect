import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Filter, X } from "lucide-react";
import { useState } from "react";

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
  { id: 'course', label: 'Course à pied', color: 'bg-red-500' },
  { id: 'velo', label: 'Vélo', color: 'bg-blue-500' },
  { id: 'marche', label: 'Marche', color: 'bg-green-500' },
  { id: 'natation', label: 'Natation', color: 'bg-cyan-500' },
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

  const activeFiltersCount = filters.activity_types.length + filters.session_types.length;

  return (
    <>
      {/* Filter Toggle Button */}
      <div>
        <Button
          onClick={() => setIsOpen(!isOpen)}
          size="sm"
          variant="outline"
          className="bg-card/90 backdrop-blur-sm shadow-map-control"
        >
          <Filter className="h-4 w-4 mr-1" />
          Filtres
          {activeFiltersCount > 0 && (
            <Badge variant="secondary" className="ml-2 h-5 px-1 text-xs">
              {activeFiltersCount}
            </Badge>
          )}
        </Button>
      </div>

      {/* Filters Panel */}
      {isOpen && (
        <Card className="absolute top-12 right-0 z-20 w-80 bg-card/95 backdrop-blur-sm shadow-map-panel">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Filtres</h3>
              <div className="flex gap-2">
                {activeFiltersCount > 0 && (
                  <Button
                    onClick={clearAllFilters}
                    size="sm"
                    variant="ghost"
                    className="text-xs"
                  >
                    Effacer
                  </Button>
                )}
                <Button
                  onClick={() => setIsOpen(false)}
                  size="sm"
                  variant="ghost"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-4">
              {/* Activity Types */}
              <div>
                <h4 className="text-sm font-medium mb-2">Type d'activité</h4>
                <div className="grid grid-cols-2 gap-2">
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
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
};