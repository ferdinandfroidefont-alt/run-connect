import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

/**
 * Page d'atterrissage OAuth web (Supabase `redirectTo: <origin>/auth/callback`).
 *
 * Stratégie :
 * 1. Si un `code` PKCE est présent dans l'URL, on l'échange explicitement.
 * 2. On poll la session jusqu'à 8 s, en parallèle d'un listener `SIGNED_IN`.
 * 3. Quand la session apparaît, on bascule sur `/` (Layout prend la main).
 * 4. En cas d'échec total : on redirige vers `/` (et NON `/auth`) pour laisser le
 *    Layout afficher la connexion si réellement absent — évite les boucles
 *    "session présente mais redirigé vers login" observées sur iOS Apple Sign-In.
 */
const AUTH_CALLBACK_TIMEOUT_MS = 8000;
const AUTH_CALLBACK_POLL_MS = 250;

const AuthCallback = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState("Connexion en cours...");
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
        const params = new URLSearchParams(window.location.search);
        const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
        const code = params.get("code") || hashParams.get("code");

        if (code) {
          console.log("[AuthCallback] PKCE code détecté — exchange explicite");
          const { error: exErr } = await supabase.auth.exchangeCodeForSession(code);
          if (exErr) {
            console.warn("[AuthCallback] exchangeCodeForSession:", exErr.message);
          }
        }

        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          safeNavigate("/", "session-immediate");
          return;
        }

        // Session pas encore visible : on combine listener + polling pour limiter la
        // race entre l'init du client supabase, l'écriture storage, et notre lecture.
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
            /* transient — on retentera au prochain tick */
          }
        }, AUTH_CALLBACK_POLL_MS);

        timeoutId = window.setTimeout(() => {
          if (navigatedRef.current) return;
          console.warn("[AuthCallback] timeout — fallback vers `/` (Layout gérera /auth si pas de session)");
          setStatus("Délai dépassé. Retour à l'accueil…");
          // On NE redirige PAS vers /auth : si la session est arrivée tardivement,
          // on s'éviterait une boucle. Le Layout sur `/` redirigera vers /auth uniquement
          // si réellement non connecté.
          safeNavigate("/", "timeout");
          cleanup();
        }, AUTH_CALLBACK_TIMEOUT_MS);
      } catch (err) {
        console.error("[AuthCallback] erreur handler:", err);
        setStatus("Erreur. Retour à l'accueil…");
        window.setTimeout(() => safeNavigate("/", "exception"), 1200);
      }
    };

    void handleCallback();
    return cleanup;
  }, [navigate]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-6">
      <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
      <p className="text-muted-foreground text-center mb-4">{status}</p>
    </div>
  );
};

export default AuthCallback;
