import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { waitForCapacitorAndDetect } from '@/lib/nativeDetection'

// INITIALISATION CAPACITOR ROBUSTE
const initializeCapacitor = async () => {
  console.log('🚀 INITIALISATION CAPACITOR ROBUSTE...');
  
  try {
    // Attendre que Capacitor soit prêt et détecter le mode
    const isNative = await waitForCapacitorAndDetect(5000);
    
    console.log('🚀 RÉSULTAT DÉTECTION FINALE:', isNative);
    
    if (isNative) {
      // Confirmer le mode natif avec flag global
      (window as any).CapacitorForceNative = true;
      console.log('✅ MODE NATIF CONFIRMÉ ET FORCÉ');
      
      // Précharger les plugins critiques en arrière-plan
      try {
        const { Geolocation } = await import('@capacitor/geolocation');
        const { Camera } = await import('@capacitor/camera');
        console.log('✅ Plugins critiques préchargés');
        
        // Vérifier les APIs natives disponibles
        setTimeout(async () => {
          try {
            const geoPerms = await Geolocation.checkPermissions();
            const camPerms = await Camera.checkPermissions();
            console.log('✅ APIs natives vérifiées - Geo:', geoPerms.location, 'Camera:', camPerms.camera);
          } catch (error) {
            console.log('⚠️ Erreur vérification APIs:', error);
          }
        }, 1000);
        
      } catch (pluginError) {
        console.error('❌ Erreur chargement plugins:', pluginError);
      }
      
      // Événement global pour confirmer mode natif
      window.dispatchEvent(new CustomEvent('capacitorReady', { 
        detail: { platform: 'android', native: true }
      }));
      
    } else {
      console.log('ℹ️ MODE WEB DÉTECTÉ');
      
      // Événement global pour mode web
      window.dispatchEvent(new CustomEvent('capacitorReady', { 
        detail: { platform: 'web', native: false }
      }));
    }
    
  } catch (error) {
    console.error('❌ Erreur initialisation Capacitor:', error);
    
    // Fallback en cas d'erreur
    const isAndroid = navigator.userAgent.toLowerCase().includes('android');
    if (isAndroid) {
      (window as any).CapacitorForceNative = true;
      console.log('⚠️ Fallback: Force mode natif pour Android');
    }
  }
};

// Démarrer l'initialisation
initializeCapacitor();

// Render l'app
createRoot(document.getElementById("root")!).render(<App />)