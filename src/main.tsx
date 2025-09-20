import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { initCapacitorFix } from './lib/capacitorAABFix'
import { waitForCapacitorAndDetect } from './lib/detectNativeAndroid'

// 🔥 FORCE ANDROID MODE si paramètre URL présent
const urlParams = new URLSearchParams(window.location.search);
const forceAndroid = urlParams.has('forceAndroid') || urlParams.has('test');

console.log('🔥🔥🔥 MAIN.TSX - DÉMARRAGE AVEC LOGGING EXTENSIF');
console.log('🔥 URL:', window.location.href);
console.log('🔥 UserAgent:', navigator.userAgent);
console.log('🔥 Force Android mode:', forceAndroid);

if (forceAndroid) {
  console.log('🔥🚨 MODE FORCE ANDROID ACTIVÉ');
  // Forcer toutes les variables globales immédiatement
  (window as any).CapacitorMode = 'android';
  (window as any).CapacitorIsNative = true;
  (window as any).CapacitorAABFixed = true;
  (window as any).ForceAndroidMode = true;
}

// 🔥 FIX CRITIQUE AAB - Appliquer AVANT tout le reste
console.log('🔥 MAIN.TSX - Initialisation Capacitor Fix...');
initCapacitorFix();

// 🔥 DÉTECTION NATIVE ANDROID UNIFIÉE avec logging extensif
waitForCapacitorAndDetect().then((isNativeAndroid) => {
  console.log('🔥🔥🔥 MAIN.TSX - DÉTECTION FINALE COMPLÈTE:');
  console.log('🔥 - isNativeAndroid:', isNativeAndroid);
  console.log('🔥 - Force mode:', forceAndroid);
  console.log('🔥 - CapacitorMode:', (window as any).CapacitorMode);
  console.log('🔥 - CapacitorIsNative:', (window as any).CapacitorIsNative);
  console.log('🔥 - CapacitorAABFixed:', (window as any).CapacitorAABFixed);
  console.log('🔥 - Capacitor disponible:', !!(window as any).Capacitor);
  
  if (isNativeAndroid || forceAndroid) {
    console.log('🔥 ✅ APP ANDROID NATIVE DÉTECTÉE (ou forcée)');
    window.dispatchEvent(new CustomEvent('nativeAndroidReady', { 
      detail: { 
        isNativeAndroid: true, 
        forced: forceAndroid,
        detected: isNativeAndroid 
      } 
    }));
  } else {
    console.log('🔥 ℹ️ MODE WEB DÉTECTÉ');
    window.dispatchEvent(new CustomEvent('nativeAndroidReady', { 
      detail: { 
        isNativeAndroid: false, 
        forced: false,
        detected: false 
      } 
    }));
  }
});

createRoot(document.getElementById("root")!).render(<App />);
