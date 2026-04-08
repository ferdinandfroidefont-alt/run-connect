

# Refonte design "Mon Profil" — style Instagram/Strava premium

## Probleme actuel
La page profil a trop de blocs empiles avec des designs differents : grille d'infos personnelles redondante (pseudo et nom deja affiches en haut), raccourcis en pilules basiques, et une densite visuelle trop forte. Ca fait amateur.

## Inspiration Instagram / Strava
- **Instagram** : Header compact (avatar + stats sur la meme ligne), bio en dessous, stories highlights, puis onglets de contenu (grille/reels/tags)
- **Strava** : Stats integrees dans le header, actions directes, contenu en sections propres

## Structure cible

```text
┌───────────────────────────────────┐
│  ← Retour     Mon Profil     ⚙️  │  (⚙️ remplace le vide a droite)
├───────────────────────────────────┤
│  [Avatar]   Séances  Abonnés  Abts│  (stats a cote de l'avatar
│   96x96       12       34     28  │   comme Instagram)
│                                   │
│  Nom complet 👑                   │
│  @username                        │
│  🇫🇷 France · 24 ans · 🏃 Course │  (1 ligne meta, plus de chips)
│                                   │
│  Bio texte ici si presente...     │
│                                   │
│  [ Modifier le profil ] [Partager]│
├───────────────────────────────────┤
│  ○ Story1  ○ Story2  ⊕ Ajouter   │  (stories inchange)
├───────────────────────────────────┤
│  🏆 Records    🛡️ Fiabilité 94%  │  (grille 2x2 d'acces rapides
│  🗺️ Parcours   📍 Séances        │   icones + labels, style propre)
└───────────────────────────────────┘
```

## Changements concrets dans `ProfileDialog.tsx`

### 1. Header : ajouter bouton Parametres a droite
- Remplacer le `div` vide par un bouton engrenage (`Settings` icon) qui ouvre `setShowSettingsDialog(true)`
- Retire "Parametres" des raccourcis en bas

### 2. Bloc identite : layout Instagram (avatar + stats cote a cote)
- **Ligne du haut** : Avatar 80px a gauche, 3 colonnes de stats a droite (Seances | Abonnes | Abonnements) — exactement comme Instagram
- **En dessous** : Nom + crown, @username, ligne meta condensee (`🇫🇷 France · 24 ans · 🏃 Course`) — remplace les chips
- **Bio** sous la ligne meta
- **Boutons** Modifier / Partager en dessous, `h-9 rounded-lg` plus fins

### 3. Supprimer la grille "Personal Info"
- Les infos (pseudo, nom, age, pays, sport, tel) sont redondantes : deja dans le header et la ligne meta
- Suppression complete de ce bloc

### 4. Raccourcis : grille 2x2 d'icones au lieu de pilules scrollables
- 4 raccourcis : Records, Fiabilite, Parcours, Seances
- Chaque case : icone centree + label en dessous, fond `bg-secondary/40`, `rounded-xl`
- Tap = navigation ou dialog
- Plus compact et plus pro que des pilules horizontales

### 5. Supprimer les chips sport/pays
- Remplacees par la ligne meta sous le @username
- Plus propre, moins encombre

## Fichier modifie
- `src/components/ProfileDialog.tsx` uniquement

