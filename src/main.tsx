import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { initCapacitorFix } from './lib/capacitorAABFix'
import { waitForCapacitorAndDetect } from './lib/detectNativeAndroid'

// 🔥 FIX CRITIQUE AAB - Appliquer immédiatement
console.log('🔥 MAIN.TSX - Initialisation Capacitor Fix...');
initCapacitorFix();

// 🔥 DÉTECTION NATIVE ANDROID UNIFIÉE
waitForCapacitorAndDetect().then((isNativeAndroid) => {
  console.log('🔥 MAIN.TSX - Détection finale Android natif:', isNativeAndroid);
  if (isNativeAndroid) {
    console.log('🔥 ✅ APP ANDROID NATIVE DÉTECTÉE');
    // Notifier que l'app est prête
    window.dispatchEvent(new CustomEvent('nativeAndroidReady', { detail: { isNativeAndroid } }));
  } else {
    console.log('🔥 ℹ️ MODE WEB DÉTECTÉ');
    window.dispatchEvent(new CustomEvent('nativeAndroidReady', { detail: { isNativeAndroid } }));
  }
});

createRoot(document.getElementById("root")!).render(<App />);
