import { useState, useEffect } from 'react';
import { Progress } from '@/components/ui/progress';

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
    <div className="fixed inset-0 bg-secondary flex flex-col items-center justify-center pt-safe pb-safe px-6">
      {/* Welcome text */}
      <p className="text-muted-foreground text-[15px] mb-1">Bienvenue sur</p>
      
      {/* App title */}
      <h1 className="text-primary text-[32px] font-bold tracking-tight mb-10">
        RUNCONNECT
      </h1>

      {/* Custom RunConnect Icon */}
      <div className="mb-10">
        <div 
          className="w-[120px] h-[120px] rounded-[28px] bg-primary flex items-center justify-center"
          style={{ boxShadow: '0 8px 24px hsl(211 100% 50% / 0.25)' }}
        >
          <svg 
            width="70" 
            height="70" 
            viewBox="0 0 70 70" 
            fill="none" 
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Runner silhouette */}
            <circle cx="35" cy="12" r="6" fill="white"/>
            <path 
              d="M28 22C28 22 32 20 35 20C38 20 42 22 42 22L46 32L42 34L38 28L40 42L48 54L44 56L35 44L26 56L22 54L30 42L32 28L28 34L24 32L28 22Z" 
              fill="white"
            />
            
            {/* Calendar icon (top right) */}
            <rect x="48" y="8" width="14" height="12" rx="2" fill="white" fillOpacity="0.9"/>
            <rect x="50" y="6" width="2" height="3" rx="1" fill="white"/>
            <rect x="58" y="6" width="2" height="3" rx="1" fill="white"/>
            <line x1="48" y1="13" x2="62" y2="13" stroke="hsl(211, 100%, 50%)" strokeWidth="1.5"/>
            <circle cx="52" cy="16" r="1" fill="hsl(211, 100%, 50%)"/>
            <circle cx="55" cy="16" r="1" fill="hsl(211, 100%, 50%)"/>
            <circle cx="58" cy="16" r="1" fill="hsl(211, 100%, 50%)"/>
            
            {/* Location pin (bottom right) */}
            <path 
              d="M54 42C54 42 48 50 48 54C48 58.4183 50.6863 62 54 62C57.3137 62 60 58.4183 60 54C60 50 54 42 54 42Z" 
              fill="white" 
              fillOpacity="0.9"
            />
            <circle cx="54" cy="54" r="3" fill="hsl(211, 100%, 50%)"/>
          </svg>
        </div>
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
