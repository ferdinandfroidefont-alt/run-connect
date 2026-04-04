import { createRoot } from 'react-dom/client'
import './index.css'
import { primeHomeMapAtAppEntry } from '@/lib/homeMapPrefetch'
import 'mapbox-gl/dist/mapbox-gl.css'
import { isIosAppShell } from '@/lib/iosAppShell'

// ✅ NIVEAU 29: DÉTECTION NATIVE MULTI-PLATEFORME (Android + iOS)
const detectNativeImmediately = () => {
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
  
  return isNative;
};

// ✅ EXÉCUTER LA DÉTECTION **AVANT** LE RENDER
const isNative = detectNativeImmediately();

/** Géoloc accueil en parallèle du splash / React — cache OS + persistance locale au maximum tôt. */
primeHomeMapAtAppEntry();

// 🍎 Marges « Réglages » resserrées : variante Tailwind `ios-shell:` (évite de toucher au navigateur desktop étroit)
if (typeof document !== 'undefined' && isIosAppShell()) {
  document.documentElement.classList.add('ios-app-shell');
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
  
  console.log('🚀 Préchargement plugins Capacitor...');
  
  try {
    const { Geolocation } = await import('@capacitor/geolocation');
    const { Camera } = await import('@capacitor/camera');
    console.log('✅ Plugins critiques préchargés');
    
    console.log('✅ Plugins préchargés - permissions seront demandées à l\'usage');
    
  } catch (pluginError) {
    console.error('❌ Erreur chargement plugins:', pluginError);
  }
  
  const detectedPlatform = (window as any).detectedPlatform || 'android';

  /* Barre d’état iOS : gérée par ThemeContext + splash (évite conflit / flash avec LoadingScreen) */

  window.dispatchEvent(new CustomEvent('capacitorReady', { 
    detail: { platform: detectedPlatform, native: true }
  }));
};

// Lancer l'initialisation des plugins en arrière-plan
initializeCapacitorPlugins();

function formatBootError(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === 'string') return error;
  try {
    return JSON.stringify(error);
  } catch {
    return 'Erreur inconnue';
  }
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function renderBootError(rootElement: HTMLElement, message: string) {
  const safeMessage = escapeHtml(message);
  rootElement.innerHTML = `
    <div style="min-height:100dvh;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px;background:#111318;color:#f5f7ff;font-family:Inter,system-ui,sans-serif;text-align:center">
      <div style="max-width:420px">
        <h1 style="margin:0 0 12px;font-size:20px;font-weight:700">Impossible de lancer RunConnect</h1>
        <p style="margin:0 0 10px;color:#c7cfdd;line-height:1.5">L'application a rencontré une erreur pendant le démarrage. Recharge la page ou vérifie la configuration web.</p>
        <pre style="margin:0 0 18px;padding:12px;border-radius:12px;background:#1a1d24;color:#9fb2ff;white-space:pre-wrap;word-break:break-word;text-align:left;font-size:12px;line-height:1.45">${safeMessage}</pre>
        <button type="button" onclick="window.location.reload()" style="border:0;border-radius:12px;padding:12px 16px;background:#2E68FF;color:white;font-weight:600;cursor:pointer">Recharger l'application</button>
      </div>
    </div>
  `;
}

window.addEventListener('error', (event) => {
  console.error('[main] Uncaught error before/after boot:', event.error ?? event.message);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('[main] Unhandled promise rejection:', event.reason);
});

async function bootstrapApp(rootElement: HTMLElement) {
  try {
    const [
      { default: App },
      { AuthProvider },
      { UserProfileProvider },
      { DistanceUnitsProvider },
      { LanguageProvider },
    ] = await Promise.all([
      import('./App.tsx'),
      import('@/hooks/useAuth'),
      import('@/contexts/UserProfileContext'),
      import('@/contexts/DistanceUnitsContext'),
      import('./contexts/LanguageContext'),
    ]);

    createRoot(rootElement).render(
      <AuthProvider>
        <UserProfileProvider>
          <DistanceUnitsProvider>
            <LanguageProvider>
              <App />
            </LanguageProvider>
          </DistanceUnitsProvider>
        </UserProfileProvider>
      </AuthProvider>
    );
  } catch (bootErr) {
    const message = formatBootError(bootErr);
    console.error("[main] Échec du bootstrap applicatif:", bootErr);
    renderBootError(rootElement, message);
  }
}

// ✅ Render l'app (maintenant window.CapacitorForceNative est DÉJÀ défini)
const rootElement = document.getElementById("root");
if (!rootElement) {
  console.error("[main] Élément #root introuvable — impossible de monter React.");
  document.body.innerHTML =
    '<p style="font-family:system-ui,sans-serif;padding:24px;text-align:center">Erreur de démarrage : interface introuvable. Réinstallez ou rechargez l’application.</p>';
} else {
  void bootstrapApp(rootElement);
}

// ✅ NIVEAU 28: Marquer que React est chargé
(window as any).reactAlreadyLoaded = true;
console.log('✅ React chargé - reactAlreadyLoaded défini');