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
import { ChevronLeft } from "lucide-react";

export type ActivityType = 'running' | 'cycling' | 'walking' | 'course' | 'trail' | 'velo' | 'vtt' | 'bmx' | 'gravel' | 'marche' | 'natation' | 'swimming' | 'football' | 'basket' | 'basketball' | 'volley' | 'badminton' | 'pingpong' | 'tennis' | 'escalade' | 'petanque' | 'rugby' | 'handball' | 'fitness' | 'yoga' | 'musculation' | 'crossfit' | 'boxe' | 'arts_martiaux' | 'golf' | 'ski' | 'snowboard' | 'randonnee' | 'kayak' | 'surf';
export type ScopeType = 'global' | 'local' | 'friends' | 'clubs';
export type FilterType = 'general' | ActivityType | 'friends' | 'clubs';

interface Club {
  id: string;
  name: string;
}

interface FilterBarProps {
  activeScope: ScopeType;
  onScopeChange: (scope: ScopeType) => void;
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

const scopeSegments: { value: ScopeType; label: string; emoji: string }[] = [
  { value: 'global', label: 'Global', emoji: '🌍' },
  { value: 'local', label: 'Local', emoji: '📍' },
  { value: 'friends', label: 'Amis', emoji: '👥' },
  { value: 'clubs', label: 'Clubs', emoji: '🏃' },
];

type SportSegment = { value: FilterType; label: string; emoji: string };
const sportSegments: SportSegment[] = [
  { value: 'general', label: 'Général', emoji: '🏆' },
  { value: 'running', label: 'Running', emoji: '🏃' },
  { value: 'cycling', label: 'Vélo', emoji: '🚴' },
  { value: 'walking', label: 'Marche', emoji: '🚶' },
];

/* ── Segmented Control ── */
const SegmentedControl = <T extends string>({
  segments,
  active,
  onChange,
}: {
  segments: { value: T; label: string; emoji?: string }[];
  active: T;
  onChange: (v: T) => void;
}) => {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const [slider, setSlider] = useState({ left: 0, width: 0 });

  const activeIdx = segments.findIndex(s => s.value === active);

  useEffect(() => {
    const btn = refs.current[activeIdx];
    const container = containerRef.current;
    if (btn && container) {
      const cr = container.getBoundingClientRect();
      const br = btn.getBoundingClientRect();
      setSlider({ left: br.left - cr.left, width: br.width });
    }
  }, [active, activeIdx]);

  return (
    <div ref={containerRef} className="relative flex bg-secondary rounded-lg p-0.5">
      {activeIdx >= 0 && (
        <div
          className="absolute top-0.5 bottom-0.5 bg-card rounded-md shadow-sm transition-all duration-200 ease-out z-0"
          style={{ left: slider.left, width: slider.width }}
        />
      )}
      {segments.map((seg, i) => (
        <button
          key={seg.value}
          ref={el => { refs.current[i] = el; }}
          onClick={() => onChange(seg.value)}
          className={cn(
            "relative z-10 flex-1 text-center py-1.5 text-[12px] font-medium rounded-md transition-colors whitespace-nowrap",
            active === seg.value ? "text-foreground" : "text-muted-foreground"
          )}
        >
          {seg.emoji && <span className="mr-0.5">{seg.emoji}</span>}
          {seg.label}
        </button>
      ))}
    </div>
  );
};

export const FilterBar = ({
  activeScope,
  onScopeChange,
  activeFilter,
  onFilterChange,
  selectedClubs,
  onClubsChange,
  userClubs,
}: FilterBarProps) => {
  const [showClubsDialog, setShowClubsDialog] = useState(false);
  const [tempSelectedClubs, setTempSelectedClubs] = useState<string[]>(selectedClubs);
  const sportsScrollRef = useRef<HTMLDivElement>(null);

  const isAdditionalSport = (filter: FilterType): boolean =>
    additionalSports.some(sport => sport.value === filter);

  const handleScopeChange = (scope: ScopeType) => {
    if (scope === 'clubs') {
      setTempSelectedClubs(selectedClubs);
      setShowClubsDialog(true);
    }
    onScopeChange(scope);
  };

  const handleApplyClubs = () => {
    onClubsChange(tempSelectedClubs);
    setShowClubsDialog(false);
  };

  const toggleClub = (clubId: string) => {
    setTempSelectedClubs(prev =>
      prev.includes(clubId) ? prev.filter(id => id !== clubId) : [...prev, clubId]
    );
  };

  const baseSports: SportSegment[] = [
    ...sportSegments,
    ...additionalSports.filter((sport) => !sportSegments.some((base) => base.value === sport.value))
  ];

  const handleSportSelect = (sport: FilterType) => {
    if (activeScope === 'friends' || activeScope === 'clubs') {
      onScopeChange('global');
    }
    onFilterChange(sport);
  };

  return (
    <>
      {/* Row 1: Scope */}
      <SegmentedControl segments={scopeSegments} active={activeScope} onChange={handleScopeChange} />

      {/* Row 2: Sport carousel (style Feed) */}
      <div className="mt-2">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[12px] font-medium uppercase tracking-wide text-muted-foreground">Sports</span>
          <button
            type="button"
            onClick={() => handleSportSelect('general')}
            className="text-[12px] font-medium text-primary"
          >
            Réinitialiser
          </button>
        </div>

        <div ref={sportsScrollRef} className="overflow-x-auto scrollbar-hide -mx-1 px-1">
          <div className="flex gap-2 pb-1">
            {baseSports.map((sport) => (
              <button
                key={sport.value}
                type="button"
                onClick={() => handleSportSelect(sport.value)}
                className={cn(
                  "whitespace-nowrap rounded-full px-3.5 py-2 text-[13px] font-semibold transition-all",
                  activeFilter === sport.value && activeScope !== 'friends' && activeScope !== 'clubs'
                    ? "bg-primary text-primary-foreground shadow-sm shadow-primary/25"
                    : "bg-primary/10 text-primary hover:bg-primary/15"
                )}
              >
                <span className="mr-1" aria-hidden>{sport.emoji}</span>
                {sport.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Clubs dialog */}
      <Dialog open={showClubsDialog} onOpenChange={setShowClubsDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Sélectionner vos clubs</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-4">
            {userClubs.map((club) => (
              <div key={club.id} className="flex items-center space-x-2">
                <Checkbox id={club.id} checked={tempSelectedClubs.includes(club.id)} onCheckedChange={() => toggleClub(club.id)} />
                <Label htmlFor={club.id} className="text-sm font-medium cursor-pointer">{club.name}</Label>
              </div>
            ))}
            {userClubs.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">Vous n'êtes membre d'aucun club</p>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowClubsDialog(false)}>Annuler</Button>
            <Button onClick={handleApplyClubs}>Appliquer</Button>
          </div>
        </DialogContent>
      </Dialog>

    </>
  );
};
