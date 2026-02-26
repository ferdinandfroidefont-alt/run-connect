

## Diagnostic

L'image montre le message "Erreur d'authentification. Réessayez." dans Safari (SFSafariViewController) sur iOS. Le probleme est fondamental dans le flux PKCE :

1. Le `signInWithOAuth` genere un **code verifier** et le stocke dans le localStorage du **WKWebView** de l'app
2. Supabase redirige vers `https://run-connect.lovable.app/auth/callback?code=XXXXX` qui s'ouvre dans **SFSafariViewController** (un contexte de navigateur totalement separe)
3. `AuthCallback.tsx` tente `exchangeCodeForSession(code)` mais echoue car le **code verifier n'existe pas** dans le localStorage de SFSafariViewController — d'ou l'erreur
4. La page reste bloquee dans Safari, ne redirige jamais vers l'app

## Solution

Au lieu d'echanger le code dans SFSafariViewController (impossible sans le code verifier), la page AuthCallback doit **immediatement transmettre le code a l'app** via le custom scheme, et laisser le WKWebView (qui possede le code verifier) faire l'echange.

### Fichier 1 : `src/pages/AuthCallback.tsx`

Refactorer `handleCallback` pour detecter le contexte iOS et rediriger directement :

```text
Flux actuel (casse) :
  SFSafariViewController → AuthCallback → exchangeCodeForSession() → ECHEC (pas de code verifier)

Flux corrige :
  SFSafariViewController → AuthCallback → detecte iOS → redirige app.runconnect://auth?code=XXXXX
  WKWebView → deep link handler (Auth.tsx) → exchangeCodeForSession() → SUCCES (code verifier present)
```

Changements concrets :
- Quand on detecte un contexte iOS (iPhone/iPad dans le user agent, pas Capacitor), **ne pas tenter l'echange de code**
- Recuperer le `code` des query params
- Rediriger immediatement vers `app.runconnect://auth?code=${code}`
- Garder le flux web (non-iOS) inchange pour les navigateurs classiques

### Fichier 2 : `src/pages/Auth.tsx`

Le deep link handler (ligne 258+) gere deja le cas `code` (ligne 291-295) : il appelle `exchangeCodeForSession(code)`. Ce flux fonctionnera car le WKWebView a le code verifier en localStorage.

Aucune modification necessaire cote Auth.tsx — le handler existant couvre deja ce cas.

### Detail technique de la modification AuthCallback.tsx

```typescript
const handleCallback = async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const code = urlParams.get('code');
  
  const isIOSNative = /iPhone|iPad|iPod/.test(navigator.userAgent) && 
    !(/CriOS|FxiOS|EdgiOS/.test(navigator.userAgent)) &&
    !(window as any).Capacitor;

  // Sur iOS natif (SFSafariViewController), on ne peut pas echanger le code ici
  // car le code verifier PKCE est dans le WKWebView. Renvoyer le code a l'app.
  if (isIOSNative && code) {
    setStatus("Retour à l'application...");
    window.location.href = `app.runconnect://auth?code=${code}`;
    setTimeout(() => {
      setStatus("Ouvrez l'application Run Connect pour continuer.");
    }, 3000);
    return;
  }

  // Flux web classique (navigateur desktop/mobile) : echanger normalement
  // ... reste du code existant
};
```

### Pourquoi ca fonctionnera

- Le code PKCE est a usage unique et valable quelques minutes
- Le code verifier est dans le localStorage du WKWebView
- Le deep link `app.runconnect://auth?code=XXX` est intercepte par le listener dans Auth.tsx (ligne 258)
- Auth.tsx appelle `exchangeCodeForSession(code)` dans le bon contexte → succes

