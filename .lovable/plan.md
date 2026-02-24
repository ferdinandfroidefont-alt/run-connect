

# Fix Google Sign-In iOS — "Accès bloqué" (WebView bloqué par Google)

## Diagnostic

L'erreur "Accès bloqué : la demande de project-220304658307 ne respecte pas les regles de Google" signifie que Google detecte que l'OAuth est ouvert dans un **WebView embarque** (WKWebView), pas dans un navigateur systeme securise.

Le code actuel utilise `@capgo/inappbrowser` avec `InAppBrowser.open()` et ecoute `urlChangeEvent`. Le probleme : `urlChangeEvent` ne fonctionne qu'avec `.openWebView()` (WKWebView), et Google bloque les WKWebView pour OAuth. Meme si `.open()` devrait utiliser SFSafariViewController, le plugin peut retomber en WebView selon la configuration.

## Solution

Remplacer `@capgo/inappbrowser` par `@capacitor/browser` (Browser.open) + `@capacitor/app` (App.addListener appUrlOpen) pour le flux iOS. Cela utilise **SFSafariViewController** (accepte par Google) et recupere le callback via deep link (`app.runconnect://`).

## Changements

### Fichier : `src/pages/Auth.tsx`

**Remplacer le bloc iOS (lignes 237-347)** par un flux utilisant :

1. `supabase.auth.signInWithOAuth` avec `redirectTo: 'app.runconnect://auth'` et `skipBrowserRedirect: true`
2. `Browser.open({ url: oauthData.url })` de `@capacitor/browser` (SFSafariViewController)
3. `App.addListener('appUrlOpen', ...)` de `@capacitor/app` pour intercepter le deep link de retour
4. Extraire `access_token` et `refresh_token` du fragment URL, puis `supabase.auth.setSession()`
5. `Browser.close()` apres reception du callback

**Imports** : Remplacer `import { InAppBrowser } from '@capgo/inappbrowser'` par :
```typescript
import { Browser } from '@capacitor/browser';
import { App } from '@capacitor/app';
```

### Flux technique detaille

```
1. signInWithOAuth({ provider: 'google', options: {
     redirectTo: 'app.runconnect://auth',
     skipBrowserRedirect: true
   }})
2. Browser.open({ url: oauthData.url })
   → Ouvre SFSafariViewController (approuve par Google)
3. App.addListener('appUrlOpen', ({ url }) => {
     if (url.startsWith('app.runconnect://auth')) {
       Browser.close();
       // Extraire tokens du fragment
       supabase.auth.setSession({ access_token, refresh_token });
     }
   })
```

### Pre-requis iOS deja en place

- Le deep link `app.runconnect://` est deja configure dans le manifest Android et devrait etre dans `Info.plist` iOS
- Le redirect URL `app.runconnect://**` est deja dans la config Supabase (cf. memoire)
- `@capacitor/browser` et `@capacitor/app` sont deja installes dans le projet

| Fichier | Action |
|---|---|
| `src/pages/Auth.tsx` | Modifier — remplacer InAppBrowser par Browser + App deep link |

Aucun nouveau fichier. Aucune migration.

