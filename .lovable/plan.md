

# Plan : Correction du changement de compte - Session précédente persistante

## Problème identifié

Quand vous vous déconnectez et vous connectez avec un autre compte, vous restez connecté à l'ancien compte. C'est un problème de nettoyage incomplet de la session.

## Causes techniques

### 1. Nettoyage incomplet du localStorage dans `signOut()`

**Fichier : `src/hooks/useAuth.tsx` (lignes 159-173)**

Le code actuel :
```typescript
const signOut = async () => {
  try {
    localStorage.removeItem('supabase.auth.token');
    localStorage.removeItem('sb-dbptgehpknjsoisirviz-auth-token');
    sessionStorage.clear();
    
    await supabase.auth.signOut({ scope: 'global' });
    window.location.href = '/auth';
  } catch (error) {
    // ...
  }
};
```

**Problème** : La déconnexion est appelée APRÈS le nettoyage du localStorage, donc les tokens peuvent être recréés par Supabase avant la redirection.

### 2. Pas de nettoyage avant connexion

**Fichier : `src/pages/Auth.tsx` (lignes 330-361)**

Quand l'utilisateur se connecte avec `signInWithPassword`, le code ne nettoie pas l'ancienne session avant d'en créer une nouvelle.

### 3. État React non réinitialisé

Les contextes `AuthProvider` et `UserProfileProvider` gardent l'ancien état en mémoire même après `signOut` car la page ne se recharge pas toujours correctement sur mobile.

---

## Solution

### Modification 1 : Améliorer `signOut` dans `useAuth.tsx`

```typescript
const signOut = async () => {
  try {
    console.log('🚪 [AUTH] Starting signOut...');
    
    // 1. D'abord déconnecter côté serveur
    await supabase.auth.signOut({ scope: 'global' });
    
    // 2. Nettoyer TOUS les tokens Supabase du localStorage
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.includes('supabase') || key.includes('sb-'))) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
    
    // 3. Vider sessionStorage
    sessionStorage.clear();
    
    // 4. Réinitialiser les états React
    setUser(null);
    setSession(null);
    setSubscriptionInfo(null);
    
    console.log('✅ [AUTH] SignOut complete, redirecting...');
    
    // 5. Forcer un rechargement complet pour vider la mémoire React
    window.location.href = '/auth';
  } catch (error) {
    console.error('❌ [AUTH] Error signing out:', error);
    // Forcer le nettoyage et la redirection même en cas d'erreur
    localStorage.clear();
    sessionStorage.clear();
    window.location.href = '/auth';
  }
};
```

### Modification 2 : Nettoyer avant nouvelle connexion dans `Auth.tsx`

Dans `handleUsernameOrEmailSignin` (ligne 330), ajouter un nettoyage préalable :

```typescript
const handleUsernameOrEmailSignin = async (e: React.FormEvent) => {
  e.preventDefault();
  setIsLoading(true);
  try {
    // ✅ NOUVEAU: Nettoyer toute session existante avant connexion
    console.log('🧹 [AUTH] Cleaning existing session before new login...');
    await supabase.auth.signOut({ scope: 'local' });
    
    let emailToUse = usernameOrEmail;
    // ... reste du code
  }
};
```

Même modification pour `handleGoogleAuth` et `handleOtpSubmit`.

### Modification 3 : Améliorer le `WebViewStorage`

Ajouter une méthode pour nettoyer tous les tokens Supabase :

```typescript
// Dans src/lib/webview-storage.ts
clearAllSupabaseKeys(): void {
  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && (key.includes('supabase') || key.includes('sb-'))) {
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach(key => {
    localStorage.removeItem(key);
    console.log(`🗑️ [WebViewStorage] Removed: ${key}`);
  });
}
```

---

## Résumé des modifications

| Fichier | Modification |
|---------|--------------|
| `src/hooks/useAuth.tsx` | Améliorer `signOut()` pour nettoyer tous les tokens, réinitialiser les états React, et déconnecter AVANT le nettoyage |
| `src/pages/Auth.tsx` | Ajouter `signOut({ scope: 'local' })` avant chaque nouvelle connexion |
| `src/lib/webview-storage.ts` | Ajouter méthode `clearAllSupabaseKeys()` |

---

## Pourquoi ça marche

1. **Ordre correct** : Déconnexion serveur AVANT nettoyage local
2. **Nettoyage complet** : Tous les tokens Supabase sont supprimés (pas juste 2 clés spécifiques)
3. **Prévention** : Nettoyage avant nouvelle connexion pour éviter les conflits
4. **États React** : Réinitialisation explicite des states avant redirection

