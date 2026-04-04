import { createContext, useContext, useState, useCallback, ReactNode } from "react";

export type HomeFeedSheetSnap = 0 | 1 | 2;

interface AppContextType {
  refreshSessions: () => void;
  setRefreshSessions: (refresh: () => void) => void;
  openCreateSession: () => void;
  setOpenCreateSession: (openFunction: () => void) => void;
  openCreateRoute: () => void;
  setOpenCreateRoute: (openFunction: () => void) => void;
  hideBottomNav: boolean;
  setHideBottomNav: (hide: boolean) => void;
  /** Ouvre / ajuste la bottom sheet Feed sur l’accueil (0 = bandeau, 1 = mi-hauteur, 2 = quasi plein écran). */
  requestHomeFeedSheetSnap: (snap: HomeFeedSheetSnap) => void;
  homeFeedSheetRequest: { snap: HomeFeedSheetSnap; id: number } | null;
  clearHomeFeedSheetRequest: () => void;
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
  const [hideBottomNav, setHideBottomNav] = useState(false);
  const [homeFeedSheetRequest, setHomeFeedSheetRequest] = useState<{
    snap: HomeFeedSheetSnap;
    id: number;
  } | null>(null);

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
      setHideBottomNav,
      homeFeedSheetRequest,
      clearHomeFeedSheetRequest,
      requestHomeFeedSheetSnap,
    }}>
      {children}
    </AppContext.Provider>
  );
};