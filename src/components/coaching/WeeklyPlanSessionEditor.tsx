import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RCCEditor } from "./RCCEditor";
import { CoachingTemplatesDialog } from "./CoachingTemplatesDialog";
import { BookOpen, Copy, Trash2, MapPin, Loader2, HelpCircle } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import type { RCCResult, ParsedBlock } from "@/lib/rccParser";

const DAY_LABELS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

const ACTIVITY_TYPES = [
  { value: "running", label: "Course" },
  { value: "trail", label: "Trail" },
  { value: "cycling", label: "Vélo" },
  { value: "swimming", label: "Natation" },
  { value: "walking", label: "Marche" },
];

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

  // Debounced location search
  useEffect(() => {
    if (!locationSearch.trim() || locationSearch === session.locationName) {
      setLocationResults([]);
      setShowLocationResults(false);
      return;
    }
    const timer = setTimeout(() => {
      searchLocation(locationSearch);
    }, 500);
    return () => clearTimeout(timer);
  }, [locationSearch]);

  const searchLocation = async (query: string) => {
    if (!query.trim()) return;
    setIsSearchingLocation(true);
    try {
      if (window.google?.maps?.places) {
        const service = new google.maps.places.PlacesService(document.createElement('div'));
        service.textSearch({ query }, (results, status) => {
          if (status === google.maps.places.PlacesServiceStatus.OK && results) {
            setLocationResults(results.slice(0, 4).map(r => ({
              name: r.formatted_address || r.name || "",
              lat: r.geometry?.location?.lat() || 0,
              lng: r.geometry?.location?.lng() || 0,
            })));
            setShowLocationResults(true);
          }
          setIsSearchingLocation(false);
        });
      } else {
        const { data } = await supabase.functions.invoke('google-maps-proxy', {
          body: { address: query, type: 'geocode' }
        });
        if (data?.results) {
          setLocationResults(data.results.slice(0, 4).map((r: any) => ({
            name: r.formatted_address,
            lat: r.geometry.location.lat,
            lng: r.geometry.location.lng,
          })));
          setShowLocationResults(true);
        }
        setIsSearchingLocation(false);
      }
    } catch {
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
    update("parsedBlocks", result.blocks);
  };

  const otherDays = DAY_LABELS.map((label, i) => ({ label, index: i }))
    .filter(d => d.index !== session.dayIndex);

  return (
    <div className="space-y-3 p-4 border rounded-xl bg-card">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">{DAY_LABELS[session.dayIndex]} — {session.objective || "Nouvelle séance"}</p>
        <div className="flex gap-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7" title="Dupliquer vers...">
                <Copy className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {otherDays.map(d => (
                <DropdownMenuItem key={d.index} onClick={() => onDuplicate(d.index)}>
                  {d.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={onDelete}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Select value={session.activityType} onValueChange={v => update("activityType", v)}>
          <SelectTrigger className="h-9 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ACTIVITY_TYPES.map(a => (
              <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          value={session.objective}
          onChange={e => update("objective", e.target.value)}
          placeholder="Objectif (VMA, Seuil...)"
          className="h-9 text-xs"
        />
      </div>

      <div className="flex gap-1.5">
        <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setShowTemplates(true)}>
          <BookOpen className="h-3.5 w-3.5 mr-1" />
          Template
        </Button>
      </div>

      <div className="relative">
        <div className="flex items-center justify-between mb-1">
          <label className="text-xs font-medium text-muted-foreground uppercase">Séance</label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className="h-5 w-5 p-0 text-muted-foreground hover:text-foreground">
                <HelpCircle className="h-3.5 w-3.5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72 text-xs space-y-2" side="top">
              <p className="font-semibold text-sm">Formats RCC</p>
              <div className="space-y-1.5">
                <div><code className="font-mono bg-muted px-1 rounded">20'&gt;5'30</code> → 20 min à 5:30/km</div>
                <div><code className="font-mono bg-muted px-1 rounded">10'</code> → 10 min (allure libre)</div>
                <div><code className="font-mono bg-muted px-1 rounded">3x1000&gt;4'00</code> → 3×1000m à 4:00</div>
                <div><code className="font-mono bg-muted px-1 rounded">6x3'&gt;3'30</code> → 6×3min à 3:30</div>
                <div><code className="font-mono bg-muted px-1 rounded">r1'30&gt;trot</code> → Récup 1'30 trot</div>
              </div>
              <p className="text-muted-foreground pt-1">Séparez les blocs par des virgules.<br/>Ex: <code className="font-mono bg-muted px-1 rounded">20'&gt;5'30, 6x3'&gt;3'30 r1'30&gt;trot, 10'&gt;6'00</code></p>
            </PopoverContent>
          </Popover>
        </div>
        <RCCEditor
          value={session.rccCode}
          onChange={v => update("rccCode", v)}
          onParsedChange={handleParsedChange}
        />
      </div>

      {/* Location with autocomplete */}
      <div className="relative">
        <div className="relative">
          <MapPin className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={locationSearch}
            onChange={e => {
              setLocationSearch(e.target.value);
              if (!e.target.value.trim()) {
                update("locationName", "");
              }
            }}
            placeholder="Rechercher un lieu..."
            className="h-9 text-xs pl-8 pr-8"
          />
          {isSearchingLocation && (
            <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin text-muted-foreground" />
          )}
        </div>
        {showLocationResults && locationResults.length > 0 && (
          <div className="absolute z-50 w-full mt-1 bg-card border border-border rounded-lg shadow-lg overflow-hidden">
            {locationResults.map((loc, i) => (
              <button
                key={i}
                type="button"
                className="w-full text-left px-3 py-2 text-xs hover:bg-accent/50 transition-colors flex items-center gap-2"
                onClick={() => selectLocation(loc)}
              >
                <MapPin className="h-3 w-3 shrink-0 text-muted-foreground" />
                <span className="truncate">{loc.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <Textarea
        value={session.coachNotes}
        onChange={e => update("coachNotes", e.target.value)}
        placeholder="📝 Notes coach (optionnel)"
        className="text-xs min-h-[40px] resize-none"
        rows={2}
      />

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
