import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

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

type MainSegment = { value: FilterType; label: string };

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
  const [sliderStyle, setSliderStyle] = useState({ left: 0, width: 0 });
  const segmentRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  const mainSegments: MainSegment[] = [
    { value: 'general', label: 'Général' },
    { value: 'running', label: 'Running' },
    { value: 'cycling', label: 'Vélo' },
    { value: 'walking', label: 'Marche' },
    { value: 'friends', label: 'Amis' },
  ];

  const isAdditionalSport = (filter: FilterType): boolean => {
    return additionalSports.some(sport => sport.value === filter);
  };

  const activeMainIndex = mainSegments.findIndex(s => s.value === activeFilter);
  const isMainActive = activeMainIndex >= 0;

  // Update slider position
  useEffect(() => {
    if (!isMainActive) {
      setSliderStyle({ left: 0, width: 0 });
      return;
    }
    const btn = segmentRefs.current[activeMainIndex];
    const container = containerRef.current;
    if (btn && container) {
      const containerRect = container.getBoundingClientRect();
      const btnRect = btn.getBoundingClientRect();
      setSliderStyle({
        left: btnRect.left - containerRect.left,
        width: btnRect.width,
      });
    }
  }, [activeFilter, activeMainIndex, isMainActive]);

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
      prev.includes(clubId) ? prev.filter(id => id !== clubId) : [...prev, clubId]
    );
  };

  const getActiveSportLabel = () => {
    const sport = additionalSports.find(s => s.value === activeFilter);
    if (sport) return `${sport.emoji} ${sport.label}`;
    if (activeFilter === 'clubs') return `Clubs (${selectedClubs.length})`;
    return null;
  };

  return (
    <>
      {/* iOS Segmented Control */}
      <div className="flex items-center gap-2">
        <div
          ref={containerRef}
          className="relative flex-1 flex bg-secondary rounded-lg p-0.5"
        >
          {/* Animated slider */}
          {isMainActive && (
            <div
              className="absolute top-0.5 bottom-0.5 bg-card rounded-md shadow-sm transition-all duration-200 ease-out z-0"
              style={{ left: sliderStyle.left, width: sliderStyle.width }}
            />
          )}
          {mainSegments.map((seg, i) => (
            <button
              key={seg.value}
              ref={(el) => { segmentRefs.current[i] = el; }}
              onClick={() => onFilterChange(seg.value)}
              className={cn(
                "relative z-10 flex-1 text-center py-1.5 text-[13px] font-medium rounded-md transition-colors",
                activeFilter === seg.value
                  ? "text-foreground"
                  : "text-muted-foreground"
              )}
            >
              {seg.label}
            </button>
          ))}
        </div>

        {/* Extra buttons */}
        <div className="flex gap-1.5 shrink-0">
          {userClubs.length > 0 && (
            <button
              onClick={handleClubsClick}
              className={cn(
                "px-2.5 py-1.5 rounded-lg text-[12px] font-medium transition-colors",
                activeFilter === 'clubs'
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground"
              )}
            >
              {selectedClubs.length > 0 ? `Clubs (${selectedClubs.length})` : 'Clubs'}
            </button>
          )}
          <button
            onClick={() => setShowSportsDialog(true)}
            className={cn(
              "p-1.5 rounded-lg transition-colors",
              isAdditionalSport(activeFilter)
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-muted-foreground"
            )}
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Active sport tag */}
      {(isAdditionalSport(activeFilter) || activeFilter === 'clubs') && (
        <div className="mt-1.5 flex items-center gap-2 px-1">
          <span className="text-[12px] font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">
            {getActiveSportLabel()}
          </span>
          <button
            onClick={() => onFilterChange('general')}
            className="text-[11px] text-muted-foreground underline"
          >
            Réinitialiser
          </button>
        </div>
      )}

      {/* Clubs dialog */}
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
                <Label htmlFor={club.id} className="text-sm font-medium cursor-pointer">
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
            <Button variant="outline" onClick={() => setShowClubsDialog(false)}>Annuler</Button>
            <Button onClick={handleApplyClubs}>Appliquer</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Sports dialog */}
      <Dialog open={showSportsDialog} onOpenChange={setShowSportsDialog}>
        <DialogContent className="sm:max-w-md flex flex-col items-center">
          <DialogHeader className="w-full">
            <DialogTitle className="text-center">Autres sports</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-2 py-4 max-h-[60vh] overflow-y-auto scrollbar-hide w-full px-2">
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
