import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { Capacitor } from '@capacitor/core'

// FORCE DÉTECTION NATIVE pour AAB
const isReallyNative = () => {
  // Vérifications multiples pour AAB
  const userAgent = navigator.userAgent.toLowerCase();
  const isAndroidApp = userAgent.includes('android') && !userAgent.includes('chrome');
  const isCapacitorNative = !!(window as any).Capacitor && Capacitor.isNativePlatform();
  const hasNativePlugins = !!(window as any).CapacitorPlugins;
  
  console.log('🔍 Détection native:');
  console.log('- UserAgent Android sans Chrome:', isAndroidApp);
  console.log('- Capacitor Native:', isCapacitorNative);
  console.log('- Plugins natifs:', hasNativePlugins);
  console.log('- URL:', window.location.href);
  
  return isAndroidApp || isCapacitorNative || hasNativePlugins || 
         window.location.protocol === 'capacitor:' ||
         window.location.protocol === 'ionic:' ||
         document.URL.startsWith('file://');
};

// Configuration Capacitor avec détection forcée
const initCapacitor = () => {
  console.log('🚀 Initialisation Capacitor...');
  
  const reallyNative = isReallyNative();
  console.log('🚀 Vraiment natif?', reallyNative);
  
  if (reallyNative) {
    // Forcer les variables globales pour mode natif
    (window as any).CapacitorForceNative = true;
    console.log('✅ Mode natif forcé activé');
    
    // Événement pour confirmer mode natif
    window.dispatchEvent(new CustomEvent('capacitorReady', { 
      detail: { platform: 'android', native: true, forced: true }
    }));
  } else {
    console.log('ℹ️ Mode web détecté');
    window.dispatchEvent(new CustomEvent('capacitorReady', { 
      detail: { platform: 'web', native: false }
    }));
  }
};

initCapacitor();

createRoot(document.getElementById("root")!).render(<App />)