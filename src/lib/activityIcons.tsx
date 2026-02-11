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
  gradient: string;
  shadow: string;
  label: string;
}

const activityConfig: Record<string, ActivityIconConfig> = {
  course: {
    icon: Footprints,
    gradient: "linear-gradient(145deg, #FF6B6B 0%, #EE3B3B 50%, #CC2929 100%)",
    shadow: "0 4px 12px rgba(238, 59, 59, 0.4), inset 0 1px 1px rgba(255, 255, 255, 0.25)",
    label: "Course"
  },
  running: {
    icon: Footprints,
    gradient: "linear-gradient(145deg, #FF6B6B 0%, #EE3B3B 50%, #CC2929 100%)",
    shadow: "0 4px 12px rgba(238, 59, 59, 0.4), inset 0 1px 1px rgba(255, 255, 255, 0.25)",
    label: "Course"
  },
  velo: {
    icon: Bike,
    gradient: "linear-gradient(145deg, #5AC8FA 0%, #007AFF 50%, #0055D4 100%)",
    shadow: "0 4px 12px rgba(0, 122, 255, 0.4), inset 0 1px 1px rgba(255, 255, 255, 0.25)",
    label: "Vélo"
  },
  cycling: {
    icon: Bike,
    gradient: "linear-gradient(145deg, #5AC8FA 0%, #007AFF 50%, #0055D4 100%)",
    shadow: "0 4px 12px rgba(0, 122, 255, 0.4), inset 0 1px 1px rgba(255, 255, 255, 0.25)",
    label: "Vélo"
  },
  marche: {
    icon: PersonStanding,
    gradient: "linear-gradient(145deg, #5AF0A8 0%, #34C759 50%, #248A3D 100%)",
    shadow: "0 4px 12px rgba(52, 199, 89, 0.4), inset 0 1px 1px rgba(255, 255, 255, 0.25)",
    label: "Marche"
  },
  walking: {
    icon: PersonStanding,
    gradient: "linear-gradient(145deg, #5AF0A8 0%, #34C759 50%, #248A3D 100%)",
    shadow: "0 4px 12px rgba(52, 199, 89, 0.4), inset 0 1px 1px rgba(255, 255, 255, 0.25)",
    label: "Marche"
  },
  natation: {
    icon: Waves,
    gradient: "linear-gradient(145deg, #70D7FF 0%, #32ADE6 50%, #1A8FC4 100%)",
    shadow: "0 4px 12px rgba(50, 173, 230, 0.4), inset 0 1px 1px rgba(255, 255, 255, 0.25)",
    label: "Natation"
  },
  swimming: {
    icon: Waves,
    gradient: "linear-gradient(145deg, #70D7FF 0%, #32ADE6 50%, #1A8FC4 100%)",
    shadow: "0 4px 12px rgba(50, 173, 230, 0.4), inset 0 1px 1px rgba(255, 255, 255, 0.25)",
    label: "Natation"
  },
  basketball: {
    icon: Circle,
    gradient: "linear-gradient(145deg, #FFB340 0%, #FF9500 50%, #CC7700 100%)",
    shadow: "0 4px 12px rgba(255, 149, 0, 0.4), inset 0 1px 1px rgba(255, 255, 255, 0.25)",
    label: "Basketball"
  },
  football: {
    icon: Circle,
    gradient: "linear-gradient(145deg, #4ADE80 0%, #22C55E 50%, #15803D 100%)",
    shadow: "0 4px 12px rgba(34, 197, 94, 0.4), inset 0 1px 1px rgba(255, 255, 255, 0.25)",
    label: "Football"
  },
  petanque: {
    icon: Target,
    gradient: "linear-gradient(145deg, #D4A574 0%, #A0826D 50%, #7A5C4F 100%)",
    shadow: "0 4px 12px rgba(160, 130, 109, 0.4), inset 0 1px 1px rgba(255, 255, 255, 0.25)",
    label: "Pétanque"
  },
  tennis: {
    icon: Circle,
    gradient: "linear-gradient(145deg, #FFE066 0%, #FFCC00 50%, #D4AA00 100%)",
    shadow: "0 4px 12px rgba(255, 204, 0, 0.4), inset 0 1px 1px rgba(255, 255, 255, 0.25)",
    label: "Tennis"
  },
  musculation: {
    icon: Dumbbell,
    gradient: "linear-gradient(145deg, #BF7AF0 0%, #AF52DE 50%, #8944B3 100%)",
    shadow: "0 4px 12px rgba(175, 82, 222, 0.4), inset 0 1px 1px rgba(255, 255, 255, 0.25)",
    label: "Musculation"
  },
  randonnee: {
    icon: Mountain,
    gradient: "linear-gradient(145deg, #6DD5C0 0%, #30B0A0 50%, #1F8A7D 100%)",
    shadow: "0 4px 12px rgba(48, 176, 160, 0.4), inset 0 1px 1px rgba(255, 255, 255, 0.25)",
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
    sm: "h-8 w-8 rounded-[7px]",
    md: "h-10 w-10 rounded-[10px]",
    lg: "h-12 w-12 rounded-[12px]"
  };
  
  const iconSizes = {
    sm: "h-4 w-4",
    md: "h-5 w-5",
    lg: "h-6 w-6"
  };
  
  return (
    <div 
      className={`${sizeClasses[size]} flex items-center justify-center flex-shrink-0 relative overflow-hidden ${className}`}
      style={{ 
        background: config.gradient,
        boxShadow: config.shadow,
      }}
    >
      {/* iOS glossy highlight */}
      <div 
        className="absolute inset-x-0 top-0 h-[45%] rounded-t-[inherit] pointer-events-none"
        style={{
          background: "linear-gradient(180deg, rgba(255,255,255,0.35) 0%, rgba(255,255,255,0.05) 100%)",
        }}
      />
      <Icon className={`${iconSizes[size]} text-white relative z-10 drop-shadow-[0_1px_1px_rgba(0,0,0,0.15)]`} strokeWidth={2.2} />
    </div>
  );
};

export const getActivityLabel = (activityType: string): string => {
  return activityConfig[activityType]?.label || "Activité";
};

export const getActivityConfig = (activityType: string): ActivityIconConfig => {
  return activityConfig[activityType] || activityConfig.course;
};
