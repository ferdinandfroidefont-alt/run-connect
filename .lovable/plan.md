

# Fix : Token push null pour les nouveaux utilisateurs

## Diagnostic

En analysant la base de donnees, **8 utilisateurs sur 10** ont `push_token: null`. Le probleme vient d'un **probleme de timing** entre la creation du profil et la sauvegarde du token FCM.

### Sequence actuelle (bugguee)

```text
1. App demarre -> Token FCM genere par Firebase
2. Token injecte dans window.fcmToken
3. React detecte le token -> appelle savePushToken()
4. savePushToken() fait un UPDATE sur la table profiles
5. MAIS le profil n'existe pas encore (l'utilisateur n'a pas termine le ProfileSetup)
6. UPDATE match 0 lignes -> "reussit" silencieusement sans rien sauvegarder
7. L'utilisateur termine son profil -> INSERT du profil SANS le token
8. Le token est perdu a jamais
```

## Solution

### 1. savePushToken : ajouter un retry apres echec d'UPDATE (usePushNotifications.tsx)

Quand l'UPDATE ne modifie aucune ligne (profil pas encore cree), stocker le token en memoire et programmer un retry toutes les 10 secondes pendant 2 minutes. Des que le profil existe, le token sera sauve.

Aussi, verifier le nombre de lignes affectees par l'UPDATE : si 0, ca veut dire que le profil n'existe pas encore.

### 2. ProfileSetupDialog : sauvegarder le token FCM a la creation du profil

Dans `ProfileSetupDialog.tsx`, apres l'INSERT du nouveau profil, verifier si un token FCM est disponible dans `window.fcmToken` et le sauvegarder immediatement dans le profil. Cela garantit que meme si le retry n'a pas encore tourne, le token est capture au moment de la creation du profil.

### 3. Ajouter un useEffect qui re-tente quand user change

Actuellement, le useEffect #2 (recovery) lance des timers a 3s et 6s. Mais si l'utilisateur met plus de 6 secondes a se connecter (tres probable sur une nouvelle installation), les timers sont passes. Ajouter un retry plus long (toutes les 10s pendant 2 min) specifiquement pour le cas ou le profil n'existe pas encore.

## Details techniques

### Fichier 1 : `src/hooks/usePushNotifications.tsx`

**Modifier `savePushToken`** :
- Apres l'UPDATE, verifier combien de lignes ont ete affectees (via `.select()` apres update ou un re-query)
- Si 0 lignes : le profil n'existe pas encore, garder le token en memoire et retourner `false`
- Ajouter un mecanisme de retry : un `setInterval` de 10s qui re-tente `savePushToken` tant que le token n'est pas sauve (max 2 min)

**Ajouter un useEffect supplementaire** :
- Quand `user` passe de null a une valeur, verifier si un token est en attente dans le state local ou dans `window.fcmToken`
- Si oui, lancer immediatement `savePushToken` puis des retries a 5s, 15s, 30s, 60s

### Fichier 2 : `src/components/ProfileSetupDialog.tsx`

**Apres l'INSERT du profil** (ligne 415), ajouter :
```
const pendingToken = (window as any).fcmToken;
if (pendingToken && pendingToken.length > 50) {
  await supabase.from('profiles')
    .update({ push_token: pendingToken, push_token_platform: 'android', push_token_updated_at: new Date().toISOString(), notifications_enabled: true })
    .eq('user_id', userId);
}
```

### Resume des changements

| Fichier | Modification |
|---------|-------------|
| `src/hooks/usePushNotifications.tsx` | savePushToken avec retry si profil inexistant + useEffect de re-tentative progressive |
| `src/components/ProfileSetupDialog.tsx` | Sauvegarde du token FCM en attente lors de la creation du profil |

