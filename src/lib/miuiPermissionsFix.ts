import { androidPermissions } from './androidPermissions';
import { Geolocation } from '@capacitor/geolocation';

export class MIUIPermissionsFix {
  private static initialized = false;
  private static deviceInfo: any = null;
  private static permissionStatus = {
    location: false,
    camera: false,
    contacts: false,
    notifications: false
  };

  static async initialize(): Promise<boolean> {
    if (this.initialized) return true;

    try {
      console.log('🔥 MIUI Fix: Initialisation...');
      
      // Attendre que le plugin soit disponible avec timeout plus long pour MIUI
      const maxAttempts = 50; // 10 secondes au lieu de 4
      let attempts = 0;
      
      while (attempts < maxAttempts) {
        if (window.PermissionsPlugin) {
          console.log('🔥 MIUI Fix: Plugin trouvé après', attempts * 200, 'ms');
          break;
        }
        
        console.log('🔥 MIUI Fix: Tentative', attempts + 1, '/', maxAttempts);
        await new Promise(resolve => setTimeout(resolve, 200));
        attempts++;
      }

      if (!window.PermissionsPlugin) {
        console.log('❌ MIUI Fix: Plugin non disponible après timeout');
        return false;
      }

      // Récupérer les infos de l'appareil
      this.deviceInfo = await androidPermissions.getDeviceInfo();
      console.log('🔥 MIUI Fix: Device info:', this.deviceInfo);

      this.initialized = true;
      return true;
    } catch (error) {
      console.error('❌ MIUI Fix: Erreur initialisation:', error);
      return false;
    }
  }

  static isMIUIDevice(): boolean {
    if (!this.deviceInfo) return false;
    
    const isMIUI = this.deviceInfo.isMIUI || 
                   this.deviceInfo.manufacturer?.toLowerCase().includes('xiaomi') ||
                   this.deviceInfo.brand?.toLowerCase().includes('redmi') ||
                   this.deviceInfo.brand?.toLowerCase().includes('poco');
    
    console.log('🔥 MIUI Fix: Device is MIUI?', isMIUI);
    return isMIUI;
  }

