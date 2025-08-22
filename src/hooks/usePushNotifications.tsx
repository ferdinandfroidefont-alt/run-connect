import { useState, useEffect } from 'react';
import { PushNotifications } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from './use-toast';

export const usePushNotifications = () => {
  const [isRegistered, setIsRegistered] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  const requestPermissions = async () => {
    if (!Capacitor.isNativePlatform()) {
      toast({
        title: "Notifications non disponibles", 
        description: "Les notifications push ne sont disponibles que sur mobile",
        variant: "destructive"
      });
      return false;
    }

    try {
      const permission = await PushNotifications.requestPermissions();
      
      if (permission.receive === 'granted') {
        await PushNotifications.register();
        return true;
      } else {
        toast({
          title: "Permission refusée",
          description: "Activez les notifications dans les paramètres pour recevoir les alertes",
          variant: "destructive"
        });
        return false;
      }
    } catch (error) {
      console.error('Error requesting push permissions:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'activer les notifications",
        variant: "destructive"
      });
      return false;
    }
  };

  const savePushToken = async (pushToken: string) => {
    if (!user) return;

    try {
      await supabase
        .from('profiles')
        .update({ push_token: pushToken })
        .eq('user_id', user.id);
      
      setToken(pushToken);
    } catch (error) {
      console.error('Error saving push token:', error);
    }
  };

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    // Register for push notifications
    PushNotifications.addListener('registration', (token) => {
      console.log('Push registration success, token: ' + token.value);
      setIsRegistered(true);
      savePushToken(token.value);
    });

    // Handle registration errors
    PushNotifications.addListener('registrationError', (error) => {
      console.error('Push registration error:', error);
      setIsRegistered(false);
    });

    // Handle incoming notifications
    PushNotifications.addListener('pushNotificationReceived', (notification) => {
      console.log('Push received: ', notification);
      
      // Show local toast for received notifications
      toast({
        title: notification.title || "Nouvelle notification",
        description: notification.body || "",
      });
    });

    // Handle notification tap
    PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
      console.log('Push action performed: ', notification);
      
      // Handle navigation based on notification data
      const data = notification.notification.data;
      if (data?.type) {
        handleNotificationTap(data);
      }
    });

    return () => {
      PushNotifications.removeAllListeners();
    };
  }, [user]);

  const handleNotificationTap = (data: any) => {
    switch (data.type) {
      case 'friend_request':
        // Navigate to notifications/profile
        window.location.href = '/profile';
        break;
      case 'session_created':
      case 'session_request':
      case 'request_accepted':
        // Navigate to messages or sessions
        window.location.href = '/';
        break;
      default:
        break;
    }
  };

  return {
    isRegistered,
    token,
    requestPermissions,
    isNative: Capacitor.isNativePlatform()
  };
};