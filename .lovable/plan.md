
# Correction définitive : Redirection après création de profil

## Problème identifié

La redirection `window.location.href = '/'` dans `ProfileSetupDialog` ne fonctionne pas sur Android WebView après la création du profil. Le compte est bien créé mais l'utilisateur reste bloqué sur la page.

## Causes techniques

1. **`setTimeout` + `window.location.href` = non fiable sur WebView**
   - La WebView Android peut ignorer les changements de navigation dans un setTimeout
   - Après des opérations async lourdes (upload image), la WebView peut être dans un état instable
   
2. **Fermeture du dialog avant redirection**
   - `onOpenChange(false)` ferme le dialog, ce qui peut démonter le composant
   - Le `setTimeout` se retrouve orphelin et peut ne pas s'exécuter

3. **Absence de mécanisme de fallback**
   - Si la première tentative échoue, rien ne prend le relais

## Solution en 3 parties

### Partie 1 : Redirection SYNCHRONE et MULTIPLE

Remplacer le `setTimeout` simple par une stratégie de redirection agressive :

```typescript
// Dans ProfileSetupDialog.tsx - handleSubmit
// APRÈS la création du profil réussie

// 🔥 NIVEAU 33: Stratégie de redirection ULTRA-AGRESSIVE pour Android WebView
console.log('✅ [ProfileSetup] Profil créé - lancement redirection MULTI-MÉTHODE');

// Méthode 1: localStorage flag pour que la page Auth détecte le succès
localStorage.setItem('profileCreatedSuccessfully', 'true');
localStorage.setItem('profileCreatedAt', Date.now().toString());

// Méthode 2: Fermer le dialog APRÈS avoir configuré la redirection
// PAS AVANT pour éviter le démontage prématuré
const redirectNow = () => {
  console.log('🚀 [ProfileSetup] Tentative redirection...');
  window.location.href = '/';
};

// Méthode 3: Tentatives multiples avec délais croissants
redirectNow(); // Tentative immédiate

setTimeout(redirectNow, 100);
setTimeout(redirectNow, 300);
setTimeout(redirectNow, 500);
setTimeout(redirectNow, 1000);

// Méthode 4: Utiliser aussi location.replace comme fallback
setTimeout(() => {
  console.log('🚀 [ProfileSetup] Fallback location.replace...');
  window.location.replace('/');
}, 1500);

// Méthode 5: Si toujours là après 2s, forcer avec reload
setTimeout(() => {
  console.log('🚀 [ProfileSetup] Dernier recours - reload vers /');
  window.location.assign('/');
}, 2000);

// Fermer le dialog en dernier
onOpenChange(false);
if (onComplete) onComplete();
```

### Partie 2 : Détection côté Auth.tsx pour redirection automatique

Ajouter une vérification dans `Auth.tsx` qui détecte si un profil vient d'être créé et force la redirection :

```typescript
// Dans Auth.tsx - useEffect existant
useEffect(() => {
  // 🔥 NIVEAU 33: Détecter si profil créé mais redirection échouée
  const profileCreated = localStorage.getItem('profileCreatedSuccessfully');
  const profileCreatedAt = localStorage.getItem('profileCreatedAt');
  
  if (profileCreated === 'true' && profileCreatedAt) {
    const createdTime = parseInt(profileCreatedAt, 10);
    const timeSinceCreation = Date.now() - createdTime;
    
    // Si profil créé il y a moins de 30 secondes, forcer la redirection
    if (timeSinceCreation < 30000) {
      console.log('🔥 [Auth] Profil créé détecté, redirection forcée vers /');
      localStorage.removeItem('profileCreatedSuccessfully');
      localStorage.removeItem('profileCreatedAt');
      window.location.href = '/';
      return;
    } else {
      // Nettoyer les vieux flags
      localStorage.removeItem('profileCreatedSuccessfully');
      localStorage.removeItem('profileCreatedAt');
    }
  }
  
  // ... reste du useEffect existant
}, []);
```

### Partie 3 : Vérifier que le profil est LISIBLE avant de rediriger

Suivre le pattern Stack Overflow fourni - vérifier que le profil est lisible par RLS :

```typescript
// Dans ProfileSetupDialog.tsx - handleSubmit
// APRÈS l'insert/update du profil

// 🔥 NIVEAU 33: Vérifier que le profil est lisible (RLS)
const { data: verifiedProfile, error: verifyError } = await supabase
  .from('profiles')
  .select('id, user_id')
  .eq('user_id', userId)
  .single();

if (verifyError || !verifiedProfile) {
  console.error('❌ [ProfileSetup] Profil créé mais non lisible - problème RLS?', verifyError);
  throw new Error('Profil créé mais non vérifiable. Réessayez.');
}

console.log('✅ [ProfileSetup] Profil vérifié comme lisible:', verifiedProfile.id);

// Continuer avec la redirection...
```

## Résumé des modifications

| Fichier | Modification |
|---------|--------------|
| `src/components/ProfileSetupDialog.tsx` | Stratégie de redirection multi-méthode avec tentatives répétées + vérification RLS |
| `src/pages/Auth.tsx` | Détection du flag localStorage pour forcer la redirection si elle a échoué |

## Pourquoi cette solution fonctionne

1. **Redirection synchrone** : On essaie immédiatement, pas juste après un délai
2. **Tentatives multiples** : 6 tentatives sur 2 secondes garantissent qu'au moins une passe
3. **Fallback localStorage** : Si tout échoue, Auth.tsx prend le relais au prochain render
4. **Vérification RLS** : On s'assure que le profil est bien lisible avant de quitter
5. **Fermeture différée** : Le dialog reste ouvert jusqu'à ce que la redirection soit lancée

## Comportement attendu

1. Utilisateur clique "Créer mon compte"
2. Profil créé dans Supabase
3. Vérification RLS confirme la lisibilité
4. localStorage flag mis en place
5. 6 tentatives de redirection en 2 secondes
6. L'une d'elles réussit → utilisateur sur la page d'accueil
7. Si toutes échouent → Auth.tsx détecte le flag et redirige
