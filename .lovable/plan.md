
# Fix: Scroll sur la page Connexion

## Probleme identifie

Le CSS global verrouille le scroll a tous les niveaux :
- `html, body` : `position: fixed` + `overflow: hidden`
- `#root` : `overflow: hidden`
- Le conteneur Auth : `overflow: hidden` (inline style)

Le conteneur scrollable utilise `flex: 1` mais cela ne lui donne pas une hauteur fixe calculee -- donc le navigateur ne detecte jamais de debordement et le scroll ne se declenche pas.

## Solution

Donner au conteneur scrollable une **hauteur explicite** au lieu de se reposer sur flexbox. L'approche `flex: 1` ne fonctionne pas dans une chaine de parents tous verrouilles en `overflow: hidden`.

## Modifications techniques

### Fichier : `src/pages/Auth.tsx`

1. **Conteneur racine** : retirer le `style={{ overflow: 'hidden' }}` ajoute lors du dernier edit (il est deja fixe par la classe `fixed inset-0`).

2. **Conteneur scrollable** : remplacer le style flex actuel par une hauteur explicite calculee :

```tsx
// AVANT (ne fonctionne pas)
<div id="auth-scroll-container" className="scroll-momentum" style={{ flex: '1 1 0%', minHeight: 0 }}>

// APRES (hauteur explicite = viewport - header)
<div 
  id="auth-scroll-container" 
  style={{ 
    height: 'calc(100dvh - 56px)',
    overflowY: 'auto',
    overflowX: 'hidden',
    WebkitOverflowScrolling: 'touch',
    touchAction: 'pan-y'
  }}
>
```

3. **Conteneur racine** : changer le layout de `flex flex-col` vers un simple empilement sans flex, pour eviter que le moteur flex ne recalcule la hauteur du scroll container :

```tsx
// AVANT
<div className="fixed inset-0 bg-secondary flex flex-col bg-pattern" style={{ overflow: 'hidden' }}>

// APRES  
<div className="fixed inset-0 bg-secondary bg-pattern">
```

Le header gardera sa hauteur fixe de 56px grace a `flexShrink: 0` et sa position naturelle en haut du flux.

Cela garantit que le conteneur de scroll a une taille concrete en pixels, independamment des contraintes `overflow: hidden` des parents.
