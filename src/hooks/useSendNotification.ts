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
      
      const { data: result, error } = await supabase.functions.invoke('send-push-notification', {
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
        
        // 🔥 NOUVEAU : Parser le contexte de l'erreur
        try {
          const errorContext = error.context as any;
          const responseText = await errorContext?.response?.text();
          
          if (responseText) {
            const errorData = JSON.parse(responseText);
            console.error('🧠 Détail erreur Edge Function:', errorData);
            
            // Stocker le diagnostic
            setLastPushError({
              stage: errorData.stage || 'UNKNOWN',
              reason: errorData.reason || error.message,
              token: errorData.push_token ?? null
            });
          }
        } catch (parseError) {
          console.error('❌ Impossible de parser l\'erreur:', parseError);
          setLastPushError({
            stage: 'PARSE_ERROR',
            reason: error.message,
            token: null
          });
        }
        
        return false;
      }

      // 🔥 NOUVEAU : Stocker aussi le diagnostic en cas de succès
      if (result) {
        setLastPushError({
          stage: result.stage || 'SUCCESS',
          reason: result.reason || 'OK',
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
