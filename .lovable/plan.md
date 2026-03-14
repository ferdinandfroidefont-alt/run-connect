
Diagnostic rapide
- Le symptôme actuel (`google-maps-proxy get-key failed: Failed to send a request to the Edge Function`) indique un échec réseau côté navigateur avant d’obtenir une vraie réponse JSON.
- Le `Origin` vu dans les logs réseau est `https://91401b07-...lovableproject.com`.
- La politique CORS actuelle (`supabase/functions/_shared/cors.ts`) n’autorise pas ce domaine (`*.lovableproject.com`) ; elle ne whitelist que `run-connect.lovable.app`, un preview `id-preview--...lovable.app`, et localhost.
- Conséquence probable : préflight CORS rejeté, donc `supabase.functions.invoke(...)` remonte “Failed to send a request…”, et la carte affiche l’erreur.

Plan de correction
1) Corriger la whitelist CORS partagée (source unique)
- Modifier `supabase/functions/_shared/cors.ts` pour accepter :
  - les domaines exacts existants,
  - et les patterns dynamiques de preview (`https://*.lovableproject.com` + `https://id-preview--*.lovable.app`).
- Garder une logique stricte (pas de `*`) mais compatible avec les previews générés dynamiquement.

2) Renforcer les en-têtes CORS pour éviter les préflights fragiles
- Dans `getCorsHeaders`, inclure aussi :
  - `Access-Control-Allow-Methods: GET, POST, OPTIONS`
  - `Vary: Origin`
  - éventuellement `Access-Control-Max-Age`.
- Conserver les headers déjà nécessaires à Supabase (`authorization`, `x-client-info`, `apikey`, `content-type`, `x-supabase-client-*`, etc.).

3) Sécuriser l’observabilité du proxy map
- Dans `google-maps-proxy`, garder la réponse OPTIONS avec les headers CORS partagés.
- Ajouter un log explicite côté fonction quand l’origin n’est pas autorisé (pour diagnostiquer immédiatement les prochains cas).

4) Vérification après correction
- Vérifier l’appel `google-maps-proxy` depuis les 3 domaines (preview lovable.app, preview lovableproject.com, prod run-connect).
- Confirmer en console que l’erreur “Failed to send a request…” disparaît.
- Confirmer que `Loader` Google Maps s’initialise et que la carte se rend sur `/`.

Détails techniques (implémentation ciblée)
- Fichier principal à ajuster : `supabase/functions/_shared/cors.ts`
- Approche recommandée :
  - `isExplicitlyAllowed(origin)` via tableau existant
  - `isPreviewAllowed(origin)` via regex sécurisées :
    - `^https://[a-z0-9-]+\.lovableproject\.com$`
    - `^https://id-preview--[a-z0-9-]+\.lovable\.app$`
  - Si autorisé => renvoyer exactement `origin` dans `Access-Control-Allow-Origin`.
- Impact positif collatéral : toutes les Edge Functions utilisant `getCorsHeaders` fonctionneront aussi dans les previews dynamiques (pas seulement Google Maps).

Critères d’acceptation
- Plus d’erreur toast “Erreur lors du chargement de la carte”.
- Plus de message console `Failed to send a request to the Edge Function` pour `google-maps-proxy`.
- Carte visible et interactive sur les 3 domaines.
