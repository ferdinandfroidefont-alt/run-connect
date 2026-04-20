import { Navigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { ProfileOtherUserShell } from "@/pages/ProfileOtherUserShell";

/**
 * `/profile` : profil perso → redirection accueil + ouverture du ProfileDialog.
 * `/profile?user=` autre utilisateur → aperçu. `?tab=settings` → accueil + paramètres.
 */
export default function ProfileEntry() {
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const queryUser = searchParams.get("user");
  const tab = searchParams.get("tab");
  const focus = searchParams.get("focus") ?? "";

  if (queryUser && user?.id && queryUser !== user.id) {
    return <ProfileOtherUserShell userId={queryUser} />;
  }
  if (queryUser && user?.id && queryUser === user.id) {
    return <Navigate to="/" replace state={{ openProfileDialog: true }} />;
  }
  if (tab === "settings") {
    return <Navigate to="/" replace state={{ openSettingsDialog: true, settingsFocus: focus }} />;
  }
  return <Navigate to="/" replace state={{ openProfileDialog: true }} />;
}
