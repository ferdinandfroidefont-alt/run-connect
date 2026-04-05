import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "@/hooks/useAuth";
import { useUserProfile } from "@/contexts/UserProfileContext";
import { supabase } from "@/integrations/supabase/client";
import {
  type DistanceUnit,
  DISTANCE_UNIT_STORAGE_KEY,
  formatDistanceKm,
  formatDistanceMeters,
  formatSpeedKmh,
  readDistanceUnitFromStorage,
} from "@/lib/distanceUnits";

type DistanceUnitsContextValue = {
  unit: DistanceUnit;
  /** @returns false si l’enregistrement profil a échoué (compte connecté uniquement) */
  setUnit: (u: DistanceUnit) => Promise<boolean>;
  formatMeters: (meters: number | null | undefined) => string;
  formatKm: (km: number | null | undefined) => string;
  formatSpeed: (kmh: number | null | undefined) => string;
};

const DistanceUnitsContext = createContext<DistanceUnitsContextValue | undefined>(undefined);

export function DistanceUnitsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { userProfile, refreshProfile } = useUserProfile();
  const [unit, setUnitState] = useState<DistanceUnit>(() => readDistanceUnitFromStorage());
  /** Tant que le serveur n’a pas la même valeur, on n’écrase pas l’UI avec un ancien profil. */
  const optimisticDistanceUnitRef = useRef<DistanceUnit | null>(null);

  useEffect(() => {
    if (!user) {
      optimisticDistanceUnitRef.current = null;
      setUnitState(readDistanceUnitFromStorage());
      return;
    }
    const fromProfile = (userProfile as { distance_unit?: string } | null)?.distance_unit;
    if (fromProfile !== "mi" && fromProfile !== "km") {
      return;
    }
    const pending = optimisticDistanceUnitRef.current;
    if (pending !== null) {
      if (fromProfile === pending) {
        optimisticDistanceUnitRef.current = null;
      } else {
        return;
      }
    }
    setUnitState(fromProfile);
    try {
      localStorage.setItem(DISTANCE_UNIT_STORAGE_KEY, fromProfile);
    } catch {
      /* ignore */
    }
  }, [user, userProfile]);

  const setUnit = useCallback(
    async (u: DistanceUnit) => {
      optimisticDistanceUnitRef.current = u;
      setUnitState(u);
      try {
        localStorage.setItem(DISTANCE_UNIT_STORAGE_KEY, u);
      } catch {
        /* ignore */
      }
      if (!user?.id) {
        optimisticDistanceUnitRef.current = null;
        return true;
      }
      try {
        const { error } = await supabase.from("profiles").update({ distance_unit: u } as any).eq("user_id", user.id);
        if (error) {
          console.error("[DistanceUnits] distance_unit update failed:", error.message);
          return false;
        }
        await refreshProfile();
        return true;
      } catch (e) {
        console.error("[DistanceUnits] distance_unit update error:", e);
        return false;
      }
    },
    [user?.id, refreshProfile]
  );

  const value = useMemo<DistanceUnitsContextValue>(
    () => ({
      unit,
      setUnit,
      formatMeters: (meters) => formatDistanceMeters(meters, unit),
      formatKm: (km) => formatDistanceKm(km, unit),
      formatSpeed: (kmh) => formatSpeedKmh(kmh, unit),
    }),
    [unit, setUnit]
  );

  return <DistanceUnitsContext.Provider value={value}>{children}</DistanceUnitsContext.Provider>;
}

export function useDistanceUnits() {
  const ctx = useContext(DistanceUnitsContext);
  if (!ctx) {
    throw new Error("useDistanceUnits must be used within DistanceUnitsProvider");
  }
  return ctx;
}
