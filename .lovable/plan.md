

## Diagnostic

L'erreur YAML ligne 101 est causée par le code Python injecté à l'indentation 0 dans un bloc `run: |`. YAML exige que toutes les lignes du bloc soient indentées à au moins 10 espaces (le niveau du premier contenu). Les lignes `with open(...)`, `apns_methods = '''`, etc. à colonne 0 font sortir le parseur YAML du bloc littéral.

Cela affecte **deux blocs Python** : lignes 97-207 et lignes 224-299.

## Solution

Extraire la logique Python dans un fichier script séparé `scripts/inject_ios_push.py`, puis l'appeler depuis le workflow. Cela élimine tout problème d'indentation/échappement YAML.

### 1. Créer `scripts/inject_ios_push.py`

Script Python autonome qui :
- Accepte un argument `--mode` : `fresh` (première injection) ou `update` (réinjection si bridge manquant)
- En mode `fresh` : lit `AppDelegate.swift`, injecte les méthodes APNs + FCM + WebView bridge avant la dernière `}`
- En mode `update` : supprime les anciennes méthodes (regex) puis réinjecte les nouvelles
- Contient tout le code Swift en triple-quotes (sans conflit YAML puisque c'est un fichier .py séparé)

### 2. Modifier `.github/workflows/ios-appstore.yml`

Remplacer les deux blocs `python3 -c "..."` par :

```yaml
              python3 scripts/inject_ios_push.py --mode fresh
```

et

```yaml
                python3 scripts/inject_ios_push.py --mode update
```

Le reste du workflow (sed pour imports, MessagingDelegate, FirebaseApp.configure) reste inchangé — il fonctionne déjà correctement.

### Fichiers modifiés
- **Nouveau** : `scripts/inject_ios_push.py`
- **Modifié** : `.github/workflows/ios-appstore.yml` (lignes 96-207 et 223-299)

