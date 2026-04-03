# Opérations sécurité RunConnect

## Rotation de la clé `service_role` Supabase (P0)

Si une clé `service_role` a fuité (dépôt Git, capture d’écran, ancienne migration), **considérez-la comme compromise**.

1. Dans le [dashboard Supabase](https://supabase.com/dashboard) : **Project Settings → API → Service role** → **Rotate** la clé `service_role`.
2. Mettre à jour **tous** les endroits qui utilisent l’ancienne clé :
   - Secrets des **Edge Functions** (`SUPABASE_SERVICE_ROLE_KEY`) pour chaque fonction déployée.
   - Secret **Vault** Postgres `pg_net_service_role_jwt` (voir ci-dessous), si vous utilisez le trigger push.
3. Vérifier l’**historique Git** : si le dépôt a été public, la rotation reste obligatoire ; pour effacer un secret de l’historique, utiliser `git filter-repo` ou l’assistance support Git (hors scope de ce doc).

## Secrets Vault pour le trigger push (`pg_net`)

Le trigger sur `public.notifications` appelle l’Edge Function `send-push-notification` via `pg_net`. Aucune clé `service_role` n’est stockée dans le dépôt.

Après la migration `20260402140000_push_trigger_vault.sql`, créer dans le **SQL Editor** (une fois par environnement) :

```sql
-- URL complète de la fonction Edge
SELECT vault.create_secret(
  'https://VOTRE_REF.supabase.co/functions/v1/send-push-notification',
  'pg_net_send_push_url',
  'URL invoke send-push-notification'
);

-- Clé anon (Settings → API → anon public) — déjà exposée côté client, sert uniquement à invoquer la fonction
SELECT vault.create_secret(
  'COLLER_ICI_LA_CLE_ANON',
  'pg_net_supabase_anon_key',
  'Anon key pour invoke Edge send-push-notification'
);

-- Secret interne long et aléatoire (le même doit être défini côté Edge : INTERNAL_PUSH_INVOKE_SECRET)
SELECT vault.create_secret(
  'GENERER_UNE_CHAINE_ALEATOIRE_LONGUE',
  'pg_net_internal_push_secret',
  'Secret header x-internal-push-secret pour send-push-notification'
);
```

Dans **Supabase → Edge Functions → Secrets**, définir `INTERNAL_PUSH_INVOKE_SECRET` avec **exactement** la même valeur que `pg_net_internal_push_secret`.

Si un secret Vault manque, le trigger **n’appelle pas** HTTP (warning Postgres) et l’insertion dans `notifications` réussit quand même.

### Rétrocompatibilité Edge

Tant que `INTERNAL_PUSH_INVOKE_SECRET` n’est **pas** défini sur la fonction `send-push-notification`, les appels sans JWT utilisateur restent acceptés (avec un avertissement dans les logs). Dès que le secret est défini, seuls les appels avec `x-internal-push-secret` correct **ou** un JWT utilisateur valide sont autorisés.

## Durcissement dashboard (équipe)

- Activer la **MFA** pour chaque compte ayant accès au projet Supabase.
- Réviser périodiquement les **URL de redirection OAuth** et les clés API exposées côté client (`anon` + restrictions Mapbox par domaine / bundle).

## Observabilité (Sentry, etc.)

Si vous ajoutez Sentry ou un outil similaire : activer le **filtrage des données personnelles** (tokens, emails, query `code=` OAuth) et éviter d’attacher le corps brut des requêtes auth aux événements.

## CI

Le workflow [`.github/workflows/security-checks.yml`](../.github/workflows/security-checks.yml) exécute `npm audit` (niveau high, non bloquant par défaut) et refuse les migrations contenant la chaîne `service_role`.

## Migrations historiques modifiées

Si le fichier `20251021151759_*.sql` a été réécrit pour retirer un secret, un dépôt qui avait déjà appliqué l’ancienne version peut voir un **décalage de checksum** avec la CLI Supabase. En cas d’alerte, suivre la doc officielle `supabase migration repair` pour l’environnement concerné, ou réappliquer la chaîne sur une base de dev via `db reset`.
