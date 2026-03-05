

## Diagnostic

L'erreur est claire : `plutil -insert CFBundleURLTypes.-1` echoue quand le tableau est **vide** (0 elements). L'index `-1` (append) ne fonctionne pas sur un tableau vide avec certaines versions de `plutil` sur macOS. Il faut utiliser l'index `0` pour un tableau vide.

## Correction

Remplacer le bloc lignes 174-181 par une logique qui :
1. Verifie si `CFBundleURLTypes` existe
2. Si non, insere directement le tableau avec l'entree dedans (pas de tableau vide + append)
3. Si oui, utilise `/usr/libexec/PlistBuddy` comme fallback fiable pour ajouter a la fin

```bash
INFO_PLIST="ios/App/App/Info.plist"

if plutil -p "$INFO_PLIST" | grep -q '"runconnect"'; then
  echo "✅ runconnect scheme already present"
else
  # Check if CFBundleURLTypes key exists
  if plutil -extract CFBundleURLTypes json "$INFO_PLIST" >/dev/null 2>&1; then
    # Array exists — use PlistBuddy to append (handles any array size)
    IDX=$(/usr/libexec/PlistBuddy -c "Print :CFBundleURLTypes" "$INFO_PLIST" | grep -c "Dict")
    /usr/libexec/PlistBuddy -c "Add :CFBundleURLTypes:$IDX dict" "$INFO_PLIST"
    /usr/libexec/PlistBuddy -c "Add :CFBundleURLTypes:$IDX:CFBundleURLName string com.ferdi.runconnect" "$INFO_PLIST"
    /usr/libexec/PlistBuddy -c "Add :CFBundleURLTypes:$IDX:CFBundleURLSchemes array" "$INFO_PLIST"
    /usr/libexec/PlistBuddy -c "Add :CFBundleURLTypes:$IDX:CFBundleURLSchemes:0 string runconnect" "$INFO_PLIST"
  else
    # Array doesn't exist — create it with the entry directly
    plutil -insert CFBundleURLTypes \
      -json '[{"CFBundleURLName":"com.ferdi.runconnect","CFBundleURLSchemes":["runconnect"]}]' \
      "$INFO_PLIST"
  fi
  echo "✅ Deep link URL Type configured (runconnect://)"
fi
```

La difference cle : au lieu de creer un tableau vide puis append avec `-1`, on insere le **tableau complet avec l'entree dedans** en une seule commande quand la cle n'existe pas. Quand elle existe deja (Capacitor peut l'avoir creee), on utilise PlistBuddy qui gere correctement l'index calcule.

### Fichier modifie

**`.github/workflows/ios-appstore.yml`** — lignes 170-188, remplacer le bloc de configuration du deep link.

