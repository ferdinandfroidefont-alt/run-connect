import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface PushErrorDiagnostic {
  stage: string | null;
  reason: string | null;
  token: string | null;
}

/**
 * Hook pour envoyer des notifications push via l'edge function send-push-notification
 * Permet d'envoyer des notifications FCM aux utilisateurs via Firebase
 */
export const useSendNotification = () => {
  const [lastPushError, setLastPushError] = useState<PushErrorDiagnostic | null>(null);

  const sendPushNotification = async (
    userId: string,
    title: string,
    body: string,
    type: string,
    data?: any
  ): Promise<boolean> => {
    try {
      console.log('📱 [PUSH] Envoi notification push:', { userId, title, type });
      
      // 🔥 IMPORTANT: Refresh session before calling edge function
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !sessionData?.session) {
        console.error('❌ [PUSH] Session Supabase non disponible:', sessionError);
        
        // Try to refresh the session
        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
        
        if (refreshError || !refreshData?.session) {
          console.error('❌ [PUSH] Impossible de rafraîchir la session:', refreshError);
          setLastPushError({
            stage: 'SESSION_REFRESH',
            reason: 'Session expirée et impossible à rafraîchir',
            token: null
          });
          return false;
        }
        
        console.log('✅ [PUSH] Session rafraîchie avec succès');
      }
      
      const { data: sessionData2 } = await supabase.auth.getSession();
      const accessToken = sessionData2?.session?.access_token;

      if (!accessToken) {
        console.error('❌ [PUSH] Pas de jeton d’accès — impossible d’appeler send-push-notification sans session');
        setLastPushError({
          stage: 'NO_ACCESS_TOKEN',
          reason: 'Session sans access_token',
          token: null,
        });
        return false;
      }

      const { data: result, error } = await supabase.functions.invoke('send-push-notification', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        body: {
          user_id: userId,
          title,
          body,
          type,
          data: data || {}
        }
      });

      if (error) {
        console.error('❌ [PUSH] Erreur edge function:', error);
        
        // 🔥 Si erreur 401, tenter un refresh et réessayer
        if (error.message?.includes('401') || error.message?.includes('unauthorized')) {
          console.log('🔄 [PUSH] Tentative de refresh session après 401...');
          
          const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
          
          if (!refreshError && refreshData?.session) {
            console.log('✅ [PUSH] Session rafraîchie, nouvelle tentative...');
            
            const retrySession = await supabase.auth.getSession();
            const retryToken = retrySession.data?.session?.access_token;
            if (!retryToken) {
              setLastPushError({
                stage: 'NO_ACCESS_TOKEN_RETRY',
                reason: 'Session sans access_token après refresh',
                token: null,
              });
              return false;
            }

            const { data: retryResult, error: retryError } = await supabase.functions.invoke('send-push-notification', {
              headers: { Authorization: `Bearer ${retryToken}` },
              body: {
                user_id: userId,
                title,
                body,
                type,
                data: data || {}
              }
            });
            
            if (!retryError && retryResult) {
              console.log('✅ [PUSH] Notification envoyée après retry:', retryResult);
              setLastPushError({
                stage: retryResult.stage || 'SUCCESS_RETRY',
                reason: retryResult.reason || 'OK',
                token: retryResult.push_token ?? null
              });
              return retryResult?.fcm_sent === true;
            }
          }
        }
        
        // Parser le contexte de l'erreur
        try {
          const errorContext = error.context as any;
          const responseText = await errorContext?.response?.text();
          
          if (responseText) {
            const errorData = JSON.parse(responseText);
            console.error('🧠 Détail erreur Edge Function:', errorData);
            
            setLastPushError({
              stage: errorData.stage || 'UNKNOWN',
              reason: errorData.message || errorData.reason || errorData.code || error.message,
              token: errorData.push_token ?? null
            });
          }
        } catch (parseError) {
          console.error('❌ Impossible de parser l\'erreur:', parseError);
          setLastPushError({
            stage: 'PARSE_ERROR',
            reason: (error as any)?.message || 'Edge Function returned non-2xx status',
            token: null
          });
        }
        setLastPushError((prev) => prev ?? {
          stage: 'EDGE_NON_2XX',
          reason: (error as any)?.message || 'Edge Function returned non-2xx status',
          token: null,
        });
        
        return false;
      }

      // Stocker le diagnostic en cas de succès
      if (result) {
        setLastPushError({
          stage: result.stage || 'SUCCESS',
          reason: result.message || result.reason || result.code || 'OK',
          token: result.push_token ?? null
        });
      }

      console.log('✅ [PUSH] Notification envoyée:', result);
      return result?.fcm_sent === true;
    } catch (error) {
      console.error('❌ [PUSH] Exception:', error);
      setLastPushError({
        stage: 'EXCEPTION',
        reason: error instanceof Error ? error.message : 'Erreur inconnue',
        token: null
      });
      return false;
    }
  };

  return { sendPushNotification, lastPushError };
};
