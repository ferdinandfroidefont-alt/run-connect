import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

/**
 * Hook qui écoute les nouvelles notifications en temps réel
 * et déclenche l'envoi de push notifications via l'Edge Function
 * 
 * Remplace le trigger pg_net défectueux par un système fiable côté frontend
 */
export const useNotificationRealtimeSync = () => {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    console.log('🔔 Activation du système de notifications Realtime');

    const channel = supabase
      .channel('notifications-realtime')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${user.id}`
      }, async (payload) => {
        console.log('📥 Nouvelle notification détectée:', payload.new);

        // Appeler l'Edge Function pour envoyer le push
        try {
          const notification = payload.new as any;
          
          const { data, error } = await supabase.functions.invoke('send-push-notification', {
            body: {
              user_id: notification.user_id,
              title: notification.title,
              body: notification.message,
              type: notification.type,
              data: notification.data
            }
          });

          if (error) {
            console.error('❌ Erreur envoi push via Edge Function:', error);
          } else {
            console.log('✅ Push notification envoyée avec succès', data);
          }
        } catch (error) {
          console.error('❌ Exception envoi push:', error);
        }
      })
      .subscribe((status) => {
        console.log('📡 Statut channel notifications:', status);
      });

    return () => {
      console.log('🔕 Désactivation du système de notifications Realtime');
      supabase.removeChannel(channel);
    };
  }, [user]);
};
