

# Plan de Hardening Sécurité RunConnect

## Vulnérabilités identifiées

### CRITIQUE

1. **Admin check client-side via `profiles.is_admin`** — `SecurityDashboard.tsx` (ligne 58) et `useAuth.tsx` (lignes 95-100) vérifient le statut admin depuis la table `profiles` côté client ou hardcodent un email. Un attaquant peut modifier `is_admin` dans `profiles` si la colonne n'est pas protégée par RLS, ou manipuler le state React.

2. **Edge functions sans auth** — `award-organizer-points`, `season-reset`, `update-streaks`, `cleanup-live-tracking`, `mark-absent-cron`, `coaching-reminder`, `weekly-challenge-reminder`, `notify-challenge-progress` utilisent `SERVICE_ROLE_KEY` sans vérifier aucun JWT ni secret d'invocation. N'importe qui avec l'URL peut les appeler.

3. **`save-push-token` accepte les requêtes sans JWT** — si pas d'`Authorization` header, la fonction log un warning mais exécute quand même la mise à jour avec `SERVICE_ROLE_KEY` (ligne 78-80 → tombe au travers vers ligne 82+). Un attaquant peut écraser le push token de n'importe quel utilisateur.

4. **CORS `*` sur toutes les edge functions** — 27 fonctions exposent `Access-Control-Allow-Origin: *`, permettant des appels cross-origin depuis n'importe quel site.

5. **Hardcoded admin email** — `useAuth.tsx` ligne 95 et `admin-manage-premium` ligne 41 hardcodent `ferdinand.froidefont@gmail.com` pour le bypass premium et l'accès admin.

6. **Logs sensibles** — `firebase-auth` log des previews de tokens (ligne 28), des IDs utilisateurs, des longueurs de tokens d'accès (lignes 213-214). `useAuth.tsx` log les emails et la présence de tokens dans la console navigateur.

### MOYEN

7. **`SecurityDashboard` exposé sur `/security`** — route accessible sans protection serveur, seul un check client `is_admin` la garde.

8. **`PushDiagnosticPanel` en production** — panneau de diagnostic technique visible par tous les utilisateurs dans les paramètres de notifications.

9. **`CapacitorDebug.vue`** — fichier de debug présent dans le repo.

---

## Plan de correction fichier par fichier

### Phase 1 — Edge Functions : Auth obligatoire

**8 fonctions "cron/internes"** à protéger avec un secret partagé :

`award-organizer-points`, `season-reset`, `update-streaks`, `cleanup-live-tracking`, `mark-absent-cron`, `coaching-reminder`, `weekly-challenge-reminder`, `notify-challenge-progress`

Pour chacune, ajouter en début de handler :
```typescript
const cronSecret = req.headers.get('x-cron-secret');
if (cronSecret !== Deno.env.get('CRON_SECRET')) {
  return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: corsHeaders });
}
```
Ajouter un secret `CRON_SECRET` dans Supabase. Mettre à jour les appels côté client qui invoquent ces fonctions pour passer le header (ou les restreindre aux crons Supabase uniquement).

**`save-push-token`** — rendre le JWT obligatoire : si pas de JWT valide, retourner 401 au lieu de continuer.

### Phase 2 — CORS restrictif

Remplacer `'Access-Control-Allow-Origin': '*'` par une liste blanche dans **toutes** les edge functions :

```typescript
const ALLOWED_ORIGINS = [
  'https://run-connect.lovable.app',
  'https://id-preview--91401b07-9cff-4f05-94e7-3eb42a9b7a7a.lovable.app',
];

function getCorsHeaders(req: Request) {
  const origin = req.headers.get('Origin') || '';
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, ...',
  };
}
```

**Exceptions** : `stripe-webhook` et `strava-callback` (appelés par des serveurs externes) gardent `*` mais n'ont pas besoin de CORS (server-to-server). `firebase-auth` idem (appelé depuis WebView natif sans Origin).

### Phase 3 — Suppression debug/logs sensibles côté client

