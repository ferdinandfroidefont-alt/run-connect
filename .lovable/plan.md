

# Fix crash iOS — Double `FirebaseApp.configure()`

## Cause
Le crash report montre clairement : `+[FIRApp configure]` (FIRApp.m:110) lève une exception à `AppDelegate.swift:13`. Firebase crashe quand `configure()` est appelé deux fois. Le pod `Firebase/Messaging` ajouté à la ligne 73 du workflow peut déclencher une auto-configuration, et le script injecte ensuite un second appel non protégé.

## Fix
Dans `scripts/configure_ios_push.sh`, remplacer l'injection de :
```swift
FirebaseApp.configure()
```
par :
```swift
if FirebaseApp.app() == nil { FirebaseApp.configure() }
```

Cela correspond exactement à ce que la mémoire `notifications/ios/native-initialization-logic` prescrit.

## Fichier impacté
| Fichier | Changement |
|---------|-----------|
| `scripts/configure_ios_push.sh` | Ligne 39 : ajouter la garde `if FirebaseApp.app() == nil` autour de `FirebaseApp.configure()` |

