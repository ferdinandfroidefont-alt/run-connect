import {
  Activity,
  Bike,
  Dumbbell,
  Flag,
  Footprints,
  Mountain,
  PersonStanding,
  Snowflake,
  Sparkles,
  Target,
  Waves,
  type LucideIcon,
} from "lucide-react";

interface ActivityIconConfig {
  icon: LucideIcon;
  bgColor: string;
  iconColor: string;
  label: string;
}

/** Léger contour pour détacher les pastilles sur fond clair / sombre */
const chipRing = "border border-black/10 dark:border-white/15";

const activityConfig: Record<string, ActivityIconConfig> = {
  course: { icon: Footprints, bgColor: `bg-red-500 ${chipRing}`, iconColor: "text-white", label: "Course" },
  running: { icon: Footprints, bgColor: `bg-red-500 ${chipRing}`, iconColor: "text-white", label: "Course" },
  trail: { icon: Mountain, bgColor: `bg-orange-500 ${chipRing}`, iconColor: "text-white", label: "Trail" },
  velo: { icon: Bike, bgColor: `bg-blue-500 ${chipRing}`, iconColor: "text-white", label: "Vélo" },
  cycling: { icon: Bike, bgColor: `bg-blue-500 ${chipRing}`, iconColor: "text-white", label: "Vélo" },
  vtt: { icon: Bike, bgColor: `bg-emerald-600 ${chipRing}`, iconColor: "text-white", label: "VTT" },
  bmx: { icon: Bike, bgColor: `bg-violet-600 ${chipRing}`, iconColor: "text-white", label: "BMX" },
  gravel: { icon: Bike, bgColor: `bg-amber-600 ${chipRing}`, iconColor: "text-white", label: "Gravel" },
  marche: { icon: PersonStanding, bgColor: `bg-green-500 ${chipRing}`, iconColor: "text-white", label: "Marche" },
  walking: { icon: PersonStanding, bgColor: `bg-green-500 ${chipRing}`, iconColor: "text-white", label: "Marche" },
  natation: { icon: Waves, bgColor: `bg-teal-500 ${chipRing}`, iconColor: "text-white", label: "Natation" },
  swimming: { icon: Waves, bgColor: `bg-teal-500 ${chipRing}`, iconColor: "text-white", label: "Natation" },
  football: { icon: Activity, bgColor: `bg-green-600 ${chipRing}`, iconColor: "text-white", label: "Football" },
  basket: { icon: Activity, bgColor: `bg-orange-600 ${chipRing}`, iconColor: "text-white", label: "Basketball" },
  basketball: { icon: Activity, bgColor: `bg-orange-600 ${chipRing}`, iconColor: "text-white", label: "Basketball" },
  volley: { icon: Activity, bgColor: `bg-yellow-500 ${chipRing}`, iconColor: "text-white", label: "Volleyball" },
  badminton: { icon: Activity, bgColor: `bg-lime-600 ${chipRing}`, iconColor: "text-white", label: "Badminton" },
  pingpong: { icon: Activity, bgColor: `bg-pink-500 ${chipRing}`, iconColor: "text-white", label: "Ping-pong" },
  tennis: { icon: Activity, bgColor: `bg-lime-500 ${chipRing}`, iconColor: "text-white", label: "Tennis" },
  escalade: { icon: Mountain, bgColor: `bg-stone-600 ${chipRing}`, iconColor: "text-white", label: "Escalade" },
  petanque: { icon: Target, bgColor: `bg-yellow-600 ${chipRing}`, iconColor: "text-white", label: "Pétanque" },
  rugby: { icon: Activity, bgColor: `bg-green-800 ${chipRing}`, iconColor: "text-white", label: "Rugby" },
  handball: { icon: Activity, bgColor: `bg-blue-600 ${chipRing}`, iconColor: "text-white", label: "Handball" },
  fitness: { icon: Activity, bgColor: `bg-fuchsia-600 ${chipRing}`, iconColor: "text-white", label: "Fitness" },
  yoga: { icon: Sparkles, bgColor: `bg-indigo-500 ${chipRing}`, iconColor: "text-white", label: "Yoga" },
  musculation: { icon: Dumbbell, bgColor: `bg-slate-700 ${chipRing}`, iconColor: "text-white", label: "Musculation" },
  crossfit: { icon: Dumbbell, bgColor: `bg-red-600 ${chipRing}`, iconColor: "text-white", label: "CrossFit" },
  boxe: { icon: Activity, bgColor: `bg-rose-700 ${chipRing}`, iconColor: "text-white", label: "Boxe" },
  arts_martiaux: { icon: Activity, bgColor: `bg-neutral-800 ${chipRing}`, iconColor: "text-white", label: "Arts martiaux" },
  golf: { icon: Flag, bgColor: `bg-emerald-700 ${chipRing}`, iconColor: "text-white", label: "Golf" },
  ski: { icon: Snowflake, bgColor: `bg-sky-500 ${chipRing}`, iconColor: "text-white", label: "Ski" },
  snowboard: { icon: Snowflake, bgColor: `bg-cyan-600 ${chipRing}`, iconColor: "text-white", label: "Snowboard" },
  randonnee: { icon: Mountain, bgColor: `bg-green-700 ${chipRing}`, iconColor: "text-white", label: "Randonnée" },
  kayak: { icon: Waves, bgColor: `bg-cyan-500 ${chipRing}`, iconColor: "text-white", label: "Kayak" },
  surf: { icon: Waves, bgColor: `bg-blue-400 ${chipRing}`, iconColor: "text-white", label: "Surf" },
};

