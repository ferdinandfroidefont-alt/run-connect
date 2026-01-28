import { useState, useEffect } from 'react';
import { Progress } from '@/components/ui/progress';
import appIcon from '@/assets/app-icon.png';

const loadingPhrases = [
  "Préparation de la carte...",
  "Synchronisation des données...",
  "Chargement des séances...",
  "Connexion au serveur...",
  "Récupération de votre profil...",
  "Initialisation..."
];

interface LoadingScreenProps {
  onLoadingComplete: () => void;
}

export const LoadingScreen = ({ onLoadingComplete }: LoadingScreenProps) => {
  const [progress, setProgress] = useState(0);
  const [currentPhrase, setCurrentPhrase] = useState(loadingPhrases[0]);

  useEffect(() => {
    // Progress animation
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          return 100;
        }
        return prev + 2;
      });
    }, 50);

    // Change phrase every 500ms
    const phraseInterval = setInterval(() => {
      setCurrentPhrase(loadingPhrases[Math.floor(Math.random() * loadingPhrases.length)]);
    }, 500);

    return () => {
      clearInterval(progressInterval);
      clearInterval(phraseInterval);
    };
  }, []);

  useEffect(() => {
    if (progress >= 100) {
      const timeout = setTimeout(() => {
        onLoadingComplete();
      }, 300);
      return () => clearTimeout(timeout);
    }
  }, [progress, onLoadingComplete]);

  return (
    <div className="fixed inset-0 bg-secondary flex flex-col items-center justify-center pt-safe pb-safe px-6 -mt-12">
      {/* Welcome text */}
      <p className="text-muted-foreground text-[15px] mb-1">Bienvenue sur</p>
      
      {/* App title */}
      <h1 className="text-primary text-[32px] font-bold tracking-tight mb-10">
        RUNCONNECT
      </h1>

      {/* App Icon from assets */}
      <div className="mb-10">
        <img 
          src={appIcon} 
          alt="RunConnect" 
          className="w-[120px] h-[120px] rounded-[28px]"
          style={{ boxShadow: '0 8px 24px hsl(211 100% 50% / 0.25)' }}
        />
      </div>

      {/* Loading card */}
      <div 
        className="w-full max-w-[280px] bg-card rounded-[14px] p-5"
        style={{ boxShadow: '0 2px 8px hsl(0 0% 0% / 0.06)' }}
      >
        <p className="text-foreground text-[15px] font-medium text-center mb-3">
          Chargement en cours
        </p>
        
        {/* Progress bar */}
        <div className="mb-3">
          <Progress 
            value={progress} 
            className="h-[6px] bg-border"
          />
        </div>
        
        {/* Status phrase and percentage */}
        <div className="flex flex-col items-center gap-1">
          <p className="text-muted-foreground text-[13px] text-center">
            {currentPhrase}
          </p>
          <p className="text-primary text-[15px] font-semibold">
            {progress}%
          </p>
        </div>
      </div>
    </div>
  );
};
