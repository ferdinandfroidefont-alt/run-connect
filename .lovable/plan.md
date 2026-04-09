
Objectif: corriger enfin l’écran blanc persistant sur iOS au lancement, en partant du constat que le bug précédent sur les hooks n’explique pas tout.

1. Recentrer le diagnostic sur le vrai symptôme restant
- Le message visible en bas `[RunConnect] Console boot (natif)...` vient de `index.html`, donc le HTML natif charge bien.
- Si l’écran reste blanc après ça, le problème est très probablement dans la transition entre:
  - boot HTML natif
  - splash React (`LoadingScreen`)
  - app réelle après auth/profil/onboarding

2. Corriger le “trou visuel” au démarrage
- Aujourd’hui `LoadingScreen` disparaît dès que `getSession()` répond ou après timeout.
- Ensuite plusieurs couches peuvent encore rendre `null`:
  - `Layout` quand `loading || profileLoading`
  - `Index` quand `useOnboarding().loading`
  - plusieurs `Suspense` avec fallback vide
- Résultat probable sur iOS: le splash se retire, mais rien de visible n’est encore rendu, donc écran blanc.
- Implémentation prévue:
  - garder un fallback visuel après le splash
  - utiliser `AppBootFallback` ou `AppShellLoader` au lieu de `return null`
  - afficher ce fallback tant que auth, profil ou onboarding ne sont pas prêts

3. Sécuriser la chaîne d’initialisation auth/profil
- `AuthProvider` et `UserProfileProvider` sont déjà proches du bon modèle, mais le rendu UI ne les attend pas proprement.
- Je vais introduire un état de “boot prêt pour affichage” au niveau app/layout:
  - auth restaurée
  - profil résolu
  - redirection / consentement / onboarding déterminés
- Les requêtes dépendantes de l’utilisateur ne devront s’exécuter qu’une fois cet état prêt.
- Cela suit le bon pattern de “auth ready” pour éviter les phases intermédiaires incohérentes sur iOS.

4. Supprimer les points qui masquent l’UI sans alternative
- Remplacer dans les zones critiques les `return null` de boot par un écran de chargement visible.
- Vérifier spécialement:
  - `src/components/Layout.tsx`
  - `src/pages/Index.tsx`
  - `src/App.tsx`
- Garder les `Suspense fallback={null}` seulement là où ce n’est pas bloquant pour l’écran principal.

5. Corriger le dialog récemment modifié
- Les logs montrent encore un problème d’accessibilité sur un `DialogContent` sans `DialogTitle`.
- Le plus suspect est le gestionnaire de “Stories à la une” dans `ProfileDialog.tsx`, qui a `aria-describedby={undefined}` mais pas de `DialogTitle` visible/sr-only dans ce bloc précis.
- Je prévois d’ajouter un `DialogTitle` et éventuellement un `DialogDescription` cachés pour supprimer cette erreur parasite.
- Ce n’est sans doute pas la cause principale du boot blanc iOS, mais il faut l’enlever pour éviter de brouiller le diagnostic.

6. Vérifier que le splash React ne se retire pas trop tôt
- `LoadingScreen` appelle `onLoadingComplete` après un simple `getSession()` + durée minimale.
- Je vais ajuster le comportement pour qu’il ne s’efface pas avant qu’un écran de remplacement soit garanti derrière.
- Deux approches possibles selon la structure existante:
  - soit faire durer le splash jusqu’au “boot ready”
  - soit laisser le splash sortir normalement mais afficher immédiatement un fallback plein écran juste après

7. Validation attendue
- Sur iOS:
  - plus d’écran blanc juste après lancement
  - soit splash bleu, soit loader/fallback visible, puis app
- Sur web:
  - plus de flash blanc entre splash et chargement
- En bonus:
  - suppression du warning `DialogContent requires a DialogTitle`

Fichiers les plus probables à modifier
- `src/App.tsx`
- `src/components/Layout.tsx`
- `src/pages/Index.tsx`
- `src/components/ProfileDialog.tsx`

Détail technique
Le problème le plus probable maintenant n’est plus un crash React pur, mais un problème de séquencement visuel: plusieurs composants de boot rendent temporairement `null`, ce qui laisse le WebView iOS afficher un fond blanc entre le splash et le vrai contenu. Le correctif doit donc rendre le boot “continu”, jamais vide.
