import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAppContext } from "@/contexts/AppContext";

/**
 * Ancienne route /feed : ouvre la bottom sheet Feed sur l’accueil et revient sur la carte.
 */
export default function Feed() {
  const navigate = useNavigate();
  const { requestHomeFeedSheetSnap } = useAppContext();

  useEffect(() => {
    requestHomeFeedSheetSnap(2);
    navigate("/", { replace: true });
  }, [navigate, requestHomeFeedSheetSnap]);

  return null;
}
