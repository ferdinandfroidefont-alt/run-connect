

# Correction du Pipeline iOS — Mise à jour vers Xcode 16

## Problème identifié

L'erreur est très claire :

> **SDK version issue. This app was built with the iOS 17.5 SDK. All iOS and iPadOS apps must be built with the iOS 18 SDK or later, included in Xcode 16 or later.**

Le workflow utilise actuellement **Xcode 15.4** (ligne 23) qui inclut le SDK iOS 17.5. Apple exige maintenant le **SDK iOS 18** (Xcode 16+) pour soumettre des apps sur l'App Store.

## Solution

Mettre à jour la version de Xcode de `15.4` vers `16.2` (dernière version stable disponible sur `macos-14`).

## Changement à effectuer

### Fichier : `.github/workflows/ios-appstore.yml`

**Ligne 23** - Changer la version de Xcode :

```yaml
# Avant
xcode-version: "15.4"

# Après
xcode-version: "16.2"
```

## Versions Xcode disponibles sur macos-14

| Version | SDK iOS | Statut |
|---------|---------|--------|
| 15.4 | iOS 17.5 | ❌ Rejeté par Apple |
| 16.0 | iOS 18.0 | ✅ Accepté |
| 16.1 | iOS 18.1 | ✅ Accepté |
| 16.2 | iOS 18.2 | ✅ Recommandé |

Je recommande **Xcode 16.2** car c'est la version la plus récente et stable.

## Impact

- **Build** : Le projet sera compilé avec iOS 18 SDK
- **Compatibilité** : L'app restera compatible avec les versions iOS antérieures (selon votre `Deployment Target`)
- **TestFlight** : L'upload passera la validation Apple

## Note importante

Si votre provisioning profile a été créé avec un ancien SDK, il devrait quand même fonctionner. Les profils sont liés au Bundle ID et Team, pas à la version du SDK.

