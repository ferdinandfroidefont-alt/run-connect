import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { initCapacitorFix } from './lib/capacitorAABFix'
import { initPermissionsPluginFix } from './lib/permissionsPluginFallback'

// 🔥 FIX CRITIQUE AAB - Appliquer immédiatement
initCapacitorFix();
initPermissionsPluginFix();

// 🔥 FORCE DETECTION NATIVE APK
console.log('🔥 MAIN.TSX - Détection app native...');
console.log('🔥 - Capacitor:', !!(window as any).Capacitor);
console.log('🔥 - Platform:', (window as any).Capacitor?.getPlatform?.());
console.log('🔥 - isNativePlatform:', (window as any).Capacitor?.isNativePlatform?.());

// Attendre et forcer le plugin
if ((window as any).Capacitor) {
  let retryCount = 0;
  const maxRetries = 10;
  
  const forcePlugin = () => {
    console.log('🔥 VÉRIF PermissionsPlugin:', !!window.PermissionsPlugin);
    if (!window.PermissionsPlugin && retryCount < maxRetries) {
      retryCount++;
      console.log('🔥 RETRY plugin dans 200ms... (', retryCount, '/', maxRetries, ')');
      setTimeout(forcePlugin, 200);
    } else if (!window.PermissionsPlugin && retryCount >= maxRetries) {
      console.log('🔥 FORCE CRÉATION FALLBACK après', maxRetries, 'tentatives');
      // Force la création du fallback après les tentatives
      import('./lib/permissionsPluginFallback').then(({ forcePermissionsPlugin }) => {
        forcePermissionsPlugin();
        console.log('🔥 ✅ FALLBACK FORCÉ !');
      });
    } else {
      console.log('🔥 ✅ PLUGIN TROUVÉ !');
    }
  };
  forcePlugin();
}

createRoot(document.getElementById("root")!).render(<App />);
