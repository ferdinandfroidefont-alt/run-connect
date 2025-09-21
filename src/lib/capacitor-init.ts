import { Capacitor } from '@capacitor/core';

export const initializeCapacitor = async () => {
  console.log('🚀 Initialisation Capacitor...');
  
  try {
    // Vérifier si on est en mode natif
    const isNative = Capacitor.isNativePlatform();
    const platform = Capacitor.getPlatform();
    
    console.log('🚀 Platform:', platform);
    console.log('🚀 Native:', isNative);
    
    if (isNative) {
      console.log('✅ Mode natif confirmé - APIs Capacitor disponibles');
      
      // Précharger les plugins critiques
      try {
        const { Geolocation } = await import('@capacitor/geolocation');
        const { Camera } = await import('@capacitor/camera');
        
        console.log('✅ Plugins Geolocation et Camera chargés');
        
        // Vérifier les permissions au démarrage
        const geoPerms = await Geolocation.checkPermissions();
        const camPerms = await Camera.checkPermissions();
        
        console.log('✅ Permissions initiales - Geo:', geoPerms.location, 'Camera:', camPerms.camera);
        
      } catch (error) {
        console.error('❌ Erreur chargement plugins:', error);
      }
    } else {
      console.log('ℹ️ Mode web - Fallback sur APIs web standards');
    }
    
    return { isNative, platform };
    
  } catch (error) {
    console.error('❌ Erreur initialisation Capacitor:', error);
    return { isNative: false, platform: 'web' };
  }
};