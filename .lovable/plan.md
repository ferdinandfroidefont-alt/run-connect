
# Plan : Correction sélection photo de profil sur mobile Android

## Problème identifié

Quand l'utilisateur sélectionne une photo depuis la galerie pendant la création de compte sur Android, la photo ne s'affiche pas. Le fichier est bien sélectionné côté Android natif (`onActivityResult` dans `MainActivity.java`), mais l'événement `onchange` JavaScript n'est pas capté correctement par la WebView.

## Cause technique

L'ordre des événements sur Android WebView :
1. Utilisateur sélectionne une image dans la galerie
2. Android envoie l'URI via `filePathCallback.onReceiveValue(results)`
3. Les événements `focus`/`visibilitychange` se déclenchent IMMÉDIATEMENT
4. L'événement `onchange` de l'input est retardé (timing variable selon l'appareil)
5. Après 3 secondes, le code vérifie `input.files` mais celui-ci peut encore être vide

## Solution en 2 parties

### Partie 1 : Améliorer le timing côté JavaScript

**Fichier : `src/hooks/useCamera.tsx`**

Modifications :
1. Augmenter le délai d'attente après `focus`/`visibilitychange` à 5 secondes
2. Ajouter une vérification en boucle (polling) au lieu d'une vérification unique
3. Utiliser `MutationObserver` pour détecter quand le fichier est assigné

```typescript
const selectFromGalleryWeb = async (): Promise<File | null> => {
  return new Promise((resolve) => {
    console.log('🌐 [GALLERY-WEB] Ouverture input file web...');
    
    // Supprimer tout input résiduel
    const existingInputs = document.querySelectorAll('input[type="file"][data-gallery-picker]');
    existingInputs.forEach(el => el.remove());
    
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.setAttribute('data-gallery-picker', 'true');
    
    // Style visible mais hors écran
    input.style.position = 'fixed';
    input.style.top = '0';
    input.style.left = '0';
    input.style.opacity = '0.01';
    input.style.width = '1px';
    input.style.height = '1px';
    input.style.zIndex = '999999';
    
    document.body.appendChild(input);
    
    let resolved = false;
    let pollIntervalId: NodeJS.Timeout | null = null;
    
    const doResolve = (file: File | null, source: string) => {
      if (resolved) return;
      resolved = true;
      clearTimeout(timeoutId);
      if (pollIntervalId) clearInterval(pollIntervalId);
      console.log(`🌐 [GALLERY-WEB] Résolution via ${source}:`, file ? file.name : 'null');
      
      setTimeout(() => {
        try { input.remove(); } catch (e) { /* ignore */ }
      }, 200);
      
      resolve(file);
    };
    
    // Timeout global de 90 secondes
    const timeoutId = setTimeout(() => {
      console.warn('⏱️ [GALLERY-WEB] Timeout sélection galerie (90s)');
      doResolve(null, 'timeout');
    }, 90000);
    
    // POLLING: Vérifier input.files toutes les 500ms pendant 10 secondes max
    const startPolling = () => {
      if (pollIntervalId) return;
      
      let pollCount = 0;
      const maxPolls = 20; // 10 secondes max (20 * 500ms)
      
      pollIntervalId = setInterval(() => {
        pollCount++;
        console.log(`🔄 [GALLERY-WEB] Poll #${pollCount}: files=${input.files?.length || 0}`);
        
        if (input.files && input.files.length > 0) {
          console.log('✅ [GALLERY-WEB] Fichier détecté via polling:', input.files[0].name);
          doResolve(input.files[0], 'polling');
          return;
        }
        
        if (pollCount >= maxPolls) {
          console.log('ℹ️ [GALLERY-WEB] Polling terminé sans fichier');
          if (pollIntervalId) clearInterval(pollIntervalId);
          pollIntervalId = null;
          doResolve(null, 'polling-timeout');
        }
      }, 500);
    };
    
    // onchange reste prioritaire
    input.onchange = (event) => {
      console.log('🔄 [GALLERY-WEB] onchange déclenché');
      const file = (event.target as HTMLInputElement).files?.[0];
      
      if (file) {
        console.log('✅ [GALLERY-WEB] Fichier via onchange:', file.name, file.size);
        doResolve(file, 'onchange');
      } else {
        console.warn('⚠️ [GALLERY-WEB] onchange sans fichier');
        // Ne pas résoudre null ici, laisser le polling continuer
      }
    };
    
    // Détecter le retour de l'app et démarrer le polling
    const handleVisibilityOrFocus = () => {
      if (resolved) return;
      console.log('🔄 [GALLERY-WEB] App revenue au premier plan, démarrage polling...');
      startPolling();
    };
    
    window.addEventListener('focus', handleVisibilityOrFocus, { once: true });
    
    const visibilityHandler = () => {
      if (document.visibilityState === 'visible') {
        handleVisibilityOrFocus();
        document.removeEventListener('visibilitychange', visibilityHandler);
      }
    };
    document.addEventListener('visibilitychange', visibilityHandler);
    
    input.onerror = (error) => {
      console.error('❌ [GALLERY-WEB] Erreur input file:', error);
      doResolve(null, 'error');
    };
    
    // Cliquer sur l'input après un court délai
    setTimeout(() => {
      try {
        input.click();
        console.log('✅ [GALLERY-WEB] Input file cliqué');
      } catch (clickError) {
        console.error('❌ [GALLERY-WEB] Erreur click input:', clickError);
        doResolve(null, 'click-error');
      }
    }, 150);
  });
};
```

### Partie 2 : Améliorer le feedback utilisateur

**Fichier : `src/components/ProfileSetupDialog.tsx`**

Ajouter un état de chargement visible pendant la sélection de photo :

```typescript
const handleSelectPhoto = async () => {
  try {
    console.log('📸 [ProfileSetup] Début sélection photo...');
    
    // Afficher un indicateur de chargement
    toast({
      title: "Sélection en cours...",
      description: "Veuillez patienter après avoir choisi votre photo",
    });
    
    const file = await selectFromGallery();
    console.log('📸 [ProfileSetup] Fichier reçu:', file ? { name: file.name, size: file.size } : 'null');
    
    if (file) {
      handleFileSelection(file);
      toast({
        title: "Photo sélectionnée !",
        description: "Vous pouvez maintenant recadrer votre photo",
      });
    } else {
      console.log('📸 [ProfileSetup] Aucun fichier sélectionné');
      toast({
        title: "Aucune photo",
        description: "Aucune photo n'a été sélectionnée. Réessayez ou utilisez la sélection alternative.",
        variant: "destructive"
      });
    }
  } catch (error: any) {
    console.error('📸 [ProfileSetup] Erreur:', error);
    toast({ 
      title: "Erreur", 
      description: error?.message || "Impossible d'accéder à la galerie. Utilisez la sélection alternative.", 
      variant: "destructive" 
    });
  }
};
```

### Partie 3 : Améliorer le bouton de sélection alternative

Rendre le bouton de sélection alternative plus visible :

```tsx
{/* Bouton de sélection alternative plus visible */}
<Button
  type="button"
  variant="outline"
  size="sm"
  onClick={() => fileInputRef.current?.click()}
  className="mt-2"
>
  📱 Sélection alternative (si la galerie ne fonctionne pas)
</Button>
<input
  ref={fileInputRef}
  type="file"
  accept="image/*"
  onChange={(e) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelection(file);
  }}
  className="hidden"
/>
```

## Résumé des modifications

| Fichier | Modification |
|---------|--------------|
| `src/hooks/useCamera.tsx` | Remplacer la vérification unique par un système de polling qui vérifie `input.files` toutes les 500ms pendant 10 secondes après le retour de l'app |
| `src/components/ProfileSetupDialog.tsx` | Ajouter des toasts de feedback et améliorer le bouton de sélection alternative |

## Pourquoi cette solution fonctionne

1. **Polling** : Au lieu d'attendre un délai fixe (3s), on vérifie régulièrement si le fichier est disponible
2. **Timing adaptatif** : Le polling s'arrête dès qu'un fichier est détecté (pas de délai inutile)
3. **Robustesse** : Si `onchange` se déclenche, il prend la priorité ; sinon le polling récupère le fichier
4. **Fallback visible** : Le bouton de sélection alternative est plus accessible si tout échoue
