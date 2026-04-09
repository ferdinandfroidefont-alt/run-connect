import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

const AuthCallback = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState("Connexion en cours...");

  useEffect(() => {
    let timeout: NodeJS.Timeout;

    const handleCallback = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (session) {
          console.log("✅ [AuthCallback] Session found");
          navigate('/', { replace: true });
          return;
        }

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
