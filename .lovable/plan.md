

## Audit complet du mode Coach - Problemes identifies

Apres analyse detaillee de tous les composants coaching, voici les bugs et dysfonctionnements trouves :

---

### BUG 1 (CRITIQUE) : Requete avec `club_id` vide → erreur 400

**Fichier** : `src/components/coaching/CoachAccessDialog.tsx`
**Probleme** : Quand l'utilisateur clique sur un club coach dans le `CoachAccessDialog`, `onSelectClub(club.conversation_id)` est appele, puis le dialog se ferme. Mais dans `Messages.tsx`, la valeur du `clubId` semble etre transmise au `CoachingTab` via `ClubInfoDialog`. Le network log montre une requete `club_id=eq.` (chaine vide) vers `coaching_sessions` qui retourne un 400 `"invalid input syntax for type uuid"`. Cela signifie que le `clubId` transmis au `CoachingTab` est parfois vide/undefined lors du second rendu. Le `ClubInfoDialog` est re-rendu en boucle toutes les secondes (visible dans les console logs : `GroupInfoDialog render - DEBUGGING` chaque seconde), ce qui cause aussi des requetes repetees inutiles.

**Correction** :
- Dans `CoachingTab`, ajouter un guard `if (!clubId) return null;` au debut du `loadDashboard`
- Supprimer ou conditionner les console.log de debug du `ClubInfoDialog` qui polluent les logs et indiquent un re-render excessif

---

### BUG 2 (MODERE) : `AthleteWeeklyDialog` passe un tableau `sessions` vide

**Fichier** : `src/components/coaching/AthleteWeeklyDialog.tsx` (ligne 48-49)
**Probleme** : Le composant passe toujours `sessions={[]}` a `AthleteWeeklyView`. Bien que `AthleteWeeklyView` charge ses propres sessions via Supabase, le prop `parentSessions` recu est inutile et ne sert qu'a la vue dans `CoachingTab`. Ce n'est pas un vrai bug car `AthleteWeeklyView` utilise son propre `loadWeek()`, mais c'est une confusion d'API.

**Impact** : Aucun impact fonctionnel direct - `AthleteWeeklyView.loadWeek()` charge correctement les sessions.

---

### BUG 3 (MODERE) : Re-render infini du `ClubInfoDialog`

**Console logs** : Le `GroupInfoDialog render - DEBUGGING` apparait toutes les secondes sans arret.
**Probleme** : Il y a un effet secondaire dans `ClubInfoDialog` ou `Messages.tsx` qui cause un re-render continu du dialog quand il est ouvert. Cela surcharge les performances et multiplie les requetes Supabase inutiles.

**Correction** :
- Identifier la source du re-render dans `ClubInfoDialog` (probablement un `useEffect` avec des dependances instables ou un state parent qui change frequemment)
- Supprimer les `console.log` de debug

---

### BUG 4 (MINEUR) : Barre de progression "segmented" du Hero Card est codee en dur

**Fichier** : `src/components/coaching/CoachingTab.tsx` (lignes ~186-194)
**Probleme** : La barre de progression segmentee affiche toujours 60% / 30% / 10% de maniere statique au lieu de calculer les proportions reelles a partir des types de sessions. Cela donne une information trompeuse au coach.

**Correction** : Calculer les pourcentages reels a partir des sessions de la semaine, en categorisant par objectif (Volume/Intensite/Recup).

---

### BUG 5 (MINEUR) : Badge "success"/"warning"/"destructive" non defini

**Fichier** : `src/components/coaching/WeeklyTrackingView.tsx` (ligne 319)
**Probleme** : Le composant `Badge` utilise les variants `"success"` et `"warning"` qui ne sont probablement pas definis dans le composant Badge de shadcn/ui. Cela peut causer un rendu incorrect des badges de statut des athletes.

**Correction** : Verifier les variants disponibles dans `src/components/ui/badge.tsx` et ajouter `success` et `warning` si manquants.

---

### POINT FONCTIONNEL 6 : Envoi du plan hebdo - flux complet OK

Le `WeeklyPlanDialog.handleSendPlan()` fonctionne correctement :
- Cree les `coaching_sessions` pour chaque groupe
- Cree les `coaching_participations` pour chaque membre
- Envoie les notifications in-app et push
- Sauvegarde le draft avec `sent_at`

---

### POINT FONCTIONNEL 7 : Groupes - flux OK

Le `ClubGroupsManager` fonctionne correctement :
- Creation/suppression de groupes
- Ajout/suppression de membres dans les groupes
- Chargement des donnees depuis Supabase

---

### POINT FONCTIONNEL 8 : Suivi athletes - flux OK (sauf bug 5)

Le `WeeklyTrackingView` charge correctement tous les membres du club, leurs sessions et participations, avec les rappels push fonctionnels.

---

### POINT FONCTIONNEL 9 : Brouillons - flux OK

Le `CoachingDraftsList` et le systeme de sauvegarde auto fonctionnent correctement avec la table `coaching_drafts`.

---

### POINT FONCTIONNEL 10 : Templates (modeles) - flux OK

Les `CoachingTemplatesDialog` et `coaching_week_templates` fonctionnent correctement pour la sauvegarde et le chargement de semaines types.

---

## Plan de corrections

### Fichier 1 : `src/components/coaching/CoachingTab.tsx`

- Ajouter `if (!clubId) return;` au debut de `loadDashboard()`
- Calculer les proportions reelles de la barre segmentee

### Fichier 2 : `src/components/ClubInfoDialog.tsx`

- Supprimer les `console.log` de debug (`🔍 GroupInfoDialog render - DEBUGGING`)
- Investiguer et corriger la source du re-render continu

### Fichier 3 : `src/components/ui/badge.tsx`

- Verifier et ajouter les variants `success` et `warning` si necessaires

### Resume

```text
Bugs identifies : 5
- 1 critique (club_id vide → 400)
- 2 moderes (sessions vides dans AthleteWeeklyDialog, re-renders infinis)
- 2 mineurs (barre segmentee statique, variants Badge)

Fonctionnalites OK : 5
- Envoi plan hebdo ✓
- Groupes de niveau ✓
- Suivi athletes ✓
- Brouillons ✓
- Templates ✓
```

