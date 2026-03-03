

## Diagnostic : J'ai trouvé la vraie cause

Le correctif precedent (PlistBuddy) **echoue silencieusement** a cause de `|| true`.

### Pourquoi ca ne marche pas

Quand `npx cap sync ios` s'execute dans le workflow, Capacitor genere **deja** un `CFBundleURLTypes` dans `Info.plist` avec son propre scheme interne a l'index 0. Ensuite, les commandes PlistBuddy :

```bash
/usr/libexec/PlistBuddy -c "Add :CFBundleURLTypes array" ... 2>/dev/null || true   # ECHOUE: array existe deja
/usr/libexec/PlistBuddy -c "Add :CFBundleURLTypes:0 dict" ... 2>/dev/null || true   # ECHOUE: index 0 existe deja
/usr/libexec/PlistBuddy -c "Add :CFBundleURLTypes:0:CFBundleURLName ..." || true     # ECHOUE: dict existe deja
/usr/libexec/PlistBuddy -c "Add :CFBundleURLTypes:0:CFBundleURLSchemes ..." || true  # ECHOUE
```

**Toutes les commandes echouent silencieusement**. Le scheme `runconnect` n'est jamais ajoute. L'IPA ne contient pas le URL Type → Safari dit "adresse invalide".

### Correction

Remplacer l'etape dans `.github/workflows/ios-appstore.yml` par un script qui :
1. Compte combien d'entrees existent deja dans `CFBundleURLTypes`
2. Ajoute le scheme `runconnect` au **prochain index disponible**
3. Verifie en lisant le plist apres

```bash
INFO_PLIST="ios/App/App/Info.plist"

# Count existing URL types
COUNT=$(/usr/libexec/PlistBuddy -c "Print :CFBundleURLTypes" "$INFO_PLIST" 2>/dev/null | grep -c "Dict" || echo "0")

# If no CFBundleURLTypes array exists, create it
if [ "$COUNT" = "0" ]; then
  /usr/libexec/PlistBuddy -c "Add :CFBundleURLTypes array" "$INFO_PLIST" 2>/dev/null || true
  COUNT=0
fi

# Check if runconnect scheme already exists
EXISTING=$(/usr/libexec/PlistBuddy -c "Print :CFBundleURLTypes" "$INFO_PLIST" 2>/dev/null | grep "runconnect" || true)
if [ -n "$EXISTING" ]; then
  echo "✅ runconnect scheme already present"
  exit 0
fi

# Add at next available index
IDX=$COUNT
/usr/libexec/PlistBuddy -c "Add :CFBundleURLTypes:$IDX dict" "$INFO_PLIST"
/usr/libexec/PlistBuddy -c "Add :CFBundleURLTypes:$IDX:CFBundleURLName string com.ferdi.runconnect" "$INFO_PLIST"
/usr/libexec/PlistBuddy -c "Add :CFBundleURLTypes:$IDX:CFBundleURLSchemes array" "$INFO_PLIST"
/usr/libexec/PlistBuddy -c "Add :CFBundleURLTypes:$IDX:CFBundleURLSchemes:0 string runconnect" "$INFO_PLIST"
```

### Fichiers modifies
- `.github/workflows/ios-appstore.yml` : remplacement de l'etape "Configure Deep Link URL Type" par le script corrige qui gere l'index dynamiquement

### Aucun autre fichier a modifier
- Edge function : deja correct
- App.tsx listener : deja correct
- Auth.tsx : deja correct

### Apres le deploy
1. Lancer un nouveau run GitHub Actions
2. Verifier dans les logs que le script affiche `runconnect` dans le print final
3. Installer la nouvelle build TestFlight
4. Tester le bouton "Debug: Tester scheme iOS" → ne doit plus afficher "adresse invalide"
5. Tester le flux Google OAuth complet

