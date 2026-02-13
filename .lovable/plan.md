

# Fix : Notifications push cassées après refonte

## Problèmes identifiés

### 1. `testNotification` bloque sur "Mode Web"
La fonction `testNotification` (ligne 247) fait `if (!isNative) return` et affiche "Mode Web". Mais le test devrait fonctionner depuis n'importe ou : il suffit de vérifier si un token FCM existe en base de données pour cet utilisateur, puis d'appeler l'edge function.

### 2. `testNotification` affiche "Token manquant"
Meme sur natif, la ligne 252 vérifie `(window as any).fcmToken || token` -- ces deux valeurs sont souvent `null` parce que le state `token` n'est pas systématiquement rempli. Le fix : aller chercher le token directement en DB au lieu de se fier au state local.

### 3. Token recovery trop passive
Le hook ne récupère le `window.fcmToken` qu'une seule fois après 3s (useEffect #2). Si le token natif arrive après 3s (ce qui est courant sur Android lent), il est perdu. Le listener `fcmTokenReady` (useEffect #3) existe mais ne se redéclenche pas si le token était déjà injecté avant le montage du hook.

## Corrections

### Fichier 1 : `src/hooks/usePushNotifications.tsx`

**A. Refaire `testNotification` pour qu'il fonctionne partout :**
- Supprimer le blocage `if (!isNative) return`
- Chercher le token directement en DB (`profiles.push_token`)
- Si token trouvé en DB : appeler l'edge function normalement
- Si pas de token en DB : afficher "Aucun token enregistré" avec instruction d'installer l'app

**B. Renforcer la récupération du token au démarrage :**
- Dans useEffect #1 (init), toujours synchroniser le token depuis la DB dans le state local
- Dans useEffect #2 (recovery), ajouter un second check à 6s en plus du check à 3s
- Dans useEffect #3 (fcmTokenReady), vérifier aussi `window.fcmToken` au montage du listener (pas seulement sur l'événement)

**C. Ajouter la récupération du `window.fcmToken` au montage :**
- Au montage de useEffect #3, si `window.fcmToken` existe déjà (injecté avant React), le sauvegarder immédiatement

### Fichier 2 : Edge function `send-push-notification` -- aucun changement
L'edge function est correcte. Le problème est entièrement coté client.

---

## Détails techniques

### `testNotification` corrigé (pseudo-code)

```text
testNotification:
  1. Vérifier que user est connecté
  2. Récupérer le push_token depuis profiles (DB)
  3. Si pas de token en DB -> "Aucun token. Installez l'app native."
  4. Si token trouvé -> appeler edge function send-push-notification
  5. Afficher le résultat (succès/échec)
```

### Token recovery renforcé

```text
useEffect #3 (fcmTokenReady):
  Au montage:
    - Vérifier si window.fcmToken existe déjà
    - Si oui et pas encore sauvegardé -> savePushToken()
  Sur événement fcmTokenReady:
    - Sauvegarder le token (comme avant)
```

### Fichiers modifiés

| Fichier | Modification |
|---------|-------------|
| `src/hooks/usePushNotifications.tsx` | Fix testNotification + renforcement recovery token |

