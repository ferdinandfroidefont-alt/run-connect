
Objectif: tu n’aies plus jamais besoin d’ouvrir un `.zip` localement pour diagnostiquer l’échec iOS (code 65), et que GitHub Actions affiche directement l’erreur exploitable.

Plan d’implémentation

1) Rendre l’erreur lisible directement dans le job
- Dans `.github/workflows/ios-appstore.yml`, ajouter une étape `if: always()` juste après le build archive:
  - lit `$RUNNER_TEMP/xcodebuild.log`
  - extrait automatiquement les lignes critiques (`error:`, `fatal error:`, `CodeSign`, `ARCHIVE FAILED`, `PhaseScriptExecution`)
  - publie un résumé court dans `$GITHUB_STEP_SUMMARY`
  - imprime aussi un bloc compact dans les logs du job (avec `::group::`)

2) Échouer explicitement avant l’export si l’archive n’existe pas
- Ajouter une étape de garde avant `Export IPA`:
  - vérifie que `"$RUNNER_TEMP/App.xcarchive"` existe
  - si absent: affiche un message clair + les dernières erreurs extraites du log, puis `exit 1`
- Ça évite l’erreur trompeuse “archive not found” comme symptôme principal.

3) Conserver les logs complets en artefact (déjà en place), mais rendre le diagnostic immédiat
- Garder `Upload xcodebuild log` en `if: always()`
- Le but: diagnostic rapide dans l’UI + artefact complet pour investigation profonde.

4) (Option de robustesse) Détecter automatiquement les causes fréquentes iOS CI
- Dans le script de résumé, ajouter des “hints” si motifs trouvés:
  - `No signing certificate` / `provisioning profile` → problème signing
  - `SwiftCompile` / `module map` → problème compilation dépendances
  - `PhaseScriptExecution` → script CocoaPods/Build Phase
- Ces hints seront ajoutés au `GITHUB_STEP_SUMMARY`.

Schéma du flux visé
```text
xcodebuild archive -> xcodebuild.log
                  -> summary auto (erreurs filtrées + hints)
                  -> check App.xcarchive exists
                        yes -> Export IPA
                        no  -> fail clair + cause probable
```

Détails techniques (concis)
- Fichier: `.github/workflows/ios-appstore.yml`
- Zones modifiées:
  - après “🏗️ Build iOS archive”
  - avant “📦 Export IPA”
- Outils shell:
  - `grep -nE`, `tail`, `awk` (ou équivalent POSIX)
  - sortie markdown vers `$GITHUB_STEP_SUMMARY`
- Résultat attendu:
  - plus besoin d’extraire manuellement les logs compressés
  - erreur racine visible en quelques lignes dans l’onglet Actions
