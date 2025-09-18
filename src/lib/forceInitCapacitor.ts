// Force l'initialisation du plugin Capacitor pour les builds AAB
export const forceInitCapacitorPlugins = () => {
  console.log('🔥 FORCE INIT CAPACITOR PLUGINS');
  
  // Attendre que Capacitor soit prêt
  const initializePlugin = () => {
    console.log('🔥 Initialisation des plugins...');
    console.log('🔥 - Capacitor disponible:', !!(window as any).Capacitor);
    console.log('🔥 - Platform:', (window as any).Capacitor?.getPlatform?.());
    console.log('🔥 - PermissionsPlugin avant init:', !!window.PermissionsPlugin);
    
    // Force l'enregistrement du plugin si on est sur Android
    if ((window as any).Capacitor) {
      try {
        // Tenter de déclencher l'init des plugins
        const capacitor = (window as any).Capacitor;
        if (capacitor.Plugins) {
          console.log('🔥 Plugins disponibles:', Object.keys(capacitor.Plugins));
        }
        
        // Vérifier si PermissionsPlugin est maintenant disponible
        setTimeout(() => {
          console.log('🔥 - PermissionsPlugin après init:', !!window.PermissionsPlugin);
          if (window.PermissionsPlugin) {
            console.log('🔥 ✅ PermissionsPlugin initialisé avec succès');
          } else {
            console.log('🔥 ❌ PermissionsPlugin toujours manquant');
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
    // Attendre que Capacitor soit chargé
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(initializePlugin, 500);
    });
  }
};

// Auto-init au chargement du module
if (typeof window !== 'undefined') {
  forceInitCapacitorPlugins();
}