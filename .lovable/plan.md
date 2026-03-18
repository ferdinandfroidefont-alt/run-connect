

## Plan: Polissage vectoriel premium du logo R

### Analyse du probleme
Les paths actuels utilisent des courbes `C` mais avec des segments tres courts et des points de controle quasi-colineaires, ce qui cree un effet de facettes. Les degrades n'ont que 2-3 stops et l'ombre est trop epaisse (stdDeviation=10).

### Ce qui ne change PAS
- Animation, timing, phases, TRACE_PATH
- Structure JSX, logique React
- Silhouette globale du R

### Modifications dans `src/components/LoadingScreen.tsx`

**1. Paths SVG (lignes 9-13)**
- Retracer les 5 layers avec des courbes Bezier longues et fluides
- Remplacer les suites de micro-segments `C` par des arcs continus avec points de controle espaces
- Utiliser `S` (smooth cubic) pour garantir la continuite des tangentes aux jonctions
- Conserver exactement la meme silhouette

**2. Degrades (lignes 165-189)**
- Passer de 3 stops a 5-6 stops par gradient pour des transitions ultra-fluides
- Ajouter des stops intermediaires avec des couleurs interpolees
- Utiliser `radialGradient` sur la couche principale pour un effet de volume

**3. Ombre (lignes 208-217)**
- Reduire `stdDeviation` de 10 a 6
- Reduire `floodOpacity` de 0.15 a 0.10
- Reduire `dy` offset de 5 a 3
- Resultat: ombre plus fine et subtile

**4. Glossy (lignes 220-226)**
- Reduire `specularConstant` de 0.4 a 0.25
- Augmenter `specularExponent` de 25 a 35 pour un reflet plus concentre
- Reduire k3 de 0.12 a 0.08 pour un effet plus subtil

**5. Dot glow (lignes 199-205)**
- Reduire `stdDeviation` de 5 a 3

### Fichier modifie
- `src/components/LoadingScreen.tsx` uniquement