| Fichier | Action |
|---------|--------|
| `src/components/SecurityDashboard.tsx` | Supprimer le composant ou le conditionner à `import.meta.env.DEV` |
| `src/App.tsx` ligne 150 | Supprimer la route `/security` |
| `src/CapacitorDebug.vue` | Supprimer le fichier |
| `src/components/settings/PushDiagnosticPanel.tsx` | Conditionner l'affichage à `import.meta.env.DEV` ou admin vérifié côté serveur |
| `src/hooks/useAuth.tsx` | Supprimer les `console.log` qui affichent emails, présence de tokens (lignes 74, 126-128, 44, 93) |
| `src/components/NotificationManager.tsx` | Supprimer les `console.log` avec tokens (lignes 87, 133, 165, 201, 216) |
| `supabase/functions/firebase-auth` | Supprimer lignes 27-28 (token preview), 117 (password length), 213-214 (token lengths) |

### Phase 4 — Admin : vérification serveur via `user_roles`

1. **Le projet a déjà** `user_roles` avec un enum `app_role` et une fonction `has_role()` — il faut l'utiliser au lieu de `profiles.is_admin`.

2. **`SecurityDashboard.tsx`** : remplacer la query `profiles.is_admin` par un appel RPC `has_role(user.id, 'admin')`.

3. **`useAuth.tsx`** : supprimer le hardcode `ferdinand.froidefont@gmail.com` pour le premium. Le premium doit venir de `check-subscription` comme pour tous les utilisateurs. Si l'admin doit être premium, insérer une ligne dans `subscribers` côté base.

4. **`admin-manage-premium`** : remplacer le check email hardcodé par une vérification `has_role` via RPC côté edge function (query `user_roles` avec le service role client).

### Phase 5 — Vérification auth flows

Les flux Apple/Google/email sont fonctionnels. Points à valider :
- `firebase-auth` : le flux est correct (vérifie le token Firebase, crée/met à jour l'utilisateur, génère une session). Pas de changement fonctionnel.
- `ProfileSetupDialog` : crée correctement le profil. OK.
- Le trigger `handle_new_user()` crée un profil automatiquement au signup. OK.

### Phase 6 — Secrets à faire tourner

| Secret | Raison |
|--------|--------|
| `SUPABASE_ANON_KEY` | Exposé dans le client JS (normal, mais vérifier que les RLS sont solides) |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Idem, public par design |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | OK si uniquement dans les secrets edge functions |
| `STRIPE_SECRET_KEY` | OK si uniquement dans les secrets edge functions |
| `GOOGLE_MAPS_API_KEY` | Vérifier les restrictions de domaine côté Google Cloud Console |

**A faire tourner immédiatement** : aucun secret n'est exposé dans le code source. Les clés anon/publishable sont publiques par design. Les secrets edge functions sont stockés côté Supabase. **Recommandation** : faire tourner `CRON_SECRET` après création, et vérifier les restrictions API key Google Maps.

---

## Résumé des fichiers modifiés

| # | Fichier | Type de changement |
|---|---------|-------------------|
| 1-8 | 8 edge functions cron | Ajouter vérification `CRON_SECRET` |
| 9 | `save-push-token/index.ts` | JWT obligatoire |
| 10-27 | ~18 edge functions | CORS restrictif |
| 28 | `firebase-auth/index.ts` | Supprimer logs sensibles |
| 29 | `src/hooks/useAuth.tsx` | Supprimer logs + hardcode admin |
| 30 | `src/components/SecurityDashboard.tsx` | Conditionner à DEV |
| 31 | `src/App.tsx` | Supprimer route `/security` en prod |
| 32 | `src/CapacitorDebug.vue` | Supprimer |
| 33 | `src/components/settings/PushDiagnosticPanel.tsx` | Conditionner à DEV |
| 34 | `src/components/NotificationManager.tsx` | Supprimer logs tokens |
| 35 | `admin-manage-premium/index.ts` | Remplacer email hardcodé par `user_roles` |

