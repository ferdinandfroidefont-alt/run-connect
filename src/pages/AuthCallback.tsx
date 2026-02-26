import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

// 🔥 CRITICAL: Capture the code IMMEDIATELY at module level
// BEFORE Supabase's detectSessionInUrl can consume it
const INITIAL_URL_PARAMS = new URLSearchParams(window.location.search);
const INITIAL_CODE = INITIAL_URL_PARAMS.get('code');
const INITIAL_FULL_URL = window.location.href;

console.log("🔑 [AuthCallback] Module-level capture:", {
  INITIAL_CODE: INITIAL_CODE ? `${INITIAL_CODE.substring(0, 10)}...` : null,
  INITIAL_FULL_URL,
});

const AuthCallback = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState("Connexion en cours...");
  const [showFallbackButton, setShowFallbackButton] = useState(false);
  const [deepLinkUrl, setDeepLinkUrl] = useState<string | null>(null);

  useEffect(() => {
    let timeout: NodeJS.Timeout;

    const handleCallback = async () => {
      try {
        console.log("🔄 [AuthCallback] useEffect fired");
        console.log("🔄 [AuthCallback] INITIAL_CODE:", INITIAL_CODE ? "present" : "null");

        // Detect native iOS (SFSafariViewController)
        const isIOSNative = /iPhone|iPad|iPod/.test(navigator.userAgent) &&
          !(/CriOS|FxiOS|EdgiOS/.test(navigator.userAgent)) &&
          !(window as any).Capacitor;

        console.log("🔄 [AuthCallback] isIOSNative:", isIOSNative);
        console.log("🔄 [AuthCallback] userAgent:", navigator.userAgent);

        // 🍎 iOS NATIVE: Redirect code via deep link IMMEDIATELY, BEFORE any exchange
        if (isIOSNative && INITIAL_CODE) {
          console.log("🍎 [AuthCallback] iOS native detected — redirecting code to app via deep link");
          setStatus("Retour à l'application...");
          
          const link = `app.runconnect://auth?code=${INITIAL_CODE}`;
          setDeepLinkUrl(link);
          window.location.href = link;
          
          // Fallback: if deep link doesn't work after 3s, show button
          setTimeout(() => {
            console.log("⚠️ [AuthCallback] Deep link may have failed, showing fallback button");
            setStatus("Si l'application ne s'ouvre pas automatiquement :");
            setShowFallbackButton(true);
          }, 3000);
          return;
        }

        // --- Standard web flow below (desktop / mobile browsers) ---

        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
          console.error("❌ [AuthCallback] getSession error:", error);
        }

        if (session) {
          console.log("✅ [AuthCallback] Session found immediately");
          redirectToApp();
          return;
        }

        console.log("⏳ [AuthCallback] No session yet, listening for auth state change...");
        
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
          console.log("🔄 [AuthCallback] Auth state changed:", event);
          if (event === 'SIGNED_IN' && session) {
            console.log("✅ [AuthCallback] Session established via onAuthStateChange");
            subscription.unsubscribe();
            redirectToApp();
          }
        });

        // Use INITIAL_CODE (module-level) instead of re-reading URL
        if (INITIAL_CODE) {
          console.log("🔄 [AuthCallback] Found INITIAL_CODE, exchanging...");
          const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(INITIAL_CODE);
          if (exchangeError) {
            console.error("❌ [AuthCallback] Code exchange error:", exchangeError);
            setStatus("Erreur d'authentification. Réessayez.");
          } else if (data?.session) {
            console.log("✅ [AuthCallback] Code exchanged successfully");
            subscription.unsubscribe();
            redirectToApp();
          }
        }

        timeout = setTimeout(() => {
          console.warn("⚠️ [AuthCallback] Timeout waiting for session");
          setStatus("Délai dépassé. Retour à la connexion...");
          subscription.unsubscribe();
          navigate('/auth', { replace: true });
        }, 15000);

      } catch (err) {
        console.error("❌ [AuthCallback] Error:", err);
        setStatus("Erreur. Retour à la connexion...");
        setTimeout(() => navigate('/auth', { replace: true }), 2000);
      }
    };

    const redirectToApp = () => {
      const isNativeContext = /iPhone|iPad|iPod/.test(navigator.userAgent) && 
        !(/CriOS|FxiOS|EdgiOS/.test(navigator.userAgent));
      const isCapacitor = !!(window as any).Capacitor;

      if (isCapacitor) {
        console.log("📱 [AuthCallback] Inside Capacitor WebView, navigating to /");
        navigate('/', { replace: true });
      } else if (isNativeContext) {
        console.log("🍎 [AuthCallback] In SFSafariViewController, redirecting to custom scheme...");
        setStatus("Retour à l'application...");
        window.location.href = 'app.runconnect://auth?session=ok';
        setTimeout(() => {
          setStatus("Si l'application ne s'ouvre pas automatiquement :");
          setShowFallbackButton(true);
          setDeepLinkUrl('app.runconnect://auth?session=ok');
        }, 3000);
      } else {
        console.log("🌐 [AuthCallback] Web browser, navigating to /");
        navigate('/', { replace: true });
      }
    };

    handleCallback();

    return () => {
      if (timeout) clearTimeout(timeout);
    };
  }, [navigate]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-6">
      <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
      <p className="text-muted-foreground text-center mb-4">{status}</p>
      {showFallbackButton && deepLinkUrl && (
        <Button
          onClick={() => {
            window.location.href = deepLinkUrl;
          }}
          className="mt-2"
          size="lg"
        >
          Ouvrir Run Connect
        </Button>
      )}
    </div>
  );
};

export default AuthCallback;
