import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface AppContextType {
  refreshSessions: () => void;
  setRefreshSessions: (refresh: () => void) => void;
  openCreateSession: () => void;
  setOpenCreateSession: (openFunction: () => void) => void;
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

  const setRefreshSessions = useCallback((refresh: () => void) => {
    setRefreshSessionsState(() => refresh);
  }, []);

  const setOpenCreateSession = useCallback((openFunction: () => void) => {
    setOpenCreateSessionState(() => openFunction);
  }, []);

  return (
    <AppContext.Provider value={{ 
      refreshSessions, 
      setRefreshSessions, 
      openCreateSession,
      setOpenCreateSession 
    }}>
      {children}
    </AppContext.Provider>
  );
};