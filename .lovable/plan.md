
Objectif: rendre le bouton “+” entre les blocs immédiatement visible et compréhensible dans “Créer une séance”.

1. Renforcer visuellement l’insert entre deux blocs
- Modifier `src/components/session-creation/SessionBlockBuilder.tsx` pour remplacer le petit bouton rond actuel par un séparateur d’insertion beaucoup plus visible.
- Nouveau rendu prévu :
  - ligne horizontale discrète de chaque côté
  - bouton central plus grand
  - fond blanc / secondaire contrasté
  - icône `Plus` plus nette
  - libellé explicite du type “Ajouter ici”
- Garder une cible tactile iOS premium (44px mini).

2. Éviter que le “+” se fonde dans le fond
- Augmenter le contraste :
  - bordure plus marquée
  - ombre légère
  - couleur primaire pour l’icône
  - fond `bg-card` ou `bg-background` au lieu d’un fond trop proche du conteneur
- Ajouter un état `hover/active` plus clair pour qu’on sente que c’est interactif.

3. Rendre l’action compréhensible sans ambiguïté
- Aujourd’hui le bouton ajoute directement un `interval`, ce qui peut sembler “invisible” ou inattendu.
- Faire en sorte que l’action d’insertion ouvre le même menu de types de blocs que “Ajouter un bloc”, mais ancré sur l’emplacement visé.
- Résultat :
  - le coach clique sur le `+` entre deux blocs
  - il choisit échauffement / intervalle / continu / retour au calme
  - le bloc est inséré exactement à cet endroit

4. Garder la cohérence Premium iOS / coaching
- Aligner ce séparateur avec le design RunConnect :
  - espacement propre
  - composant centré
  - pas trop technique
  - lisible sur mobile 390px
- Conserver la hiérarchie visuelle :
  - bloc
  - séparateur d’insertion
  - bloc suivant

5. Vérifier les cas d’affichage
- Entre deux blocs existants : le `+` doit être évident au premier regard
- Avec plusieurs blocs : chaque zone d’insertion doit rester visible sans surcharger
- En bas de liste : garder les quick actions existantes si elles restent utiles
- Avec menu ouvert : éviter les chevauchements visuels avec le schéma de séance

Détails techniques
- Fichier principal : `src/components/session-creation/SessionBlockBuilder.tsx`
- Ajustements probables :
  - introduire un `pendingInsertIndex`
  - réutiliser le menu de sélection de type pour insertion entre blocs
  - remplacer le bouton actuel `h-8 w-8` par un composant d’insertion plus visible
- Aucun changement métier nécessaire sur le moteur de calcul ; c’est un correctif UX/UI ciblé.

Résultat attendu
- Le “petit plus” est enfin visible immédiatement
- L’utilisateur comprend qu’il sert à ajouter un bloc entre deux blocs
- L’insertion est plus claire, plus premium et plus cohérente avec le reste du builder
