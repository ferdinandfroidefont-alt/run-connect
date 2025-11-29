import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Filter } from "lucide-react";
import { useState } from "react";
import { ClubSelector } from "./ClubSelector";

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
  { id: 'course', label: '🏃 Course à pied', color: 'bg-red-500' },
  { id: 'trail', label: '⛰️ Trail', color: 'bg-orange-500' },
  { id: 'velo', label: '🚴 Vélo', color: 'bg-blue-500' },
  { id: 'vtt', label: '🚵 VTT', color: 'bg-green-600' },
  { id: 'bmx', label: '🚲 BMX', color: 'bg-yellow-500' },
  { id: 'gravel', label: '🚴‍♂️ Gravel', color: 'bg-teal-500' },
  { id: 'marche', label: '🚶 Marche', color: 'bg-green-500' },
  { id: 'natation', label: '🏊 Natation', color: 'bg-cyan-500' },
  { id: 'football', label: '⚽ Football', color: 'bg-emerald-600' },
  { id: 'basket', label: '🏀 Basketball', color: 'bg-orange-600' },
  { id: 'volley', label: '🏐 Volleyball', color: 'bg-yellow-600' },
  { id: 'badminton', label: '🏸 Badminton', color: 'bg-pink-500' },
  { id: 'pingpong', label: '🏓 Tennis de table', color: 'bg-red-400' },
  { id: 'tennis', label: '🎾 Tennis', color: 'bg-lime-600' },
  { id: 'escalade', label: '🧗 Escalade', color: 'bg-stone-600' },
  { id: 'petanque', label: '⚪ Pétanque', color: 'bg-slate-500' },
  { id: 'rugby', label: '🏉 Rugby', color: 'bg-amber-700' },
  { id: 'handball', label: '🤾 Handball', color: 'bg-indigo-500' },
  { id: 'fitness', label: '💪 Fitness', color: 'bg-purple-500' },
  { id: 'yoga', label: '🧘 Yoga', color: 'bg-violet-400' },
  { id: 'musculation', label: '🏋️ Musculation', color: 'bg-gray-700' },
  { id: 'crossfit', label: '🔥 CrossFit', color: 'bg-red-600' },
  { id: 'boxe', label: '🥊 Boxe', color: 'bg-rose-600' },
  { id: 'arts_martiaux', label: '🥋 Arts martiaux', color: 'bg-fuchsia-600' },
  { id: 'golf', label: '⛳ Golf', color: 'bg-green-400' },
  { id: 'ski', label: '⛷️ Ski', color: 'bg-sky-400' },
  { id: 'snowboard', label: '🏂 Snowboard', color: 'bg-blue-600' },
  { id: 'randonnee', label: '🥾 Randonnée', color: 'bg-amber-600' },
  { id: 'kayak', label: '🛶 Kayak', color: 'bg-teal-600' },
  { id: 'surf', label: '🏄 Surf', color: 'bg-cyan-600' },
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
    <Card className={`absolute top-1 right-0 z-20 ${isOpen ? 'w-80' : 'w-auto'} bg-card/95 backdrop-blur-sm shadow-map-control`}>
      {/* Header cliquable - toujours visible */}
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between p-2 cursor-pointer hover:bg-accent/50 transition-colors rounded-t-xl"
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
        <CardContent className="p-4 pt-0">
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