import { useCallback, useEffect, useRef } from 'react';
import { useAppContext } from '@/contexts/AppContext';

export const useSoundFeedback = () => {
  const { soundEnabled } = useAppContext();
  const audioContextRef = useRef<{ createClickSound: () => void } | null>(null);

  useEffect(() => {
    // Créer un son synthétique court
    if (typeof window !== 'undefined' && 'AudioContext' in window) {
      // Créer un son de click synthétique très court
      const createClickSound = () => {
        const audioContext = new AudioContext();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(200, audioContext.currentTime + 0.02);
        
        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.02);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.02);
        
        return { audioContext, oscillator, gainNode };
      };
      
      // Stocker la fonction de création dans la ref
      audioContextRef.current = { createClickSound };
    }
  }, []);

  const playClick = useCallback(() => {
    if (soundEnabled && audioContextRef.current) {
      try {
        audioContextRef.current.createClickSound();
      } catch (error) {
        // Ignore les erreurs (contexte audio non initialisé, etc.)
        console.debug('Cannot play click sound:', error);
      }
    }
  }, [soundEnabled]);

  return { playClick };
};