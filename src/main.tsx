import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { LanguageProvider } from "./contexts/LanguageContext";
import { UserProfileProvider } from "@/contexts/UserProfileContext";
import { AuthProvider } from "@/hooks/useAuth";

// ✅ NIVEAU 28: DÉTECTION NATIVE ULTRA-RENFORCÉE (AVANT le render)
const detectNativeImmediately = () => {
  const userAgent = navigator.userAgent;
  const protocol = window.location.protocol.toLowerCase();
  
  // ✅ CRITÈRE 1: Protocole natif
  const isFileProtocol = protocol === 'file:' || protocol === 'capacitor:' || protocol === 'ionic:';
  
  // ✅ CRITÈRE 2: User Agent Android + WebView
  const isAndroid = /Android/i.test(userAgent);
  const hasWebView = /wv/.test(userAgent);
  
  // ✅ CRITÈRE 3: AndroidBridge disponible (injecté par MainActivity)
  const hasAndroidBridge = !!(window as any).AndroidBridge;
  
  // ✅ CRITÈRE 4: Flag injecté par Android (peut arriver en retard)
  const hasForceFlag = !!(window as any).CapacitorForceNative;
  
  // ✅ CRITÈRE 5: Vérifier l'absence de scrollbar (signe de WebView native fullscreen)
  const isFullscreen = window.innerWidth === screen.width || window.outerWidth === screen.width;
  
  // ✅ CRITÈRE 6: Capacitor déjà chargé
  const hasCapacitor = !!(window as any).Capacitor;
  
  // ✅ SI AU MOINS 2 CRITÈRES SUR 6 => NATIF (ou AndroidBridge seul suffit)
  const criteriaCount = [
    isFileProtocol,
    isAndroid && hasWebView,
    hasAndroidBridge,
    hasForceFlag,
    isAndroid && isFullscreen,
    hasCapacitor
  ].filter(Boolean).length;
  
  const isNative = criteriaCount >= 2 || hasAndroidBridge; // AndroidBridge est un critère fort
  
  console.log('🔥 NIVEAU 28 - DÉTECTION NATIVE RENFORCÉE:', {
    criteriaCount: `${criteriaCount}/6`,
    isFileProtocol,
    hasWebView,
    hasAndroidBridge,
    hasForceFlag,
    isFullscreen,
    hasCapacitor,
    '🎯 RÉSULTAT': isNative ? '✅ NATIF' : '❌ WEB'
  });
  
  if (isNative) {
    (window as any).CapacitorForceNative = true;
    (window as any).nativeModeActivated = true;
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

// ✅ NIVEAU 28: RETRY MECHANISM pour les cas limites
if (!isNative) {
  setTimeout(() => {
    if ((window as any).AndroidBridge && !(window as any).CapacitorForceNative) {
      console.log('🔥 CORRECTION: AndroidBridge détecté en retard, activation mode natif');
      (window as any).CapacitorForceNative = true;
      (window as any).nativeModeActivated = true;
      
      // Recharger la page pour appliquer le mode natif
      console.log('🔄 Rechargement de la page pour activer le mode natif...');
      window.location.reload();
    }
  }, 500);
}

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
  <AuthProvider>
    <UserProfileProvider>
      <LanguageProvider>
        <App />
      </LanguageProvider>
    </UserProfileProvider>
  </AuthProvider>
);

// ✅ NIVEAU 28: Marquer que React est chargé
(window as any).reactAlreadyLoaded = true;
console.log('✅ React chargé - reactAlreadyLoaded défini');