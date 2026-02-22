
## Afficher la position actuelle sur la page Suivi d'itinéraire

### Problème
La page Suivi d'itinéraire a déjà le code du point bleu (marqueur GPS), mais il ne s'affiche qu'une fois que le tracking GPS démarre et renvoie une position. Contrairement à la carte principale qui récupère la position dès le chargement, cette page attend le `watchPosition` qui peut mettre du temps.

### Solution
Ajouter une récupération immédiate de la position dès que la carte est prête, avant même que le tracking ne démarre. Cela affichera le point bleu instantanément comme sur la carte principale.

### Changements prévus

**Fichier : `src/pages/TrainingMode.tsx`**

1. Ajouter un `useEffect` qui récupère la position actuelle via `navigator.geolocation.getCurrentPosition()` dès que la carte est initialisée (`mapReady === true`), et place le marqueur bleu immédiatement -- sans attendre le cycle de tracking.

2. Ce `useEffect` sera indépendant du tracking : il sert uniquement à afficher le point bleu au plus vite. Le tracking (watch) prendra ensuite le relais pour les mises à jour continues.

### Détail technique

Nouveau `useEffect` à ajouter après l'init de la carte (après ligne 106) :

```tsx
// Fetch initial position immediately when map is ready
useEffect(() => {
  if (!mapReady || !googleMapRef.current) return;

  const getInitialPosition = async () => {
    try {
      // Try Capacitor first
      if (Capacitor.isNativePlatform()) {
        const pos = await Geolocation.getCurrentPosition({
          enableHighAccuracy: true,
          timeout: 10000
        });
        if (pos) {
          const coord = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          // Create marker immediately
          // (the existing userPosition effect will handle it
          //  once we set a temporary position)
        }
      }
    } catch {}

    // Web fallback
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const initialPos = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        // Place marker on map directly
        const map = googleMapRef.current;
        if (map && !markerRef.current) {
          try {
            const dotEl = document.createElement('div');
            dotEl.innerHTML = `...`; // Same blue dot HTML
            const marker = new google.maps.marker.AdvancedMarkerElement({
              map, position: initialPos, content: dotEl
            });
            markerRef.current = marker;
          } catch {
            // Fallback classic marker
          }
          map.panTo(initialPos);
        }
      },
      () => {},
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  getInitialPosition();
}, [mapReady]);
```

Il faut aussi importer `Capacitor` et `Geolocation` depuis les packages Capacitor.

### Fichiers modifiés

| Fichier | Modification |
|---------|-------------|
| `src/pages/TrainingMode.tsx` | Ajout d'un useEffect pour récupérer la position GPS initiale dès que la carte est prête, et afficher le point bleu immédiatement. Import de Capacitor et Geolocation. |
