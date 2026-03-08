

# Améliorations du Mode Coach — Design et Fonctionnalités

Après analyse complète des composants coaching (`CoachingTab`, `AthleteWeeklyView`, `WeeklyPlanCard`, `CoachingSessionDetail`, `WeeklyTrackingView`, `CoachAccessDialog`, `WeeklyBarChart`, `MesocycleView`), voici les améliorations identifiées.

---

## A. Problèmes de design actuels

1. **CoachAccessDialog** : écran d'accueil du mode coach très plat — juste des listes iOS sans visuel d'accroche. Pas d'illustration, pas de hero section, pas de couleur.
2. **CoachingTab (Hero Card)** : le gradient `from-primary/10` est trop subtil, le gros chiffre "0 séances" sur un club vide n'inspire pas. Pas de CTA clair quand il n'y a aucune séance.
3. **WeeklyPlanCard** : cards sans séparation visuelle (`rounded-none`, pas de gap entre elles), effet "mur gris". Le barré (`line-through`) sur les séances faites est peu gratifiant.
4. **WeeklyBarChart** : barres monochromes (tout en `primary/80`), pas de code couleur par type de séance.
5. **CoachingSessionDetail** : page de détail très "formulaire" — pas de header visuel avec le type de séance, pas d'illustration, feedback individuel mal hiérarchisé.
6. **AthleteWeeklyView** : le calendrier 7 jours et l'anneau de progression sont bien, mais la section "Pas de séance" est fade (juste une icône grisée).
7. **Éléments manquants** : pas de micro-animations (confetti, check animé), pas de feedback haptique visuel sur la complétion.

## B. Améliorations de design proposées

### B1. CoachAccessDialog — Hero motivant
- Ajouter un hero gradient en haut avec une icône large + titre "Mode Coach" en bold et un sous-titre contextuel ("2 clubs · 12 athlètes")
- Ajouter un badge "PRO" ou couleur premium pour donner un sentiment d'outil avancé

### B2. CoachingTab — Dashboard plus vivant
- Remplacer le gradient subtil par un vrai fond coloré plus affirmé (gradient `from-primary/20 via-primary/10`)
- Ajouter un état vide engageant : illustration + CTA "Créer votre première séance"
- Animer le chiffre principal avec un `framer-motion` counter

### B3. WeeklyPlanCard — Cards plus aérées et récompensantes
- Ajouter `rounded-xl` et un gap de `3px` entre les cards pour de la respiration
- Remplacer le `line-through` par un overlay vert léger + checkmark animé
- Ajouter une micro-animation scale+bounce sur le check de complétion

### B4. WeeklyBarChart — Barres colorées par type
- Colorer chaque barre selon l'objectif de la séance (rouge=VMA, vert=EF, orange=Seuil, bleu=récup) au lieu de tout en `primary`

### B5. CoachingSessionDetail — Header visuel
- Ajouter un header gradient coloré selon le type de séance avec emoji + titre en blanc
- Meilleure hiérarchie : séparer info session / actions athlète / participants en sections Card distinctes

### B6. Empty states partout
- Remplacer les icônes grises par des illustrations/emojis plus grands avec texte motivant

## C. Fonctionnalités manquantes

### C1. Duplication de semaine en un tap
- Depuis le `CoachingTab`, un bouton "Dupliquer la semaine précédente" pour pré-remplir le plan hebdo — gain de temps massif pour les coachs.

### C2. Notification de relance automatique
- Quand un athlète n'a pas validé une séance passée depuis 24h, le coach peut envoyer une relance push en un tap depuis le suivi.

### C3. Statistiques athlète enrichies dans le suivi
- Ajouter dans `WeeklyTrackingView` (fiche détail) : volume total cumulé sur 4 semaines, tendance (flèche haut/bas), et streak de complétion.

### C4. Export PDF du plan hebdo
- Permettre au coach de générer un PDF résumé de la semaine (séances + objectifs) à partager hors app.

### C5. Comparaison entre athlètes
- Dans le suivi, pouvoir sélectionner 2-3 athlètes et comparer leur volume/complétion côte à côte.

### C6. Objectifs personnalisés par athlète
- Ajouter un champ "objectif de la semaine" (texte libre) par athlète dans le plan hebdo, visible dans la fiche de suivi.

---

## D. Plan d'implémentation recommandé (priorité)

| Priorité | Changement | Fichiers |
|----------|-----------|----------|
| 1 | Design CoachAccessDialog — hero gradient + stats | `CoachAccessDialog.tsx` |
| 2 | WeeklyPlanCard — rounded, animations, couleur complétion | `WeeklyPlanCard.tsx` |
| 3 | WeeklyBarChart — barres colorées par type | `WeeklyBarChart.tsx` |
| 4 | CoachingTab — état vide engageant + gradient plus fort | `CoachingTab.tsx` |
| 5 | CoachingSessionDetail — header coloré + sections | `CoachingSessionDetail.tsx` |
| 6 | Relance push en un tap | `WeeklyTrackingView.tsx` + edge function |
| 7 | Stats 4 semaines + streak | `WeeklyTrackingView.tsx` |

Je recommande de commencer par les améliorations design (B1-B6) car elles changent immédiatement le ressenti, puis d'ajouter les fonctionnalités C1-C3 en priorité.

