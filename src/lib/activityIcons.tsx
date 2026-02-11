import runningIcon from "@/assets/activity-icons/running.png";
import cyclingIcon from "@/assets/activity-icons/cycling.png";
import walkingIcon from "@/assets/activity-icons/walking.png";
import swimmingIcon from "@/assets/activity-icons/swimming.png";
import basketballIcon from "@/assets/activity-icons/basketball.png";
import footballIcon from "@/assets/activity-icons/football.png";
import petanqueIcon from "@/assets/activity-icons/petanque.png";
import tennisIcon from "@/assets/activity-icons/tennis.png";
import musculationIcon from "@/assets/activity-icons/musculation.png";
import randonneeIcon from "@/assets/activity-icons/randonnee.png";

interface ActivityIconConfig {
  image: string;
  label: string;
}

const activityConfig: Record<string, ActivityIconConfig> = {
  course: { image: runningIcon, label: "Course" },
  running: { image: runningIcon, label: "Course" },
  velo: { image: cyclingIcon, label: "Vélo" },
  cycling: { image: cyclingIcon, label: "Vélo" },
  marche: { image: walkingIcon, label: "Marche" },
  walking: { image: walkingIcon, label: "Marche" },
  natation: { image: swimmingIcon, label: "Natation" },
  swimming: { image: swimmingIcon, label: "Natation" },
  basketball: { image: basketballIcon, label: "Basketball" },
  football: { image: footballIcon, label: "Football" },
  petanque: { image: petanqueIcon, label: "Pétanque" },
  tennis: { image: tennisIcon, label: "Tennis" },
  musculation: { image: musculationIcon, label: "Musculation" },
  randonnee: { image: randonneeIcon, label: "Randonnée" },
};

interface ActivityIconProps {
  activityType: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export const ActivityIcon = ({ activityType, size = "md", className = "" }: ActivityIconProps) => {
  const config = activityConfig[activityType] || activityConfig.course;

  const sizeClasses = {
    sm: "h-8 w-8 rounded-md",
    md: "h-10 w-10 rounded-[10px]",
    lg: "h-12 w-12 rounded-xl"
  };

  return (
    <div className={`${sizeClasses[size]} flex items-center justify-center flex-shrink-0 overflow-hidden ${className}`}>
      <img
        src={config.image}
        alt={config.label}
        className="w-full h-full object-cover"
      />
    </div>
  );
};

export const getActivityLabel = (activityType: string): string => {
  return activityConfig[activityType]?.label || "Activité";
};

export const getActivityConfig = (activityType: string): ActivityIconConfig => {
  return activityConfig[activityType] || activityConfig.course;
};
