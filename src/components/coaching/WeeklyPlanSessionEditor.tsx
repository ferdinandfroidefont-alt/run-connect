import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RCCEditor } from "./RCCEditor";
import { CoachingTemplatesDialog } from "./CoachingTemplatesDialog";
import { BookOpen, Copy, Trash2, MapPin, Loader2, HelpCircle, ChevronDown } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { geocodeSearchMapbox } from "@/lib/mapboxGeocode";
import { mergeParsedBlocksByIndex, type RCCResult, type ParsedBlock } from "@/lib/rccParser";
import { RCCBlocksPreview } from "./RCCBlocksPreview";

const DAY_LABELS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];
const DAY_SHORT = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

const ACTIVITY_TYPES = [
  { value: "running", label: "Course" },
  { value: "cycling", label: "Vélo" },
  { value: "swimming", label: "Natation" },
];

const QUICK_OBJECTIVES: Record<string, string[]> = {
  running: [
    "Footing", "Footing Z2", "Seuil", "VMA", "VMA courte",
    "VMA longue", "Fartlek", "Côtes", "Sortie longue", "Récupération",
    "PPG / Renfo", "Spé 10K", "Spé semi", "Spé marathon"
  ],
  cycling: [
    "Endurance", "Récup", "Tempo", "Seuil", "PMA", "PMA courte",
    "PMA longue", "Sprint", "Côtes", "Sortie longue", "Home trainer"
  ],
  swimming: [
    "Échauffement", "Technique", "Endurance", "Seuil", "Vitesse",
    "Interval", "Retour au calme", "Mixte", "Palmes", "Pull buoy"
  ],
};

const PACE_UNITS: Record<string, string> = {
  running: "min/km",
  cycling: "watts (W)",
  swimming: "min/100m",
};

const PACE_EXAMPLES: Record<string, { code: string; label: string }[]> = {
  running: [
    { code: "20'>5'30", label: "20 min à 5:30/km" },
    { code: "3x1000>4'00", label: "3×1000m à 4:00/km" },
    { code: "6x3'>3'30", label: "6×3min à 3:30/km" },
  ],
  cycling: [
    { code: "20'>250W", label: "20 min à 250W" },
    { code: "5x5'>300W", label: "5×5min à 300W" },
    { code: "60'>180W", label: "60 min à 180W" },
  ],
  swimming: [
    { code: "10x100>1'45", label: "10×100m à 1:45/100m" },
    { code: "20'>2'00", label: "20 min à 2:00/100m" },
    { code: "5x200>3'30", label: "5×200m à 3:30/200m" },
  ],
};

interface AthleteOverride {
  pace?: string;
  reps?: number;
  recovery?: number;
  notes?: string;
}

export interface WeekSession {
  dayIndex: number;
  activityType: string;
  objective: string;
  rccCode: string;
  parsedBlocks: ParsedBlock[];
  coachNotes: string;
  locationName: string;
  locationLat?: number;
  locationLng?: number;
  athleteOverrides: Record<string, AthleteOverride>;
  rpe?: number;
}

interface ClubMember {
  user_id: string;
  display_name: string;
}

interface WeeklyPlanSessionEditorProps {
  session: WeekSession;
  onChange: (session: WeekSession) => void;
  onDuplicate: (targetDay: number) => void;
  onDelete: () => void;
  members: ClubMember[];
}

