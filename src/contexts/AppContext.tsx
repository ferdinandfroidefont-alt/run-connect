import { createContext, useContext, useState, ReactNode } from 'react';

interface AppContextType {
  refreshSessions: () => void;
  setRefreshSessions: (refresh: () => void) => void;
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

  const setRefreshSessions = (refresh: () => void) => {
    setRefreshSessionsState(() => refresh);
  };

  return (
    <AppContext.Provider value={{ refreshSessions, setRefreshSessions }}>
      {children}
    </AppContext.Provider>
  );
};