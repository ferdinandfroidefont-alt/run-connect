Je vais corriger le scroll de `Mon plan` et `Programmer la semaine` pour qu’il ne saute plus brutalement d’une semaine à l’autre.

Plan :
1. Remplacer le changement de semaine déclenché trop tôt aux bords du scroll par une zone de transition plus naturelle.
2. Quand l’utilisateur arrive en bas d’une semaine, afficher la semaine suivante comme une continuité : après dimanche, on verra l’en-tête “Semaine X” + stats puis les jours suivants, au lieu d’un saut immédiat.
3. Faire la même logique en remontant : avant lundi, afficher la semaine précédente avec son en-tête + stats, sans téléportation visible.
4. Conserver le recentrage initial sur aujourd’hui uniquement à l’arrivée sur la semaine actuelle, sans perturber le scroll manuel.

Détails techniques :
- Modifier uniquement `src/components/coaching/CoachPlanningExperience.tsx`.
- Construire une petite liste virtuelle de 3 semaines : précédente, courante, suivante.
- Garder `weekAnchor` comme semaine centrale, mais rendre les trois blocs pour donner une vraie continuité visuelle.
- Recentrer discrètement la semaine centrale après bascule pour permettre le scroll infini, sans effet de saut visible.