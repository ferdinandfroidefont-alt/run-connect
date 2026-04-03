-- Requêtes d’audit RLS (à exécuter dans le SQL Editor Supabase ou psql).
-- Tables du schéma public sans RLS activé (à corriger par des migrations dédiées).

SELECT c.relname AS table_name
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relkind = 'r'
  AND NOT c.relrowsecurity
ORDER BY c.relname;

-- Fonctions SECURITY DEFINER dans public (revue manuelle recommandée)

SELECT p.proname AS function_name
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.prosecdef
ORDER BY p.proname;
