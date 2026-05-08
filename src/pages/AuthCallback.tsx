import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, AlertCircle } from "lucide-react";

const AUTH_CALLBACK_TIMEOUT_MS = 8000;
const AUTH_CALLBACK_POLL_MS = 250;

function readOAuthErrorFromUrl(): string | null {
  const params = new URLSearchParams(window.location.search);
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  return params.get("error") || hashParams.get("error") || null;
}

function readOAuthErrorDescriptionFromUrl(): string | null {
  const params = new URLSearchParams(window.location.search);
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  return (
    params.get("error_description") ||
    hashParams.get("error_description") ||
    null
  );
}

const AuthCallback = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState("Connexion en cours...");
  const [oauthError, setOauthError] = useState<string | null>(null);
  const navigatedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    let pollId: number | null = null;
    let timeoutId: number | null = null;
    let subscription: { unsubscribe: () => void } | null = null;

    const safeNavigate = (path: string, source: string) => {
      if (navigatedRef.current || cancelled) return;
      navigatedRef.current = true;
      console.log(`[AuthCallback] navigate -> ${path} (${source})`);
      navigate(path, { replace: true });
    };

    const cleanup = () => {
      cancelled = true;
      if (pollId !== null) window.clearInterval(pollId);
      if (timeoutId !== null) window.clearTimeout(timeoutId);
      subscription?.unsubscribe();
    };

    const handleCallback = async () => {
      try {
        // ── Détection d'erreur OAuth immédiate ──────────────────────────────
        const oauthErr = readOAuthErrorFromUrl();
        if (oauthErr) {
          const desc = readOAuthErrorDescriptionFromUrl();
          console.warn("[AuthCallback] OAuth error dans l'URL", { oauthErr, desc });
          setOauthError(desc || oauthErr);
          // Retour vers /auth après 2.5 s pour laisser l'utilisateur voir le message
          timeoutId = window.setTimeout(() => safeNavigate("/auth", `oauth-error:${oauthErr}`), 2500);
          return;
        }

        const params = new URLSearchParams(window.location.search);
        const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
        const code = params.get("code") || hashParams.get("code");

        if (code) {
          console.log("[AuthCallback] PKCE code détecté — exchange explicite");
          const { error: exErr } = await supabase.auth.exchangeCodeForSession(code);
          if (exErr) {
            console.warn("[AuthCallback] exchangeCodeForSession:", exErr.message);
            // Échec d'échange : afficher message + retour /auth rapide
            setOauthError(exErr.message);
            timeoutId = window.setTimeout(() => safeNavigate("/auth", "exchange-failed"), 2500);
            return;
          }
        }

        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          safeNavigate("/", "session-immediate");
          return;
        }

        const sub = supabase.auth.onAuthStateChange((event, nextSession) => {
          if (nextSession?.user && (event === "SIGNED_IN" || event === "INITIAL_SESSION" || event === "TOKEN_REFRESHED")) {
            safeNavigate("/", `event-${event}`);
            cleanup();
          }
        });
        subscription = sub.data.subscription;

        pollId = window.setInterval(async () => {
          try {
            const { data: { session: polled } } = await supabase.auth.getSession();
            if (polled?.user) {
              safeNavigate("/", "poll");
              cleanup();
            }
          } catch {
            /* transient */
          }
        }, AUTH_CALLBACK_POLL_MS);

        timeoutId = window.setTimeout(() => {
          if (navigatedRef.current) return;
          console.warn("[AuthCallback] timeout — fallback /auth");
          safeNavigate("/auth", "timeout");
          cleanup();
        }, AUTH_CALLBACK_TIMEOUT_MS);
      } catch (err) {
        console.error("[AuthCallback] erreur handler:", err);
        setStatus("Erreur. Retour à la connexion…");
        window.setTimeout(() => safeNavigate("/auth", "exception"), 1500);
      }
    };

    void handleCallback();
    return cleanup;
  }, [navigate]);

  if (oauthError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background px-6 gap-4">
        <AlertCircle className="h-10 w-10 text-destructive" />
        <p className="text-center font-semibold text-foreground">Connexion échouée</p>
        <p className="text-center text-sm text-muted-foreground max-w-xs">{oauthError}</p>
        <p className="text-center text-xs text-muted-foreground">Retour à la connexion…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-6">
      <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
      <p className="text-muted-foreground text-center mb-4">{status}</p>
    </div>
  );
};

export default AuthCallback;
