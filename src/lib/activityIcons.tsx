import {
  Bike,
  Footprints,
  PersonStanding,
  Waves,
  Target,
  Circle,
  Dumbbell,
  Mountain,
  type LucideIcon,
} from "lucide-react";

interface ActivityIconConfig {
  icon: LucideIcon;
  bgColor: string;
  iconColor: string;
  label: string;
}

/** Icônes d’activité : fond neutre chaud + picto sombre (identité premium, pas d’arc-en-ciel). */
const NEUTRAL_BG = "bg-muted/70 border border-border/60";
const NEUTRAL_ICON = "text-foreground";

const activityConfig: Record<string, ActivityIconConfig> = {
  course: { icon: Footprints, bgColor: NEUTRAL_BG, iconColor: NEUTRAL_ICON, label: "Course" },
  running: { icon: Footprints, bgColor: NEUTRAL_BG, iconColor: NEUTRAL_ICON, label: "Course" },
  velo: { icon: Bike, bgColor: NEUTRAL_BG, iconColor: NEUTRAL_ICON, label: "Vélo" },
  cycling: { icon: Bike, bgColor: NEUTRAL_BG, iconColor: NEUTRAL_ICON, label: "Vélo" },
  marche: { icon: PersonStanding, bgColor: NEUTRAL_BG, iconColor: NEUTRAL_ICON, label: "Marche" },
  walking: { icon: PersonStanding, bgColor: NEUTRAL_BG, iconColor: NEUTRAL_ICON, label: "Marche" },
  natation: { icon: Waves, bgColor: NEUTRAL_BG, iconColor: NEUTRAL_ICON, label: "Natation" },
  swimming: { icon: Waves, bgColor: NEUTRAL_BG, iconColor: NEUTRAL_ICON, label: "Natation" },
  basketball: { icon: Circle, bgColor: NEUTRAL_BG, iconColor: NEUTRAL_ICON, label: "Basketball" },
  football: { icon: Circle, bgColor: NEUTRAL_BG, iconColor: NEUTRAL_ICON, label: "Football" },
  petanque: { icon: Target, bgColor: NEUTRAL_BG, iconColor: NEUTRAL_ICON, label: "Pétanque" },
  tennis: { icon: Circle, bgColor: NEUTRAL_BG, iconColor: NEUTRAL_ICON, label: "Tennis" },
  musculation: { icon: Dumbbell, bgColor: NEUTRAL_BG, iconColor: NEUTRAL_ICON, label: "Musculation" },
  randonnee: { icon: Mountain, bgColor: NEUTRAL_BG, iconColor: NEUTRAL_ICON, label: "Randonnée" },
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
