import { createContext, useContext, useState, useCallback, useMemo, ReactNode } from "react";

export type HomeFeedSheetSnap = 0 | 1 | 2;

interface AppContextType {
  refreshSessions: () => void;
  setRefreshSessions: (refresh: () => void) => void;
  openCreateSession: () => void;
  setOpenCreateSession: (openFunction: () => void) => void;
  openCreateRoute: () => void;
  setOpenCreateRoute: (openFunction: () => void) => void;
  hideBottomNav: boolean;
  /** Masque la tab bar si au moins une raison est active (logique OU — évite les conflits entre écrans). */
  setBottomNavSuppressed: (id: string, suppressed: boolean) => void;
  /** @deprecated Préférer setBottomNavSuppressed avec un id stable. */
  setHideBottomNav: (hide: boolean) => void;
  /** Ouvre / ajuste la bottom sheet Feed sur l’accueil (0 = bandeau, 1 = mi-hauteur, 2 = quasi plein écran). */
  requestHomeFeedSheetSnap: (snap: HomeFeedSheetSnap) => void;
  homeFeedSheetRequest: { snap: HomeFeedSheetSnap; id: number } | null;
  clearHomeFeedSheetRequest: () => void;
  /** Carte accueil en plein écran (immersif) : masque le panneau Feed et le FAB création. */
  homeMapImmersive: boolean;
  setHomeMapImmersive: (value: boolean) => void;
  /** État du panneau Feed accueil (0 = replié) — pour masquer le FAB « Programmer une séance ». */
  homeFeedSheetSnap: HomeFeedSheetSnap;
  setHomeFeedSheetSnap: (snap: HomeFeedSheetSnap) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within AppProvider');
  }
  return context;
};

interface AppProviderProps {
  children: ReactNode;
}

export const AppProvider = ({ children }: AppProviderProps) => {
  const [refreshSessions, setRefreshSessionsState] = useState<() => void>(() => () => {});
  const [openCreateSession, setOpenCreateSessionState] = useState<() => void>(() => () => {});
  const [openCreateRoute, setOpenCreateRouteState] = useState<() => void>(() => () => {});
  const [bottomNavSuppressors, setBottomNavSuppressors] = useState<Record<string, boolean>>({});

  const setBottomNavSuppressed = useCallback((id: string, suppressed: boolean) => {
    setBottomNavSuppressors((prev) => {
      const next = { ...prev };
      if (suppressed) next[id] = true;
      else delete next[id];
      return next;
    });
  }, []);

  const hideBottomNav = useMemo(
    () => Object.values(bottomNavSuppressors).some(Boolean),
    [bottomNavSuppressors]
  );

  /** Compat : une seule bascule sans id (écrans legacy). */
  const setHideBottomNav = useCallback(
    (hide: boolean) => {
      setBottomNavSuppressed("_legacy", hide);
    },
    [setBottomNavSuppressed]
  );
  const [homeFeedSheetRequest, setHomeFeedSheetRequest] = useState<{
    snap: HomeFeedSheetSnap;
    id: number;
  } | null>(null);
  const [homeMapImmersive, setHomeMapImmersive] = useState(false);
  const [homeFeedSheetSnap, setHomeFeedSheetSnap] = useState<HomeFeedSheetSnap>(0);

  const requestHomeFeedSheetSnap = useCallback((snap: HomeFeedSheetSnap) => {
    setHomeFeedSheetRequest({ snap, id: Date.now() });
  }, []);

  const clearHomeFeedSheetRequest = useCallback(() => {
    setHomeFeedSheetRequest(null);
  }, []);

  const setRefreshSessions = useCallback((refresh: () => void) => {
    setRefreshSessionsState(() => refresh);
  }, []);

  const setOpenCreateSession = useCallback((openFunction: () => void) => {
    setOpenCreateSessionState(() => openFunction);
  }, []);

  const setOpenCreateRoute = useCallback((openFunction: () => void) => {
    setOpenCreateRouteState(() => openFunction);
  }, []);

  return (
    <AppContext.Provider value={{ 
      refreshSessions, 
      setRefreshSessions, 
      openCreateSession,
      setOpenCreateSession,
      openCreateRoute,
      setOpenCreateRoute,
      hideBottomNav,
      setBottomNavSuppressed,
      setHideBottomNav,
      homeFeedSheetRequest,
      clearHomeFeedSheetRequest,
      requestHomeFeedSheetSnap,
      homeMapImmersive,
      setHomeMapImmersive,
      homeFeedSheetSnap,
      setHomeFeedSheetSnap,
    }}>
      {children}
    </AppContext.Provider>
  );
};