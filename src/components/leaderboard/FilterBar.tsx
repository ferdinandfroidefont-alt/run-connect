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
  { value: 'course', label: 'Course à pied', emoji: '🏃' },
  { value: 'trail', label: 'Trail', emoji: '⛰️' },
  { value: 'velo', label: 'Vélo', emoji: '🚴' },
  { value: 'vtt', label: 'VTT', emoji: '🚵' },
  { value: 'bmx', label: 'BMX', emoji: '🚲' },
  { value: 'gravel', label: 'Gravel', emoji: '🚴‍♂️' },
  { value: 'marche', label: 'Marche', emoji: '🚶' },
  { value: 'natation', label: 'Natation', emoji: '🏊' },
  { value: 'swimming', label: 'Natation', emoji: '🏊' },
  { value: 'football', label: 'Football', emoji: '⚽' },
  { value: 'basket', label: 'Basketball', emoji: '🏀' },
  { value: 'basketball', label: 'Basketball', emoji: '🏀' },
  { value: 'volley', label: 'Volleyball', emoji: '🏐' },
  { value: 'badminton', label: 'Badminton', emoji: '🏸' },
  { value: 'pingpong', label: 'Tennis de table', emoji: '🏓' },
  { value: 'tennis', label: 'Tennis', emoji: '🎾' },
  { value: 'escalade', label: 'Escalade', emoji: '🧗' },
  { value: 'petanque', label: 'Pétanque', emoji: '⚪' },
  { value: 'rugby', label: 'Rugby', emoji: '🏉' },
  { value: 'handball', label: 'Handball', emoji: '🤾' },
  { value: 'fitness', label: 'Fitness', emoji: '💪' },
  { value: 'yoga', label: 'Yoga', emoji: '🧘' },
  { value: 'musculation', label: 'Musculation', emoji: '🏋️' },
  { value: 'crossfit', label: 'CrossFit', emoji: '🔥' },
  { value: 'boxe', label: 'Boxe', emoji: '🥊' },
  { value: 'arts_martiaux', label: 'Arts martiaux', emoji: '🥋' },
  { value: 'golf', label: 'Golf', emoji: '⛳' },
  { value: 'ski', label: 'Ski', emoji: '⛷️' },
  { value: 'snowboard', label: 'Snowboard', emoji: '🏂' },
  { value: 'randonnee', label: 'Randonnée', emoji: '🥾' },
  { value: 'kayak', label: 'Kayak', emoji: '🛶' },
  { value: 'surf', label: 'Surf', emoji: '🏄' }
];

const filterColors: Record<string, { gradient: string; shadow: string }> = {
  'general': { gradient: 'from-blue-500 to-cyan-500', shadow: 'shadow-blue-500/30' },
  'running': { gradient: 'from-orange-500 to-red-500', shadow: 'shadow-orange-500/30' },
  'cycling': { gradient: 'from-green-500 to-emerald-500', shadow: 'shadow-green-500/30' },
  'walking': { gradient: 'from-teal-500 to-cyan-500', shadow: 'shadow-teal-500/30' },
  'friends': { gradient: 'from-purple-500 to-pink-500', shadow: 'shadow-purple-500/30' },
  'clubs': { gradient: 'from-amber-500 to-orange-500', shadow: 'shadow-amber-500/30' },
};

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

  const getFilterStyle = (filterValue: string, isActive: boolean) => {
    const colors = filterColors[filterValue] || filterColors['general'];
    if (isActive) {
      return `bg-gradient-to-r ${colors.gradient} text-white shadow-lg ${colors.shadow} border-0 hover:scale-105`;
    }
    return "bg-background/50 hover:bg-background/80 border-border/50";
  };

  return (
    <>
      <div className="w-full overflow-x-auto pb-2 scrollbar-hide">
        <div className="flex gap-2 min-w-max px-1">
          {mainFilters.map((filter) => {
            const Icon = filter.icon;
            const isActive = activeFilter === filter.value;
            return (
              <Button
                key={filter.value}
                variant="outline"
                size="sm"
                onClick={() => onFilterChange(filter.value)}
                className={cn(
                  "flex items-center gap-1.5 whitespace-nowrap transition-all duration-300",
                  getFilterStyle(filter.value, isActive)
                )}
              >
                <Icon className="h-4 w-4" />
                {filter.label}
              </Button>
            );
          })}
          
          {userClubs.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleClubsClick}
              className={cn(
                "flex items-center gap-1.5 whitespace-nowrap transition-all duration-300",
                getFilterStyle('clubs', activeFilter === 'clubs')
              )}
            >
              <Home className="h-4 w-4" />
              {selectedClubs.length > 0 ? `Clubs (${selectedClubs.length})` : 'Mes clubs'}
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSportsDialog(true)}
            className={cn(
              "flex items-center gap-1.5 whitespace-nowrap transition-all duration-300",
              isAdditionalSport(activeFilter) 
                ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/30 border-0 hover:scale-105"
                : "bg-background/50 hover:bg-background/80 border-border/50"
            )}
          >
            <Plus className="h-4 w-4" />
            {getActiveFilterLabel() || 'Plus'}
          </Button>
        </div>
      </div>

      {/* Dialog de sélection des clubs */}
      <Dialog open={showClubsDialog} onOpenChange={setShowClubsDialog}>
        <DialogContent className="sm:max-w-md glass-primary">
          <DialogHeader>
            <DialogTitle className="text-gradient-primary">Sélectionner vos clubs</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-4">
            {userClubs.map((club) => (
              <div key={club.id} className="flex items-center space-x-2 p-2 rounded-lg hover:bg-white/5 transition-colors">
                <Checkbox
                  id={club.id}
                  checked={tempSelectedClubs.includes(club.id)}
                  onCheckedChange={() => toggleClub(club.id)}
                  className="border-primary/50 data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-primary data-[state=checked]:to-accent"
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
            <Button onClick={handleApplyClubs} className="bg-gradient-to-r from-primary to-accent hover:opacity-90">
              Appliquer
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog des sports supplémentaires */}
      <Dialog open={showSportsDialog} onOpenChange={setShowSportsDialog}>
        <DialogContent className="sm:max-w-md flex flex-col items-center glass-primary">
          <DialogHeader className="w-full">
            <DialogTitle className="text-center text-gradient-primary">Autres sports</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-2 py-4 max-h-[60vh] overflow-y-auto scrollbar-hide w-full px-2">
            {additionalSports.map((sport) => (
              <Button
                key={sport.value}
                variant="outline"
                className={cn(
                  "h-20 flex-col gap-2 transition-all duration-300",
                  activeFilter === sport.value 
                    ? "bg-gradient-to-br from-primary/20 to-accent/20 border-primary/50 shadow-lg shadow-primary/20"
                    : "hover:bg-white/5"
                )}
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
