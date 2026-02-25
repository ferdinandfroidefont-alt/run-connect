import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

/**
 * AuthCallback - Handles the PKCE OAuth callback for iOS native apps.
 * 
 * Flow:
 * 1. Supabase redirects here after Google OAuth with ?code=XXXX
 * 2. detectSessionInUrl: true in the Supabase client auto-exchanges the code
 * 3. Once session is established, redirect back to the native app via custom scheme
 * 4. If not in a native context, navigate to /
 */
const AuthCallback = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState("Connexion en cours...");

  useEffect(() => {
    let timeout: NodeJS.Timeout;

    const handleCallback = async () => {
      try {
        console.log("🔄 [AuthCallback] Page loaded, waiting for session exchange...");
        console.log("🔄 [AuthCallback] URL:", window.location.href);

        // detectSessionInUrl: true will auto-exchange the PKCE code
        // We just need to wait for the session to be established
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
          console.error("❌ [AuthCallback] getSession error:", error);
        }

        if (session) {
          console.log("✅ [AuthCallback] Session found immediately");
          redirectToApp();
          return;
        }

        // If no session yet, listen for auth state change
        console.log("⏳ [AuthCallback] No session yet, listening for auth state change...");
        
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
          console.log("🔄 [AuthCallback] Auth state changed:", event);
          if (event === 'SIGNED_IN' && session) {
            console.log("✅ [AuthCallback] Session established via onAuthStateChange");
            subscription.unsubscribe();
            redirectToApp();
          }
        });

        // Also try exchanging code manually if present
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        if (code) {
          console.log("🔄 [AuthCallback] Found code param, exchanging...");
          const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) {
            console.error("❌ [AuthCallback] Code exchange error:", exchangeError);
            setStatus("Erreur d'authentification. Réessayez.");
          } else if (data?.session) {
            console.log("✅ [AuthCallback] Code exchanged successfully");
            subscription.unsubscribe();
            redirectToApp();
          }
        }

        // Timeout after 15 seconds
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
      // Check if we're in a native iOS context (loaded in SFSafariViewController)
      const isNativeContext = /iPhone|iPad|iPod/.test(navigator.userAgent) && 
        !(/CriOS|FxiOS|EdgiOS/.test(navigator.userAgent));
      
      // Also check if Capacitor is available (means we're in the app webview already)
      const isCapacitor = !!(window as any).Capacitor;

      if (isCapacitor) {
        // We're inside the app's WKWebView - just navigate
        console.log("📱 [AuthCallback] Inside Capacitor WebView, navigating to /");
        navigate('/', { replace: true });
      } else if (isNativeContext) {
        // We're in SFSafariViewController - redirect to custom scheme to return to app
        console.log("🍎 [AuthCallback] In SFSafariViewController, redirecting to custom scheme...");
        setStatus("Retour à l'application...");
        window.location.href = 'app.runconnect://auth?session=ok';
        
        // Fallback: if custom scheme doesn't work after 3s, show message
        setTimeout(() => {
          setStatus("Ouvrez l'application Run Connect pour continuer.");
        }, 3000);
      } else {
        // Web browser - just navigate
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
    <div className="min-h-screen flex flex-col items-center justify-center bg-background">
      <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
      <p className="text-muted-foreground">{status}</p>
    </div>
  );
};

export default AuthCallback;
