

## Ajouter le Live Tracking pour les seances rejointes (participants)

### Objectif

Permettre aux participants de seances rejointes (a venir) d'activer/desactiver le partage de leur position en temps reel. Leur position sera visible sur la page "Suivre les participants" (`/session-tracking/:id`). Un message de prevention s'affiche avant activation, et la permission de localisation native (Android/iOS) est demandee si necessaire.

### Modifications

#### 1. Fichier `src/pages/MySessions.tsx` - Vue detail des seances rejointes

**Nouveaux states :**
- `liveTrackingEnabled: boolean` - indique si le participant partage sa position
- `showTrackingWarning: boolean` - controle l'affichage du dialog de prevention
- `trackingWatchId: string | null` - reference du watch GPS pour nettoyage

**Nouvelle section UI dans la vue detail (apres la section ORGANISATEUR, avant INFORMATIONS) :**
- Visible uniquement si `isViewingJoinedSession && isUpcoming`
- Carte iOS-style avec icone MapPin et Switch pour activer/desactiver
- Texte explicatif : "Partagez votre position en temps reel avec les autres participants"
- Bouton "Voir sur la carte" qui navigue vers `/session-tracking/:id`

**Nouveau AlertDialog de prevention :**
- S'affiche quand l'utilisateur active le switch pour la premiere fois
- Titre : "Partager votre position"
- Message : "En activant cette fonctionnalite, votre position GPS sera partagee en temps reel avec l'organisateur et les autres participants de cette seance. Votre position ne sera plus partagee une fois la seance terminee ou si vous desactivez manuellement."
- Boutons : "Annuler" / "Activer"
- Sur "Activer" : demande la permission de localisation native via `Geolocation.requestPermissions()` (declenche le popup systeme Android/iOS), puis demarre le watch GPS

**Logique de tracking participant :**
- `startParticipantTracking()` : 
  - Appelle `Geolocation.requestPermissions()` (popup natif)
  - Lance `Geolocation.watchPosition()` (natif) ou `setInterval` + `getCurrentPosition()` (web)
  - Insere les points dans `live_tracking_points` toutes les 5 secondes
  - Met a jour `liveTrackingEnabled = true`
- `stopParticipantTracking()` :
  - Arrete le watch/interval GPS
  - Met a jour `liveTrackingEnabled = false`
- Auto-stop : quand `scheduled_at` est depasse de plus de 3 heures, arret automatique

**Nettoyage :** le watch GPS est nettoye au unmount du composant et quand on revient a la liste

#### 2. Fichier `src/hooks/useLiveTracking.tsx` - Etendre aux participants

Actuellement le hook ne permet le tracking que pour `isOrganizer`. Modification :
- Supprimer le guard `if (!isOrganizer) return;` dans `startTracking`
- Ajouter un parametre optionnel `isParticipant: boolean`
- Pour les participants : ne pas modifier `sessions.live_tracking_active` (seul l'orga controle ce flag)
- Le reste (watch GPS + insert dans `live_tracking_points`) fonctionne de la meme maniere

Alternativement, la logique de tracking participant peut etre directement dans `MySessions.tsx` sans modifier le hook existant, pour eviter des regressions. C'est l'approche choisie.

### Imports a ajouter dans MySessions.tsx

- `MapPin` (deja importe)
- `Switch` depuis `@/components/ui/switch`
- `Geolocation` depuis `@capacitor/geolocation`
- `Capacitor` depuis `@capacitor/core`

### Resume

| Element | Detail |
|---------|--------|
| States | `liveTrackingEnabled`, `showTrackingWarning`, `trackingWatchId` |
| UI | Section "Position en direct" avec Switch + dialog prevention |
| Permission | Popup natif Android/iOS via `Geolocation.requestPermissions()` |
| GPS | `watchPosition` (natif) ou interval (web), insert `live_tracking_points` |
| Auto-stop | 3h apres `scheduled_at` |
| Desactivation | Switch OFF ou quitter la seance |
| Fichier modifie | `src/pages/MySessions.tsx` uniquement |

