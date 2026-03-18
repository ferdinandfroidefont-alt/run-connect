

## Plan: Améliorer la qualité visuelle du logo R (sans toucher l'animation)

### Probleme actuel
Les 5 couches du logo (LAYER_1 a LAYER_5) utilisent exclusivement des commandes `L` (lignes droites) et `M` (move-to), ce qui produit un rendu polygonal/facetté avec des angles visibles. Pas de courbes Bezier, donc un aspect "low-poly".

### Ce qui ne change PAS
- Aucun timing (APPEAR_DELAY, TRACE_DURATION, REVEAL_DELAY, EXIT_DELAY, TOTAL_DURATION)
- Aucune phase d'animation (appear, trace, reveal, exit)
- Aucune logique (animateTrace, dashOffset, maskStrokeWidth, etc.)
- Le TRACE_PATH reste identique
- La structure JSX reste identique

### Modifications prevues dans `src/components/LoadingScreen.tsx`

**1. Remplacement des 5 layers SVG** (lignes 9-13)
- Convertir chaque path de commandes `M...L...Z` en `M...C...Q...Z` avec des courbes Bezier cubiques et quadratiques
- Lisser toutes les jonctions anguleuses pour un rendu fluide
- Conserver la silhouette exacte du R mais avec des courbes parfaitement lisses
- Chaque sous-path (séparé par `M`) sera converti individuellement

**2. Amelioration des degrades** (lignes ~163-168 et ~204-208)
- Remplacer les fills plats par des `linearGradient` par couche pour un effet 3D subtil
- Ajouter des stops intermediaires pour des transitions ultra-fluides entre les tons bleus
- Palette conservee (#dce8f8, #b9d1f1, #67abf8, #2072f7, #1244d4) mais avec micro-variations

**3. Amelioration des filtres SVG** (lignes ~170-196)
- `logoShadow`: ombre plus douce (stdDeviation plus eleve, opacite reduite)
- Ajouter un filtre `feSpecularLighting` subtil pour un effet glossy
- Anti-aliasing renforce via `shape-rendering="geometricPrecision"` sur le SVG root

**4. Bords nets**
- Ajouter `shape-rendering="geometricPrecision"` au `<svg>` principal
- Verifier `stroke-linejoin="round"` sur les paths du logo

### Fichier modifie
- `src/components/LoadingScreen.tsx` uniquement

