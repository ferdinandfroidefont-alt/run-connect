

## Probleme

Le tooltip du tutoriel Joyride dépasse de l'écran sur iOS (visible sur la capture : le contenu est coupé en haut et déborde sur les côtés). Joyride positionne le tooltip librement et ne respecte pas les safe areas iOS ni les limites du viewport mobile.

## Solution

Modifier `InteractiveTutorial.tsx` pour :

1. **Limiter la largeur** du tooltip : réduire `max-w-[320px]` à `max-w-[calc(100vw-32px)]` pour garantir 16px de marge de chaque côté
2. **Ajouter des marges de sécurité** via `floaterProps.offset` pour éloigner le tooltip des bords
3. **Forcer `disableScrolling: true`** pour éviter que Joyride ne scrolle la page et crée des décalages
4. **Ajouter un style global** pour contraindre le floater Joyride dans le viewport avec `max-width` et `padding` sur le conteneur `.react-joyride__tooltip`
5. **Ajouter `safe-area-inset-top`** comme padding sur le tooltip pour ne pas passer sous la barre de statut iOS

### Fichier : `src/components/InteractiveTutorial.tsx`

- Tooltip div : `max-w-[320px]` → `max-w-[min(320px,calc(100vw-32px))]`
- Ajouter du padding interne en tenant compte de la safe area : `style={{ marginTop: 'env(safe-area-inset-top, 0px)' }}`
- `floaterProps` : ajouter `offset: 16` pour créer une marge entre le spotlight et le tooltip
- `disableScrolling: true` pour stabiliser sur mobile

### Fichier : `src/index.css`

- Ajouter une règle globale pour contraindre le positionnement Joyride :
```css
.__floater {
  max-width: calc(100vw - 16px) !important;
  padding: 0 8px !important;
}
```

Cela garantit que le tooltip reste toujours visible et ne dépasse jamais des bords de l'écran, y compris avec les safe areas iOS.

