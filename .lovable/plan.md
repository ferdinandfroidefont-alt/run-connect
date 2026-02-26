

## Diagnostic

Le composant `AthleteWeeklyView.tsx` a son **JSX vidé** : les lignes 195-269 (navigation semaine + calendrier hero) et 271-278 (bar chart) sont vides. Le composant ne rend que le message "Pas de séance" et rien d'autre — d'où la page blanche.

## Plan

### 1. Reconstruire le JSX manquant dans `AthleteWeeklyView.tsx`

Restaurer les deux sections supprimées :

**Section hero navigation (lignes 195-269)** — Conformément au memory `ui/coaching/weekly-plan-visuals` :
- Card de navigation semaine avec chevrons gauche/droite et label semaine
- Calendrier interactif inline (7 jours, points de couleur : bleu = aujourd'hui, vert = séance complétée, gris = séance non faite)
- Anneau de progression SVG avec compteur `completedCount/totalCount`
- Icone flamme/trophy si 100% complété

**Section bar chart (lignes 271-278)** :
- Rendu conditionnel de `<WeeklyBarChart>` quand `sessions.length > 0`, avec mapping des sessions vers le format attendu

**Section session list** :
- Boucle sur `sessions` avec `<WeeklyPlanCard>` pour chaque séance, avec checkbox completion, note, et click handler
- Zone note expandable avec `<Textarea>` et sauvegarde onBlur

### Fichier modifié
- `src/components/coaching/AthleteWeeklyView.tsx` — Reconstruire le JSX complet

