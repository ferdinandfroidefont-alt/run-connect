import { useAppPreview } from "@/contexts/AppPreviewContext";
import { CoachPlanningExperience } from "@/components/coaching/CoachPlanningExperience";
import { CoachingPreviewExperience } from "@/components/coaching/CoachingPreviewExperience";

export default function Coaching() {
  const { isPreviewMode, previewIdentity } = useAppPreview();
  if (isPreviewMode && previewIdentity) {
    return <CoachingPreviewExperience identity={previewIdentity} />;
  }
  return <CoachPlanningExperience />;
}
