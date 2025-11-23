import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Globe, Bike, Footprints, Users, Home, Trophy, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

export type ActivityType = 'running' | 'cycling' | 'walking' | 'swimming' | 'basketball' | 'football' | 'petanque' | 'tennis';
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
  { value: 'swimming', label: 'Natation', emoji: '🏊' },
  { value: 'basketball', label: 'Basketball', emoji: '🏀' },
  { value: 'football', label: 'Football', emoji: '⚽' },
  { value: 'petanque', label: 'Pétanque', emoji: '🎯' },
  { value: 'tennis', label: 'Tennis', emoji: '🎾' },
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
    { value: 'general' as FilterType, label: 'Général', icon: Globe },
    { value: 'running' as FilterType, label: 'Running', icon: Trophy },
    { value: 'cycling' as FilterType, label: 'Vélo', icon: Bike },
    { value: 'walking' as FilterType, label: 'Marche', icon: Footprints },
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

  const getActiveFilterLabel = () => {
    const additionalSport = additionalSports.find(s => s.value === activeFilter);
    if (additionalSport) return `${additionalSport.emoji} ${additionalSport.label}`;
    if (activeFilter === 'clubs' && selectedClubs.length > 0) {
      return `Clubs (${selectedClubs.length})`;
    }
    return null;
  };

  return (
    <>
      <div className="w-full overflow-x-auto pb-2 scrollbar-hide">
        <div className="flex gap-2 min-w-max px-1">
          {mainFilters.map((filter) => {
            const Icon = filter.icon;
            return (
              <Button
                key={filter.value}
                variant={activeFilter === filter.value ? "default" : "outline"}
                size="sm"
                onClick={() => onFilterChange(filter.value)}
                className={cn(
                  "flex items-center gap-1.5 whitespace-nowrap transition-all",
                  activeFilter === filter.value && "shadow-md"
                )}
              >
                <Icon className="h-4 w-4" />
                {filter.label}
              </Button>
            );
          })}
          
          {userClubs.length > 0 && (
            <Button
              variant={activeFilter === 'clubs' ? "default" : "outline"}
              size="sm"
              onClick={handleClubsClick}
              className={cn(
                "flex items-center gap-1.5 whitespace-nowrap transition-all",
                activeFilter === 'clubs' && "shadow-md"
              )}
            >
              <Home className="h-4 w-4" />
              {selectedClubs.length > 0 ? `Clubs (${selectedClubs.length})` : 'Mes clubs'}
            </Button>
          )}

          <Button
            variant={isAdditionalSport(activeFilter) ? "default" : "outline"}
            size="sm"
            onClick={() => setShowSportsDialog(true)}
            className={cn(
              "flex items-center gap-1.5 whitespace-nowrap transition-all",
              isAdditionalSport(activeFilter) && "shadow-md"
            )}
          >
            <Plus className="h-4 w-4" />
            {getActiveFilterLabel() || 'Plus'}
          </Button>
        </div>
      </div>

      {/* Dialog de sélection des clubs */}
      <Dialog open={showClubsDialog} onOpenChange={setShowClubsDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Sélectionner vos clubs</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-4">
            {userClubs.map((club) => (
              <div key={club.id} className="flex items-center space-x-2">
                <Checkbox
                  id={club.id}
                  checked={tempSelectedClubs.includes(club.id)}
                  onCheckedChange={() => toggleClub(club.id)}
                />
                <Label
                  htmlFor={club.id}
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  {club.name}
                </Label>
              </div>
            ))}
            {userClubs.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                Vous n'êtes membre d'aucun club
              </p>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowClubsDialog(false)}>
              Annuler
            </Button>
            <Button onClick={handleApplyClubs}>
              Appliquer
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog des sports supplémentaires */}
      <Dialog open={showSportsDialog} onOpenChange={setShowSportsDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Autres sports</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-2 py-4">
            {additionalSports.map((sport) => (
              <Button
                key={sport.value}
                variant={activeFilter === sport.value ? "default" : "outline"}
                className="h-20 flex-col gap-2"
                onClick={() => {
                  onFilterChange(sport.value);
                  setShowSportsDialog(false);
                }}
              >
                <span className="text-2xl">{sport.emoji}</span>
                <span className="text-sm">{sport.label}</span>
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
