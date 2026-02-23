

## Auto-stop basé sur la durée définie + Live tracking pour le créateur

### Objectif

1. L'auto-stop du live tracking doit utiliser `live_tracking_max_duration` (défini par le créateur) au lieu d'un 3h codé en dur
2. Le créateur de la séance doit aussi pouvoir partager sa position pendant une séance en cours (pas seulement les participants rejoints)

### Modifications - `src/pages/MySessions.tsx`

#### 1. Interface `UserSession` - ajouter le champ durée

Ajouter `live_tracking_max_duration?: number` a l'interface `UserSession` pour accéder à la durée configurée par le créateur.

#### 2. Auto-stop dynamique

Remplacer la logique actuelle "3h après `scheduled_at`" par :
- Calculer la durée max depuis `selectedSession.live_tracking_max_duration` (défaut: 120 min)
- Auto-stop = `scheduled_at + live_tracking_max_duration minutes`

Avant :
```
const threeHoursAfter = scheduledTime + 3 * 60 * 60 * 1000;
```

Après :
```
const maxDuration = (selectedSession as any).live_tracking_max_duration || 120;
const autoStopTime = scheduledTime + maxDuration * 60 * 1000;
```

#### 3. Section Live Tracking pour les séances créées (organisateur)

Ajouter une section "POSITION EN DIRECT" dans la vue détail des séances créées, visible quand la séance est en cours ou à venir. La condition "en cours" sera : `scheduled_at <= now < scheduled_at + max_duration`.

- Meme UI que pour les séances rejointes : Switch + bouton "Voir sur la carte"
- Utilise les memes fonctions `startParticipantTracking` / `stopParticipantTracking` / `handleTrackingToggle` (renommage interne pas nécessaire, elles fonctionnent pour tout utilisateur)

#### 4. Condition d'affichage

Pour les séances rejointes : visible si la séance est à venir OU en cours (pas terminée)
Pour les séances créées : visible si la séance est à venir OU en cours (pas terminée)

"En cours" = `scheduled_at <= now AND now < scheduled_at + live_tracking_max_duration`

On simplifie : afficher la section si `now < scheduled_at + live_tracking_max_duration` (séance pas encore terminée selon la durée définie).

#### 5. RLS - Vérification

La policy "Organizer can insert tracking points" exige `live_tracking_active = true` sur la session. Il faudra soit :
- Activer `live_tracking_active` quand le créateur active son switch (via update sur `sessions`)
- Ou utiliser la policy "Participants can insert tracking points" si le créateur est aussi participant

Le créateur n'est PAS dans `session_participants`, donc il faut mettre à jour `sessions.live_tracking_active = true` quand le créateur active le switch. On ajoutera cette logique dans `startParticipantTracking` : si `sessionSource === 'created'`, faire un update de `sessions.live_tracking_active`.

### Résumé des changements

| Element | Detail |
|---------|--------|
| Interface | Ajouter `live_tracking_max_duration` dans `UserSession` |
| Auto-stop | Basé sur `live_tracking_max_duration` au lieu de 3h fixe |
| UI créateur | Section "Position en direct" dans vue detail des séances créées |
| RLS | Update `live_tracking_active` quand le créateur active le switch |
| Fichier modifié | `src/pages/MySessions.tsx` uniquement |
