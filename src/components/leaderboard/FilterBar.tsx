import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Globe, Bike, Footprints, Users, Home, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

export type ActivityType = 'running' | 'cycling' | 'walking' | 'course' | 'trail' | 'velo' | 'vtt' | 'bmx' | 'gravel' | 'marche' | 'natation' | 'swimming' | 'football' | 'basket' | 'basketball' | 'volley' | 'badminton' | 'pingpong' | 'tennis' | 'escalade' | 'petanque' | 'rugby' | 'handball' | 'fitness' | 'yoga' | 'musculation' | 'crossfit' | 'boxe' | 'arts_martiaux' | 'golf' | 'ski' | 'snowboard' | 'randonnee' | 'kayak' | 'surf';
export type FilterType = 'general' | ActivityType | 'friends' | 'clubs';

interface Club {
  id: string;
  name: string;
}

interface FilterBarProps {
  activeFilter: FilterType;
  onFilterChange: (filter: FilterType) => void;
  selectedClubs: string[];
  onClubsChange: (clubIds: string[]) => void;
  userClubs: Club[];
}

const additionalSports: { value: ActivityType; label: string; emoji: string }[] = [
  { value: 'course', label: 'Course', emoji: '🏃' },
  { value: 'trail', label: 'Trail', emoji: '⛰️' },
  { value: 'velo', label: 'Vélo', emoji: '🚴' },
  { value: 'vtt', label: 'VTT', emoji: '🚵' },
  { value: 'natation', label: 'Natation', emoji: '🏊' },
  { value: 'football', label: 'Football', emoji: '⚽' },
  { value: 'basketball', label: 'Basketball', emoji: '🏀' },
  { value: 'tennis', label: 'Tennis', emoji: '🎾' },
  { value: 'fitness', label: 'Fitness', emoji: '💪' },
  { value: 'yoga', label: 'Yoga', emoji: '🧘' },
  { value: 'randonnee', label: 'Rando', emoji: '🥾' },
  { value: 'surf', label: 'Surf', emoji: '🏄' }
];

export const FilterBar = ({ 
  activeFilter, 
  onFilterChange, 
  selectedClubs,
  onClubsChange,
  userClubs
}: FilterBarProps) => {
  const [showClubsDialog, setShowClubsDialog] = useState(false);
  const [showSportsDialog, setShowSportsDialog] = useState(false);
  const [tempSelectedClubs, setTempSelectedClubs] = useState<string[]>(selectedClubs);

  const mainFilters = [
    { value: 'general' as FilterType, label: 'Tous', icon: Globe },
    { value: 'running' as FilterType, label: 'Course', icon: Footprints },
    { value: 'cycling' as FilterType, label: 'Vélo', icon: Bike },
    { value: 'friends' as FilterType, label: 'Amis', icon: Users },
  ];

  const handleClubsClick = () => {
    setTempSelectedClubs(selectedClubs);
    setShowClubsDialog(true);
  };

  const handleApplyClubs = () => {
    onClubsChange(tempSelectedClubs);
    if (tempSelectedClubs.length > 0) {
      onFilterChange('clubs');
    } else {
      onFilterChange('general');
    }
    setShowClubsDialog(false);
  };

  const toggleClub = (clubId: string) => {
    setTempSelectedClubs(prev => 
      prev.includes(clubId) 
        ? prev.filter(id => id !== clubId)
        : [...prev, clubId]
    );
  };

  const isAdditionalSport = (filter: FilterType): boolean => {
    return additionalSports.some(sport => sport.value === filter);
  };

  return (
    <>
      <div className="w-full overflow-x-auto pb-2 -mx-1">
        <div className="flex gap-2 min-w-max px-1">
          {mainFilters.map((filter) => {
            const Icon = filter.icon;
            const isActive = activeFilter === filter.value;
            return (
              <button
                key={filter.value}
                onClick={() => onFilterChange(filter.value)}
                className={cn(
                  "flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-foreground text-background"
                    : "bg-muted/50 text-muted-foreground hover:bg-muted"
                )}
              >
                <Icon className="h-4 w-4" />
                {filter.label}
              </button>
            );
          })}
          
          {userClubs.length > 0 && (
            <button
              onClick={handleClubsClick}
              className={cn(
                "flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200",
                activeFilter === 'clubs'
                  ? "bg-foreground text-background"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted"
              )}
            >
              <Home className="h-4 w-4" />
              {selectedClubs.length > 0 ? `Clubs (${selectedClubs.length})` : 'Clubs'}
            </button>
          )}

          <button
            onClick={() => setShowSportsDialog(true)}
            className={cn(
              "flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200",
              isAdditionalSport(activeFilter)
                ? "bg-foreground text-background"
                : "bg-muted/50 text-muted-foreground hover:bg-muted"
            )}
          >
            <Plus className="h-4 w-4" />
            Plus
          </button>
        </div>
      </div>

      <Dialog open={showClubsDialog} onOpenChange={setShowClubsDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Sélectionner vos clubs</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-4">
            {userClubs.map((club) => (
              <div key={club.id} className="flex items-center space-x-3 p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors">
                <Checkbox
                  id={club.id}
                  checked={tempSelectedClubs.includes(club.id)}
                  onCheckedChange={() => toggleClub(club.id)}
                />
                <Label htmlFor={club.id} className="flex-1 cursor-pointer">
                  {club.name}
                </Label>
              </div>
            ))}
            {userClubs.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">
                Vous n'êtes membre d'aucun club
              </p>
            )}
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setShowClubsDialog(false)} className="flex-1">
              Annuler
            </Button>
            <Button onClick={handleApplyClubs} className="flex-1">
              Appliquer
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showSportsDialog} onOpenChange={setShowSportsDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center">Autres sports</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-3 gap-2 py-4 max-h-[50vh] overflow-y-auto">
            {additionalSports.map((sport) => (
              <button
                key={sport.value}
                onClick={() => {
                  onFilterChange(sport.value);
                  setShowSportsDialog(false);
                }}
                className={cn(
                  "flex flex-col items-center justify-center gap-2 p-4 rounded-xl transition-all duration-200",
                  activeFilter === sport.value
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted/30 hover:bg-muted/50"
                )}
              >
                <span className="text-2xl">{sport.emoji}</span>
                <span className="text-xs font-medium">{sport.label}</span>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
