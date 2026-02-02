
# Plan de correction : Bug RGPD boucle infinie

## Diagnostic approfondi

J'ai identifié **3 causes racines** qui créent la boucle infinie et l'incohérence :

### Cause 1 : Race condition dans `refreshProfile`
Dans `UserProfileContext.tsx`, la fonction `refreshProfile` recharge le profil mais met `setLoading(true)` **avant** le rechargement :

```typescript
const refreshProfile = async () => {
  setLoading(true);   // ← PROBLÈME : remet loading à true
  await loadProfile();
};
```

Le flux actuel :
1. Utilisateur clique "Accepter"
2. `handleAccept` → update Supabase → `onComplete()` (= `refreshProfile`)
3. `refreshProfile` → `setLoading(true)` → profile rechargé
4. `Layout` détecte `profileLoading = true` → affiche écran vide
5. Quand le profil est rechargé, le contexte React n'a pas encore le nouveau profil
6. Le temps réel n'a pas encore propagé la mise à jour
7. `needsConsent` reste `true` → boucle !

### Cause 2 : Le temps réel peut NE PAS être écouté
Dans `UserProfileContext.tsx`, le subscription temps réel est établi APRÈS que le profile soit chargé. Si le profil n'existe pas encore ou si la subscription échoue, les mises à jour ne sont pas propagées.

### Cause 3 : Problème de cache/état dans `refreshProfile`
Le `await loadProfile()` peut retourner l'ancienne version du profil si Supabase n'a pas encore fini de propager l'update, ou si le cache du client Supabase retourne les anciennes données.

### Cause 4 : Condition `needsConsent` incorrecte
```typescript
const needsConsent = userProfile && 
  (!userProfile.rgpd_accepted || !userProfile.security_rules_accepted);
```

Cette condition est vérifiée **à chaque render** de Layout. Si `refreshProfile` déclenche un re-render avant que les nouvelles données arrivent, la condition reste vraie.

## Solution complète

### Partie 1 : Ajouter un état local `consentCompleted` dans Layout

Au lieu de se fier uniquement à `userProfile.rgpd_accepted`, ajouter un état local qui persiste dans la session :

```typescript
// Layout.tsx
const [consentCompleted, setConsentCompleted] = useState(false);

// Vérifier localStorage au montage
useEffect(() => {
  const cachedConsent = localStorage.getItem(`consent_${user?.id}`);
  if (cachedConsent === 'true') {
    setConsentCompleted(true);
  }
}, [user?.id]);

// Si consentCompleted est true, ne jamais afficher le dialog
const needsConsent = userProfile && 
  !consentCompleted &&
  (!userProfile.rgpd_accepted || !userProfile.security_rules_accepted);

// Callback pour ConsentDialog
const handleConsentComplete = async () => {
  // Stocker en local pour éviter la boucle
  localStorage.setItem(`consent_${user?.id}`, 'true');
  setConsentCompleted(true);
  await refreshProfile();
};
```

### Partie 2 : Modifier ConsentDialog pour une fermeture garantie

```typescript
// ConsentDialog.tsx
const handleAccept = async () => {
  // ...update Supabase...
  
  // Stocker en localStorage AVANT d'appeler onComplete
  localStorage.setItem(`consent_${userId}`, 'true');
  
  // Puis notifier le parent
  onComplete();
};
```

### Partie 3 : Améliorer refreshProfile pour éviter les états incohérents

```typescript
// UserProfileContext.tsx
const refreshProfile = async () => {
  // NE PAS mettre loading à true pour éviter les flashs
  // Juste recharger le profil en arrière-plan
  await loadProfile();
};
```

### Partie 4 : Forcer un délai avant de vérifier needsConsent

Dans `Layout.tsx`, après le chargement initial, attendre que les données soient stables :

```typescript
const [isInitialized, setIsInitialized] = useState(false);

useEffect(() => {
  if (userProfile && !profileLoading) {
    // Attendre un tick pour s'assurer que le temps réel a propagé
    const timer = setTimeout(() => {
      setIsInitialized(true);
    }, 100);
    return () => clearTimeout(timer);
  }
}, [userProfile, profileLoading]);

// Ne vérifier le consentement qu'après initialisation
const needsConsent = isInitialized && userProfile && 
  !consentCompleted &&
  (!userProfile.rgpd_accepted || !userProfile.security_rules_accepted);
```

### Partie 5 : Nettoyer le cache localStorage à la déconnexion

```typescript
// useAuth.tsx - signOut
const signOut = async () => {
  // Nettoyer aussi les flags de consentement
  Object.keys(localStorage).forEach(key => {
    if (key.startsWith('consent_')) {
      localStorage.removeItem(key);
    }
  });
  // ...reste du code
};
```

## Résumé des modifications

| Fichier | Modification |
|---------|--------------|
| `src/components/Layout.tsx` | Ajouter état `consentCompleted` avec cache localStorage, ne vérifier qu'après initialisation |
| `src/components/ConsentDialog.tsx` | Stocker le consentement en localStorage avant d'appeler `onComplete` |
| `src/contexts/UserProfileContext.tsx` | Ne pas remettre `loading` à true dans `refreshProfile` pour éviter les flashs |
| `src/hooks/useAuth.tsx` | Nettoyer les flags `consent_*` à la déconnexion |

## Comportement attendu après fix

1. **Premier lancement** : 
   - Pas de `consent_userId` en localStorage
   - Profil avec `rgpd_accepted = false`
   - → Dialog RGPD s'affiche

2. **Après "Accepter"** :
   - `localStorage.setItem('consent_userId', 'true')` immédiatement
   - `consentCompleted = true` localement
   - Update Supabase en parallèle
   - → Dialog se ferme immédiatement, pas de boucle

3. **Après désinstallation/réinstallation** :
   - localStorage est vidé
   - Si l'utilisateur a un compte avec `rgpd_accepted = true` en base, pas de dialog
   - Si `rgpd_accepted = false` en base, dialog s'affiche

4. **Changement de compte** :
   - À la déconnexion, les `consent_*` sont nettoyés
   - Le nouveau compte vérifiera son propre état

## Pourquoi cette solution fonctionne

1. **Double vérification** : Le localStorage évite la boucle car il est lu de manière synchrone
2. **Source de vérité** : Supabase reste la source de vérité, le localStorage n'est qu'un cache de session
3. **Pas de race condition** : On ne dépend plus de `refreshProfile` pour fermer le dialog
4. **Comportement cohérent** : La logique gère correctement tous les cas (réinstallation, changement de compte, etc.)
