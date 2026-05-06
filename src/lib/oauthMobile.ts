import type { SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseUrl } from "@/lib/supabaseEnv";

const LOG_PREFIX = "[OAuth/Mobile]";

/**
 * Même pont PKCE que Google iOS : Supabase redirige vers cette Edge Function,
 * puis 302 → `ios-callback.html` qui ouvre `runconnect://auth/callback?code=…`.
 * À déclarer dans Supabase → Auth → Redirect URLs (URL https de la function).
 */
export function getIosSupabaseOAuthBridgeRedirectTo(): string {
  return `${requireSupabaseUrl()}/functions/v1/ios-auth-callback`;
}

export function isAuthCallbackDeepLink(url: string | null | undefined): boolean {
  if (!url) return false;
  return (
    url.startsWith("runconnect://auth/callback") ||
    url.startsWith("app.runconnect://auth/callback")
  );
}

export type ParsedOAuthCallback = {
  code: string | null;
  error: string | null;
  errorDescription: string | null;
  accessToken: string | null;
  refreshToken: string | null;
};

/**
 * Extrait query (`?`) et fragment (`#`) — certains flux placent les jetons dans le hash.
 */
export function parseOAuthCallbackUrl(rawUrl: string): ParsedOAuthCallback {
  const qIndex = rawUrl.indexOf("?");
  const hIndex = rawUrl.indexOf("#");
  let queryString = "";
  let hashString = "";
  if (qIndex >= 0) {
    const end = hIndex > qIndex ? hIndex : rawUrl.length;
    queryString = rawUrl.slice(qIndex + 1, end);
  }
  if (hIndex >= 0) {
    hashString = rawUrl.slice(hIndex + 1);
  }
  const q = new URLSearchParams(queryString);
  const h = new URLSearchParams(hashString.replace(/^\/+/, ""));
  return {
    code: q.get("code") || h.get("code"),
    error: q.get("error") || h.get("error"),
    errorDescription: q.get("error_description") || h.get("error_description"),
    accessToken: q.get("access_token") || h.get("access_token"),
    refreshToken: q.get("refresh_token") || h.get("refresh_token"),
  };
}

let lastProcessedCallbackUrl: string | null = null;
const SESSION_CONFIRM_TIMEOUT_MS = 3500;
const SESSION_CONFIRM_POLL_MS = 250;

function shouldSkipDuplicate(rawUrl: string): boolean {
  if (lastProcessedCallbackUrl === rawUrl) {
    console.log(`${LOG_PREFIX} skip duplicate callback URL`);
    return true;
  }
  lastProcessedCallbackUrl = rawUrl;
  return false;
}

/**
 * Échange le code PKCE ou applique les jetons implicites, puis persiste la session (storage Supabase).
 */
export async function finalizeSupabaseOAuthFromDeepLink(
  client: SupabaseClient,
  rawUrl: string
): Promise<{ ok: boolean; reason?: string }> {
  if (!isAuthCallbackDeepLink(rawUrl)) {
    return { ok: false, reason: "not_auth_callback" };
  }
  if (shouldSkipDuplicate(rawUrl)) {
    return { ok: false, reason: "duplicate" };
  }

  const { code, error, errorDescription, accessToken, refreshToken } = parseOAuthCallbackUrl(rawUrl);

  console.log(`${LOG_PREFIX} deep link received`, {
    hasCode: !!code,
    codeLength: code?.length ?? 0,
    hasError: !!error,
    hasImplicitPair: !!(accessToken && refreshToken),
  });

  if (error) {
    console.error(`${LOG_PREFIX} OAuth error param`, { error, errorDescription: errorDescription?.slice(0, 120) });
    lastProcessedCallbackUrl = null;
    return { ok: false, reason: "oauth_error" };
  }

  try {
    const waitForSessionUser = async (): Promise<boolean> => {
      const endAt = Date.now() + SESSION_CONFIRM_TIMEOUT_MS;
      while (Date.now() < endAt) {
        const {
          data: { session },
        } = await client.auth.getSession();
        if (session?.user) return true;
        await new Promise((resolve) => window.setTimeout(resolve, SESSION_CONFIRM_POLL_MS));
      }
      return false;
    };

    if (code) {
      console.log(`${LOG_PREFIX} exchangeCodeForSession (PKCE)`);
      const { error: exchangeError } = await client.auth.exchangeCodeForSession(code);
      if (exchangeError) {
        console.error(`${LOG_PREFIX} exchange failed`, exchangeError.message);
        lastProcessedCallbackUrl = null;
        return { ok: false, reason: "exchange_failed" };
      }
      const {
        data: { session },
      } = await client.auth.getSession();
      console.log(`${LOG_PREFIX} session after exchange`, {
        hasUser: !!session?.user,
        userPrefix: session?.user?.id?.slice(0, 8),
      });
      if (!session?.user) {
        const sessionReady = await waitForSessionUser();
        if (!sessionReady) {
          console.warn(`${LOG_PREFIX} session missing after PKCE exchange timeout`);
          lastProcessedCallbackUrl = null;
          return { ok: false, reason: "session_not_ready" };
        }
      }
      return { ok: true };
    }

    if (accessToken && refreshToken) {
      console.log(`${LOG_PREFIX} setSession (implicit/hash tokens)`);
      const { error: setErr } = await client.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
      if (setErr) {
        console.error(`${LOG_PREFIX} setSession failed`, setErr.message);
        lastProcessedCallbackUrl = null;
        return { ok: false, reason: "set_session_failed" };
      }
      const sessionReady = await waitForSessionUser();
      if (!sessionReady) {
        console.warn(`${LOG_PREFIX} session missing after setSession timeout`);
        lastProcessedCallbackUrl = null;
        return { ok: false, reason: "session_not_ready" };
      }
      return { ok: true };
    }

    console.error(`${LOG_PREFIX} no code and no token pair in URL`);
    lastProcessedCallbackUrl = null;
    return { ok: false, reason: "no_credentials" };
  } catch (e) {
    console.error(`${LOG_PREFIX} unexpected`, e);
    lastProcessedCallbackUrl = null;
    return { ok: false, reason: "exception" };
  }
}
