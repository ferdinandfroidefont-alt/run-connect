import { logBlockedOrigin } from "./secureLog.ts";

// Shared CORS configuration for all edge functions
const EXACT_ORIGINS = [
  'https://run-connect.lovable.app',
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:8080',
  'capacitor://localhost',
];

const PREVIEW_PATTERNS = [
  /^https:\/\/[a-z0-9-]+\.lovableproject\.com$/,
  /^https:\/\/id-preview--[a-z0-9-]+\.lovable\.app$/,
];

function isOriginAllowed(origin: string): boolean {
  if (EXACT_ORIGINS.includes(origin)) return true;
  return PREVIEW_PATTERNS.some((re) => re.test(origin));
}

export function getCorsHeaders(req: Request) {
  const origin = req.headers.get('Origin') || '';
  
  // Native WebViews (Android/iOS) may send empty or 'null' Origin
  // In that case, allow the request with wildcard
  if (!origin || origin === 'null') {
    return {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-push-trace-id, x-cron-secret, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
      'Vary': 'Origin',
    };
  }

  const allowed = isOriginAllowed(origin);
  if (!allowed) {
    logBlockedOrigin(origin);
  }
  return {
    'Access-Control-Allow-Origin': allowed ? origin : EXACT_ORIGINS[0],
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-push-trace-id, x-cron-secret, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
    'Vary': 'Origin',
  };
}

export function verifyCronSecret(req: Request): boolean {
  const cronSecret = req.headers.get('x-cron-secret');
  return cronSecret === Deno.env.get('CRON_SECRET');
}
