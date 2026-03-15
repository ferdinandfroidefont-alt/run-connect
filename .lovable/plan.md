

## Diagnostic

La carte fonctionne sur le web mais pas dans les apps natives (Android WebView / Capacitor iOS). Deux causes identifiées :

### Cause 1 : Restriction du referrer sur la clé Google Maps
La clé `GOOGLE_MAPS_BROWSER_API_KEY` est restreinte par "HTTP referrers" dans la Google Cloud Console (domaines web). Or, dans un **Android WebView**, le header `Referer` n'est pas envoyé de la même façon — Google rejette la requête avec `ApiTargetBlockedMapError`.

### Cause 2 : CORS pour les apps natives
Les requêtes depuis un Android WebView chargeant `https://run-connect.lovable.app` envoient bien cet Origin (déjà autorisé). Mais les apps Capacitor envoient `capacitor://localhost` (déjà ajouté) ou parfois un Origin vide/null, ce qui peut provoquer un rejet silencieux.

---

## Plan de correction

### 1. Modifier `google-maps-proxy` pour renvoyer la clé non restreinte aux apps natives

Ajouter un paramètre optionnel `platform` dans le body de la requête `get-key`. Si `platform === 'android'` ou `platform === 'ios'`, renvoyer la clé serveur (non restreinte par referrer) au lieu de la clé browser.

```
// Dans google-maps-proxy/index.ts
if (type === 'get-key') {
  const isNative = body.platform === 'android' || body.platform === 'ios';
  const keyToReturn = isNative 
    ? (serverApiKey || browserApiKey)   // clé sans restriction referrer
    : (browserApiKey || serverApiKey);  // clé avec restriction referrer
  ...
}
```

### 2. Modifier les appels `get-key` côté frontend pour passer la plateforme

Créer un petit helper réutilisable :

```typescript
// src/lib/googleMapsKey.ts
import { isReallyNative, getPlatform } from './nativeDetection';

export function getKeyBody() {
  const body: any = { type: 'get-key' };
  if (isReallyNative()) {
    body.platform = getPlatform(); // 'android' ou 'ios'
  }
  return body;
}
```

Mettre à jour les ~7 fichiers qui appellent `google-maps-proxy` avec `type: 'get-key'` :
- `src/components/InteractiveMap.tsx`
- `src/pages/TrainingMode.tsx`
- `src/pages/SessionTracking.tsx`
- `src/components/feed/MiniMapPreview.tsx`
- `src/components/routes-feed/RoutesFeedCard.tsx`
- `src/components/routes-feed/RouteDetailDialog.tsx`
- `src/components/ElevationProfile3D.tsx`

### 3. Gérer les Origins vides/null dans le CORS

Dans `_shared/cors.ts`, si l'Origin est vide et que le `User-Agent` contient des marqueurs natifs (ex: `wv`, `WebView`), autoriser la requête. Cela couvre les cas WebView Android où l'Origin peut être absent.

```typescript
function isOriginAllowed(origin: string): boolean {
  if (!origin || origin === 'null') return false; // handled separately
  if (EXACT_ORIGINS.includes(origin)) return true;
  return PREVIEW_PATTERNS.some((re) => re.test(origin));
}

// In getCorsHeaders:
if (!origin || origin === 'null') {
  // Native WebView — no CORS enforcement needed, allow through
  return { 'Access-Control-Allow-Origin': '*', ... };
}
```

### 4. Redéployer la fonction `google-maps-proxy`

Après les modifications, redéployer la Edge Function pour appliquer les changements.

---

## Fichiers modifiés

| Fichier | Changement |
|---|---|
| `supabase/functions/google-maps-proxy/index.ts` | Lire `platform` du body, renvoyer la clé serveur si natif |
| `supabase/functions/_shared/cors.ts` | Gérer Origin vide/null pour les WebViews |
| `src/lib/googleMapsKey.ts` | Nouveau helper pour construire le body `get-key` |
| 7 fichiers composants | Utiliser le helper au lieu de `{ type: 'get-key' }` |

