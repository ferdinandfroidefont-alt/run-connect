import React, { createContext, useContext, useState, useEffect } from 'react';

interface SoundContextType {
  soundEnabled: boolean;
  setSoundEnabled: (enabled: boolean) => void;
}

const SoundContext = createContext<SoundContextType | undefined>(undefined);

export const useSoundSettings = () => {
  const context = useContext(SoundContext);
  if (!context) {
    throw new Error('useSoundSettings must be used within SoundProvider');
  }
  return context;
};

interface SoundProviderProps {
  children: React.ReactNode;
}

export const SoundProvider: React.FC<SoundProviderProps> = ({ children }) => {
  const [soundEnabled, setSoundEnabledState] = useState(() => {
    const saved = localStorage.getItem('soundFeedbackEnabled');
    return saved !== 'false'; // Default to true
  });

  const setSoundEnabled = (enabled: boolean) => {
    setSoundEnabledState(enabled);
    localStorage.setItem('soundFeedbackEnabled', enabled.toString());
  };

  useEffect(() => {
    localStorage.setItem('soundFeedbackEnabled', soundEnabled.toString());
  }, [soundEnabled]);

  return (
    <SoundContext.Provider value={{ soundEnabled, setSoundEnabled }}>
      {children}
    </SoundContext.Provider>
  );
};