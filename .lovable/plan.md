

## Diagnostic : Pourquoi les tokens push ne sont pas sauvegardes

### Probleme identifie

Sur 60 utilisateurs, seulement 4 ont un token push en base. Le probleme est une **race condition** dans le hook `usePushNotifications.tsx` :

1. **Detection native echoue au demarrage** : Dans le WebView Android, `isReallyNative()` retourne `false` au premier rendu car `AndroidBridge` et `fcmToken` ne sont pas encore injectes
2. **Le listener `fcmTokenReady` n'est jamais installe** : L'useEffect #3 (ligne 433) fait `if (!isNative) return;` -- donc le listener n'est jamais mis en place
3. **Le polling natif dure seulement 5 secondes** : Meme si `isNative` passe a `true` apres le polling, le token FCM a deja ete dispatche et rate
4. **Le token n'est jamais sauve en base** : Resultat = `push_token: null` pour la majorite des utilisateurs

### Correction planifiee

**Fichier : `src/hooks/usePushNotifications.tsx`**

#### 1. Ecouter `fcmTokenReady` SANS condition `isNative` (useEffect #3)

Le listener global doit etre actif des le montage, pas seulement en mode natif. Quand un token arrive, on le sauvegarde directement.

Modifier l'useEffect #3 (lignes 433-466) :
- Retirer le guard `if (!isNative) return;`
- Quand un token est recu, mettre aussi a jour `isNative` a `true` (car recevoir un token prouve qu'on est natif)

#### 2. Verifier `window.__fcmTokenBuffer` en plus de `window.fcmToken`

Le `index.html` stocke le token dans `window.__fcmTokenBuffer` (via le listener global fallback). Le hook doit aussi verifier cette variable.

Modifier les lignes 454-461 pour aussi chercher le token dans `window.__fcmTokenBuffer`.

#### 3. Allonger le polling natif de 5s a 15s (lignes 511-516)

Changer le timeout de 5000 a 15000ms pour donner plus de temps a la detection native.

#### 4. Ajouter une sauvegarde directe dans le retry loop (useEffect #2)

Modifier le retry loop (lignes 380-429) pour ne pas etre bloque par `isNative` -- le check du token en DB et la tentative de sauvegarde doivent fonctionner meme si `isNative` n'est pas encore detecte.

Retirer le guard `if (!user || !isNative) return;` (ligne 381) et le remplacer par `if (!user) return;`.

### Resume des modifications

| Ligne | Modification |
|-------|-------------|
| 381 | Retirer `!isNative` du guard du retry loop |
| 405 | Ajouter `window.__fcmTokenBuffer` comme source de token |
| 433-435 | Retirer `if (!isNative) return;` du listener fcmTokenReady |
| 440-446 | Quand token recu, forcer `setIsNative(true)` |
| 454-461 | Ajouter verification de `window.__fcmTokenBuffer` |
| 516 | Changer timeout polling de 5000 a 15000 |

### Impact attendu

- Les tokens seront captures meme si la detection native est lente
- Le fallback `__fcmTokenBuffer` rattrape les tokens dispatches avant React
- Le retry loop fonctionne independamment de la detection native
- Compatible Android WebView, Capacitor Android, et iOS

