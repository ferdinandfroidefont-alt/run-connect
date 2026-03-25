import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  type DistanceUnit,
  DISTANCE_UNIT_STORAGE_KEY,
  readDistanceUnitFromStorage,
} from '@/lib/distanceUnits';

type DistanceUnitContextValue = {
  distanceUnit: DistanceUnit;
  setDistanceUnit: (u: DistanceUnit) => void;
};

const DistanceUnitContext = createContext<DistanceUnitContextValue | undefined>(undefined);

export function DistanceUnitProvider({ children }: { children: ReactNode }) {
  const [distanceUnit, setDistanceUnitState] = useState<DistanceUnit>(() =>
    typeof window !== 'undefined' ? readDistanceUnitFromStorage() : 'km'
  );

  const setDistanceUnit = useCallback((u: DistanceUnit) => {
    setDistanceUnitState(u);
    try {
      localStorage.setItem(DISTANCE_UNIT_STORAGE_KEY, u);
    } catch {
      /* ignore */
    }
  }, []);

  const value = useMemo(
    () => ({ distanceUnit, setDistanceUnit }),
    [distanceUnit, setDistanceUnit]
  );

  return (
    <DistanceUnitContext.Provider value={value}>{children}</DistanceUnitContext.Provider>
  );
}

export function useDistanceUnit(): DistanceUnitContextValue {
  const ctx = useContext(DistanceUnitContext);
  if (!ctx) {
    throw new Error('useDistanceUnit must be used within DistanceUnitProvider');
  }
  return ctx;
}
