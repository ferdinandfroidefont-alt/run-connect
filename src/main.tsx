import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { LanguageProvider } from "./contexts/LanguageContext";

// ✅ DÉTECTION NATIVE ULTRA-FIABLE (AVANT le render)
const detectNativeImmediately = () => {
  const userAgent = navigator.userAgent;
  const protocol = window.location.protocol.toLowerCase();
  
  // ✅ VÉRIFICATIONS MULTIPLES
  const isFileProtocol = protocol === 'file:' || protocol === 'capacitor:' || protocol === 'ionic:';
  const isAndroid = /Android/i.test(userAgent);
  const hasWebView = /wv/.test(userAgent); // WebView Android
  
  // ✅ SI au moins 1 indicateur => NATIF
  const isNative = isAndroid && (isFileProtocol || hasWebView || (window as any).AndroidBridge);
  
  console.log('🔥 DÉTECTION NATIVE SYNCHRONE:', {
    userAgent,
    protocol,
    isFileProtocol,
    isAndroid,
    hasWebView,
    hasAndroidBridge: !!(window as any).AndroidBridge,
    '🎯 RÉSULTAT': isNative ? '✅ NATIF' : '❌ WEB'
  });
  
  if (isNative) {
    (window as any).CapacitorForceNative = true;
    console.log('✅✅✅ FLAG NATIF DÉFINI - Permissions seront demandées !');
    
    // 🔥 DISPATCHER UN ÉVÉNEMENT POUR NOTIFIER LES HOOKS
    window.dispatchEvent(new CustomEvent('capacitorNativeReady', { 
      detail: { isNative: true } 
    }));
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
  <LanguageProvider>
    <App />
  </LanguageProvider>
)