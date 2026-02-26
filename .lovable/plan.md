

## Refonte complete de la page Suivi d'athlete

La maquette montre un flow en 2 niveaux :
1. **Liste des athletes** (page d'accueil) : barre de recherche + liste iOS inset grouped
2. **Fiche athlete** (page detail au clic) : profil, semaine, stats, seances, onglets

---

### Architecture

```text
WeeklyTrackingDialog (fullscreen)
  └─ WeeklyTrackingView
       ├─ MODE LISTE (selectedAthlete = null)
       │   ├─ Barre de recherche
       │   └─ Liste athletes (inset grouped)
       │        └─ Chaque ligne : avatar + nom + groupe + badge % + chevron
       │
       └─ MODE DETAIL (selectedAthlete = athlete)
            ├─ Header iOS "< Retour | Suivi de l'athlete"
            ├─ Profil hero (photo + nom + username + groupe + badge activite)
            ├─ Semaine nav (chevrons + dates)
            ├─ Mini calendrier (LUN-DIM) avec dots couleur
            ├─ Card stats (ring % + X seances faites + volume par type)
            ├─ Onglets : Seances | Commentaires
            │   ├─ Tab Seances : liste inset grouped des seances
            │   │    └─ Chaque ligne : badge jour + titre + objectif + distance + check vert si fait
            │   └─ Tab Commentaires : notes de l'athlete sur ses seances
            └─ Bouton rappel (Bell) si seances en retard
```

---

### Fichier 1 : `src/components/coaching/WeeklyTrackingView.tsx` — Reecriture complete

**Changements majeurs :**

- Ajouter un state `selectedAthlete: AthleteData | null` (null = mode liste, set = mode detail)
- **Mode Liste** :
  - Barre de recherche en haut
  - Liste style inset grouped (bg-card rounded-xl) avec chaque athlete en ligne
  - Chaque ligne : avatar (rond 44px), nom bold, @username en gris, badge groupe (depuis `club_groups` + `club_group_members`), mini indicateur % a droite, chevron >
  - Au clic → `setSelectedAthlete(athlete)`
  
- **Mode Detail** (quand selectedAthlete est set) :
  - **En-tete profil** : grande photo (72px rond), nom (18px bold), @username, badge groupe colore, badge "Actif" avec point vert
  - **Navigation semaine** : card avec chevrons < > et dates "23 fevr. — 1 mars"
  - **Mini calendrier** : 7 colonnes LUN-DIM avec labels courts, sous chaque label un dot/barre de couleur (vert=fait, bleu=programme, vide=rien), aujourd'hui en bleu inverse
  - **Card stats circulaire** : un cercle de progression (SVG ring) avec le % au centre, a cote "X seances faites", en dessous des badges par type (endurance X km, seuil X km, VMA X km) avec emoji
  - **Onglets** (Seances | Commentaires) :
    - Tab Seances : liste inset grouped, chaque seance = ligne avec badge jour colore (LUN/MAR/MER en rounded), icone activite, titre bold + objectif, distance a droite, check vert si completed, si en retard badge rouge "En retard"
    - Tab Commentaires : liste des notes laissees par l'athlete sur ses seances, avec avatar + texte + date
  - **Bouton rappel** : si seances en retard, bouton Bell en haut a droite du header

- Charger les groupes de l'athlete depuis `club_groups` + `club_group_members` pour afficher le badge groupe

### Fichier 2 : `src/components/coaching/WeeklyTrackingDialog.tsx` — Adapter le header

- Le header change dynamiquement :
  - Mode liste : "Suivi athletes" (titre centre)
  - Mode detail : bouton "< Retour" qui revient a la liste (setSelectedAthlete(null)), titre "Suivi de l'athlete"

### Details techniques

**Cercle de progression SVG** : un simple `<svg>` avec deux `<circle>` (fond gris + arc colore), le % au centre en texte.

**Onglets** : utiliser le composant `Tabs` de shadcn deja disponible dans le projet.

**Badge jour colore** : 
- Course = vert, VMA = rouge, Seuil = orange, Recup = emeraude (meme logique que WeeklyPlanCard `getActivityColor`)

**Donnees groupe** : charger `club_groups` et `club_group_members` dans `loadTracking()` pour enrichir chaque athlete avec son groupe (nom + couleur).

**Volume par type** : calculer en iterant sur les sessions de l'athlete, grouper par objectif/titre pour afficher "endurance X km, seuil X km, VMA X km" comme sur la maquette.

### Resume des fichiers modifies

| Fichier | Action |
|---|---|
| `src/components/coaching/WeeklyTrackingView.tsx` | Reecriture complete : mode liste + mode detail athlete |
| `src/components/coaching/WeeklyTrackingDialog.tsx` | Header dynamique selon le mode (liste vs detail) |