export const WeeklyPlanSessionEditor = ({
  session,
  onChange,
  onDuplicate,
  onDelete,
  members,
}: WeeklyPlanSessionEditorProps) => {
  const [showTemplates, setShowTemplates] = useState(false);
  const [locationSearch, setLocationSearch] = useState(session.locationName || "");
  const [locationResults, setLocationResults] = useState<any[]>([]);
  const [isSearchingLocation, setIsSearchingLocation] = useState(false);
  const [showLocationResults, setShowLocationResults] = useState(false);

  useEffect(() => {
    if (!locationSearch.trim() || locationSearch === session.locationName) {
      setLocationResults([]);
      setShowLocationResults(false);
      return;
    }
    const timer = setTimeout(() => { searchLocation(locationSearch); }, 500);
    return () => clearTimeout(timer);
  }, [locationSearch]);

  const searchLocation = async (query: string) => {
    if (!query.trim()) return;
    setIsSearchingLocation(true);
    try {
      const rows = await geocodeSearchMapbox(query, 4);
      setLocationResults(
        rows.map((r) => ({
          name: r.formatted_address,
          lat: r.geometry.location.lat,
          lng: r.geometry.location.lng,
        })),
      );
      setShowLocationResults(rows.length > 0);
    } catch {
      setLocationResults([]);
      setShowLocationResults(false);
    } finally {
      setIsSearchingLocation(false);
    }
  };

  const selectLocation = (loc: { name: string; lat: number; lng: number }) => {
    onChange({ ...session, locationName: loc.name, locationLat: loc.lat, locationLng: loc.lng });
    setLocationSearch(loc.name);
    setShowLocationResults(false);
    setLocationResults([]);
  };

  const update = <K extends keyof WeekSession>(key: K, value: WeekSession[K]) => {
    onChange({ ...session, [key]: value });
  };

  const handleParsedChange = (result: RCCResult) => {
    const merged = mergeParsedBlocksByIndex(result.blocks, session.parsedBlocks || []);
    update("parsedBlocks", merged);
  };

  const otherDays = DAY_SHORT.map((label, i) => ({ label, index: i }))
    .filter(d => d.index !== session.dayIndex);

  const currentObjectives = QUICK_OBJECTIVES[session.activityType] || QUICK_OBJECTIVES.running;
  const currentPaceUnit = PACE_UNITS[session.activityType] || PACE_UNITS.running;
  const currentPaceExamples = PACE_EXAMPLES[session.activityType] || PACE_EXAMPLES.running;

  return (
    <div className="overflow-hidden bg-transparent">
      {/* Header with day + actions */}
      <div className="bg-secondary/50 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center">
            <span className="text-[13px] font-bold text-primary">
              {DAY_SHORT[session.dayIndex]}
            </span>
          </div>
          <div>
            <p className="text-[15px] font-semibold text-foreground leading-tight">
              {session.objective || "Nouvelle séance"}
            </p>
            <p className="text-[12px] text-muted-foreground">{DAY_LABELS[session.dayIndex]}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl" title="Dupliquer">
                <Copy className="h-4 w-4 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {otherDays.map(d => (
                <DropdownMenuItem key={d.index} onClick={() => onDuplicate(d.index)}>
                  {DAY_LABELS[d.index]}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl text-destructive" onClick={onDelete}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Activity type + Objective */}
        <div className="space-y-3">
          <div>
            <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
              Type d'activité
            </label>
            <Select value={session.activityType} onValueChange={v => update("activityType", v)}>
              <SelectTrigger className="h-11 rounded-xl bg-secondary/50 border-0 text-[15px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ACTIVITY_TYPES.map(a => (
                  <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
              Objectif de la séance
            </label>
            <div className="relative">
              <Input
                value={session.objective}
                onChange={e => update("objective", e.target.value)}
                placeholder="Ex: Footing, VMA, Seuil..."
                className="h-11 rounded-xl bg-secondary/50 border-0 text-[15px] pr-10"
              />
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="sm" className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 p-0 rounded-lg text-muted-foreground hover:text-foreground">
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent 
                  className="w-72 p-2" 
                  side="bottom"
                  align="end"
                  sideOffset={4}
                  style={{ maxHeight: '280px' }}
                >
                  <p className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wider px-2 pb-2">
                    Sélection rapide
                  </p>
                  <ScrollArea className="h-[220px]">
                    <div className="grid grid-cols-2 gap-1 pr-2" style={{ touchAction: 'pan-y' }}>
                      {currentObjectives.map(t => (
                        <button
                          key={t}
                          type="button"
                          className="text-left px-3 py-2.5 rounded-lg text-[14px] hover:bg-primary/10 active:bg-primary/20 transition-colors truncate"
                          onClick={() => update("objective", t)}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </ScrollArea>
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </div>

        {/* Template button */}
        <Button
          variant="outline"
          size="sm"
          className="h-10 rounded-xl text-[14px] w-full border-dashed border-border/80 hover:bg-primary/5"
          onClick={() => setShowTemplates(true)}
        >
          <BookOpen className="h-4 w-4 mr-2 text-primary" />
          Charger un template
        </Button>

        {/* RCC Editor */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Contenu · Allure en {currentPaceUnit}
            </label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0 rounded-lg text-muted-foreground hover:text-foreground">
                  <HelpCircle className="h-3.5 w-3.5" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 text-[13px] space-y-2 p-4" side="top">
                <p className="font-semibold text-[15px]">Formats RCC — {currentPaceUnit}</p>
                <div className="space-y-2 text-muted-foreground">
                  {currentPaceExamples.map(ex => (
                    <div key={ex.code}>
                      <code className="font-mono bg-secondary px-1.5 py-0.5 rounded text-foreground">{ex.code}</code> → {ex.label}
                    </div>
                  ))}
                  <div><code className="font-mono bg-secondary px-1.5 py-0.5 rounded text-foreground">10'</code> → 10 min (allure libre)</div>
                  <div><code className="font-mono bg-secondary px-1.5 py-0.5 rounded text-foreground">r1'30&gt;trot</code> → Récup 1'30 trot</div>
                </div>
                <p className="text-muted-foreground pt-1 text-[12px]">Séparez les blocs par des virgules.</p>
              </PopoverContent>
            </Popover>
          </div>
          <RCCEditor
            value={session.rccCode}
            onChange={v => update("rccCode", v)}
            onParsedChange={handleParsedChange}
          />
          {session.parsedBlocks && session.parsedBlocks.length > 0 && (
            <div className="mt-4">
              <RCCBlocksPreview
                blocks={session.parsedBlocks}
                sessionRpe={session.rpe ?? 5}
                onSessionRpeChange={(v) => update("rpe", v)}
              />
            </div>
          )}
        </div>

        {/* Location */}
        <div>
          <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
            Lieu de rendez-vous
          </label>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={locationSearch}
              onChange={e => {
                setLocationSearch(e.target.value);
                if (!e.target.value.trim()) update("locationName", "");
              }}
              placeholder="Rechercher un lieu..."
              className="h-11 rounded-xl bg-secondary/50 border-0 text-[15px] pl-10 pr-10"
            />
            {isSearchingLocation && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
            )}
          </div>
          {showLocationResults && locationResults.length > 0 && (
            <div className="mt-1.5 bg-card border border-border rounded-xl shadow-lg overflow-hidden">
              {locationResults.map((loc, i) => (
                <button
                  key={i}
                  type="button"
                  className="w-full text-left px-4 py-3 text-[14px] hover:bg-secondary/50 active:bg-secondary transition-colors flex items-center gap-2.5 border-b border-border/50 last:border-0"
                  onClick={() => selectLocation(loc)}
                >
                  <MapPin className="h-3.5 w-3.5 shrink-0 text-primary" />
                  <span className="truncate">{loc.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Coach notes */}
        <div>
          <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
            Notes coach (optionnel)
          </label>
          <Textarea
            value={session.coachNotes}
            onChange={e => update("coachNotes", e.target.value)}
            placeholder="Consignes, rappels, motivation..."
            className="rounded-xl bg-secondary/50 border-0 text-[14px] min-h-[60px] resize-none"
            rows={2}
          />
        </div>

      </div>

      <CoachingTemplatesDialog
        isOpen={showTemplates}
        onClose={() => setShowTemplates(false)}
        onSelect={(code, objective) => {
          update("rccCode", code);
          if (objective) update("objective", objective);
          setShowTemplates(false);
        }}
      />
    </div>
  );
};
