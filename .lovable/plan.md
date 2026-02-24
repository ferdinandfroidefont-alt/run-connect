

# Refonte visuelle Mode Coach — Plan complet

Ce plan couvre la transformation de 6 ecrans du mode Coach pour passer d'une UI fonctionnelle a une experience premium, visuelle et vivante. Compte tenu de l'ampleur, je propose une implementation en **3 phases** (chaque phase = 1 message d'implementation).

---

## Phase 1 : Dashboard Coach + Infos Club (CoachingTab + ClubInfoDialog)

### 1A. CoachingTab.tsx — Dashboard vivant

**Etat actuel** : 4 IOSListItems textuels (stats) + 4 IOSListItems (outils) + liste seances.

**Cible** : Carte hero animee + grille 2x2 outils + sessions enrichies.

Changements :
- Remplacer la section "CETTE SEMAINE" (IOSListGroup avec 4 IOSListItem) par une **carte hero** stylisee :
  - Fond avec leger gradient (bg-gradient-to-br)
  - Grosse valeur centree : nombre de seances
  - Sous-stats en row : athletes actifs, % validation
  - **Barre de progression segmentee** (3 segments : Volume / Intensite / Recup) avec couleurs
- Remplacer les 4 IOSListItem "OUTILS" par une **grille 2x2** de boutons carres arrondis avec icone + label, ombre legere, style iOS natif
- Enrichir la liste "PROCHAINES SEANCES" : ajouter un **dot de couleur** par type (vert EF, rouge VMA, bleu recup) a cote du titre

Donnees supplementaires a charger dans `loadDashboard()` :
- Compter les athletes distincts (depuis coaching_participations) → `activeAthletes`
- Calculer le % de seances validees (completed / total participations)

### 1B. ClubInfoDialog.tsx — Header enrichi

**Etat actuel** : Header simple avec avatar + nom.

**Cible** : Ajouter un bloc stats compact sous le header.

Changements dans le rendu du "Group Header" (lignes 369-389) :
- Ajouter sous le nom du club : localisation si disponible
- Ajouter une rangee de **4 mini-stats** en row (groupes actifs, athletes, en attente, charge) — ces donnees sont deja chargees par CoachingTab quand il s'affiche, donc on ajoute juste un affichage statique dans le header

---

## Phase 2 : Plan de Semaine (WeeklyPlanDialog)

### 2A. Calendrier horizontal avec couleurs

**Etat actuel** : Grille 7 colonnes avec petits boutons texte.

**Cible** : Chaque jour affiche des **pastilles colorees** par type d'activite.

Changements dans la section "SEANCES grid" (lignes 540-573) :
- Remplacer les boutons texte par des **dots/pills colorees** :
  - Mapper `activityType` → couleur (running=vert, fractionne/interval=rouge, recup=bleu, specifique=violet)
  - Afficher la pastille avec un mini label (3 chars max)
- Le bouton "+" reste en dessous, style pointille

### 2B. Graphique barre de charge semaine

**Etat actuel** : Carte texte "Charge de la semaine" avec km + intensite.

**Cible** : Ajouter un **mini bar chart** (7 barres, une par jour) montrant la charge estimee.

Changements dans la section "CHARGE DE LA SEMAINE" (lignes 511-538) :
- Calculer la charge par jour a partir de `sessions` + `computeRCCSummary`
- Afficher 7 barres verticales proportionnelles (hauteur max = jour le plus charge)
- Couleurs : vert (EF), rouge (intense), bleu (modere)
- Implementation pure CSS/div, pas de librairie de charts

### 2C. Bouton flottant "Ajouter une seance"

- Ajouter un FAB (floating action button) bleu en bas a droite du scrollable body
- Click → ajoute une seance au jour actuel (dayIndex du jour courant)

---

## Phase 3 : Suivi Athletes + Groupes + RCC Preview

### 3A. WeeklyTrackingView — Dashboard par athlete

**Etat actuel** : Avatar + dots + progress bar + liste expandable.

**Cible** : Enrichir chaque carte athlete.

Changements :
- Ajouter un indicateur de **statut visuel** : badge colore (OK vert, Fatigue jaune, Alerte rouge) base sur le % completion :
  - >= 80% → OK vert
  - 50-79% → Fatigue jaune
  - < 50% → Alerte rouge
- Dans la vue expandee, ajouter le **volume semaine** (somme des distances des sessions assignees) via `coaching_sessions.distance_km`
- Ajouter un compteur "seances en retard" avec icone

### 3B. ClubGroupsManager — Cartes par groupe

**Etat actuel** : Accordeons simples avec checkbox.

**Cible** : Cartes visuelles par groupe.

Changements :
- Remplacer chaque accordeon par une **carte coloree** :
  - Bande laterale de la couleur du groupe
  - Nom du groupe en gros
  - Nombre d'athletes
  - Mini stat : "Charge moy" (calculee depuis les sessions du groupe cette semaine)
- Le clic expande toujours vers les checkboxes membres

### 3C. RCCBlocksPreview — Tags auto-colores

**Etat actuel** : Blocs colores avec icone + texte.

**Cible** : Ajouter des **tags auto-generes** au dessus de l'apercu.

Changements :
- Calculer les types de blocs presents et afficher des Badges :
  - EF present → Badge vert "EF"
  - Interval present → Badge rouge "VMA" ou "Seuil" (selon l'allure)
  - Cooldown present → Badge bleu "Récup"
- Afficher en row au dessus de la liste des blocs

---

## Resume technique

| Phase | Fichiers modifies | Complexite |
|-------|------------------|-----------|
| 1 | `CoachingTab.tsx`, `ClubInfoDialog.tsx` | Moyenne |
| 2 | `WeeklyPlanDialog.tsx` | Moyenne |
| 3 | `WeeklyTrackingView.tsx`, `ClubGroupsManager.tsx`, `RCCBlocksPreview.tsx` | Moyenne |

Aucune migration SQL. Aucun nouveau fichier. Toutes les donnees necessaires sont deja disponibles via les tables existantes (`coaching_sessions`, `coaching_participations`, `club_groups`).

Les changements sont purement visuels et de layout — aucun changement de logique metier.

---

**Je recommande de commencer par la Phase 1** (Dashboard + Club Info) car c'est la premiere chose que le coach voit. Approuve pour lancer la Phase 1 ?

