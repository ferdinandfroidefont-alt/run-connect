

## Correction definitive des boutons non-cliquables

### Probleme racine

Le div de la carte (`ref={mapRef}`) a la classe `absolute inset-0` ce qui le place sur toute la surface de l'ecran. Google Maps genere des dizaines de divs imbriques avec des `z-index` tres eleves. Les selecteurs CSS `.gm-style > div:first-child > div:last-child` ne ciblent pas tous ces elements.

### Solution

Approche radicalement differente : au lieu d'essayer de desactiver les pointer-events sur les overlays Google Maps (ce qui est fragile), on va **isoler la carte dans un contexte d'empilement inferieur** et s'assurer que les boutons sont au-dessus.

Changements dans `src/pages/TrainingMode.tsx` :

1. **Wrapper la carte dans un div avec `z-index: 0` et `isolation: isolate`** pour creer un nouveau contexte d'empilement. Cela force TOUS les elements internes de Google Maps (peu importe leur z-index) a rester confines dans ce contexte, et donc en dessous de nos boutons qui ont `z-[9999]`.

```
<div className="absolute inset-0" style={{ zIndex: 0, isolation: 'isolate' }}>
  <div ref={mapRef} className="w-full h-full bg-secondary" />
</div>
```

2. **Supprimer les hacks CSS `.gm-style`** car ils ne sont plus necessaires avec `isolation: isolate`.

3. **Garder les `pointer-events-auto` et `z-[9999]`** sur la barre du haut et le bouton du bas comme securite supplementaire.

Cette approche est la bonne pratique CSS pour empecher un composant tiers (Google Maps) de "sortir" de sa zone de z-index.

### Fichier modifie

| Fichier | Modification |
|---------|-------------|
| `src/pages/TrainingMode.tsx` | Wrapper carte avec `isolation: isolate` + `z-index: 0`, supprimer hacks CSS `.gm-style` |