/** Variantes API / anciennes valeurs → clé `activityConfig` */
const ACTIVITY_TYPE_ALIASES: Record<string, string> = {
  mtb: "vtt",
  run: "course",
  jogging: "course",
  cyclisme: "velo",
  bike: "velo",
  natation_libre: "natation",
};

function normalizeActivityKey(raw: string): string {
  const k = raw.toLowerCase().trim().replace(/-/g, "_");
  if (!k) return "course";
  if (activityConfig[k]) return k;
  const aliased = ACTIVITY_TYPE_ALIASES[k];
  if (aliased && activityConfig[aliased]) return aliased;
  return "course";
}

/**
 * Classes Tailwind en littéraux (scanner) — mêmes teintes que les pastilles `activityConfig`.
 * Cartes (bordure gauche) + fonds ponctuels (popup, etc.)
 */
const ACTIVITY_BORDER_LEFT: Record<string, string> = {
  course: "border-l-red-500",
  running: "border-l-red-500",
  trail: "border-l-orange-500",
  velo: "border-l-blue-500",
  cycling: "border-l-blue-500",
  vtt: "border-l-emerald-600",
  bmx: "border-l-violet-600",
  gravel: "border-l-amber-600",
  marche: "border-l-green-500",
  walking: "border-l-green-500",
  natation: "border-l-teal-500",
  swimming: "border-l-teal-500",
  football: "border-l-green-600",
  basket: "border-l-orange-600",
  basketball: "border-l-orange-600",
  volley: "border-l-yellow-500",
  badminton: "border-l-lime-600",
  pingpong: "border-l-pink-500",
  tennis: "border-l-lime-500",
  escalade: "border-l-stone-600",
  petanque: "border-l-yellow-600",
  rugby: "border-l-green-800",
  handball: "border-l-blue-600",
  fitness: "border-l-fuchsia-600",
  yoga: "border-l-indigo-500",
  musculation: "border-l-slate-700",
  crossfit: "border-l-red-600",
  boxe: "border-l-rose-700",
  arts_martiaux: "border-l-neutral-800",
  golf: "border-l-emerald-700",
  ski: "border-l-sky-500",
  snowboard: "border-l-cyan-600",
  randonnee: "border-l-green-700",
  kayak: "border-l-cyan-500",
  surf: "border-l-blue-400",
};

const ACTIVITY_SOLID_BG: Record<string, string> = {
  course: "bg-red-500",
  running: "bg-red-500",
  trail: "bg-orange-500",
  velo: "bg-blue-500",
  cycling: "bg-blue-500",
  vtt: "bg-emerald-600",
  bmx: "bg-violet-600",
  gravel: "bg-amber-600",
  marche: "bg-green-500",
  walking: "bg-green-500",
  natation: "bg-teal-500",
  swimming: "bg-teal-500",
  football: "bg-green-600",
  basket: "bg-orange-600",
  basketball: "bg-orange-600",
  volley: "bg-yellow-500",
  badminton: "bg-lime-600",
  pingpong: "bg-pink-500",
  tennis: "bg-lime-500",
  escalade: "bg-stone-600",
  petanque: "bg-yellow-600",
  rugby: "bg-green-800",
  handball: "bg-blue-600",
  fitness: "bg-fuchsia-600",
  yoga: "bg-indigo-500",
  musculation: "bg-slate-700",
  crossfit: "bg-red-600",
  boxe: "bg-rose-700",
  arts_martiaux: "bg-neutral-800",
  golf: "bg-emerald-700",
  ski: "bg-sky-500",
  snowboard: "bg-cyan-600",
  randonnee: "bg-green-700",
  kayak: "bg-cyan-500",
  surf: "bg-blue-400",
};

/** Bordure gauche carte : alignée sur ActivityIcon / carousel filtres Découvrir */
export function getActivityBorderLeftClass(activityType: string): string {
  const key = normalizeActivityKey(activityType);
  return ACTIVITY_BORDER_LEFT[key] ?? ACTIVITY_BORDER_LEFT.course;
}

export function getActivitySolidBgClass(activityType: string): string {
  const key = normalizeActivityKey(activityType);
  return ACTIVITY_SOLID_BG[key] ?? ACTIVITY_SOLID_BG.course;
}

export const getActivityConfig = (activityType: string): ActivityIconConfig => {
  const key = normalizeActivityKey(activityType);
  return activityConfig[key] || activityConfig.course;
};

export const getActivityLabel = (activityType: string): string => {
  return getActivityConfig(activityType).label;
};

interface ActivityIconProps {
  activityType: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export const ActivityIcon = ({ activityType, size = "md", className = "" }: ActivityIconProps) => {
  const config = getActivityConfig(activityType);
  const Icon = config.icon;

  const sizeClasses = {
    sm: "h-8 w-8 rounded-md",
    md: "h-10 w-10 rounded-[10px]",
    lg: "h-12 w-12 rounded-xl",
  };

  const iconSizes = {
    sm: "h-4 w-4",
    md: "h-5 w-5",
    lg: "h-6 w-6",
  };

  return (
    <div
      className={`${sizeClasses[size]} ${config.bgColor} flex flex-shrink-0 items-center justify-center ${className}`}
    >
      <Icon className={`${iconSizes[size]} ${config.iconColor}`} strokeWidth={2} />
    </div>
  );
};
