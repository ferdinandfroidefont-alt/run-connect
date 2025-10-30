import { supabase } from '@/integrations/supabase/client';

/**
 * Hook pour envoyer des notifications push via l'edge function send-push-notification
 * Permet d'envoyer des notifications FCM aux utilisateurs via Firebase
 */
export const useSendNotification = () => {
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
        return false;
      }

      console.log('✅ [PUSH] Notification envoyée:', result);
      return result?.fcm_sent === true;
    } catch (error) {
      console.error('❌ [PUSH] Exception:', error);
      return false;
    }
  };

  return { sendPushNotification };
};
