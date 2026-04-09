import React from 'react'
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

// ✅ NIVEAU 29: DÉTECTION NATIVE MULTI-PLATEFORME (Android + iOS)
const detectNativeImmediately = () => {
  const userAgent = navigator.userAgent;
  const protocol = window.location.protocol.toLowerCase();
  
  const isIOSDevice = /iPhone|iPad|iPod/i.test(userAgent);
  const isCapacitorProtocol = protocol === 'capacitor:';
  const isIOSNative = isIOSDevice && (isCapacitorProtocol || protocol === 'ionic:' || protocol === 'file:');
  
  const isFileProtocol = protocol === 'file:' || protocol === 'capacitor:' || protocol === 'ionic:';
  
  const isAndroid = /Android/i.test(userAgent);
  const hasWebView = /wv/.test(userAgent);
  const hasAndroidBridge = !!(window as any).AndroidBridge;
  const hasForceFlag = !!(window as any).CapacitorForceNative;
  const isFullscreen = window.innerWidth === screen.width || window.outerWidth === screen.width;
  const hasCapacitor = !!(window as any).Capacitor;
  const capacitorPlatform = hasCapacitor ? (window as any).Capacitor?.getPlatform?.() : null;
  const isCapacitorIOS = capacitorPlatform === 'ios';
  const isCapacitorAndroid = capacitorPlatform === 'android';
  
  const detectedPlatform = isCapacitorIOS || isIOSNative ? 'ios' : 
                           (isCapacitorAndroid || isAndroid) ? 'android' : 'web';
  
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
  
  console.log('🔥 DÉTECTION NATIVE:', {
    criteriaCount: `${criteriaCount}/8`,
    platform: detectedPlatform,
    '🎯 RÉSULTAT': isNative ? `✅ NATIF (${detectedPlatform})` : '❌ WEB'
  });
  
  if (isNative) {
    (window as any).CapacitorForceNative = true;
    (window as any).nativeModeActivated = true;
    (window as any).detectedPlatform = detectedPlatform;
    
    window.dispatchEvent(new CustomEvent('capacitorNativeReady', { 
      detail: { isNative: true, platform: detectedPlatform } 
    }));
  }
  
  return isNative;
};

// ✅ EXÉCUTER LA DÉTECTION **AVANT** LE RENDER
const isNative = detectNativeImmediately();

primeHomeMapAtAppEntry();

if (typeof document !== 'undefined' && isIosAppShell()) {
  document.documentElement.classList.add('ios-app-shell');
}

// ✅ RETRY MECHANISM pour les cas limites
if (!isNative) {
  setTimeout(() => {
    if ((window as any).AndroidBridge && !(window as any).CapacitorForceNative) {
      if ((window as any).fileSelectionInProgress) {
        (window as any).CapacitorForceNative = true;
        (window as any).nativeModeActivated = true;
        return;
      }
      
      (window as any).CapacitorForceNative = true;
      (window as any).nativeModeActivated = true;
      window.location.reload();
    }
  }, 500);
}

// ✅ Initialisation async en arrière-plan
const initializeCapacitorPlugins = async () => {
  if (!isNative) return;
  
  try {
    const { Geolocation } = await import('@capacitor/geolocation');
    const { Camera } = await import('@capacitor/camera');
    console.log('✅ Plugins critiques préchargés', { geolocation: !!Geolocation, camera: !!Camera });
  } catch (pluginError) {
    console.error('❌ Erreur chargement plugins:', pluginError);
  }
  
  const detectedPlatform = (window as any).detectedPlatform || 'android';

  window.dispatchEvent(new CustomEvent('capacitorReady', { 
    detail: { platform: detectedPlatform, native: true }
  }));
};

initializeCapacitorPlugins();

// ✅ Render l'app
const rootElement = document.getElementById("root");
if (!rootElement) {
  console.error("[main] Élément #root introuvable");
  document.body.innerHTML =
    '<p style="font-family:system-ui,sans-serif;padding:24px;text-align:center">Erreur de démarrage : interface introuvable.</p>';
} else {
  try {
    createRoot(rootElement).render(
      <BootErrorBoundary>
        <AuthProvider>
          <UserProfileProvider>
            <DistanceUnitsProvider>
              <LanguageProvider>
                <App />
              </LanguageProvider>
            </DistanceUnitsProvider>
          </UserProfileProvider>
        </AuthProvider>
      </BootErrorBoundary>
    );
  } catch (bootErr) {
    console.error("[main] Échec du render initial:", bootErr);
    rootElement.innerHTML =
      '<p style="font-family:system-ui,sans-serif;padding:24px;text-align:center">Erreur au lancement. Fermez et rouvrez l\'application.</p>';
  }
}

(window as any).reactAlreadyLoaded = true;
