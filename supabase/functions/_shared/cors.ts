// Shared CORS configuration for all edge functions
const ALLOWED_ORIGINS = [
  'https://run-connect.lovable.app',
  'https://id-preview--91401b07-9cff-4f05-94e7-3eb42a9b7a7a.lovable.app',
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:8080',
];

export function getCorsHeaders(req: Request) {
  const origin = req.headers.get('Origin') || '';
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-push-trace-id, x-cron-secret, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
  };
}

export function verifyCronSecret(req: Request): boolean {
  const cronSecret = req.headers.get('x-cron-secret');
  return cronSecret === Deno.env.get('CRON_SECRET');
}
