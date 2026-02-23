

## Corriger le bouton Retour de la page Suivi d'itineraire

### Probleme
Le bouton "Retour" bloque ou ne repond pas car il attend (`await`) la fin de `stopTracking()` avant de naviguer. Cette fonction contient des appels asynchrones lents (arret du GPS watch, liberation du wake lock, suppression des listeners) qui peuvent prendre du temps ou echouer silencieusement. De plus, `navigate(-1)` ne fonctionne pas si l'utilisateur a accede a la page directement via URL (pas d'historique).

### Solution
1. Naviguer immediatement sans attendre `stopTracking()`.
2. Lancer `stopTracking()` en arriere-plan (fire-and-forget).
3. Ajouter un fallback pour `navigate(-1)` : si pas d'historique, rediriger vers `/`.

### Modifications

**Fichier : `src/pages/TrainingMode.tsx`**

- **Bouton Retour (ligne 304)** : Remplacer le `onClick` par une navigation immediate, avec cleanup en arriere-plan :
  ```tsx
  onClick={() => {
    stopTracking().catch(() => {});
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/', { replace: true });
    }
  }}
  ```
  Suppression du `async/await` pour ne pas bloquer la navigation.

- **Fonction `handleStop` (ligne 240)** : Meme correction, supprimer le `await` :
  ```tsx
  const handleStop = useCallback(() => {
    stopTracking().catch(() => {});
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/', { replace: true });
    }
  }, [stopTracking, navigate]);
  ```

Le cleanup reel (clear GPS watch, release wake lock) se fera de toute facon automatiquement au demontage du composant via le `useEffect` de cleanup dans `useTrainingMode.ts` (ligne 347).

### Fichiers modifies

| Fichier | Modification |
|---------|-------------|
| `src/pages/TrainingMode.tsx` | Bouton retour non-bloquant, fallback navigation vers `/`, suppression du await sur stopTracking |

