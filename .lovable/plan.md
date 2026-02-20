

# Fusion de la barre du bas iOS avec le contenu de la page

## Probleme

Sur iPhone, la zone du "home indicator" (la barre tout en bas de l'ecran) affiche une couleur differente du reste de la page. Cela est du au fait que la couleur de fond native iOS definie dans `capacitor.config.ts` est `#0F1729` (bleu tres sombre), alors que l'ecran de chargement et les autres pages utilisent `bg-secondary` qui est une couleur differente (gris-bleu plus clair).

Cette couleur native est visible dans la zone de securite du home indicator, creant une rupture visuelle.

## Solution

Aligner la couleur de fond native iOS et la couleur de fond HTML/body avec la couleur secondaire du theme sombre, pour que la zone du home indicator se fonde naturellement avec le contenu au-dessus.

## Modifications

### 1. `capacitor.config.ts`
- Changer `ios.backgroundColor` de `#0F1729` vers la couleur qui correspond a `--secondary` en mode sombre (HSL 215 19% 34% = environ `#465268`)

### 2. `index.html`
- Ajouter une balise `<meta name="theme-color" content="#465268">` pour que Safari et le WebView iOS utilisent la bonne couleur systeme

### 3. `src/index.css`
- Ajouter un `background-color` explicite sur `html` et `body` qui correspond a la couleur secondaire du theme, pour que tout l'espace derriere le contenu (y compris les zones de securite) soit de la bonne couleur
- En mode clair : la couleur secondaire claire
- En mode sombre : la couleur secondaire sombre

Cela garantira que sur l'ecran de chargement, la page de conversations, et toutes les autres pages, la zone du home indicator est toujours dans la continuite visuelle du contenu juste au-dessus.

### Details techniques

Les valeurs CSS actuelles :
- Mode sombre `--secondary: 215 19% 34%` correspond a environ `#465268`
- Mode clair `--secondary: 215 19% 34%` (meme valeur) -- a verifier si le mode clair a une valeur differente

La couleur sera appliquee comme couleur de fond de base du document HTML, ce qui remplit automatiquement toutes les zones non couvertes par le contenu de l'application, y compris la zone du home indicator.

