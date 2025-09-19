import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// 🔥 FORCE DETECTION NATIVE APK
console.log('🔥 MAIN.TSX - Détection app native...');
console.log('🔥 - Capacitor:', !!(window as any).Capacitor);
console.log('🔥 - Platform:', (window as any).Capacitor?.getPlatform?.());
console.log('🔥 - isNativePlatform:', (window as any).Capacitor?.isNativePlatform?.());

// Attendre et forcer le plugin
if ((window as any).Capacitor) {
  const forcePlugin = () => {
    console.log('🔥 VÉRIF PermissionsPlugin:', !!window.PermissionsPlugin);
    if (!window.PermissionsPlugin) {
      console.log('🔥 RETRY plugin dans 200ms...');
      setTimeout(forcePlugin, 200);
    } else {
      console.log('🔥 ✅ PLUGIN TROUVÉ !');
    }
  };
  forcePlugin();
}

createRoot(document.getElementById("root")!).render(<App />);
