import { useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';

export const usePermissionsReady = () => {
  const [isReady, setIsReady] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    console.log('🔍 usePermissionsReady - Initialisation...');
    
    // Si on n'est pas sur une plateforme native, considérer comme prêt immédiatement
    if (!Capacitor.isNativePlatform()) {
      console.log('🔍 Web platform - permissions prêtes immédiatement');
      setIsReady(true);
      setIsLoading(false);
      return;
    }

    // Vérifier si le plugin est déjà disponible
    const checkPlugin = () => {
      if ((window as any).PermissionsPlugin) {
        console.log('🔍 PermissionsPlugin détecté immédiatement');
        setIsReady(true);
        setIsLoading(false);
        return true;
      }
      return false;
    };

    // Check initial
    if (checkPlugin()) return;

    let retryCount = 0;
    const maxRetries = 100; // 10 secondes max (100 * 100ms)
    
    // Écouter l'événement custom de prêt du plugin
    const handlePluginReady = () => {
      console.log('🔍 Événement permissionsPluginReady reçu');
      setIsReady(true);
      setIsLoading(false);
    };

    window.addEventListener('permissionsPluginReady', handlePluginReady);

    // Polling de fallback avec timeout plus long
    const pollInterval = setInterval(() => {
      retryCount++;
      console.log(`🔍 Vérification plugin ${retryCount}/${maxRetries}...`);
      
      if (checkPlugin()) {
        clearInterval(pollInterval);
        return;
      }
      
      if (retryCount >= maxRetries) {
        console.log('🔍 ⚠️ Timeout atteint - permissions considérées comme non disponibles');
        clearInterval(pollInterval);
        setIsReady(false);
        setIsLoading(false);
      }
    }, 100);

    return () => {
      window.removeEventListener('permissionsPluginReady', handlePluginReady);
      clearInterval(pollInterval);
    };
  }, []);

  return { isReady, isLoading };
};