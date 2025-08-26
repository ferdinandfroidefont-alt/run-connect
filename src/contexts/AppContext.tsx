import { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';

interface AppContextType {
  refreshSessions: () => void;
  setRefreshSessions: (refresh: () => void) => void;
  openCreateSession: () => void;
  setOpenCreateSession: (openFunction: () => void) => void;
  openCreateRoute: () => void;
  setOpenCreateRoute: (openFunction: () => void) => void;
  soundEnabled: boolean;
  setSoundEnabled: (enabled: boolean) => void;
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
  const [soundEnabled, setSoundEnabledState] = useState<boolean>(() => {
    const saved = localStorage.getItem('soundEnabled');
    const result = saved !== null ? JSON.parse(saved) : true;
    console.log('🔊 AppContext: soundEnabled initialized to:', result);
    return result;
  });

  useEffect(() => {
    console.log('🔊 AppContext: saving soundEnabled to localStorage:', soundEnabled);
    localStorage.setItem('soundEnabled', JSON.stringify(soundEnabled));
  }, [soundEnabled]);

  const setSoundEnabled = useCallback((enabled: boolean) => {
    setSoundEnabledState(enabled);
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
      soundEnabled,
      setSoundEnabled
    }}>
      {children}
    </AppContext.Provider>
  );
};