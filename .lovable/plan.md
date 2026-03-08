

# Photo Gallery for Routes Feed

## Concept
Add a third sub-tab "Photos" under the "Itinéraires" section in MySessions. It displays a masonry/grid gallery of all public route photos. Clicking a photo opens a sheet showing the photo full-size + a list of all routes that pass near that photo's location (using lat/lng from `route_photos`).

## Architecture

### 1. New hook: `src/hooks/useRoutePhotosGallery.tsx`
- Fetches all `route_photos` joined with `routes` (where `routes.is_public = true`)
- Enriches with `profiles` for the photographer
- If user has geolocation, sorts by proximity to user
- Exposes: `photos`, `loading`, `refresh`
- On photo click: queries `routes` to find all routes whose coordinates pass within ~500m of the photo's `lat/lng` (reuse `calculateDistance` from `useRoutesFeed`)

### 2. New component: `src/components/routes-feed/RoutePhotosGallery.tsx`
- Renders a 2-column grid of photos (aspect-ratio preserved via `aspect-ratio` CSS)
- Each photo card shows: thumbnail, route name overlay, photographer avatar
- On click: opens `RoutePhotoDetailSheet`

### 3. New component: `src/components/routes-feed/RoutePhotoDetailSheet.tsx`
- Sheet (bottom drawer) showing:
  - Full-size photo + caption
  - Photographer info (avatar + name)
  - "Routes passing here" section: list of `RoutesFeedCard`-style mini cards
  - Click a route → opens `RouteDetailDialog`

### 4. Edit `src/pages/MySessions.tsx`
- Add `'photos'` to the `routeSource` state type (currently `'created' | 'feed'`)
- Add third sub-tab button "Photos" (with Camera icon) under Itinéraires
- Render `RoutePhotosGallery` when `routeSource === 'photos'`

### Data flow
```text
route_photos (lat, lng, photo_url, caption)
  → gallery grid
    → click photo
      → sheet with photo + nearby routes list
        → click route → RouteDetailDialog
```

### Files to create
1. `src/hooks/useRoutePhotosGallery.tsx`
2. `src/components/routes-feed/RoutePhotosGallery.tsx`
3. `src/components/routes-feed/RoutePhotoDetailSheet.tsx`

### Files to edit
1. `src/pages/MySessions.tsx` — add "Photos" sub-tab + render gallery

