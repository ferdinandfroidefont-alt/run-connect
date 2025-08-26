import { useCallback, useEffect, useRef } from 'react';
import { useAppContext } from '@/contexts/AppContext';

export const useSoundFeedback = () => {
  const { soundEnabled } = useAppContext();
  const audioContextRef = useRef<{ createClickSound: () => void } | null>(null);

  useEffect(() => {
    console.log('🔊 useSoundFeedback: Initializing sound system');
    // Créer un son synthétique court
    if (typeof window !== 'undefined' && 'AudioContext' in window) {
      console.log('🔊 AudioContext available, creating click sound');
      // Créer un son de click synthétique très court
      const createClickSound = () => {
        console.log('🔊 Creating click sound');
        try {
          const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
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
          
          console.log('🔊 Click sound played successfully');
        } catch (error) {
          console.error('🔊 Error creating click sound:', error);
        }
      };
      
      // Stocker la fonction de création dans la ref
      audioContextRef.current = { createClickSound };
      console.log('🔊 Sound system initialized');
    } else {
      console.warn('🔊 AudioContext not available');
    }
  }, []);

  const playClick = useCallback(() => {
    console.log('🔊 playClick called, soundEnabled:', soundEnabled);
    if (soundEnabled && audioContextRef.current) {
      console.log('🔊 Attempting to play click sound');
      try {
        audioContextRef.current.createClickSound();
      } catch (error) {
        console.error('🔊 Cannot play click sound:', error);
      }
    } else {
      console.log('🔊 Sound disabled or context not available');
    }
  }, [soundEnabled]);

  return { playClick };
};