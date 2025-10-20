import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { ThemeProvider } from "./contexts/ThemeContext";
import { AppProvider } from "./contexts/AppContext";
import { LanguageProvider } from "./contexts/LanguageContext";

// ✅ DÉTECTION NATIVE AMÉLIORÉE (AVANT le render)
const detectNativeImmediately = () => {
  const userAgent = navigator.userAgent;
  const protocol = window.location.protocol.toLowerCase();
  
  // ✅ INDICATEURS INFAILLIBLES ANDROID AAB
  const hasCapacitor = !!(window as any).Capacitor;
  const hasAndroidBridge = !!(window as any).AndroidBridge;
  const isFileProtocol = protocol === 'file:' || protocol === 'capacitor:' || protocol === 'ionic:';
  const hasCustomUA = userAgent.includes('RunConnect/'); // Custom UA défini dans capacitor.config.ts
  const isAndroid = /Android/i.test(userAgent);
  
  // ✅ MODE NATIF si au moins 2 indicateurs sont présents
  const indicators = [hasCapacitor, hasAndroidBridge, isFileProtocol, hasCustomUA].filter(Boolean).length;
  const isNative = isAndroid && indicators >= 2;
  
  console.log('🔥 DÉTECTION NATIVE AMÉLIORÉE:', {
    userAgent,
    protocol,
    hasCapacitor,
    hasAndroidBridge,
    isFileProtocol,
    hasCustomUA,
    isAndroid,
    indicators,
    isNative: isNative ? '✅ NATIF' : '❌ WEB'
  });
  
  if (isNative) {
    (window as any).CapacitorForceNative = true;
    console.log('✅ MODE NATIF FORCÉ - Google Auth activé');
  } else {
    console.log('ℹ️ MODE WEB DÉTECTÉ - Fallback OAuth web');
  }
  
  return isNative;
};

// ✅ EXÉCUTER LA DÉTECTION **AVANT** LE RENDER
const isNative = detectNativeImmediately();

// ✅ Initialisation async en arrière-plan (pour plugins, etc.)
const initializeCapacitorPlugins = async () => {
  if (!isNative) return;
  
  console.log('🚀 Préchargement plugins Capacitor...');
  
  try {
    const { Geolocation } = await import('@capacitor/geolocation');
    const { Camera } = await import('@capacitor/camera');
    console.log('✅ Plugins critiques préchargés');
    
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
  
  window.dispatchEvent(new CustomEvent('capacitorReady', { 
    detail: { platform: 'android', native: true }
  }));
};

// Lancer l'initialisation des plugins en arrière-plan
initializeCapacitorPlugins();

// ✅ Render l'app (maintenant window.CapacitorForceNative est DÉJÀ défini)
createRoot(document.getElementById("root")!).render(
  <ThemeProvider>
    <LanguageProvider>
      <AppProvider>
        <App />
      </AppProvider>
    </LanguageProvider>
  </ThemeProvider>
)