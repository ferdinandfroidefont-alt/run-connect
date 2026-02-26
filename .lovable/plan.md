
Objectif immédiat: supprimer définitivement le “calendrier vide” quand on clique “Continuer le plan” depuis le suivi athlète.

1) Corriger le bootstrap d’ouverture dans `WeeklyPlanDialog.tsx`
- Remplacer l’enchaînement actuel (`isInitialOpen` + effets séparés) par un seul flow d’ouverture déterministe.
- À chaque `isOpen=true`, forcer:
  - `setCurrentWeek(initialWeek ?? new Date())`
  - `setActiveGroupId(initialGroupId ?? "club")`
  - `setTargetAthletes([])`
  - `setGroupPlans({})`
- Ensuite, charger membres/groupes/templates, puis résoudre l’athlète cible (priorité `initialAthleteId`, fallback nom), puis appliquer `setTargetAthletes([resolvedId])`.

2) Supprimer les races de chargement (cause principale du vide)
- Refactorer `loadSentSessions` pour prendre des paramètres explicites:
  - `weekStartParam`
  - `groupIdParam`
  - `focusedAthleteIdParam`
- Ne plus dépendre des states potentiellement obsolètes capturés dans les closures d’effets.
- Ajouter un garde anti-réponse obsolète (`requestIdRef` / `loadVersionRef`) pour ignorer les retours d’anciennes requêtes.

3) Fiabiliser la requête “athlète focus”
- Dans `loadSentSessions` (mode athlète):
  - Étape A: charger les sessions de la semaine du club (`coaching_sessions`).
  - Étape B: charger les participations de l’athlète sur ces IDs.
  - Étape C: filtrer les sessions par participations.
- Injecter les résultats dans la bonne clé de plan: `groupPlans[groupIdParam]` (pas `activeGroupId` implicite).
- Conserver `rccCode` et mapping `dayIndex`.
- Ne jamais écraser avec une réponse vide provenant d’un ancien contexte.

4) Rebrancher l’effet de chargement hebdo
- Remplacer l’effet actuel “skip first open” par:
  - un appel unique de bootstrap sur ouverture,
  - puis un effet simple pour changement semaine/groupe si dialog déjà initialisé.
- En mode athlète pré-ciblé, garder le focus athlète au changement de semaine (ne pas perdre `targetAthletes`).

5) Garder et durcir la synchro depuis le suivi
- `WeeklyTrackingView.tsx`: conserver l’appel `onOpenPlanForAthlete(..., currentWeek)`.
- `WeeklyTrackingDialog.tsx`: conserver `planWeekDate` -> `initialWeek`.
- Ajouter un fallback de sécurité: si `weekDate` absent, passer `new Date(currentWeek)` pour éviter `undefined`.

6) Validation manuelle ciblée (Ferdinand)
- Ouvrir Suivi athlète sur la semaine avec jeudi.
- Vérifier carte suivi: séance + RCC visible.
- Cliquer “Continuer le plan”.
- Vérifier dans le planificateur:
  - athlète pré-sélectionné,
  - semaine identique au suivi,
  - séance du jeudi visible (plus de calendrier vide).
- Refaire le test en changeant de semaine puis retour pour confirmer qu’aucune réponse stale ne vide le calendrier.

Section technique (détails à implémenter)
- Fichier principal: `src/components/coaching/WeeklyPlanDialog.tsx`
  - Introduire `const loadVersionRef = useRef(0);`
  - `const loadSentSessions = async (params) => { const version = ++loadVersionRef.current; ... if (version !== loadVersionRef.current) return; setGroupPlans(...); }`
  - `setGroupPlans(prev => ({ ...prev, [groupIdParam]: imported }))`
  - Éviter `initialAthleteId` lu implicitement au milieu du flux; le résoudre une fois au bootstrap.
- Fichiers de synchro:
  - `src/components/coaching/WeeklyTrackingView.tsx`
  - `src/components/coaching/WeeklyTrackingDialog.tsx`
  - garder la signature `(athleteId, athleteName, groupId?, weekDate?)` et transmission `initialWeek`.

