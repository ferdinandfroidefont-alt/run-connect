import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
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
  setUnit: (u: DistanceUnit) => void;
  formatMeters: (meters: number | null | undefined) => string;
  formatKm: (km: number | null | undefined) => string;
  formatSpeed: (kmh: number | null | undefined) => string;
};

const DistanceUnitsContext = createContext<DistanceUnitsContextValue | undefined>(undefined);

export function DistanceUnitsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { userProfile, refreshProfile } = useUserProfile();
  const [unit, setUnitState] = useState<DistanceUnit>(() => readDistanceUnitFromStorage());

  useEffect(() => {
    if (!user) {
      setUnitState(readDistanceUnitFromStorage());
      return;
    }
    const fromProfile = (userProfile as { distance_unit?: string } | null)?.distance_unit;
    if (fromProfile === "mi" || fromProfile === "km") {
      setUnitState(fromProfile);
      try {
        localStorage.setItem(DISTANCE_UNIT_STORAGE_KEY, fromProfile);
      } catch {
        /* ignore */
      }
    }
  }, [user, userProfile]);

  const setUnit = useCallback(
    async (u: DistanceUnit) => {
      setUnitState(u);
      try {
        localStorage.setItem(DISTANCE_UNIT_STORAGE_KEY, u);
      } catch {
        /* ignore */
      }
      if (!user?.id) return;
      try {
        const { error } = await supabase.from("profiles").update({ distance_unit: u }).eq("user_id", user.id);
        if (!error) void refreshProfile();
      } catch {
        /* colonne absente tant que la migration n’est pas appliquée : le localStorage suffit */
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
