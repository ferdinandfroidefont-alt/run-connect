

# Plan: Le pin CRÉE le chemin — animation façon app mondiale

## Probleme actuel

Le pin suit le path comme un passager. L'animation montre le path qui se dessine indépendamment, et le pin est juste posé dessus avec `animateMotion`. Le pin ne donne pas l'impression de **créer** la trace.

## Nouvelle approche

Utiliser un **requestAnimationFrame loop** qui :
1. Calcule la position du pin sur le path à chaque frame via `SVGPathElement.getPointAtLength()`
2. Met à jour le `strokeDashoffset` du path pour que la trace s'arrête exactement là où le pin se trouve
3. Le pin est positionné via `transform: translate()` au point calculé — pas via `animateMotion`

Cela crée l'illusion que le pin **pose** la trace derrière lui, comme un stylo sur du papier.

## Détails techniques

### Fichier : `src/components/LoadingScreen.tsx`

**Remplacer** l'approche actuelle (framer-motion `strokeDashoffset` + `animateMotion`) par :

1. **Ref sur le path SVG** : `pathRef = useRef<SVGPathElement>(null)` pour accéder à `getTotalLength()` et `getPointAtLength(t)`

2. **Animation loop** (phase `trace`) :
   ```
   rAF → elapsed / TRACE_DURATION → progress 0→1
   point = pathRef.getPointAtLength(progress * totalLength)
   setPinPosition({ x: point.x, y: point.y })
   setTraceOffset(totalLength * (1 - progress))
   ```

3. **Pin SVG** : positionné via `transform={translate(pinPos.x - 12, pinPos.y - 32)}` — le pin est toujours au bout de la trace

4. **Halo GPS** : cercle centré sur `pinPos` avec pulse CSS animation

5. **3 layers de trace** : même visuel (glow + gradient + highlight) mais `strokeDashoffset` contrôlé par state, pas framer-motion

6. **Timeline** :
   - 0-0.4s : pin-drop (spring bounce au point de départ M55,195)
   - 0.4s-2.4s : rAF loop, pin crée la trace
   - 2.4s+ : complete → loading

7. **Easing** : `linear` pour vitesse constante du pin, ou léger `easeInOut` pour un feel plus naturel

### Ce qui change vs actuel

| Avant | Après |
|-------|-------|
| `animateMotion` (pin suit le path) | `getPointAtLength` (pin positionné manuellement) |
| `motion.path strokeDashoffset` (framer) | `strokeDashoffset` via state (synchro exacte) |
| Pin et trace animés séparément | Une seule boucle rAF contrôle les deux |
| Halos via `<animate>` SMIL | Halos via CSS/framer au point du pin |

