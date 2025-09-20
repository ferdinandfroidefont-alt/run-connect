import { androidPermissions } from './androidPermissions';

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
    await this.initialize();
    
    try {
      if (this.isMIUIDevice()) {
        console.log('🔥 MIUI Fix: Demande localisation pour MIUI');
        
        // Pour MIUI, on fait plusieurs tentatives avec des délais
        for (let i = 0; i < 3; i++) {
          try {
            const result = await androidPermissions.forceRequestLocationPermissions();
            if (result) {
              this.permissionStatus.location = true;
              return true;
            }
            console.log('🔥 MIUI Fix: Tentative', i + 1, 'échouée, retry...');
            await new Promise(resolve => setTimeout(resolve, 1000));
          } catch (error) {
            console.log('🔥 MIUI Fix: Erreur tentative', i + 1, ':', error);
          }
        }
        
        // Si toutes les tentatives échouent, guider l'utilisateur
        this.showMIUILocationInstructions();
        return false;
      } else {
        // Appareil non-MIUI, méthode standard
        const result = await androidPermissions.forceRequestLocationPermissions();
        this.permissionStatus.location = result;
        return result;
      }
    } catch (error) {
      console.error('❌ MIUI Fix: Erreur localisation:', error);
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
      if (this.isMIUIDevice()) {
        console.log('🔥 MIUI Fix: Demande contacts pour MIUI');
        
        for (let i = 0; i < 3; i++) {
          try {
            const result = await androidPermissions.forceRequestContactsPermissions();
            if (result) {
              this.permissionStatus.contacts = true;
              return true;
            }
            await new Promise(resolve => setTimeout(resolve, 1000));
          } catch (error) {
            console.log('🔥 MIUI Fix: Erreur contacts tentative', i + 1, ':', error);
          }
        }
        
        this.showMIUIContactsInstructions();
        return false;
      } else {
        const result = await androidPermissions.forceRequestContactsPermissions();
        this.permissionStatus.contacts = result;
        return result;
      }
    } catch (error) {
      console.error('❌ MIUI Fix: Erreur contacts:', error);
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

  static showMIUILocationInstructions() {
    alert(`APPAREIL XIAOMI/REDMI DÉTECTÉ

La localisation doit être activée manuellement:

1. Ouvrez Paramètres Android
2. Allez dans Applications
3. Trouvez RunConnect
4. Touchez "Autorisations"
5. Touchez "Localisation"
6. Sélectionnez "Autoriser"
7. Redémarrez l'application

Si cela ne fonctionne toujours pas:
- Allez dans Sécurité > Autorisations > Localisation
- Vérifiez que RunConnect est autorisé`);
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