

## Probleme identifie

Le flux actuel est casse a cause d'une incompatibilite fondamentale :

1. L'edge function `ios-auth-callback` redirige vers `app.runconnect://ios-complete?code=...` (schema custom)
2. Mais cette redirection se fait **depuis un WebView** (`openWebView`)
3. **Un WebView ne peut pas naviguer vers un schema custom via 302** — il ne sait pas quoi faire avec `app.runconnect://`
4. `appUrlOpen` ne se declenche pas non plus car le schema custom est tente **depuis l'interieur de l'app**, pas depuis un navigateur externe
5. Resultat : rien ne se passe, ou erreur, l'utilisateur reste bloque

La combinaison correcte qui n'a jamais ete testee : **redirect HTTPS + `openWebView()` + `urlChangeEvent`**. Quand on avait `openWebView`, on avait aussi le custom scheme. Quand on avait HTTPS, on avait `open()` (pas `openWebView`).

## Solution

Revenir a une redirection HTTPS dans l'edge function. Le `urlChangeEvent` (qui fonctionne avec `openWebView`) interceptera l'URL **avant** que le SPA ne charge et consomme le code.

### Modifications

**1. `supabase/functions/ios-auth-callback/index.ts`**
- Remplacer toutes les redirections `app.runconnect://ios-complete?...` par `https://run-connect.lovable.app/ios-complete?...`
- Le WebView peut naviguer vers HTTPS, `urlChangeEvent` se declenchera

**2. `src/pages/Auth.tsx`**
- Supprimer le listener `appUrlOpen` (inutile avec HTTPS redirect dans un WebView)
- Garder uniquement `urlChangeEvent` comme mecanisme principal
- Simplifier le cleanup (plus besoin d'importer `App`)

### Flux final

```text
Google OAuth → Supabase → Edge function ios-auth-callback
→ 302 vers https://run-connect.lovable.app/ios-complete?code=XXX
→ urlChangeEvent se declenche dans le WebView
→ handleOAuthCallbackUrl intercepte, extrait le code
→ InAppBrowser.close()
→ exchangeCodeForSession(code) dans le contexte natif
→ navigation vers / ou ProfileSetup
```

### Fichiers modifies
- `supabase/functions/ios-auth-callback/index.ts`
- `src/pages/Auth.tsx`

