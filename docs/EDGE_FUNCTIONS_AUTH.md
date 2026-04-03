# Matrice d’authentification des Edge Functions

Helpers partagés : [`supabase/functions/_shared/auth.ts`](../supabase/functions/_shared/auth.ts) (`requireUserJwt`, `requireUserJwtCors`, `requireCron`).

| Fonction | Auth attendue | Notes |
|----------|----------------|-------|
| admin-manage-premium | Admin / secret métier | Vérifier en-têtes et rôle côté RPC |
| award-organizer-points | Service role + logique interne | Appelée avec JWT service ou cron |
| check-subscription | JWT utilisateur | `Authorization: Bearer` |
| cleanup-live-tracking | CRON_SECRET | `requireCron` |
| coaching-reminder | CRON_SECRET | |
| create-checkout | JWT utilisateur (anon client + getUser) | |
| create-donation | JWT utilisateur | |
| customer-portal | JWT utilisateur | |
| delete-account | JWT utilisateur | `requireUserJwt` |
| firebase-auth | Flux Firebase | Valider le corps / tokens Firebase ; pas de JWT Supabase (exception documentée) |
| get-strava-friends | JWT utilisateur | `requireUserJwtCors` + service role (requêtes bornées à `user_id` du JWT) |
| google-maps-proxy | JWT utilisateur | `requireUserJwtCors` obligatoire pour `get-key`, geocode et reverse |
| instagram-callback | OAuth redirect | |
| instagram-connect | JWT utilisateur | |
| instagram-disconnect | JWT utilisateur | |
| ios-auth-callback | OAuth (serveur) | |
| mark-absent-cron | CRON_SECRET | |
| notify-challenge-progress | CRON_SECRET ou secret interne | |
| process-referral | JWT utilisateur | `requireUserJwtCors` ; RPC avec `new_user_id` = JWT |
| process-referral-signup | JWT utilisateur | `requireUserJwtCors` ; `newUserId` doit égaler l’utilisateur du JWT |
| report-user | JWT utilisateur | `requireUserJwtCors` ; pas d’auto-signalement ; signaleur dans l’email modération |
| save-push-token | JWT utilisateur | |
| season-reset | CRON_SECRET | |
| send-push-notification | **`x-internal-push-secret` (prioritaire, serveur uniquement)** **ou** `Authorization: Bearer` + JWT utilisateur valide | Jamais de secret interne dans le frontend ; le client utilise uniquement la session Supabase (`functions.invoke` + JWT). |
| strava-callback | OAuth | |
| strava-connect | JWT utilisateur | |
| strava-disconnect | JWT utilisateur | |
| strava-recent-activities | JWT utilisateur | |
| stripe-webhook | Signature Stripe | |
| update-streaks | CRON_SECRET | `requireCron` |
| weekly-challenge-reminder | CRON_SECRET | |

Mettre à jour ce tableau lors de l’ajout d’une nouvelle fonction.
