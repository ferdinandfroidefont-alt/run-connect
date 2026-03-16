

## Refonte complète de ProfilePreviewDialog

### Ce qui change
Remplacement total du design actuel (hero cover centré) par un layout iOS "Inset Grouped" conforme à la maquette : identité horizontale (avatar gauche, infos droite), filtrage par période, stats dynamiques, et liens cliquables vers records et séances récentes.

### Structure nouvelle

```text
┌─────────────────────────────────┐
│ ← DISPLAY NAME...        •••   │  Header fixe
├─────────────────────────────────┤
│ [Avatar]  Pseudo                │
│           Âge                   │
│           🇫🇷 Sport favori      │
│                                 │
│  [Suivre]  [Message]            │  Boutons action
├─────────────────────────────────┤
│  Suivis  4    Abonnés  3        │  Quick stats row
├─────────────────────────────────┤
│  Bio text...                    │
├─────────────────────────────────┤
│ TOTAUX | 30 JOURS | 7 JOURS    │  Filtre période
├─────────────────────────────────┤
│ Séances créées          12      │
│ Itinéraires créés        3      │  Stats filtrées
│ Séances rejointes        8      │
├─────────────────────────────────┤
│ Records sport            >      │  Cliquable → dialog
│ Séances récentes         >      │  Cliquable → dialog/liste
└─────────────────────────────────┘
```

### Changements concrets dans `ProfilePreviewDialog.tsx`

1. **Supprimer** le hero cover/avatar centré, le layout vertical
2. **Header** : bar avec `ArrowLeft` + nom tronqué + dropdown "..." (bloquer/signaler)
3. **Section identité horizontale** : Avatar (80px) à gauche, à droite pseudo, âge, sport favori (détecté depuis les records non-vides)
4. **Boutons** : "Suivre" + icône "Message" (visible si amis, navigue vers conversation)
5. **Stats row** : Suivis + Abonnés (cliquables → FollowDialog)
6. **Bio** : texte simple dans une card
7. **Filtre période** : tabs TOTAUX / 30 JOURS / 7 JOURS, requête Supabase filtrée dynamiquement pour compter :
   - Séances créées (`sessions.organizer_id`)
   - Itinéraires créés (`routes.created_by`)
   - Séances rejointes (`session_participants.user_id`)
8. **Records sport** : IOSListItem cliquable → ouvre `PersonalRecords` dialog
9. **Séances récentes** : IOSListItem cliquable → ouvre un dialog/sheet avec `RecentActivities`
10. **Profil privé** : si non-follower, afficher seulement identité + bouton suivre + message "Profil privé"

### Fichier modifié
- `src/components/ProfilePreviewDialog.tsx` — réécriture complète

### Logique de filtrage période
```typescript
const now = new Date();
const dateFilter = period === '30d' 
  ? new Date(now.getTime() - 30*24*60*60*1000).toISOString()
  : period === '7d'
  ? new Date(now.getTime() - 7*24*60*60*1000).toISOString()
  : null; // totaux = pas de filtre
```

### Navigation message
Réutilise la logique existante : vérifier `are_users_friends`, chercher conversation existante ou en créer une, naviguer vers `/messages?conversation=...`.

