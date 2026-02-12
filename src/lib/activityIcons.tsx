import { 
  Bike, 
  Footprints, 
  PersonStanding, 
  Waves, 
  Target, 
  Circle,
  Dumbbell,
  Mountain,
  type LucideIcon
} from "lucide-react";

interface ActivityIconConfig {
  icon: LucideIcon;
  bgColor: string;
  iconColor: string;
  label: string;
}

const activityConfig: Record<string, ActivityIconConfig> = {
  course: {
    icon: Footprints,
    bgColor: "bg-red-500",
    iconColor: "text-white",
    label: "Course"
  },
  running: {
    icon: Footprints,
    bgColor: "bg-red-500",
    iconColor: "text-white",
    label: "Course"
  },
  velo: {
    icon: Bike,
    bgColor: "bg-blue-500",
    iconColor: "text-white",
    label: "Vélo"
  },
  cycling: {
    icon: Bike,
    bgColor: "bg-blue-500",
    iconColor: "text-white",
    label: "Vélo"
  },
  marche: {
    icon: PersonStanding,
    bgColor: "bg-green-500",
    iconColor: "text-white",
    label: "Marche"
  },
  walking: {
    icon: PersonStanding,
    bgColor: "bg-green-500",
    iconColor: "text-white",
    label: "Marche"
  },
  natation: {
    icon: Waves,
    bgColor: "bg-cyan-500",
    iconColor: "text-white",
    label: "Natation"
  },
  swimming: {
    icon: Waves,
    bgColor: "bg-cyan-500",
    iconColor: "text-white",
    label: "Natation"
  },
  basketball: {
    icon: Circle,
    bgColor: "bg-orange-500",
    iconColor: "text-white",
    label: "Basketball"
  },
  football: {
    icon: Circle,
    bgColor: "bg-emerald-600",
    iconColor: "text-white",
    label: "Football"
  },
  petanque: {
    icon: Target,
    bgColor: "bg-amber-700",
    iconColor: "text-white",
    label: "Pétanque"
  },
  tennis: {
    icon: Circle,
    bgColor: "bg-yellow-500",
    iconColor: "text-white",
    label: "Tennis"
  },
  musculation: {
    icon: Dumbbell,
    bgColor: "bg-purple-500",
    iconColor: "text-white",
    label: "Musculation"
  },
  randonnee: {
    icon: Mountain,
    bgColor: "bg-teal-600",
    iconColor: "text-white",
    label: "Randonnée"
  }
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
    lg: "h-12 w-12 rounded-xl"
  };
  
  const iconSizes = {
    sm: "h-4 w-4",
    md: "h-5 w-5",
    lg: "h-6 w-6"
  };
  
  return (
    <div className={`${sizeClasses[size]} ${config.bgColor} flex items-center justify-center flex-shrink-0 ${className}`}>
      <Icon className={`${iconSizes[size]} ${config.iconColor}`} />
    </div>
  );
};

export const getActivityLabel = (activityType: string): string => {
  return activityConfig[activityType]?.label || "Activité";
};

export const getActivityConfig = (activityType: string): ActivityIconConfig => {
  return activityConfig[activityType] || activityConfig.course;
};
