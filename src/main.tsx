import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { initCapacitorFix } from './lib/capacitorAABFix'
import { initPermissionsPluginFix } from './lib/permissionsPluginFallback'

// 🔥 FIX CRITIQUE AAB - Appliquer immédiatement
initCapacitorFix();
// Réduire le délai d'initialisation pour une récupération plus rapide
initPermissionsPluginFix();

// 🔥 FORCE DETECTION NATIVE APK
console.log('🔥 MAIN.TSX - Détection app native...');
console.log('🔥 - Capacitor:', !!(window as any).Capacitor);
console.log('🔥 - Platform:', (window as any).Capacitor?.getPlatform?.());
console.log('🔥 - isNativePlatform:', (window as any).Capacitor?.isNativePlatform?.());

// Attendre et forcer le plugin
if ((window as any).Capacitor) {
  let retryCount = 0;
  const maxRetries = 20;
  
  const forcePlugin = () => {
    console.log('🔥 VÉRIF PermissionsPlugin:', !!window.PermissionsPlugin);
    if (!window.PermissionsPlugin && retryCount < maxRetries) {
      retryCount++;
      console.log('🔥 RETRY plugin dans 100ms... (', retryCount, '/', maxRetries, ')');
      setTimeout(forcePlugin, 100);
    } else if (!window.PermissionsPlugin && retryCount >= maxRetries) {
      console.log('🔥 FORCE CRÉATION FALLBACK après', maxRetries, 'tentatives');
      // Force la création du fallback après les tentatives
      import('./lib/permissionsPluginFallback').then(({ forcePermissionsPlugin }) => {
        forcePermissionsPlugin();
        console.log('🔥 ✅ FALLBACK FORCÉ !');
        // Dispatch event pour notifier que le plugin est prêt
        window.dispatchEvent(new CustomEvent('permissionsPluginReady'));
      });
    } else {
      console.log('🔥 ✅ PLUGIN TROUVÉ !');
      // Dispatch event pour notifier que le plugin est prêt
      window.dispatchEvent(new CustomEvent('permissionsPluginReady'));
    }
  };
  forcePlugin();
}

createRoot(document.getElementById("root")!).render(<App />);
