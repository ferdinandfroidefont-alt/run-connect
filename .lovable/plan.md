

## Diagnostic

Le code cote web/edge est correct. Le probleme est exclusivement cote **build iOS natif** : le workflow GitHub Actions (`ios-appstore.yml`) ne declare jamais `CFBundleURLTypes` dans `Info.plist`. Donc iOS ne sait pas que `runconnect://` est un scheme valide → Safari affiche "adresse invalide".

**Preuve** : le fichier `ios-appstore.yml` configure permissions, Firebase, signing, mais **aucune ligne ne touche `CFBundleURLTypes`**. Le `capacitor.config.ts` a `ios.scheme = 'runconnect'` mais `npx cap sync` genere uniquement le scheme pour le WKWebView interne, **pas** un URL Type pour les deep links externes.

## Cause racine

Capacitor `ios.scheme` configure le scheme du **serveur web interne** (pour charger les assets), pas un `CFBundleURLTypes` pour les deep links. Il faut **explicitement** ajouter le URL Type dans `Info.plist`.

## Plan

### 1. Ajouter CFBundleURLTypes dans le workflow GitHub Actions

**Fichier** : `.github/workflows/ios-appstore.yml`

Apres l'etape "Configure Info.plist permissions" (ligne ~157), ajouter une nouvelle etape qui utilise PlistBuddy pour creer le `CFBundleURLTypes` :

```bash
INFO_PLIST="ios/App/App/Info.plist"
# Add URL Types for deep linking (runconnect://)
/usr/libexec/PlistBuddy -c "Add :CFBundleURLTypes array" "$INFO_PLIST" 2>/dev/null || true
/usr/libexec/PlistBuddy -c "Add :CFBundleURLTypes:0 dict" "$INFO_PLIST" 2>/dev/null || true
/usr/libexec/PlistBuddy -c "Add :CFBundleURLTypes:0:CFBundleURLName string com.ferdi.runconnect" "$INFO_PLIST" 2>/dev/null || true
/usr/libexec/PlistBuddy -c "Add :CFBundleURLTypes:0:CFBundleURLSchemes array" "$INFO_PLIST" 2>/dev/null || true
/usr/libexec/PlistBuddy -c "Add :CFBundleURLTypes:0:CFBundleURLSchemes:0 string runconnect" "$INFO_PLIST" 2>/dev/null || true
```

### 2. Ameliorer le logging de l'edge function

**Fichier** : `supabase/functions/ios-auth-callback/index.ts`

Logger l'URL exacte du redirect 302 pour faciliter le debug futur :

```typescript
console.log(`[ios-auth-callback] Final redirect URL: ${redirectUrl}`);
```

### 3. Ameliorer le bouton debug iOS dans Auth.tsx

**Fichier** : `src/pages/Auth.tsx`

Le bouton debug actuel utilise `Browser.open({ url: 'runconnect://test' })` — mais `Browser.open` est prevu pour les URLs HTTP. Sur iOS, pour tester un custom scheme, il faut utiliser `window.location.href` ou un lien `<a>`. Modifier le bouton pour utiliser `window.open('runconnect://test', '_self')` et afficher un toast avec le resultat.

### 4. Rien a changer dans App.tsx ni capacitor.config.ts

Le listener global `appUrlOpen` et la config sont deja corrects.

### Fichiers modifies
- `.github/workflows/ios-appstore.yml` (ajout CFBundleURLTypes pour deep link `runconnect://`)
- `supabase/functions/ios-auth-callback/index.ts` (logging ameliore)
- `src/pages/Auth.tsx` (bouton debug ameliore)

### Flux apres correctif
```text
GitHub Actions build:
  npx cap sync ios → genere ios/
  PlistBuddy ajoute CFBundleURLTypes[runconnect] dans Info.plist
  xcodebuild archive → IPA contient le URL Type

Runtime:
  Clic Google → Browser.open(oauthUrl) → SFSafariViewController
  → Google login → Supabase → Edge function ios-auth-callback
  → 302 vers runconnect://auth/callback?code=XXX
  → iOS reconnait le scheme (present dans Info.plist) → rouvre l'app
  → appUrlOpen listener (global dans App.tsx)
  → Browser.close() → exchangeCodeForSession(code) → navigation /
```

