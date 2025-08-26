import { useCallback, useRef } from 'react';

// Create audio context and sounds
const audioContext = typeof window !== 'undefined' 
  ? new (window.AudioContext || (window as any).webkitAudioContext)() 
  : null;

// Generate a subtle click sound
const createClickSound = () => {
  if (!audioContext) return null;
  
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();
  
  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);
  
  // Subtle click sound settings
  oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
  oscillator.frequency.exponentialRampToValueAtTime(400, audioContext.currentTime + 0.1);
  
  gainNode.gain.setValueAtTime(0, audioContext.currentTime);
  gainNode.gain.linearRampToValueAtTime(0.1, audioContext.currentTime + 0.01);
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
  
  oscillator.start(audioContext.currentTime);
  oscillator.stop(audioContext.currentTime + 0.1);
  
  return { oscillator, gainNode };
};

export const useSoundFeedback = () => {
  const lastPlayTime = useRef(0);
  
  const playClickSound = useCallback(() => {
    // Check if sound feedback is enabled
    const soundEnabled = localStorage.getItem('soundFeedbackEnabled');
    if (soundEnabled === 'false') return;
    
    // Throttle sound to prevent spam
    const now = Date.now();
    if (now - lastPlayTime.current < 100) return;
    lastPlayTime.current = now;
    
    try {
      if (audioContext && audioContext.state === 'suspended') {
        audioContext.resume();
      }
      createClickSound();
    } catch (error) {
      console.warn('Could not play sound feedback:', error);
    }
  }, []);
  
  return { playClickSound };
};