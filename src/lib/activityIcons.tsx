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

interface ActivityIconProps {
  activityType: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export const ActivityIcon = ({ activityType, size = "md", className = "" }: ActivityIconProps) => {
  const config = activityConfig[activityType] || activityConfig.course;
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

export const getActivityLabel = (activityType: string): string => {
  return activityConfig[activityType]?.label || "Activité";
};

export const getActivityConfig = (activityType: string): ActivityIconConfig => {
  return activityConfig[activityType] || activityConfig.course;
};
