

## Corrections du Mode Entrainement

### Problemes identifies

1. **Carte affiche "For development purposes only"** : le code utilise `import.meta.env.VITE_GOOGLE_MAPS_API_KEY` (variable vide) au lieu du proxy `google-maps-proxy` utilise par toute l'app pour recuperer la cle API Google Maps.
2. **Puce bleue absente** : la carte ne charge pas correctement donc le marker GPS ne s'affiche pas. De plus, `AdvancedMarkerElement` necessite un `mapId` dans les options de la carte.
3. **Pas de bouton retour** dans la barre blanche du haut.
4. **Couleur de l'itineraire** : l'utilisateur veut une couleur differente du bleu principal.

### Corrections dans `src/pages/TrainingMode.tsx`

#### 1. Charger la cle API via le proxy (comme le reste de l'app)

Remplacer l'utilisation de `import.meta.env.VITE_GOOGLE_MAPS_API_KEY` par un appel a `supabase.functions.invoke('google-maps-proxy', { body: { type: 'get-key' } })` pour recuperer la cle dynamiquement avant d'initialiser la carte. C'est exactement ce que font `InteractiveMap.tsx` et `RouteCreation.tsx`.

#### 2. Ajouter le `mapId` pour activer AdvancedMarkerElement

Ajouter `mapId: MAP_ID` dans les options de `new google.maps.Map(...)` pour que le marker bleu iOS fonctionne.

#### 3. Ajouter un bouton retour (fleche) dans la barre du haut

Ajouter une fleche de retour a gauche dans la barre blanche, style iOS, qui appelle `navigate(-1)`.

#### 4. Changer la couleur de l'itineraire

Passer du bleu `#5B7CFF` a un orange/corail `#FF6B35` pour que le trace se distingue bien de la puce bleue de position.

#### 5. Fallback pour la puce bleue sans AdvancedMarkerElement

Si `AdvancedMarkerElement` n'est pas disponible (certaines versions), utiliser un `google.maps.Marker` classique avec une icone SVG cercle bleu en fallback.

### Fichier modifie

| Fichier | Modification |
|---------|-------------|
| `src/pages/TrainingMode.tsx` | Charger la cle API via proxy, ajouter mapId, bouton retour, nouvelle couleur itineraire |

