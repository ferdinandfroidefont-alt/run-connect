import { useMemo } from "react";
import { MapPin } from "lucide-react";
import { ACTIVITY_TYPES } from "@/hooks/useDiscoverFeed";
import { ACTION_BLUE } from "@/components/discover/DiscoverChromeShell";
import { getFilterSportMeta } from "@/lib/discoverSessionVisual";
import { SportFilterCarousel, type SportFilterItem } from "@/components/feed/SportFilterCarousel";

interface DiscoverFiltersProps {
  maxDistance: number;
  setMaxDistance: (distance: number) => void;
  selectedActivities: string[];
  toggleActivity: (activity: string) => void;
  toggleAllActivities: () => void;
}

const FILTER_SPORTS: SportFilterItem[] = ACTIVITY_TYPES.map((a) => {
  const meta = getFilterSportMeta(a.value);
  return {
    id: a.value,
    emoji: meta.emoji,
    label: a.label,
    color: meta.color,
  };
});

export const DiscoverFilters = ({
  maxDistance,
  setMaxDistance,
  selectedActivities,
  toggleActivity,
  toggleAllActivities,
}: DiscoverFiltersProps) => {
  const allSelected = selectedActivities.length === ACTIVITY_TYPES.length;

  const distanceDisplay = useMemo(() => {
    const n = Math.min(100, Math.max(1, maxDistance));
    return String(n);
  }, [maxDistance]);

  const onDistanceChange = (raw: string) => {
    const parsed = parseInt(raw, 10);
    if (Number.isNaN(parsed)) {
      setMaxDistance(10);
      return;
    }
    setMaxDistance(Math.min(100, Math.max(1, parsed)));
  };

  return (
    <div
      className="rounded-[18px] bg-white p-4"
      style={{
        boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 0 0 0.5px rgba(0,0,0,0.06)",
      }}
    >
      <div className="mb-3 flex items-center justify-between">
        <p
          className="text-[13px] font-extrabold uppercase tracking-[0.12em] text-[#8E8E93]"
        >
          Sports
        </p>
        <button type="button" onClick={toggleAllActivities}>
          <span className="text-[15px] font-bold tracking-[-0.01em]" style={{ color: ACTION_BLUE }}>
            {allSelected ? "Désélectionner tout" : "Tout sélectionner"}
          </span>
        </button>
      </div>

      <SportFilterCarousel
        sports={FILTER_SPORTS}
        selected={selectedActivities}
        onToggle={toggleActivity}
        multi
        size="sm"
      />

      <div className="-mx-4 my-3 h-px bg-[#E5E5EA]" />

      <div className="flex w-full items-center gap-3">
        <MapPin className="h-5 w-5 flex-shrink-0 text-[#8E8E93]" strokeWidth={2.2} aria-hidden />
        <span className="min-w-0 flex-1 text-left text-[17px] font-bold tracking-[-0.01em] text-[#0A0F1F]">
          Distance max
        </span>
        <label className="sr-only" htmlFor="discover-max-distance">
          Distance maximale en kilomètres
        </label>
        <div
          className="flex min-w-[60px] items-center justify-center rounded-xl bg-[#F2F2F7] px-4 py-2"
        >
          <input
            id="discover-max-distance"
            type="number"
            inputMode="numeric"
            value={distanceDisplay}
            onChange={(e) => onDistanceChange(e.target.value)}
            className="w-10 border-0 bg-transparent p-0 text-center text-[18px] font-extrabold tabular-nums text-[#0A0F1F] outline-none ring-0 focus:ring-0"
            min={1}
            max={100}
          />
        </div>
        <span className="text-[17px] font-semibold text-[#8E8E93]">km</span>
      </div>
    </div>
  );
};
