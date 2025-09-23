export interface ManufacturerGuide {
  manufacturer: string;
  displayName: string;
  locationSteps: string[];
  cameraSteps: string[];
  contactsSteps: string[];
  notificationSteps: string[];
  specificAdvice: string[];
}

export const manufacturerGuides: Record<string, ManufacturerGuide> = {
  xiaomi: {
    manufacturer: 'xiaomi',
    displayName: 'Xiaomi/Redmi/POCO (MIUI)',
    locationSteps: [
      '1. Ouvrez Paramètres → Applications → RunConnect',
      '2. Appuyez sur "Permissions"',
      '3. Activez "Position"',
      '4. Choisissez "Autoriser tout le temps" ou "Autoriser uniquement pendant l\'utilisation"',
      '5. Si Android 10+: Activez aussi "Position en arrière-plan"'
    ],
    cameraSteps: [
      '1. Paramètres → Applications → RunConnect → Permissions',
      '2. Activez "Appareil photo"',
      '3. Paramètres → Applications → RunConnect → Autres permissions',
      '4. Activez "Afficher au-dessus d\'autres applications"'
    ],
    contactsSteps: [
      '1. Paramètres → Applications → RunConnect → Permissions',
      '2. Activez "Contacts"',
      '3. Vérifiez dans Sécurité → Gestion des autorisations → Contacts'
    ],
    notificationSteps: [
      '1. Paramètres → Applications → RunConnect → Notifications',
      '2. Activez "Autoriser les notifications"',
      '3. Paramètres → Notifications → Paramètres avancés',
      '4. Désactivez "Masquer les notifications silencieuses"'
    ],
    specificAdvice: [
      'MIUI peut bloquer les permissions automatiquement',
      'Vérifiez "Démarrage automatique" dans Sécurité',
      'Désactivez l\'optimisation de batterie pour RunConnect',
      'Certaines versions MIUI nécessitent un redémarrage après activation'
    ]
  },

  samsung: {
    manufacturer: 'samsung',
    displayName: 'Samsung (One UI)',
    locationSteps: [
      '1. Paramètres → Applications → RunConnect',
      '2. Permissions → Localisation',
      '3. Sélectionnez "Autoriser tout le temps"',
      '4. Activez "Utiliser la localisation précise"'
    ],
    cameraSteps: [
      '1. Paramètres → Applications → RunConnect → Permissions',
      '2. Activez "Appareil photo"',
      '3. Paramètres → Confidentialité → Gestionnaire d\'autorisations → Appareil photo',
      '4. Vérifiez que RunConnect est autorisé'
    ],
    contactsSteps: [
      '1. Paramètres → Applications → RunConnect → Permissions',
      '2. Activez "Contacts"'
    ],
    notificationSteps: [
      '1. Paramètres → Applications → RunConnect → Notifications',
      '2. Activez "Autoriser les notifications"',
      '3. Configurez les catégories de notifications selon vos préférences'
    ],
    specificAdvice: [
      'One UI peut avoir des restrictions d\'économie d\'énergie',
      'Vérifiez Paramètres → Batterie → Applications non surveillées',
      'Ajoutez RunConnect aux applications non optimisées'
    ]
  },

  oneplus: {
    manufacturer: 'oneplus',
    displayName: 'OnePlus (OxygenOS)',
    locationSteps: [
      '1. Paramètres → Applications et notifications → Voir toutes les applications',
      '2. RunConnect → Autorisations → Localisation',
      '3. Sélectionnez "Autoriser tout le temps"'
    ],
    cameraSteps: [
      '1. Paramètres → Applications → RunConnect → Autorisations',
      '2. Activez "Appareil photo"'
    ],
    contactsSteps: [
      '1. Paramètres → Applications → RunConnect → Autorisations',
      '2. Activez "Contacts"'
    ],
    notificationSteps: [
      '1. Paramètres → Applications → RunConnect → Notifications',
      '2. Activez toutes les notifications nécessaires'
    ],
    specificAdvice: [
      'OxygenOS peut avoir des restrictions de batterie agressives',
      'Désactivez l\'optimisation de batterie pour RunConnect'
    ]
  },

  oppo: {
    manufacturer: 'oppo',
    displayName: 'Oppo (ColorOS)',
    locationSteps: [
      '1. Paramètres → Confidentialité → Gestionnaire d\'autorisations',
      '2. Localisation → RunConnect → Autoriser',
      '3. Ou: Paramètres → Applications → RunConnect → Autorisations'
    ],
    cameraSteps: [
      '1. Paramètres → Confidentialité → Gestionnaire d\'autorisations',
      '2. Appareil photo → RunConnect → Autoriser'
    ],
    contactsSteps: [
      '1. Paramètres → Confidentialité → Gestionnaire d\'autorisations',
      '2. Contacts → RunConnect → Autoriser'
    ],
    notificationSteps: [
      '1. Paramètres → Applications → RunConnect → Notifications',
      '2. Activez "Autoriser les notifications"'
    ],
    specificAdvice: [
      'ColorOS peut bloquer les applications en arrière-plan',
      'Ajoutez RunConnect à la liste blanche dans Paramètres → Batterie'
    ]
  },

  vivo: {
    manufacturer: 'vivo',
    displayName: 'Vivo (Funtouch OS)',
    locationSteps: [
      '1. Paramètres → Confidentialité et sécurité → Gestionnaire d\'autorisations',
      '2. Localisation → RunConnect → Autoriser',
      '3. Activez "Localisation précise"'
    ],
    cameraSteps: [
      '1. Paramètres → Confidentialité et sécurité → Gestionnaire d\'autorisations',
      '2. Appareil photo → RunConnect → Autoriser'
    ],
    contactsSteps: [
      '1. Paramètres → Confidentialité et sécurité → Gestionnaire d\'autorisations',
      '2. Contacts → RunConnect → Autoriser'
    ],
    notificationSteps: [
      '1. Paramètres → Notifications et barre d\'état → Notifications',
      '2. RunConnect → Autoriser les notifications'
    ],
    specificAdvice: [
      'Funtouch OS peut avoir des restrictions strictes',
      'Vérifiez les paramètres d\'économie d\'énergie',
      'Ajoutez RunConnect aux applications protégées'
    ]
  },

  huawei: {
    manufacturer: 'huawei',
    displayName: 'Huawei/Honor (EMUI/Magic UI)',
    locationSteps: [
      '1. Paramètres → Applications → Gestionnaire d\'applications',
      '2. RunConnect → Autorisations → Localisation',
      '3. Activez "Autoriser" et "Localisation précise"'
    ],
    cameraSteps: [
      '1. Paramètres → Applications → RunConnect → Autorisations',
      '2. Activez "Appareil photo"'
    ],
    contactsSteps: [
      '1. Paramètres → Applications → RunConnect → Autorisations',
      '2. Activez "Contacts"'
    ],
    notificationSteps: [
      '1. Paramètres → Notifications → Plus de paramètres de notification',
      '2. RunConnect → Autoriser les notifications'
    ],
    specificAdvice: [
      'EMUI a des restrictions très strictes sur les applications',
      'Ajoutez RunConnect au "Gestionnaire de démarrage automatique"',
      'Désactivez l\'optimisation de batterie',
      'Vérifiez les "Applications protégées" dans les paramètres de batterie'
    ]
  }
};

