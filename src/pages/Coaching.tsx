import { useAppPreview } from "@/contexts/AppPreviewContext";
import { CoachPlanningExperience } from "@/components/coaching/CoachPlanningExperience";
import { CoachingPreviewExperience } from "@/components/coaching/CoachingPreviewExperience";

export default function Coaching() {
  const { isPreviewMode, previewIdentity } = useAppPreview();
  if (isPreviewMode && previewIdentity) {
    if (previewIdentity.role === "coach" || previewIdentity.role === "both") {
      return <CoachPlanningExperience />;
    }
    return <CoachingPreviewExperience identity={previewIdentity} />;
  }
  return <CoachPlanningExperience />;
}
