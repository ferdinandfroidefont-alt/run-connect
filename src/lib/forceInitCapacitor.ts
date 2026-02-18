// Force l'initialisation du plugin Capacitor pour les builds AAB (Android uniquement)
export const forceInitCapacitorPlugins = () => {
  // ✅ Guard iOS : ne pas exécuter sur iOS
  const platform = (window as any).Capacitor?.getPlatform?.();
  if (platform === 'ios') {
    console.log('⏭️ forceInitCapacitor: ignoré sur iOS');
    return;
  }
  
  // ✅ Guard : ne pas exécuter si pas sur Android
  const isAndroid = /Android/i.test(navigator.userAgent);
  if (!isAndroid && platform !== 'android') {
    return;
  }

  console.log('🔥 FORCE INIT CAPACITOR PLUGINS (Android)');
  
  const initializePlugin = () => {
    console.log('🔥 Initialisation des plugins Android...');
    
    if ((window as any).Capacitor) {
      try {
        const capacitor = (window as any).Capacitor;
        if (capacitor.Plugins) {
          console.log('🔥 Plugins disponibles:', Object.keys(capacitor.Plugins));
        }
        
        setTimeout(() => {
          if (window.PermissionsPlugin) {
            console.log('🔥 ✅ PermissionsPlugin initialisé');
          }
        }, 1000);
        
      } catch (error) {
        console.error('🔥 Erreur init plugins:', error);
      }
    }
  };
  
  if ((window as any).Capacitor) {
    initializePlugin();
  } else {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(initializePlugin, 500);
    });
  }
};

// Auto-init au chargement du module (Android uniquement)
if (typeof window !== 'undefined') {
  forceInitCapacitorPlugins();
}
