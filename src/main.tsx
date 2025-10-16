import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// ✅ DÉTECTION SYNCHRONE IMMÉDIATE (AVANT le render)
const detectNativeImmediately = () => {
  const userAgent = navigator.userAgent.toLowerCase();
  const isAndroid = userAgent.includes('android');
  const isWebView = userAgent.includes('wv') || 
                   userAgent.includes('webview') ||
                   (userAgent.includes('version/') && userAgent.includes('chrome'));
  
  const hasAndroidInterface = !!(window as any).Android || !!(window as any).AndroidInterface;
  const protocol = window.location.protocol.toLowerCase();
  const isNativeProtocol = protocol === 'capacitor:' || protocol === 'ionic:' || protocol === 'file:';
  
  // Si Android + (WebView OU interface native OU protocole natif) = NATIF
  const isNative = isAndroid && (isWebView || hasAndroidInterface || isNativeProtocol);
  
  console.log('🔥 DÉTECTION SYNCHRONE IMMÉDIATE:', {
    userAgent,
    isAndroid,
    isWebView,
    hasAndroidInterface,
    protocol,
    isNativeProtocol,
    isNative
  });
  
  if (isNative) {
    (window as any).CapacitorForceNative = true;
    console.log('✅ MODE NATIF FORCÉ IMMÉDIATEMENT');
  } else {
    console.log('ℹ️ MODE WEB DÉTECTÉ');
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
createRoot(document.getElementById("root")!).render(<App />)