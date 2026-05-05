import {
  Footprints,
  Bike,
  Waves,
  Dumbbell,
  Mountain,
  Snowflake,
  Activity,
  Flame,
  Target,
  Trophy,
  Sword,
  Flower2,
  HeartPulse,
  Sailboat,
  type LucideProps,
} from "lucide-react";
import { cn } from "@/lib/utils";

const ICON_MAP: Record<string, React.ComponentType<LucideProps>> = {
  course: Footprints,
  running: Footprints,
  marche: Footprints,
  walking: Footprints,
  randonnee: Mountain,
  trail: Mountain,
  velo: Bike,
  cycling: Bike,
  vtt: Bike,
  bmx: Bike,
  gravel: Bike,
  natation: Waves,
  swimming: Waves,
  kayak: Sailboat,
  surf: Waves,
  ski: Snowflake,
  snowboard: Snowflake,
  fitness: HeartPulse,
  yoga: Flower2,
  musculation: Dumbbell,
  strength: Dumbbell,
  crossfit: Flame,
  boxe: Sword,
  arts_martiaux: Sword,
  football: Trophy,
  basket: Trophy,
  volley: Trophy,
  badminton: Trophy,
  pingpong: Trophy,
  tennis: Trophy,
  rugby: Trophy,
  handball: Trophy,
  golf: Target,
  petanque: Target,
  escalade: Mountain,
  triathlon: Activity,
  other: Activity,
};

const COLOR_MAP: Record<string, string> = {
  course: "bg-[#007AFF]",
  running: "bg-[#007AFF]",
  marche: "bg-[#34C759]",
  walking: "bg-[#34C759]",
  trail: "bg-[#A8632B]",
  randonnee: "bg-[#34C759]",
  velo: "bg-[#FF375F]",
  cycling: "bg-[#FF375F]",
  vtt: "bg-[#FF6B2C]",
  bmx: "bg-[#FF6B2C]",
  gravel: "bg-[#A8632B]",
  natation: "bg-[#5AC8FA]",
  swimming: "bg-[#5AC8FA]",
  kayak: "bg-[#0EA5E9]",
  surf: "bg-[#06B6D4]",
  ski: "bg-[#8B5CF6]",
  snowboard: "bg-[#7C3AED]",
  fitness: "bg-[#FF2D55]",
  yoga: "bg-[#F472B6]",
  musculation: "bg-[#3F3F46]",
  strength: "bg-[#3F3F46]",
  crossfit: "bg-[#F97316]",
  boxe: "bg-[#DC2626]",
  arts_martiaux: "bg-[#1F2937]",
  football: "bg-[#15803D]",
  basket: "bg-[#EA580C]",
  volley: "bg-[#F59E0B]",
  badminton: "bg-[#65A30D]",
  pingpong: "bg-[#FB7185]",
  tennis: "bg-[#EAB308]",
  rugby: "bg-[#166534]",
  handball: "bg-[#2563EB]",
  golf: "bg-[#10B981]",
  petanque: "bg-[#78716C]",
  escalade: "bg-[#78716C]",
  triathlon: "bg-[#0EA5E9]",
  other: "bg-[#6B7280]",
};

export function getSportColorClass(key: string): string {
  return COLOR_MAP[key] ?? "bg-[#007AFF]";
}

export function getSportIconComponent(key: string): React.ComponentType<LucideProps> {
  return ICON_MAP[key] ?? Activity;
}

interface SportIconProps {
  sport: string;
  size?: number;
  className?: string;
  iconClassName?: string;
}

/** iOS-style sport icon: Lucide glyph in a rounded colored tile. */
export function SportIcon({ sport, size = 36, className, iconClassName }: SportIconProps) {
  const Icon = getSportIconComponent(sport);
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-[10px] text-white",
        getSportColorClass(sport),
        className
      )}
      style={{ width: size, height: size }}
    >
      <Icon className={cn("h-1/2 w-1/2", iconClassName)} strokeWidth={2.25} aria-hidden />
    </div>
  );
}