  static async requestLocationWithMIUIFallback(): Promise<boolean> {
    try {
      console.log('🔄 MIUI Location: Tentative permissions Capacitor...');
      
      // Détecter Android 10+ pour MIUI
      const androidVersion = navigator.userAgent.match(/Android (\d+)/)?.[1];
      const isAndroid10Plus = androidVersion && parseInt(androidVersion) >= 10;
      const isMIUIAndroid10 = this.isMIUIDevice() && isAndroid10Plus;
      
      console.log('📱 MIUI + Android 10+ détecté:', isMIUIAndroid10);
      
      // Essayer d'abord Capacitor standard
      const result = await Geolocation.requestPermissions();
      
      if (result.location === 'granted') {
        console.log('✅ MIUI Location: Permissions Capacitor OK');
        this.permissionStatus.location = true;
        return true;
      }
      
      // Si échec et MIUI détecté, utiliser stratégie adaptée à la version Android
      if (this.isMIUIDevice()) {
        console.log('📱 MIUI détecté - Stratégie adaptée...');
        
        const maxAttempts = isMIUIAndroid10 ? 2 : 3; // Moins de tentatives sur Android 10+
        const delayMs = isMIUIAndroid10 ? 5000 : 2000; // Délais plus longs sur Android 10+
        
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
          console.log(`📱 MIUI Location: Tentative ${attempt}/${maxAttempts} (Android ${androidVersion})`);
          
          try {
            let customResult;
            
            // Utiliser méthode Android 10+ si disponible
            if (isMIUIAndroid10 && (window as any).PermissionsPlugin?.forceRequestLocationPermissionsAndroid10) {
              console.log('🔄 Utilisation méthode MIUI Android 10+...');
              customResult = await (window as any).PermissionsPlugin.forceRequestLocationPermissionsAndroid10();
            } else {
              customResult = await (window as any).PermissionsPlugin?.forceRequestLocationPermissions();
            }
            
            if (customResult?.granted) {
              console.log(`✅ MIUI Location: Succès tentative ${attempt}`);
              this.permissionStatus.location = true;
              return true;
            }
            
            // Attendre entre les tentatives (délai plus long pour Android 10+)
            if (attempt < maxAttempts) {
              console.log(`⏳ Attente ${delayMs}ms avant prochaine tentative...`);
              await new Promise(resolve => setTimeout(resolve, delayMs));
            }
            
          } catch (error) {
            console.log(`❌ MIUI Location: Échec tentative ${attempt}:`, error);
            if (attempt < maxAttempts) {
              await new Promise(resolve => setTimeout(resolve, delayMs));
            }
          }
        }
        
        // Si toutes les tentatives échouent, afficher les instructions MIUI
        console.log('📱 MIUI Location: Toutes tentatives échouées - Instructions manuelles');
        this.showMIUILocationInstructions(isMIUIAndroid10);
        return false;
      }
      
      console.log('❌ Location: Permissions refusées');
      return false;
      
    } catch (error) {
      console.error('❌ MIUI Location: Erreur globale:', error);
      
      if (this.isMIUIDevice()) {
        const androidVersion = navigator.userAgent.match(/Android (\d+)/)?.[1];
        const isAndroid10Plus = androidVersion && parseInt(androidVersion) >= 10;
        this.showMIUILocationInstructions(isAndroid10Plus);
      }
      
      return false;
    }
  }

  static async requestCameraWithMIUIFallback(): Promise<boolean> {
    await this.initialize();
    
    try {
      if (this.isMIUIDevice()) {
        console.log('🔥 MIUI Fix: Demande caméra pour MIUI');
        
        for (let i = 0; i < 3; i++) {
          try {
            const result = await androidPermissions.forceRequestCameraPermissions();
            if (result) {
              this.permissionStatus.camera = true;
              return true;
            }
            await new Promise(resolve => setTimeout(resolve, 1000));
          } catch (error) {
            console.log('🔥 MIUI Fix: Erreur caméra tentative', i + 1, ':', error);
          }
        }
        
        this.showMIUICameraInstructions();
        return false;
      } else {
        const result = await androidPermissions.forceRequestCameraPermissions();
        this.permissionStatus.camera = result;
        return result;
      }
    } catch (error) {
      console.error('❌ MIUI Fix: Erreur caméra:', error);
      return false;
    }
  }

  static async requestContactsWithMIUIFallback(): Promise<boolean> {
    await this.initialize();
    
    try {
      console.log('🔥 MIUI Fix: Demande contacts avec fallback MIUI');
      
      // Try standard permissions first
      try {
        const { Contacts } = await import('@capacitor-community/contacts');
        const result = await Contacts.requestPermissions();
        if (result.contacts === 'granted') {
          console.log('✅ MIUI Fix: Permissions contacts standard accordées');
          this.permissionStatus.contacts = true;
          return true;
        }
      } catch (standardError) {
        console.log('🔥 MIUI Fix: Permissions standard échouées:', standardError);
      }

      // Use MIUI-specific strategy if standard fails
      if (this.isMIUIDevice()) {
        console.log('🔥 MIUI Fix: Stratégie spécialisée MIUI pour contacts');
        
        for (let i = 0; i < 3; i++) {
          try {
            const result = await androidPermissions.forceRequestContactsPermissions();
            if (result) {
              console.log(`✅ MIUI Fix: Contacts accordés tentative ${i + 1}`);
              this.permissionStatus.contacts = true;
              return true;
            }
            
            // Wait between attempts
            if (i < 2) {
              await new Promise(resolve => setTimeout(resolve, 2000));
            }
          } catch (error) {
            console.log(`🔥 MIUI Fix: Erreur contacts tentative ${i + 1}:`, error);
          }
        }
        
        console.log('🔥 MIUI Fix: Toutes tentatives échouées - Instructions manuelles');
        this.showMIUIContactsInstructions();
        return false;
      } else {
        // Non-MIUI device, try native plugin
        try {
          const result = await androidPermissions.forceRequestContactsPermissions();
          this.permissionStatus.contacts = result;
          return result;
        } catch (error) {
          console.log('🔥 MIUI Fix: Plugin natif échoué pour contacts:', error);
          return false;
        }
      }
    } catch (error) {
      console.error('❌ MIUI Fix: Erreur globale contacts:', error);
      return false;
    }
  }

  static async requestNotificationsWithMIUIFallback(): Promise<boolean> {
    await this.initialize();
    
    try {
      if (this.isMIUIDevice()) {
        console.log('🔥 MIUI Fix: Demande notifications pour MIUI');
        
        for (let i = 0; i < 3; i++) {
          try {
            const result = await androidPermissions.requestNotificationPermissions();
            if (result.granted) {
              this.permissionStatus.notifications = true;
              return true;
            }
            await new Promise(resolve => setTimeout(resolve, 1000));
          } catch (error) {
            console.log('🔥 MIUI Fix: Erreur notifications tentative', i + 1, ':', error);
          }
        }
        
        this.showMIUINotificationsInstructions();
        return false;
      } else {
        const result = await androidPermissions.requestNotificationPermissions();
        this.permissionStatus.notifications = result.granted;
        return result.granted;
      }
    } catch (error) {
      console.error('❌ MIUI Fix: Erreur notifications:', error);
      return false;
    }
  }

  static showMIUILocationInstructions(isAndroid10Plus: boolean = false) {
    const android10Instructions = isAndroid10Plus ? `

🔴 ANDROID 10+ SPÉCIAL :
• Localisation > AUTORISER TOUJOURS (pas "Pendant utilisation")
• Si "Toujours" non disponible, d'abord autoriser "Pendant utilisation"
• Ensuite retourner et sélectionner "TOUJOURS"
• Android 10+ est très strict sur les permissions arrière-plan !
` : '';

    alert(`
🔧 INSTRUCTIONS MIUI - GÉOLOCALISATION${isAndroid10Plus ? ' (ANDROID 10+)' : ''}

⚠️ Votre appareil MIUI ${isAndroid10Plus ? 'Android 10+' : ''} bloque les permissions automatiques.

📱 ÉTAPES OBLIGATOIRES :

1️⃣ Ouvrez PARAMÈTRES
2️⃣ Applications > RunConnect  
3️⃣ Autorisations / Permissions
4️⃣ Localisation > AUTORISER TOUJOURS${isAndroid10Plus ? ' (OBLIGATOIRE Android 10+)' : ''}
5️⃣ Précision > PRÉCISION ÉLEVÉE${android10Instructions}

🔋 OPTIMISATION BATTERIE :
• Paramètres > Batterie
• Apps > RunConnect 
• Pas de restrictions

🚀 DÉMARRAGE AUTO :
• Paramètres > Apps > Autorisations  
• Démarrage automatique > RunConnect ON

✅ Redémarrez l'app après configuration
    `);
  }

  static showMIUICameraInstructions() {
    alert(`APPAREIL XIAOMI/REDMI DÉTECTÉ

L'accès caméra doit être activé manuellement:

1. Ouvrez Paramètres Android
2. Allez dans Applications
3. Trouvez RunConnect
4. Touchez "Autorisations"
5. Touchez "Appareil photo"
6. Sélectionnez "Autoriser"
7. Redémarrez l'application`);
  }

  static showMIUIContactsInstructions() {
    alert(`APPAREIL XIAOMI/REDMI DÉTECTÉ

L'accès contacts doit être activé manuellement:

1. Ouvrez Paramètres Android
2. Allez dans Applications
3. Trouvez RunConnect
4. Touchez "Autorisations"
5. Touchez "Contacts"
6. Sélectionnez "Autoriser"
7. Redémarrez l'application`);
  }

  static showMIUINotificationsInstructions() {
    alert(`APPAREIL XIAOMI/REDMI DÉTECTÉ

Les notifications doivent être activées manuellement:

1. Ouvrez Paramètres Android
2. Allez dans Applications
3. Trouvez RunConnect
4. Touchez "Notifications"
5. Activez "Autoriser les notifications"

ET AUSSI:
6. Allez dans Paramètres > Notifications
7. Trouvez RunConnect
8. Activez toutes les options
9. Redémarrez l'application`);
  }

  static getPermissionStatus() {
    return { ...this.permissionStatus };
  }

  static async openSettingsWithDelay() {
    await androidPermissions.openAppSettings();
    // Attendre un peu avant de revérifier les permissions
    setTimeout(() => {
      console.log('🔥 MIUI Fix: Vérification permissions après ouverture paramètres...');
    }, 2000);
  }
}