import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { Capacitor } from '@capacitor/core'

// Configuration Capacitor simple et efficace
console.log('🚀 Initialisation Capacitor...');
console.log('🚀 Platform:', Capacitor.getPlatform());
console.log('🚀 Native:', Capacitor.isNativePlatform());

// Event pour indiquer que Capacitor est prêt
if (Capacitor.isNativePlatform()) {
  console.log('✅ Mode natif détecté');
  window.dispatchEvent(new CustomEvent('capacitorReady', { 
    detail: { platform: Capacitor.getPlatform(), native: true }
  }));
} else {
  console.log('ℹ️ Mode web détecté');
  window.dispatchEvent(new CustomEvent('capacitorReady', { 
    detail: { platform: 'web', native: false }
  }));
}

createRoot(document.getElementById("root")!).render(<App />);
