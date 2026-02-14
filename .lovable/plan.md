

# Fix: Boucle de creation de profil - Cause racine et solution definitive

## Probleme identifie

La cause racine est **l'utilisation de `window.location.replace('/')` pour la redirection apres creation de profil**. Cette approche provoque un rechargement complet de la page, ce qui dans le contexte WebView Android declenche une cascade de problemes :

1. **`window.location.replace('/')` cause un full page reload** - toute l'app React se reinitialise
2. **Le mecanisme de detection native dans `main.tsx` (lignes 95-117)** peut declencher un SECOND reload 500ms apres le premier si `AndroidBridge` est detecte tardivement
3. **Les flags localStorage sont nettoyes trop tot** - dans le `useEffect` d'Auth.tsx (ligne 47), les flags `profileCreatedSuccessfully` sont supprimes AVANT que la redirection ne soit complete
4. **Race condition entre reloads** - le reload natif peut ramener l'utilisateur sur `/auth`, ou le profil n'est pas encore detecte

```text
Flux actuel (defaillant):
ProfileSetupDialog --> onComplete --> setTimeout 300ms --> window.location.replace('/')
                                                              |
                                              Full page reload, React reinitialise
                                                              |
                                              main.tsx detecte AndroidBridge en retard
                                                              |
                                              window.location.reload() <-- 2eme reload!
                                                              |
                                              Auth.tsx useEffect: supprime les flags localStorage
                                                              |
                                              Index.tsx: useOnboarding ne trouve plus les flags
                                                              |
                                              ProfileSetupDialog reapparait
```

## Solution

Remplacer `window.location.replace('/')` par une **navigation SPA via React Router** (`useNavigate`). Cela evite tout rechargement de page et elimine les race conditions.

```text
Nouveau flux:
ProfileSetupDialog --> onComplete --> navigate('/', { replace: true })
                                         |
                                  Navigation SPA instantanee (pas de reload)
                                         |
                                  Index.tsx monte, useOnboarding voit les flags localStorage
                                         |
                                  Pas de ProfileSetupDialog, app accessible
```

## Modifications techniques

### 1. `src/pages/Auth.tsx`
- Ajouter `import { useNavigate } from 'react-router-dom'`
- Ajouter `const navigate = useNavigate()` dans le composant
- Remplacer le `onComplete` du ProfileSetupDialog : supprimer les `setTimeout` et `window.location.replace`, utiliser `navigate('/', { replace: true })` directement
- Remplacer aussi les `window.location.href = '/'` dans le `useEffect` (lignes 51 et 141) par `navigate('/', { replace: true })`

### 2. `src/components/ProfileSetupDialog.tsx`
- Supprimer le fallback `window.location.replace('/')` dans handleSubmit (ligne 480) car la navigation est maintenant geree par le parent via `onComplete`

### 3. `src/pages/Index.tsx`
- Nettoyer le flag `profileCreatedSuccessfully` du localStorage apres le premier rendu reussi (au lieu de le laisser trainer indefiniment) via un `useEffect` avec delai de 5 secondes

