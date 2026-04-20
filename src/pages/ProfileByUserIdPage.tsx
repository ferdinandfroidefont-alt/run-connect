import { Navigate, useParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { ProfileOtherUserShell } from "@/pages/ProfileOtherUserShell";

/**
 * `/profile/:userId` — autre membre : aperçu ; soi-même : même UI que la photo accueil (dialog).
 */
export default function ProfileByUserIdPage() {
  const { userId } = useParams();
  const { user } = useAuth();

  if (!userId) {
    return <Navigate to="/" replace />;
  }
  if (user?.id && userId === user.id) {
    return <Navigate to="/" replace state={{ openProfileDialog: true }} />;
  }
  return <ProfileOtherUserShell userId={userId} />;
}