export const getManufacturerGuide = (deviceInfo: any): ManufacturerGuide | null => {
  if (!deviceInfo) return null;

  const manufacturer = deviceInfo.manufacturer?.toLowerCase();
  
  if (deviceInfo.isMIUI || manufacturer?.includes('xiaomi') || manufacturer?.includes('redmi') || manufacturer?.includes('poco')) {
    return manufacturerGuides.xiaomi;
  }
  
  if (deviceInfo.isSamsung || manufacturer?.includes('samsung')) {
    return manufacturerGuides.samsung;
  }
  
  if (deviceInfo.isOnePlus || manufacturer?.includes('oneplus')) {
    return manufacturerGuides.oneplus;
  }
  
  if (deviceInfo.isOppo || manufacturer?.includes('oppo')) {
    return manufacturerGuides.oppo;
  }
  
  if (deviceInfo.isVivo || manufacturer?.includes('vivo')) {
    return manufacturerGuides.vivo;
  }
  
  if (deviceInfo.isHuawei || manufacturer?.includes('huawei') || manufacturer?.includes('honor')) {
    return manufacturerGuides.huawei;
  }
  
  return null;
};

export const getGenericSteps = (permissionType: 'location' | 'camera' | 'contacts' | 'notifications'): string[] => {
  const steps = {
    location: [
      '1. Ouvrez les Paramètres de votre téléphone',
      '2. Applications → Voir toutes les applications → RunConnect',
      '3. Appuyez sur "Autorisations" ou "Permissions"',
      '4. Activez "Localisation" ou "Position"',
      '5. Sélectionnez "Autoriser tout le temps" pour un fonctionnement optimal'
    ],
    camera: [
      '1. Paramètres → Applications → RunConnect',
      '2. Autorisations → Appareil photo',
      '3. Activez l\'autorisation'
    ],
    contacts: [
      '1. Paramètres → Applications → RunConnect',
      '2. Autorisations → Contacts',
      '3. Activez l\'autorisation'
    ],
    notifications: [
      '1. Paramètres → Applications → RunConnect',
      '2. Notifications',
      '3. Activez "Autoriser les notifications"'
    ]
  };
  
  return steps[permissionType];
};