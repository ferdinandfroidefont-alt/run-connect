import './bootLogInstall'
import { addBootCheckpoint } from '@/lib/bootDebugOverlay'
addBootCheckpoint("BUNDLE_START");
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { primeHomeMapAtAppEntry } from '@/lib/homeMapPrefetch'
import { isIosAppShell } from '@/lib/iosAppShell'
import { LanguageProvider } from "./contexts/LanguageContext";
import { UserProfileProvider } from "@/contexts/UserProfileContext";
import { DistanceUnitsProvider } from "@/contexts/DistanceUnitsContext";
import { AuthProvider } from "@/hooks/useAuth";
import { BootErrorBoundary } from "@/components/BootErrorBoundary";
import { bootLog } from "@/lib/onScreenLogCapture";

// ✅ NIVEAU 29: DÉTECTION NATIVE MULTI-PLATEFORME (Android + iOS)
const detectNativeImmediately = () => {
  bootLog("[main] detectNativeImmediately:start", {
    protocol: window.location.protocol,
    ua: navigator.userAgent.slice(0, 120),
  });
  const userAgent = navigator.userAgent;
  const protocol = window.location.protocol.toLowerCase();
  
  // ✅ CRITÈRE iOS: Détection iPhone/iPad/iPod en mode natif
  const isIOSDevice = /iPhone|iPad|iPod/i.test(userAgent);
  const isCapacitorProtocol = protocol === 'capacitor:';
  const isIOSNative = isIOSDevice && (isCapacitorProtocol || protocol === 'ionic:' || protocol === 'file:');
  
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
  
  // ✅ CRITÈRE 7: Détection iOS native via Capacitor
  const capacitorPlatform = hasCapacitor ? (window as any).Capacitor?.getPlatform?.() : null;
  const isCapacitorIOS = capacitorPlatform === 'ios';
  const isCapacitorAndroid = capacitorPlatform === 'android';
  
  // ✅ Déterminer la plateforme
  const detectedPlatform = isCapacitorIOS || isIOSNative ? 'ios' : 
                           (isCapacitorAndroid || isAndroid) ? 'android' : 'web';
  
  // ✅ SI iOS natif OU Android natif => NATIF
  const criteriaCount = [
    isFileProtocol,
    isAndroid && hasWebView,
    hasAndroidBridge,
    hasForceFlag,
    isAndroid && isFullscreen,
    hasCapacitor,
    isIOSNative,
    isCapacitorIOS
  ].filter(Boolean).length;
  
  const isNative = criteriaCount >= 2 || hasAndroidBridge || isCapacitorIOS || isIOSNative;
  
  console.log('🔥 NIVEAU 29 - DÉTECTION NATIVE MULTI-PLATEFORME:', {
    criteriaCount: `${criteriaCount}/8`,
    platform: detectedPlatform,
    isIOSDevice,
    isIOSNative,
    isCapacitorIOS,
    isFileProtocol,
    hasWebView,
    hasAndroidBridge,
    hasForceFlag,
    hasCapacitor,
    '🎯 RÉSULTAT': isNative ? `✅ NATIF (${detectedPlatform})` : '❌ WEB'
  });
  
  if (isNative) {
    (window as any).CapacitorForceNative = true;
    (window as any).nativeModeActivated = true;
    (window as any).detectedPlatform = detectedPlatform;
    console.log(`✅✅✅ FLAG NATIF DÉFINI (${detectedPlatform.toUpperCase()}) - Permissions seront demandées !`);
    
    // 🔥 DISPATCHER UN ÉVÉNEMENT POUR NOTIFIER LES HOOKS
    window.dispatchEvent(new CustomEvent('capacitorNativeReady', { 
      detail: { isNative: true, platform: detectedPlatform } 
    }));
  } else {
    console.log('ℹ️ MODE WEB DÉTECTÉ - Fallback OAuth web');
  }
  
  bootLog("[main] detectNativeImmediately:done", {
    isNative,
    detectedPlatform,
    hasCapacitor,
    hasAndroidBridge,
    isIOSNative,
  });
  return isNative;
};

// ✅ EXÉCUTER LA DÉTECTION **AVANT** LE RENDER
const isNative = detectNativeImmediately();
addBootCheckpoint("NATIVE_DETECT");
bootLog("[main] native flag resolved", { isNative, detectedPlatform: (window as any).detectedPlatform ?? "unknown" });

/** Géoloc accueil en parallèle du splash / React — cache OS + persistance locale au maximum tôt. */
bootLog("[main] primeHomeMapAtAppEntry:start");
primeHomeMapAtAppEntry();
bootLog("[main] primeHomeMapAtAppEntry:done");

