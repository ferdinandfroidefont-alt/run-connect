# Matrice d’authentification des Edge Functions

Helpers partagés : [`supabase/functions/_shared/auth.ts`](../supabase/functions/_shared/auth.ts) (`requireUserJwt`, `requireCron`).

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
| firebase-auth | Flux Firebase | Valider le corps / tokens Firebase |
| get-strava-friends | JWT utilisateur | |
| google-maps-proxy | À durcir si exposée | Limiter clé / quotas |
| instagram-callback | OAuth redirect | |
| instagram-connect | JWT utilisateur | |
| instagram-disconnect | JWT utilisateur | |
| ios-auth-callback | OAuth (serveur) | |
| mark-absent-cron | CRON_SECRET | |
| notify-challenge-progress | CRON_SECRET ou secret interne | |
| process-referral | Service role / interne | |
| process-referral-signup | Service role / interne | |
| report-user | Aucune auth Supabase actuellement | **À renforcer** (JWT + rate limit) si abus |
| save-push-token | JWT utilisateur | |
| season-reset | CRON_SECRET | |
| send-push-notification | `x-internal-push-secret` **ou** JWT utilisateur | Voir `INTERNAL_PUSH_INVOKE_SECRET` |
| strava-callback | OAuth | |
| strava-connect | JWT utilisateur | |
| strava-disconnect | JWT utilisateur | |
| strava-recent-activities | JWT utilisateur | |
| stripe-webhook | Signature Stripe | |
| update-streaks | CRON_SECRET | `requireCron` |
| weekly-challenge-reminder | CRON_SECRET | |

Mettre à jour ce tableau lors de l’ajout d’une nouvelle fonction.
