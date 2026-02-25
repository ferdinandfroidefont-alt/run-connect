

## Plan de modifications du Plan de Semaine Coach

### Changements demandes

1. **Supprimer les pills de groupes** (lignes 664-700) sous le selecteur de semaine. Garder uniquement la barre de recherche unifiee qui permet deja de filtrer par groupe ou athlete.

2. **Inverser calendrier et charge** : mettre "Charge de la semaine" AVANT le "Calendrier" dans l'ordre d'affichage.

3. **Reduire la taille de la charge** : rendre la section charge plus compacte (meme hauteur que le calendrier ~), reduire la hauteur des barres de 72px a ~48px.

4. **Bloquer le swipe pour changer de semaine** : supprimer les handlers `onTouchStart`/`onTouchEnd` (lignes 628-637) qui permettent de changer de semaine en swipant. Le changement de semaine ne doit se faire QUE via les boutons chevron du hero card.

5. **Types d'activite** : reduire a 3 (Course, Velo, Natation). Supprimer Trail et Marche.

6. **Adapter l'unite d'allure par activite** :
   - Course : allure en min/km (actuel)
   - Velo : allure en watts (W)
   - Natation : allure en min/100m

7. **Adapter les objectifs rapides par activite** :
   - Course : Footing, Footing Z2, Seuil, VMA, VMA courte, VMA longue, Fartlek, Cotes, Sortie longue, Recuperation, PPG/Renfo, Spe 10K, Spe semi, Spe marathon
   - Velo : Endurance, Recup, Tempo, Seuil, PMA, PMA courte, PMA longue, Sprint, Cotes, Sortie longue, Home trainer
   - Natation : Echauffement, Technique, Endurance, Seuil, Vitesse, Interval, Retour au calme, Mixte, Palmes, Pull buoy

8. **Corriger le scroll du popover objectifs** : ajouter `position: 'popper'` et `sideOffset`, utiliser un `ScrollArea` ou un max-h plus grand avec `overflow-y-auto` et `touch-action: pan-y` pour que le scroll fonctionne sur mobile.

9. **Brouillons vs donnees envoyees** : quand on quitte et revient, n'afficher QUE les sessions deja envoyees (`loadSentSessions`) et NON le brouillon en cours. Le brouillon est un etat transitoire de travail, pas la vue par defaut. Modifier `loadDraft` pour prioriser les sessions envoyees et ne charger le brouillon que si l'utilisateur le demande explicitement (via un bouton "Reprendre le brouillon").

---

### Fichiers modifies

**`src/components/coaching/WeeklyPlanDialog.tsx`**
- Supprimer le bloc group pills (lignes 664-700)
- Supprimer les handlers onTouchStart/onTouchEnd (lignes 628-637)
- Inverser l'ordre : charge AVANT calendrier
- Reduire hauteur barres du graphique (72 → 48px)
- Modifier `loadDraft` : charger par defaut les sessions envoyees, ajouter un bouton "Reprendre brouillon" dans la section Outils

**`src/components/coaching/WeeklyPlanSessionEditor.tsx`**
- Reduire ACTIVITY_TYPES a 3 : running, cycling, swimming
- Rendre QUICK_OBJECTIVES dynamique selon l'activite selectionnee
- Ajouter une indication d'unite d'allure dans le label RCC selon l'activite (ex: "Allure en watts" pour velo)
- Fixer le scroll du popover objectifs sur mobile : ajouter `touch-action: pan-y` et augmenter `max-h`

### Detail technique

```text
Ordre actuel :           Nouvel ordre :
┌─ Semaine nav ──┐       ┌─ Semaine nav ──┐
│ Group pills    │       │ (supprime)     │
├─ Recherche ────┤       ├─ Recherche ────┤
├─ Calendrier ───┤       ├─ Charge sem. ──┤  (compact)
├─ Charge sem. ──┤       ├─ Calendrier ───┤
├─ Editeur ──────┤       ├─ Editeur ──────┤
├─ Outils ───────┤       ├─ Outils ───────┤
└─ Footer ───────┘       │ + "Reprendre   │
                         │   brouillon"   │
                         └─ Footer ───────┘
```

Objectifs par activite :
- `getQuickObjectives(activityType)` → retourne le tableau adapte
- Label d'allure dynamique dans l'aide RCC : "min/km" | "watts" | "min/100m"

