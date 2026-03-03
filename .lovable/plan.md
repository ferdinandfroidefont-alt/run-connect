

## Diagnostic complet — Vérification 100%

### Ce qui fonctionne ✅
1. **Edge function `ios-auth-callback`** : déployée et fonctionnelle — retourne un `302 Location: runconnect://auth/callback?code=...`
2. **Listener `appUrlOpen` dans App.tsx** : correctement configuré pour intercepter `runconnect://auth/callback`
3. **Auth.tsx** : ouvre correctement SFSafariViewController via `@capacitor/browser` avec `redirectTo` vers l'edge function
4. **Workflow GitHub Actions** : ajoute dynamiquement le scheme `runconnect` dans Info.plist
5. **`capacitor.config.ts`** : `ios.scheme = 'runconnect'` — Capacitor ajoute AUSSI ce scheme dans `CFBundleURLTypes` lors de `cap sync`

### Le vrai problème 🔴

**SFSafariViewController ne gère PAS les redirections 302 vers des custom URL schemes de la même façon que Safari classique.**

Quand l'edge function retourne `302 Location: runconnect://auth/callback?code=...`, SFSafariViewController essaie de **naviguer** vers cette URL au lieu de la **passer au système**. Résultat : Safari affiche "adresse invalide" car il ne sait pas charger un protocole `runconnect://`.

### Solution : remplacer le 302 par une page HTML intermédiaire

Au lieu d'un redirect HTTP 302, l'edge function doit retourner une **page HTML (200 OK)** qui utilise JavaScript pour déclencher le deep link. SFSafariViewController charge la page normalement, puis le `window.location.href` déclenche le scheme handler d'iOS.

```text
Flux actuel (cassé) :
  Edge function → 302 runconnect://... → SFSafariViewController dit "adresse invalide"

Flux corrigé :
  Edge function → 200 HTML page → JS: window.location.href = 'runconnect://...' → iOS intercepte → appUrlOpen
```

### Fichier modifié

**`supabase/functions/ios-auth-callback/index.ts`** :

Remplacer les `return new Response(null, { status: 302, headers: { Location: ... } })` par :

```typescript
const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body>
<p>Redirection vers RunConnect...</p>
<script>
  window.location.href = '${redirectUrl}';
  // Fallback si le scheme ne fonctionne pas après 2s
  setTimeout(function() {
    document.body.innerHTML = '<p>Si l\\'application ne s\\'ouvre pas, <a href="${redirectUrl}">appuyez ici</a>.</p>';
  }, 2000);
</script>
</body></html>`;

return new Response(html, {
  status: 200,
  headers: {
    "Content-Type": "text/html; charset=utf-8",
    "Cache-Control": "no-cache, no-store, must-revalidate",
  },
});
```

Cela s'applique aux 3 cas (error, no code, success).

### Aucun autre fichier à modifier

- Workflow iOS : déjà correct
- App.tsx listener : déjà correct
- Auth.tsx : déjà correct
- capacitor.config.ts : déjà correct

### Après le deploy
1. L'edge function sera re-déployée automatiquement
2. **Pas besoin de rebuild iOS** — le correctif est côté serveur
3. Tester directement avec la build TestFlight actuelle

