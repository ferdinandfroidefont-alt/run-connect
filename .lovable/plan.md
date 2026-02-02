
# Plan de correction définitive : Bug photo de profil Android

## Diagnostic approfondi

J'ai identifié **DEUX causes racines** du rechargement de page après sélection de photo :

### Cause 1 : Reload automatique dans `main.tsx`
```typescript
// main.tsx, lignes 96-106
if (!isNative) {
  setTimeout(() => {
    if ((window as any).AndroidBridge && !(window as any).CapacitorForceNative) {
      console.log('🔥 CORRECTION: AndroidBridge détecté en retard, activation mode natif');
      (window as any).CapacitorForceNative = true;
      (window as any).nativeModeActivated = true;
      console.log('🔄 Rechargement de la page pour activer le mode natif...');
      window.location.reload();  // ← CECI CAUSE LE PROBLÈME
    }
  }, 500);
}
```

Quand l'utilisateur sélectionne une photo :
1. L'activité MainActivity passe en arrière-plan (sélecteur de fichier)
2. L'utilisateur choisit la photo et revient
3. Le timer de 500ms peut se déclencher et recharger la page
4. Tous les états React sont perdus, y compris l'URL de la photo

### Cause 2 : Reload dans `MainActivity.java` → `injectAABFlags()`
```java
// MainActivity.java, lignes 1088-1091
"if (window.reactAlreadyLoaded && !window.nativeModeActivated) {" +
"  console.log('🔥 CORRECTION TARDIVE: React déjà chargé, reload nécessaire');" +
"  window.location.reload();" +
"}"
```

Ce code dans `injectAABFlags` est appelé à plusieurs moments :
- `onPageStarted` (ligne 510)
- `onPageFinished` (ligne 523)
- Au démarrage (lignes 621, 645)

Si les conditions sont réunies lors du retour de la galerie, un reload peut être déclenché.

## Solution en 3 parties

### Partie 1 : Modifier `main.tsx` pour éviter le reload pendant la sélection de fichier

Ajouter un flag `window.fileSelectionInProgress` qui empêche le reload automatique quand un file picker est ouvert.

```typescript
// AVANT
if (!isNative) {
  setTimeout(() => {
    if ((window as any).AndroidBridge && !(window as any).CapacitorForceNative) {
      window.location.reload();
    }
  }, 500);
}

// APRÈS
if (!isNative) {
  setTimeout(() => {
    if ((window as any).AndroidBridge && !(window as any).CapacitorForceNative) {
      // ✅ NE PAS RECHARGER si une sélection de fichier est en cours
      if ((window as any).fileSelectionInProgress) {
        console.log('⏸️ Reload différé - sélection de fichier en cours');
        return;
      }
      console.log('🔄 Rechargement pour activer le mode natif...');
      window.location.reload();
    }
  }, 500);
}
```

### Partie 2 : Modifier `ProfileSetupDialog.tsx` pour marquer la sélection en cours

Définir le flag `window.fileSelectionInProgress` avant d'ouvrir le file picker et le retirer après la sélection/annulation.

```typescript
// Dans handleCameraButtonClick
const handleCameraButtonClick = () => {
  console.log('📸 [ProfileSetup] Clic bouton caméra');
  (window as any).fileSelectionInProgress = true;  // ✅ BLOQUER LE RELOAD
  setIsSelectingPhoto(true);
  fileInputRef.current?.click();
};

// Dans handlePhotoInputChange
const handlePhotoInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  (window as any).fileSelectionInProgress = false;  // ✅ DÉBLOQUER
  setIsSelectingPhoto(false);
  // ...reste du code
};
```

### Partie 3 : Modifier `MainActivity.java` pour supprimer le reload conditionnel

Le reload automatique dans `injectAABFlags` est trop agressif. On le retire car il cause plus de problèmes qu'il n'en résout.

```java
// AVANT (lignes 1077-1091)
String jsCode = "window.CapacitorForceNative = true; " +
               // ...autres flags...
               "if (window.reactAlreadyLoaded && !window.nativeModeActivated) {" +
               "  console.log('🔥 CORRECTION TARDIVE: React déjà chargé, reload nécessaire');" +
               "  window.location.reload();" +
               "}";

// APRÈS
String jsCode = "window.CapacitorForceNative = true; " +
               "window.isAABBuild = true; " +
               "window.AndroidNativeEnvironment = true; " +
               "window.capacitorReady = true; " +
               "window.nativeModeActivated = true; " +  // ✅ DÉFINIR AUSSI nativeModeActivated
               "console.log('🚀 [NIVEAU 28] Flags AAB injectés:', {" +
               "  CapacitorForceNative: window.CapacitorForceNative, " +
               "  nativeModeActivated: window.nativeModeActivated" +
               "});";
// ✅ SUPPRESSION du bloc if/reload
```

## Résumé des modifications

| Fichier | Modification |
|---------|--------------|
| `src/main.tsx` | Ajouter condition `!window.fileSelectionInProgress` avant le reload |
| `src/components/ProfileSetupDialog.tsx` | Définir `window.fileSelectionInProgress = true/false` au clic caméra et au retour |
| `android/app/src/main/java/app/runconnect/MainActivity.java` | Supprimer la logique de reload conditionnel dans `injectAABFlags()` et toujours définir `nativeModeActivated = true` |

## Pourquoi cette solution fonctionne

1. **Flag de protection** : `fileSelectionInProgress` empêche tout reload pendant que l'utilisateur est dans la galerie
2. **Suppression du reload agressif** : En supprimant le reload conditionnel dans le code Java, on évite les rechargements intempestifs
3. **Définition précoce de `nativeModeActivated`** : En le définissant toujours à `true` dans l'injection Java, la condition JavaScript ne sera plus jamais vraie

## Impact

- ✅ Aucun reload après sélection de photo
- ✅ La preview de l'image apparaît immédiatement
- ✅ Le formulaire n'est pas réinitialisé
- ✅ Le mode natif reste activé normalement pour les autres fonctionnalités
