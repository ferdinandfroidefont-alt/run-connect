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
    try {
      console.log('🔍 Push permissions debug:', {
        isNativePlatform: Capacitor.isNativePlatform(),
        platform: Capacitor.getPlatform(),
        hostname: window.location.hostname,
        hasCapacitorPush: !!(window as any).Capacitor?.Plugins?.PushNotifications,
        hasNotificationAPI: 'Notification' in window
      });

      // Priority 1: Real native app (deployed to stores)
      if (Capacitor.isNativePlatform()) {
        console.log('🔍 Using Capacitor native push notifications');
        
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
      } 
      // Priority 2: Web browsers (including mobile browsers and Lovable dev)
      else if ('Notification' in window) {
        console.log('🔍 Using web push notifications');
        
        const permission = await Notification.requestPermission();
        
        if (permission === 'granted') {
          setIsRegistered(true);
          
          // Register service worker for web push notifications
          if ('serviceWorker' in navigator) {
            try {
              const registration = await navigator.serviceWorker.register('/sw.js');
              console.log('Service Worker registered:', registration);
              
              toast({
                title: "Notifications activées !",
                description: "Vous recevrez maintenant les notifications"
              });
              
              return true;
            } catch (swError) {
              console.error('Service Worker registration failed:', swError);
              setIsRegistered(true);
              toast({
                title: "Notifications activées !",
                description: "Vous recevrez maintenant les notifications"
              });
              return true;
            }
          } else {
            setIsRegistered(true);
            toast({
              title: "Notifications activées !",
              description: "Vous recevrez maintenant les notifications"
            });
            return true;
          }
        } else {
          toast({
            title: "Permission refusée",
            description: "Activez les notifications dans les paramètres de votre navigateur",
            variant: "destructive"
          });
          return false;
        }
      } 
      // Fallback: No notification support
      else {
        console.log('❌ No notification support detected');
        toast({
          title: "Non supporté",
          description: "Les notifications ne sont pas supportées sur cet appareil",
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
      // Note: This will fail until types are regenerated after migration
      const { error } = await supabase
        .from('profiles')
        .update({ push_token: pushToken })
        .eq('user_id', user.id);
      
      if (error) {
        console.error('Error saving push token:', error);
      } else {
        setToken(pushToken);
      }
    } catch (error) {
      console.error('Error saving push token:', error);
    }
  };

  useEffect(() => {
    // Check if notifications are already granted on web
    if ('Notification' in window && Notification.permission === 'granted') {
      setIsRegistered(true);
    }

    // Setup Capacitor listeners on native platforms
    if (Capacitor.isNativePlatform()) {
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
    }

    return () => {
      if (Capacitor.isNativePlatform()) {
        PushNotifications.removeAllListeners();
      }
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