import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

export const FCMTokenDiagnostic = () => {
  const { user } = useAuth();
  const [pushToken, setPushToken] = useState<string | null>(null);
  const [tokenPlatform, setTokenPlatform] = useState<string | null>(null);
  const [tokenUpdatedAt, setTokenUpdatedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchToken = async () => {
      if (!user?.id) return;
      
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('profiles')
          .select('push_token, push_token_platform, push_token_updated_at')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) throw error;
        
        setPushToken(data?.push_token || null);
        setTokenPlatform(data?.push_token_platform || null);
        setTokenUpdatedAt(data?.push_token_updated_at || null);
      } catch (error) {
        console.error('Error fetching FCM token:', error);
        setPushToken(null);
        setTokenPlatform(null);
        setTokenUpdatedAt(null);
      } finally {
        setLoading(false);
      }
    };

    fetchToken();
  }, [user?.id]);

  if (loading) {
    return (
      <div className="rounded-lg border border-border/50 bg-muted/30 p-4 space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">🔧 Diagnostic Notifications</span>
          <Loader2 className="h-3 w-3 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border/50 bg-muted/30 p-4 space-y-2">
      <h4 className="text-sm font-medium">🔧 Diagnostic Notifications</h4>
      
      <div className="space-y-1">
        <p className="text-xs text-muted-foreground">Token FCM :</p>
        {pushToken ? (
          <>
            <p className="text-xs text-green-600 dark:text-green-400 font-mono break-all">
              {pushToken}
            </p>
            <p className="text-xs text-muted-foreground">
              Plateforme : <span className="text-foreground font-medium">{tokenPlatform || 'N/A'}</span>
            </p>
            <p className="text-xs text-muted-foreground">
              Longueur : <span className="text-foreground font-medium">{pushToken.length} caractères</span>
            </p>
            {tokenUpdatedAt && (
              <p className="text-xs text-muted-foreground">
                Dernière MAJ : <span className="text-foreground font-medium">
                  {new Date(tokenUpdatedAt).toLocaleString('fr-FR')}
                </span>
              </p>
            )}
          </>
        ) : (
          <p className="text-xs text-red-600 dark:text-red-400 font-semibold">
            Token FCM : null
          </p>
        )}
      </div>
    </div>
  );
};
