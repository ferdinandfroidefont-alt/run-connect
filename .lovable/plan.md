

# Refonte Design Structurel Complet - Style Zwift Companion

## Ce qui change

Ce plan concerne la **structure visuelle** des pages : disposition des elements, forme des cartes, hierarchie visuelle, espacement, et patterns de navigation. Les couleurs orange sont deja en place - ici on s'attaque au **squelette** de l'app.

## Principes de design Zwift Companion identifies

1. **Headers minimalistes** : titre en gras a gauche (pas centre), pas de bordure inferieure visible, fond blanc uni
2. **Sections a fond sombre** : certaines sections utilisent un fond gris fonce/ardoise (#2C2C2E) pour creer du contraste (ex: stats, tendances)
3. **Cards bord-a-bord** : les cartes touchent les bords de l'ecran (pas de marge horizontale), separees par de fines lignes
4. **Stats en grille compacte** : chiffres enormes (32-40px) avec labels uppercase minuscules en dessous, disposes en grille 2x2 ou 3 colonnes
5. **Boutons d'action contextuels** : petit bouton "Ride On" (like) en cyan, pas en rouge
6. **Avatars avec bordure de couleur** : cercle orange autour des avatars pour indiquer le niveau/statut
7. **Barres de progression** : fines, colorees, bien visibles
8. **Segmented controls** : onglets style iOS avec fond gris et selection blanche/orange
9. **Listes sans decoration** : texte simple, chevron a droite, pas d'icones colorees dans des cercles
10. **Espacement vertical genereux** : beaucoup d'air entre les sections

---

## Changements par fichier

### 1. Headers de toutes les pages

**Avant** : titre centre, fond `bg-card`, `border-b`
**Apres** : titre aligne a gauche en `text-[28px] font-black`, fond `bg-background`, pas de bordure

Pages concernees : `Feed.tsx`, `Messages.tsx`, `MySessions.tsx`, `Profile.tsx`, `Leaderboard.tsx`

### 2. FeedCard.tsx - Redesign des cartes d'activite

**Avant** : cartes avec marges (`mx-3`), arrondis (`rounded-2xl`), ombres
**Apres** :
- Cards pleine largeur, fond blanc, separees par 8px de fond gris
- Header : avatar + nom + temps (a gauche), badge d'activite (a droite) en pill orange
- Contenu : titre en gras, description en gris
- Stats inline : icones + chiffres en ligne (lieu, participants, heure) en texte petit
- Mini-map arrondi avec coins 12px
- Boutons d'action : "Ride On" (like) en bleu cyan, commentaire, partage en gris

### 3. FeedActions.tsx - Bouton "Ride On" style Zwift

**Avant** : coeur rouge, bouton "Rejoindre" orange
**Apres** :
- Bouton like : icone pouce/main (ThumbsUp) en bleu cyan (#00B4D8) au lieu du coeur rouge
- Label "Ride On" au lieu du compteur seul
- Bouton "Rejoindre" plus compact, style pill outline orange
- Supprimer l'animation de coeurs flottants, remplacer par un simple scale

### 4. FeedHeader.tsx - Header du feed

**Avant** : avatar + titre centre + search + segmented control
**Apres** :
- Titre "FEED" en haut a gauche, gros et gras
- Segmented control : fond gris arrondi (rounded-xl), options en blanc quand selectionne
- Barre de recherche : champ gris arrondi pleine largeur
- Suppression de l'avatar du header (le profil est accessible via la nav)

### 5. Messages.tsx - Liste de conversations

**Avant** : header centre, grille de 5 boutons ronds (Profils/Contacts/etc), barre de recherche
**Apres** :
- Header : "MESSAGES" a gauche en gras, bouton "+" a droite
- Suppression de la grille de 5 boutons ronds (trop charge)
- Barre de recherche pleine largeur avec fond gris, icone loupe integree
- Liste de conversations : avatar 48px, nom en gras, dernier message en gris, heure a droite, badge non-lu en cercle orange
- Conversation detail : garder le style actuel mais header plus epure

### 6. Profile.tsx - Page profil style Zwift

**Avant** : avatar centre, stats en ligne (3 colonnes), badges inline
**Apres** :
- **Section hero** avec fond gris fonce (#2C2C2E) : avatar large (96px) avec anneau orange, nom en blanc, username en gris clair
- **Stats row** : 4 colonnes en grille (Sessions, Distance, Abonnes, Abonnements) avec chiffres `text-stat` et labels `text-label`
- **Barre de niveau** : barre de progression orange avec label "Niveau X" et pourcentage
- **Section "Tendances"** : fond sombre avec mini-graphiques
- **Boutons d'action** : "Modifier" en outline pill, "Partager" en ghost
- Separation nette entre les sections avec du fond gris entre les blocs blancs

### 7. MySessions.tsx - Mes seances

**Avant** : structure iOS list classique
**Apres** :
- Header : "MES SEANCES" a gauche, boutons filtre/vue a droite
- Segmented control pour "A venir / Passees / Routes"
- Cards de session : style compact, info a gauche (titre + lieu + heure), badge d'activite a droite
- Fond sombre optionnel pour les stats d'organisateur

### 8. BottomNavigation.tsx - Navigation

**Avant** : fond card, bordure haut, labels 9px uppercase
**Apres** :
- Fond blanc pur
- Trait superieur plus visible (1.5px au lieu de 1px)
- Labels 10px, pas uppercase, font-medium (moins crie)
- Icone active : remplie (filled) au lieu de stroke plus epais
- Bouton "+" : ombre plus marquee, legere elevation visuelle

### 9. Composants UI transversaux

**card.tsx** : supprimer les ombres par defaut (les cards Zwift sont plates, separees par le fond)
**button.tsx** : ajouter une variante `cyan` pour les boutons style "Ride On"
**badge.tsx** : s'assurer que les badges sont bien en pill shape

### 10. index.css - Ajustements globaux

- Ajouter une classe `.section-dark` pour les sections a fond sombre
- Ajouter `.stat-grid` pour les grilles de stats style Zwift
- Ajouter `.avatar-ring-primary` pour les avatars avec anneau orange
- Modifier `.ios-section-header` pour etre aligne a gauche, pas uppercase

---

## Details techniques

### Nouvelles classes CSS

```text
.section-dark {
  background: #2C2C2E;
  color: white;
  padding: 20px 16px;
}

.dark .section-dark {
  background: #1C1C1E;
}

.stat-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(80px, 1fr));
  gap: 16px;
  padding: 16px;
}

.avatar-ring-primary {
  ring: 3px solid hsl(var(--primary));
  ring-offset: 2px;
}

.segmented-control {
  background: hsl(var(--muted));
  border-radius: 12px;
  padding: 3px;
  display: flex;
}

.segmented-control button {
  flex: 1;
  border-radius: 10px;
  padding: 8px 16px;
  font-weight: 600;
  font-size: 14px;
  transition: all 0.2s;
}

.segmented-control button.active {
  background: white;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}
```

### Variante bouton cyan

```text
cyan: "bg-[#00B4D8] text-white font-bold rounded-full active:brightness-90"
```

### Header pattern commun

```text
<div className="px-4 pt-4 pb-3 bg-background">
  <h1 className="text-[28px] font-black tracking-tight">TITRE</h1>
</div>
```

---

## Fichiers modifies

1. `src/index.css` - Classes utilitaires (section-dark, stat-grid, avatar-ring, segmented-control)
2. `src/components/feed/FeedCard.tsx` - Layout des cartes pleine largeur
3. `src/components/feed/FeedActions.tsx` - Bouton "Ride On" cyan, suppression coeurs
4. `src/components/feed/FeedHeader.tsx` - Header a gauche, segmented control
5. `src/components/BottomNavigation.tsx` - Labels non-uppercase, fond blanc pur
6. `src/pages/Messages.tsx` - Header gauche, suppression grille de boutons
7. `src/pages/Profile.tsx` - Section hero sombre, stats en grille, barre de niveau
8. `src/pages/Feed.tsx` - Ajustements de layout
9. `src/pages/MySessions.tsx` - Header et segmented control
10. `src/components/ui/button.tsx` - Variante `cyan`
11. `src/components/ui/card.tsx` - Suppression ombre par defaut

## Ordre d'implementation

1. CSS global (classes utilitaires)
2. Composants UI (button, card)
3. Navigation
4. Feed (header, card, actions)
5. Messages (header, liste)
6. Profile (hero, stats)
7. MySessions (header, filtres)

