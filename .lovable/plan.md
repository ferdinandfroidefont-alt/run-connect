

## Carte 5 — Profile Share avec fond personnalisé

Ajout d'une 5ème carte de partage de profil utilisant l'image fournie (map + logo + bandeau bleu) en fond, avec tous les éléments en overlay.

### Fichiers à créer/modifier

**1. `src/assets/profile-share-card-v3.png`** (nouveau)
- Copie de l'image uploadée (`user-uploads://image-50.png`) — fond 1024×1024 (map + logo RunConnect en haut + barre bleue en bas pré-dessinée).

**2. `src/lib/profileSharePayload.ts`**
- Étendre `ProfileShareTemplateId` : ajouter `'map_overlay_card'` (Carte 5).
- `templateDimensions` reste 1080×1080 par défaut.

**3. `src/components/profile-share/ProfileShareArtboard.tsx`**
Nouveau bloc rendu pour `templateId === 'map_overlay_card'` :
- Wrapper 1024×1024 centré dans 1080×1080 (même technique que Carte 4 pour préserver la map du fond).
- `<img src={profileShareCardV3} objectFit:'fill'>` en fond, z-0.
- **Overlays centrés** (z-2) sur la zone vide de la map (top ~140 → ~720) :
  - Avatar 120px, double bordure (blanc intérieur + anneau bleu `#2563EB` extérieur), ombre.
  - Nom `Prénom Nom` (#0F172A, 48px bold) + `VerifiedPremiumBadge` à droite si premium.
  - `@username` (#6B7280, 22px).
  - Pill rôle : fond `#DBEAFE`, texte `#1D4ED8`, ligne 1 = `roleLinePrimary`, ligne 2 optionnelle = `roleLineSecondary`.
  - Ligne infos : `📍 locationLine` | séparateur vertical fin | `SportIcon dynamique` + `sportLabel` (déduit via `sportIconFromLabel`).
  - 4 stat cards alignées (Séances créées / rejointes / Abonnés / Abonnements) — fond blanc, rounded-xl, ombre, icône bleue + valeur + label.
  - Pill présence centrée sous les stats : `XX% présence` (gris doux + accent bleu) — uniquement si `presenceRate != null`.
- **Bandeau bas** (zone bleue déjà présente dans le fond, ~y 820 → 1024) : NE PAS redessiner le fond. Ajouter par-dessus, dans cette zone uniquement :
  - Texte centré « Rejoins-moi sur **RunConnect** » à gauche (cohérent avec l'image, qui a déjà le logo + bouton). Comme l'image contient déjà ces éléments, n'ajouter AUCUN overlay sur le bandeau (pas de QR, pas de lien) — laisser le fond tel quel comme demandé.

**4. `src/components/profile-share/ProfileSharePreviewCarousel.tsx`**
- Ajouter à `META` : `{ id: 'map_overlay_card', label: 'Carte 5' }`.

### Détail technique des positions (overlays sur 1024×1024 wrapper)

```text
Avatar         : top 150, centré
Nom + badge    : top 295
@username      : top 360
Pill rôle      : top 410
Ligne infos    : top 490
Stats (4 cols) : top 545, left/right 54, gap 12
Pill présence  : top 720
[Bandeau bleu du fond intact 820 → 1024]
```

### Comportement
- Carte dynamique : sport icon adapté via `sportIconFromLabel(payload.sportLabel)`.
- Pas de hardcoding : tous les champs viennent de `payload`.
- Cohérent avec Card 4 (mêmes composants `LightCardAvatarRing`, `VerifiedPremiumBadge`, `sportIconFromLabel` réutilisés).
- Export 1080×1080 PNG via le pipeline existant (`generateProfileShareImage`).

