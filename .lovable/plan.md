

## Problème

SFSafariViewController (utilisé par `@capacitor/browser`) **ne supporte pas les redirections 302 vers des custom URL schemes** (`app.runconnect://`). C'est une limitation connue d'iOS — d'où l'erreur "Safari ne peut pas ouvrir la page car l'adresse n'est pas valide".

Peu importe qu'on utilise du HTML, du JavaScript ou un 302 direct : SFSafariViewController bloquera toujours `app.runconnect://`.

## Solution

Remplacer `@capacitor/browser` par `@capgo/inappbrowser` (déjà installé) pour le flux OAuth iOS. Ce plugin expose un événement `urlChangeEvent` qui permet de détecter quand le navigateur navigue vers notre URL de callback, d'extraire le code PKCE, et de fermer le navigateur — **sans jamais utiliser de custom URL scheme**.

### Flux corrigé

```text
Auth.tsx                InAppBrowser            Google OAuth          Edge Function
   |                        |                       |                      |
   |-- open(oauthUrl) ----->|                       |                      |
   |                        |--- Google login ------>|                      |
   |                        |                       |--- redirect -------->|
   |                        |<---- 302 to HTTPS callback (with code) ------|
   |<-- urlChangeEvent -----|                       |                      |
   |   (detect callback URL)|                       |                      |
   |-- extract code ------->|                       |                      |
   |-- close() ------------>|                       |                      |
   |-- exchangeCodeForSession()                     |                      |
```

### Modifications

**1. `supabase/functions/ios-auth-callback/index.ts`**
- Rediriger vers `https://run-connect.lovable.app/auth/callback?code=XXX` au lieu de `app.runconnect://auth?code=XXX`
- C'est une URL HTTPS standard que SFSafariViewController peut ouvrir sans problème

**2. `src/pages/Auth.tsx`**
- Remplacer `Browser.open()` par `InAppBrowser.open()` de `@capgo/inappbrowser` pour le flux iOS
- Ajouter un listener `urlChangeEvent` qui surveille les changements d'URL
- Quand l'URL contient `/auth/callback?code=`, extraire le code, fermer le navigateur, appeler `exchangeCodeForSession(code)`
- Supprimer le listener `appUrlOpen` (plus nécessaire avec cette approche)

### Détails techniques

```typescript
// Auth.tsx - iOS flow
import { InAppBrowser } from '@capgo/inappbrowser';

// Listener URL changes instead of deep links
const urlListener = await InAppBrowser.addListener('urlChangeEvent', async (event) => {
  if (event.url.includes('/auth/callback')) {
    const url = new URL(event.url);
    const code = url.searchParams.get('code');
    if (code) {
      await InAppBrowser.close();
      urlListener.remove();
      await supabase.auth.exchangeCodeForSession(code);
      // ... check profile, navigate
    }
  }
});

await InAppBrowser.open({ url: oauthData.url });
```

```typescript
// ios-auth-callback edge function
const redirectUrl = `https://run-connect.lovable.app/auth/callback?code=${encodeURIComponent(code)}`;
return new Response(null, {
  status: 302,
  headers: { "Location": redirectUrl }
});
```

### Fichiers modifiés
- `supabase/functions/ios-auth-callback/index.ts`
- `src/pages/Auth.tsx`