// 🍎 Marges « Réglages » resserrées : variante Tailwind `ios-shell:` (évite de toucher au navigateur desktop étroit)
if (typeof document !== 'undefined' && isIosAppShell()) {
  document.documentElement.classList.add('ios-app-shell');
  bootLog("[main] ios-app-shell class applied");
}

// ✅ NIVEAU 28: RETRY MECHANISM pour les cas limites
if (!isNative) {
  setTimeout(() => {
    if ((window as any).AndroidBridge && !(window as any).CapacitorForceNative) {
      // ✅ NIVEAU 29: NE PAS RECHARGER si une sélection de fichier est en cours
      // Cela évite le bug de perte de photo après sélection dans la galerie
      if ((window as any).fileSelectionInProgress) {
        console.log('⏸️ Reload différé - sélection de fichier en cours');
        // Définir les flags sans recharger
        (window as any).CapacitorForceNative = true;
        (window as any).nativeModeActivated = true;
        return;
      }
      
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
  
  bootLog("[main] initializeCapacitorPlugins:start");
  console.log('🚀 Préchargement plugins Capacitor...');
  
  try {
    const { Geolocation } = await import('@capacitor/geolocation');
    const { Camera } = await import('@capacitor/camera');
    bootLog("[main] initializeCapacitorPlugins:imports-ok", {
      geolocation: !!Geolocation,
      camera: !!Camera,
    });
    console.log('✅ Plugins critiques préchargés');
    
    console.log('✅ Plugins préchargés - permissions seront demandées à l\'usage');
    
  } catch (pluginError) {
    bootLog("[main] initializeCapacitorPlugins:error", pluginError);
    console.error('❌ Erreur chargement plugins:', pluginError);
  }
  
  const detectedPlatform = (window as any).detectedPlatform || 'android';

  /* Barre d’état iOS : gérée par ThemeContext + splash (évite conflit / flash avec LoadingScreen) */

  window.dispatchEvent(new CustomEvent('capacitorReady', { 
    detail: { platform: detectedPlatform, native: true }
  }));
  bootLog("[main] capacitorReady dispatched", { platform: detectedPlatform });
};

// Lancer l'initialisation des plugins en arrière-plan
initializeCapacitorPlugins();
bootLog("[main] initializeCapacitorPlugins:scheduled");

// ✅ Render l'app (maintenant window.CapacitorForceNative est DÉJÀ défini)
const rootElement = document.getElementById("root");
if (!rootElement) {
  bootLog("[main] root element missing");
  console.error("[main] Élément #root introuvable — impossible de monter React.");
  document.body.innerHTML =
    '<p style="font-family:system-ui,sans-serif;padding:24px;text-align:center">Erreur de démarrage : interface introuvable. Réinstallez ou rechargez l’application.</p>';
} else {
  try {
    bootLog("[main] createRoot:start");
    addBootCheckpoint("CREATE_ROOT");

    // Debug wrapper to log provider mount order
    function DebugGate({ name, children }: { name: string; children: React.ReactNode }) {
      const { useEffect: ue } = require('react');
      ue(() => { addBootCheckpoint(`PROVIDER_${name}`); }, []);
      return children;
    }

    createRoot(rootElement).render(
      <BootErrorBoundary>
        <DebugGate name="Auth">
        <AuthProvider>
        <DebugGate name="UserProfile">
          <UserProfileProvider>
          <DebugGate name="DistanceUnits">
            <DistanceUnitsProvider>
            <DebugGate name="Language">
              <LanguageProvider>
                <App />
              </LanguageProvider>
            </DebugGate>
            </DistanceUnitsProvider>
          </DebugGate>
          </UserProfileProvider>
        </DebugGate>
        </AuthProvider>
        </DebugGate>
      </BootErrorBoundary>
    );
    addBootCheckpoint("RENDER_CALLED");
    bootLog("[main] createRoot:render-called");
  } catch (bootErr) {
    bootLog("[main] createRoot:error", bootErr);
    console.error("[main] Échec du render initial:", bootErr);
    rootElement.innerHTML =
      '<p style="font-family:system-ui,sans-serif;padding:24px;text-align:center">Erreur au lancement. Fermez et rouvrez l’application ou videz le cache.</p>';
  }
}

// ✅ NIVEAU 28: Marquer que React est chargé
(window as any).reactAlreadyLoaded = true;
console.log('✅ React chargé - reactAlreadyLoaded défini');
bootLog("[main] reactAlreadyLoaded=true");