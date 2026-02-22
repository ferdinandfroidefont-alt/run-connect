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
  const [phraseOpacity, setPhraseOpacity] = useState(1);

  // Couleurs iOS Status Bar + WKWebView background
  useEffect(() => {
    document.documentElement.style.setProperty('--ios-top-color', '#465467');
    document.documentElement.style.backgroundColor = '#465467';
    document.body.style.backgroundColor = '#465467';
    return () => {
      document.documentElement.style.removeProperty('--ios-top-color');
      document.documentElement.style.removeProperty('background-color');
      document.body.style.removeProperty('background-color');
    };
  }, []);

  useEffect(() => {
    // Smooth eased progress
    let elapsed = 0;
    const duration = 2800;
    const progressInterval = setInterval(() => {
      elapsed += 30;
      const t = Math.min(elapsed / duration, 1);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - t, 3);
      setProgress(Math.round(eased * 100));
      if (t >= 1) clearInterval(progressInterval);
    }, 30);

    // Change phrase every 1.5s with fade
    let phraseIndex = 0;
    const phraseInterval = setInterval(() => {
      setPhraseOpacity(0);
      setTimeout(() => {
        phraseIndex = (phraseIndex + 1) % loadingPhrases.length;
        setCurrentPhrase(loadingPhrases[phraseIndex]);
        setPhraseOpacity(1);
      }, 200);
    }, 1500);

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
    <div 
      className="fixed inset-0 z-50 bg-secondary flex flex-col items-center justify-center px-6"
    >
      {/* Pattern overlay without isolation:isolate */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: "url('/patterns/sports-pattern.png')",
          backgroundRepeat: 'repeat',
          backgroundSize: '256px 256px',
          opacity: 0.06
        }}
      />
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
          <p 
            className="text-muted-foreground text-[13px] text-center transition-opacity duration-200"
            style={{ opacity: phraseOpacity }}
          >
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
