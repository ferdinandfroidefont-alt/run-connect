import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

// Web-only callback page — iOS native flow now goes through the ios-auth-callback Edge Function

const AuthCallback = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState("Connexion en cours...");

  useEffect(() => {
    addBootCheckpoint("AUTH_CALLBACK");
    bootLog("[AuthCallback] mount", {
      href: window.location.href,
      search: window.location.search,
      hash: window.location.hash?.slice(0, 60),
      params: Object.fromEntries(new URLSearchParams(window.location.search)),
    });

    let timeout: NodeJS.Timeout;

    const handleCallback = async () => {
      try {
        // Check if session already exists (Supabase auto-detects code in URL)
        const { data: { session } } = await supabase.auth.getSession();

        if (session) {
          console.log("✅ [AuthCallback] Session found");
          navigate('/', { replace: true });
          return;
        }

        // Listen for auth state change (Supabase will auto-exchange the code)
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
          if (event === 'SIGNED_IN' && session) {
            console.log("✅ [AuthCallback] Session established");
            subscription.unsubscribe();
            navigate('/', { replace: true });
          }
        });

        timeout = setTimeout(() => {
          console.warn("⚠️ [AuthCallback] Timeout");
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

    handleCallback();
    return () => { if (timeout) clearTimeout(timeout); };
  }, [navigate]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-6">
      <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
      <p className="text-muted-foreground text-center mb-4">{status}</p>
    </div>
  );
};

export default AuthCallback;
