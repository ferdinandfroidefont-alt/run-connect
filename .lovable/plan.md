

## Probleme

`urlChangeEvent` ne fonctionne qu'avec `InAppBrowser.openWebView()`, pas avec `InAppBrowser.open()`. Le code actuel utilise `open()`, donc le listener ne se declenche jamais. Le navigateur charge `/ios-complete`, le SPA affiche NotFound, et le code PKCE n'est jamais intercepte.

## Solution

Remplacer `InAppBrowser.open()` par `InAppBrowser.openWebView()` dans le flux iOS Google Auth.

### Modification : `src/pages/Auth.tsx` (ligne ~322)

```typescript
// AVANT
await InAppBrowser.open({ url: oauthData.url });

// APRES
await InAppBrowser.openWebView({ 
  url: oauthData.url,
  title: 'Connexion Google',
  toolbarType: 'navigation',
  showArrow: true
});
```

C'est la seule modification necessaire. `openWebView` ouvre un webview integre dans l'app (pas Safari externe), ce qui permet a `urlChangeEvent` de se declencher quand l'URL change vers `/ios-complete`. Le reste du flux (interception du code, fermeture, echange de session) est deja en place.

### Fichier modifie
- `src/pages/Auth.tsx`

