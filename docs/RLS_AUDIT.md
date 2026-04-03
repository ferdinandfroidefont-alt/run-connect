# Audit Row Level Security (RLS)

## Exécution

1. Ouvrir le **SQL Editor** du projet Supabase (ou `psql` sur la base).
2. Exécuter les requêtes de [`supabase/audit/rls_inventory.sql`](../supabase/audit/rls_inventory.sql).
3. Pour chaque table listée sans `relrowsecurity`, ajouter une migration : `ALTER TABLE … ENABLE ROW LEVEL SECURITY` et des politiques explicites (`SELECT` / `INSERT` / `UPDATE` / `DELETE`) basées sur `auth.uid()` ou rôles métier.
4. Revue des fonctions `SECURITY DEFINER` listées : `SET search_path`, validation des arguments, pas d’élévation de privilèges.

## Storage

Vérifier dans le dashboard **Storage → Policies** que les buckets sensibles n’autorisent pas l’écriture globale pour `authenticated` sans préfixe utilisateur.

## Suivi

Conserver une note des tables corrigées par migration (nom du fichier dans `supabase/migrations/`).
