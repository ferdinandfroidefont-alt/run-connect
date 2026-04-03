-- Trigger push : secrets dans Vault uniquement (voir docs/SECURITY_OPERATIONS.md).
-- L’Edge Function send-push-notification exige x-internal-push-secret = INTERNAL_PUSH_INVOKE_SECRET.
CREATE EXTENSION IF NOT EXISTS vault WITH SCHEMA vault;

CREATE OR REPLACE FUNCTION public.trigger_send_push_on_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault
AS $$
DECLARE
  invoke_url text;
  anon_key text;
  internal_secret text;
BEGIN
  SELECT ds.decrypted_secret INTO invoke_url
  FROM vault.decrypted_secrets AS ds
  WHERE ds.name = 'pg_net_send_push_url'
  LIMIT 1;

  SELECT ds.decrypted_secret INTO anon_key
  FROM vault.decrypted_secrets AS ds
  WHERE ds.name = 'pg_net_supabase_anon_key'
  LIMIT 1;

  SELECT ds.decrypted_secret INTO internal_secret
  FROM vault.decrypted_secrets AS ds
  WHERE ds.name = 'pg_net_internal_push_secret'
  LIMIT 1;

  IF invoke_url IS NULL OR btrim(invoke_url) = ''
     OR anon_key IS NULL OR btrim(anon_key) = ''
     OR internal_secret IS NULL OR btrim(internal_secret) = '' THEN
    RAISE WARNING 'trigger_send_push_on_notification: secrets Vault manquants (pg_net_send_push_url, pg_net_supabase_anon_key, pg_net_internal_push_secret) — voir docs/SECURITY_OPERATIONS.md';
    RETURN NEW;
  END IF;

  PERFORM net.http_post(
    url := invoke_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || anon_key,
      'apikey', anon_key,
      'x-internal-push-secret', internal_secret
    ),
    body := jsonb_build_object(
      'user_id', NEW.user_id,
      'title', NEW.title,
      'body', NEW.message,
      'type', NEW.type,
      'data', COALESCE(NEW.data, '{}'::jsonb)
    )
  );

  RETURN NEW;
END;
$$;
