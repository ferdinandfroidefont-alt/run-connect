

# Correction du Pipeline iOS — Ajout des descriptions de permissions Info.plist

## Problème identifié

Apple rejette le build car le fichier `Info.plist` ne contient pas les descriptions obligatoires pour les permissions sensibles :

### Erreurs OBLIGATOIRES (bloquantes)
| Clé manquante | Description |
|---------------|-------------|
| `NSContactsUsageDescription` | Accès aux contacts |
| `NSPhotoLibraryUsageDescription` | Accès à la galerie photo |

### Avertissements (recommandés)
| Clé manquante | Description |
|---------------|-------------|
| `NSLocationWhenInUseUsageDescription` | Géolocalisation en premier plan |
| `NSLocationAlwaysAndWhenInUseUsageDescription` | Géolocalisation en arrière-plan |

## Cause

Le dossier `ios/` est généré dynamiquement par `npx cap add ios` dans le workflow. Le `Info.plist` par défaut de Capacitor ne contient pas ces descriptions.

## Solution

Ajouter une étape dans le workflow qui injecte les clés de permissions dans le fichier `Info.plist` après la génération du projet iOS.

---

## Changement à effectuer

### Fichier : `.github/workflows/ios-appstore.yml`

Ajouter une nouvelle étape **après** "Add iOS platform" et **avant** "Update Bundle Identifier" :

```yaml
- name: 📝 Configure Info.plist permissions
  run: |
    INFO_PLIST="ios/App/App/Info.plist"
    
    # Contacts
    /usr/libexec/PlistBuddy -c "Add :NSContactsUsageDescription string 'RunConnect a besoin d'\''accéder à vos contacts pour trouver vos amis qui utilisent l'\''application et les inviter à rejoindre vos sessions.'" "$INFO_PLIST" 2>/dev/null || \
    /usr/libexec/PlistBuddy -c "Set :NSContactsUsageDescription 'RunConnect a besoin d'\''accéder à vos contacts pour trouver vos amis qui utilisent l'\''application et les inviter à rejoindre vos sessions.'" "$INFO_PLIST"
    
    # Photo Library (lecture)
    /usr/libexec/PlistBuddy -c "Add :NSPhotoLibraryUsageDescription string 'RunConnect a besoin d'\''accéder à vos photos pour définir votre photo de profil.'" "$INFO_PLIST" 2>/dev/null || \
    /usr/libexec/PlistBuddy -c "Set :NSPhotoLibraryUsageDescription 'RunConnect a besoin d'\''accéder à vos photos pour définir votre photo de profil.'" "$INFO_PLIST"
    
    # Photo Library (écriture)
    /usr/libexec/PlistBuddy -c "Add :NSPhotoLibraryAddUsageDescription string 'RunConnect a besoin d'\''accéder à vos photos pour enregistrer des images.'" "$INFO_PLIST" 2>/dev/null || \
    /usr/libexec/PlistBuddy -c "Set :NSPhotoLibraryAddUsageDescription 'RunConnect a besoin d'\''accéder à vos photos pour enregistrer des images.'" "$INFO_PLIST"
    
    # Location (en utilisation)
    /usr/libexec/PlistBuddy -c "Add :NSLocationWhenInUseUsageDescription string 'RunConnect a besoin d'\''accéder à votre position pour afficher les sessions à proximité et enregistrer vos parcours.'" "$INFO_PLIST" 2>/dev/null || \
    /usr/libexec/PlistBuddy -c "Set :NSLocationWhenInUseUsageDescription 'RunConnect a besoin d'\''accéder à votre position pour afficher les sessions à proximité et enregistrer vos parcours.'" "$INFO_PLIST"
    
    # Location (toujours)
    /usr/libexec/PlistBuddy -c "Add :NSLocationAlwaysAndWhenInUseUsageDescription string 'RunConnect a besoin d'\''accéder à votre position en arrière-plan pour suivre vos sessions d'\''entraînement.'" "$INFO_PLIST" 2>/dev/null || \
    /usr/libexec/PlistBuddy -c "Set :NSLocationAlwaysAndWhenInUseUsageDescription 'RunConnect a besoin d'\''accéder à votre position en arrière-plan pour suivre vos sessions d'\''entraînement.'" "$INFO_PLIST"
    
    # Camera
    /usr/libexec/PlistBuddy -c "Add :NSCameraUsageDescription string 'RunConnect a besoin d'\''accéder à la caméra pour prendre des photos de profil.'" "$INFO_PLIST" 2>/dev/null || \
    /usr/libexec/PlistBuddy -c "Set :NSCameraUsageDescription 'RunConnect a besoin d'\''accéder à la caméra pour prendre des photos de profil.'" "$INFO_PLIST"
    
    echo "✅ Info.plist permissions configured"
    
    # Afficher les clés pour vérification
    echo "📋 Permissions in Info.plist:"
    /usr/libexec/PlistBuddy -c "Print :NSContactsUsageDescription" "$INFO_PLIST"
    /usr/libexec/PlistBuddy -c "Print :NSPhotoLibraryUsageDescription" "$INFO_PLIST"
    /usr/libexec/PlistBuddy -c "Print :NSLocationWhenInUseUsageDescription" "$INFO_PLIST"
```

---

## Résumé des permissions ajoutées

| Clé | Description en français |
|-----|------------------------|
| `NSContactsUsageDescription` | "RunConnect a besoin d'accéder à vos contacts pour trouver vos amis qui utilisent l'application et les inviter à rejoindre vos sessions." |
| `NSPhotoLibraryUsageDescription` | "RunConnect a besoin d'accéder à vos photos pour définir votre photo de profil." |
| `NSPhotoLibraryAddUsageDescription` | "RunConnect a besoin d'accéder à vos photos pour enregistrer des images." |
| `NSLocationWhenInUseUsageDescription` | "RunConnect a besoin d'accéder à votre position pour afficher les sessions à proximité et enregistrer vos parcours." |
| `NSLocationAlwaysAndWhenInUseUsageDescription` | "RunConnect a besoin d'accéder à votre position en arrière-plan pour suivre vos sessions d'entraînement." |
| `NSCameraUsageDescription` | "RunConnect a besoin d'accéder à la caméra pour prendre des photos de profil." |

---

## Détail technique

### Pourquoi utiliser `PlistBuddy` ?

- `PlistBuddy` est l'outil officiel Apple pour modifier les fichiers `.plist`
- La syntaxe `Add ... || Set ...` permet de créer la clé si elle n'existe pas, ou de la mettre à jour si elle existe déjà
- Les apostrophes dans les textes français sont échappées avec `'\''`

### Position dans le workflow

L'étape sera insérée entre :
1. `📱 Add iOS platform` (ligne 37-40)
2. `🔧 Update Bundle Identifier` (ligne 42-45)

Cela garantit que le `Info.plist` existe avant modification et que les changements sont inclus dans le build.

