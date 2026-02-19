

## Fix: Google Sign-In "Acces Bloque" sur iOS

### Cause racine

Google interdit l'authentification OAuth dans les WebViews embarquees (WKWebView) depuis avril 2017. C'est une politique de securite stricte de Google.

Le code actuel utilise `InAppBrowser.openWebView()` qui ouvre un **WKWebView** -- Google le detecte et affiche "Acces bloque".

Safari fonctionne car c'est un navigateur complet. Android fonctionne car il utilise le SDK natif Google (AndroidBridge).

### Solution

Remplacer `InAppBrowser.openWebView()` par `InAppBrowser.open()` dans `src/pages/Auth.tsx`. La methode `open()` utilise `SFSafariViewController` (ou `ASWebAuthenticationSession`) sur iOS, qui est **autorise par Google** pour OAuth car il partage les cookies et le contexte de securite du navigateur systeme.

### Modification

**Fichier : `src/pages/Auth.tsx`** (ligne ~331)

Changer :
```typescript
await InAppBrowser.openWebView({
  url: oauthData.url,
  title: 'Connexion Google',
  isPresentAfterPageLoad: true,
  preventDeeplink: false,
});
```

En :
```typescript
await InAppBrowser.open({
  url: oauthData.url,
  isPresentAfterPageLoad: true,
  preventDeeplink: false,
});
```

### Pourquoi ca fonctionne

| Methode | Composant iOS | Google OAuth |
|---------|--------------|--------------|
| `openWebView()` | WKWebView (embarque) | BLOQUE |
| `open()` | SFSafariViewController | AUTORISE |

`SFSafariViewController` est un composant systeme Apple qui :
- Partage les cookies avec Safari (donc les sessions Google existantes)
- Est reconnu par Google comme un navigateur legitime
- Reste dans l'application (pas de redirection vers Safari externe)

### Impact

- Une seule ligne modifiee
- Le reste du flux (urlChangeEvent, extraction des tokens, fermeture automatique) reste identique
- L'experience utilisateur reste la meme : une popup s'ouvre dans l'app, l'utilisateur se connecte, la popup se ferme

