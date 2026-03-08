

## Diagnostic

Le probleme est clair : la page `ios-callback.html` se charge correctement dans SFSafariViewController, mais quand le JavaScript execute `window.location.href = 'runconnect://auth/callback?code=...'`, **iOS ne reconnait pas le scheme `runconnect://`**. Cela signifie que le scheme n'est pas enregistre dans le `Info.plist` de l'IPA actuellement installee.

Deux problemes distincts :

1. **Le `grep -c "Dict"` dans le workflow est fragile** — PlistBuddy peut formater differemment selon la version, causant un mauvais calcul d'index et un echec silencieux
2. **Aucun nouveau build iOS n'a ete lance** depuis le dernier correctif du workflow (ou le build precedent n'avait pas le bon workflow)

## Solution en 2 parties

### Partie 1 : Rendre le workflow PlistBuddy infaillible

Remplacer le bloc PlistBuddy par `plutil` qui est plus fiable pour inserer dans un tableau :

```bash
# Utiliser plutil pour ajouter le scheme de maniere fiable
plutil -insert CFBundleURLTypes.-1 \
  -json '{"CFBundleURLName":"com.ferdi.runconnect","CFBundleURLSchemes":["runconnect"]}' \
  ios/App/App/Info.plist

# Verifier
plutil -p ios/App/App/Info.plist | grep -A5 runconnect
```

`-1` signifie "ajouter a la fin du tableau", ce qui fonctionne peu importe combien d'entrees Capacitor a deja injectees.

### Partie 2 : Securiser la page bridge

Modifier `ios-callback.html` pour tenter aussi un **iframe invisible** comme methode alternative de declenchement du scheme (certaines versions iOS gerent mieux les iframes que `window.location.href` dans SFSafariViewController) :

```html
<!-- Methode 1: location.href -->
<script>window.location.href = deepLink;</script>

<!-- Methode 2: iframe fallback -->
<iframe src="runconnect://auth/callback?code=..." style="display:none"></iframe>
```

### Fichiers modifies

1. **`.github/workflows/ios-appstore.yml`** : remplacer le bloc PlistBuddy par `plutil -insert` + verification
2. **`public/ios-callback.html`** : ajouter iframe invisible comme methode alternative de declenchement du deep link

### Apres le deploy

1. **Lancer un nouveau build GitHub Actions** — c'est obligatoire, le scheme doit etre dans l'IPA
2. Verifier dans les logs CI que `plutil -p` affiche bien `runconnect` dans les URL types
3. Installer la nouvelle build TestFlight
4. Tester le flux Google OAuth

