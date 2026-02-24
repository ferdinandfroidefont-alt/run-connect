

# Analyse honnete : est-ce que cette fonctionnalite coaching convaincrait un coach FFA ?

## Ce qui est deja bien fait

Le systeme a des bases solides qui correspondent au workflow FFA :

1. **Code RCC (RunConnect Code)** — Un coach FFA ecrit ses seances en format abrege (`3x1000>3'00 r1'15>trot`). Le parseur gere les intervalles, echauffements, recup. Les quick chips (EF, CD, x400, x1000) accelerent la saisie. C'est un vrai gain de temps vs ecrire en texte libre.

2. **Plan de semaine** — Le coach peut creer 7 jours de seances d'un coup, par groupe. La duplication de plan entre groupes (Sprint → Demi-fond) est un vrai use case FFA.

3. **Semaines type (templates)** — Le coach sauvegarde des plans types et les recharge. Utile car les cycles d'entrainement se repetent.

4. **Groupes de niveau** — Sprint, Demi-fond, Loisirs, etc. C'est exactement comme ca que fonctionnent les clubs FFA.

5. **Variantes athlete** — Ajuster l'allure/les reps par athlete depuis le meme plan. Un coach FFA a 15 athletes au meme entrainement avec des allures differentes — c'est un vrai probleme resolu.

6. **Suivi hebdo** — Le coach voit par athlete : dots colores, % completion, commentaires. C'est la vue "presence" que les coachs FFA font sur papier.

## Ce qui manque ou freine l'adoption

### Problemes critiques

1. **Pas de vue cycle / mesocycle** — Un coach FFA planifie sur 4-8 semaines (PPG, PPS, competition). Actuellement, tout est semaine par semaine. Il n'y a aucune vision de la periodisation. Le coach ne peut pas voir : "semaine 1 = volume, semaine 2 = intensite, semaine 3 = pic". C'est LE manque principal.

2. **Pas de charge d'entrainement** — Le coach ne voit pas la charge totale de la semaine (km total, denivele, intensite globale). Un simple resume en haut du plan semaine suffirait : "42 km cette semaine · 3 seances qualite · Charge : Moderee".

3. **Pas de duplication semaine → semaine suivante** — Le coach fait souvent S1 → copier vers S2 avec ajustements. Actuellement il doit tout refaire ou utiliser un template, mais sans possibilite de decaler d'une semaine directement.

4. **Le suivi coach ne permet pas de relancer les retardataires** — Le coach voit "3 athletes en retard" dans les KPI, mais ne peut pas leur envoyer un rappel push en un clic depuis le tracking view.

5. **Pas de feedback par lot** — Le coach a 20 athletes qui completent la meme seance. Il doit ouvrir chaque participation pour ecrire un feedback. Il faudrait un mode "feedback groupe" : ecrire un message commun + feedback individuel optionnel.

6. **ScheduleCoachingDialog demande lat/lng** — Un athlete ne connait pas la latitude et longitude de son stade. Il faut soit une recherche Google Maps, soit supprimer ces champs et utiliser uniquement le nom du lieu.

### Irritants UX

7. **Pas de notification de rappel** — La veille de la seance, l'athlete ne recoit aucun rappel. Un cron qui envoie "Demain : VMA 10x200 a 18h30" serait tres utile.

8. **Pas d'historique de performance** — Le coach ne peut pas voir l'evolution d'un athlete sur plusieurs semaines (est-ce qu'il complete plus ? ses commentaires sont-ils positifs ?).

9. **Le RCC ne gere pas les cotes** — En trail, le coach ecrit "3x500m D+100m". Le parseur ne comprend pas le denivele.

10. **Pas d'export/import** — Un coach FFA utilise souvent Excel ou un Google Sheet. Pouvoir importer un plan depuis un CSV ou exporter les resultats de suivi serait un gros plus.

## Verdict

**En l'etat, c'est un MVP fonctionnel mais pas encore un outil qui remplacerait le groupe WhatsApp + Excel d'un coach FFA.** Les bases sont la (RCC, groupes, templates, suivi), mais il manque la dimension "periodisation" et des raccourcis de productivite (feedback en lot, relance push, duplication semaine).

## Recommandations par priorite

| Priorite | Feature | Impact |
|---|---|---|
| **P0** | Resume charge semaine (km total, nb qualite, intensite) | Le coach veut voir en 1 seconde si sa semaine est coherente |
| **P0** | Dupliquer semaine precedente → semaine courante | Divise par 5 le temps de planification |
| **P0** | Supprimer lat/lng du ScheduleCoachingDialog | Friction inutile pour l'athlete |
| **P1** | Bouton "Relancer" sur les athletes en retard | Le coach perd du temps a ecrire des messages individuels |
| **P1** | Feedback en lot apres une seance | 20 athletes = 20 clics actuellement |
| **P2** | Vue mesocycle (4-8 semaines) | Planification long terme |
| **P2** | Notification rappel J-1 (cron) | Augmente le taux de completion |
| **P3** | Historique athlete (courbe de completion) | Vision evolution |
| **P3** | Support denivele dans RCC | Trail coaches |

Je peux implementer n'importe lequel de ces points. Lequel veux-tu attaquer en premier ?

