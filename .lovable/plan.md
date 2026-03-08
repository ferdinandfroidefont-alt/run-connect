

# Refonte LoadingScreen — Animation logo GPS premium

## Concept

Animation séquentielle en 3 phases sur ~2s :
1. **Phase 1 (0-400ms)** : Pin GPS bleu apparaît au centre avec scale+bounce
2. **Phase 2 (400-1200ms)** : Ligne lumineuse bleue trace un parcours en forme de "R" via SVG path animation (`stroke-dashoffset`)
3. **Phase 3 (1200-1800ms)** : Le tracé se transforme en logo complet avec glow + light sweep

Puis la barre de progression apparaît en fade-in avec les phrases dynamiques.

## Approche technique

Tout dans `src/components/LoadingScreen.tsx` avec du CSS pur + framer-motion (déjà installé).

- **SVG path animation** : Un `<path>` qui dessine la forme du R-logo RunConnect. Utilise `stroke-dasharray` + `stroke-dashoffset` animés pour l'effet "tracé en cours"
- **Pin GPS** : SVG pin bleu avec `motion.div` scale spring
- **Glow effect** : `filter: drop-shadow()` animé sur le SVG final
- **Light sweep** : pseudo-element gradient linéaire qui translate de gauche à droite sur le logo
- **Progress bar** : apparaît après l'animation logo, style identique mais plus raffiné

## Phases d'animation (timeline)

```text
0ms        400ms       1200ms      1800ms      ~3500ms
|--pin-----|---trace----|---glow----|---loading bar---|
  scale-in   dashoffset    fill+glow   progress+phrases
             animation     + sweep
```

## Phrases de chargement
- "Connexion aux coureurs…"
- "Chargement de la carte…"
- "Synchronisation des séances…"

## Fichier impacté
| Fichier | Changement |
|---------|-----------|
| `src/components/LoadingScreen.tsx` | Refonte complète avec animation SVG path |

## Design
- Fond blanc pur
- Bleu RunConnect `#007AFF` / `#3B82F6` comme couleur principale
- Glow bleu clair autour du logo
- Barre de progression fine et moderne
- Typographie "RUNCONNECT" apparaît en fade après le logo

