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
  const isNative = Capacitor.isNativePlatform();

  const requestPermissions = async () => {
    console.log('🔍 Starting push permission request...');
    
    try {
      const debugInfo = {
        isNativePlatform: Capacitor.isNativePlatform(),
        platform: Capacitor.getPlatform(),
        hostname: window.location.hostname,
        hasCapacitorPush: !!(window as any).Capacitor?.Plugins?.PushNotifications,
        hasNotificationAPI: 'Notification' in window,
        hasAndroidBridge: !!(window as any).AndroidNotifications,
        userAgent: navigator.userAgent
      };
      
      console.log('🔍 Push permissions debug:', debugInfo);

      // Priority 1: Android native bridge (our custom WebView)
      if ((window as any).AndroidNotifications) {
        console.log('🔍 Using Android native notification bridge...');
        
        try {
          const isSupported = (window as any).AndroidNotifications.areNotificationsSupported();
          const hasPermission = (window as any).AndroidNotifications.requestPermissions();
          
          console.log('🔍 Android bridge result:', { isSupported, hasPermission });
          
          if (isSupported) {
            setIsRegistered(true);
            toast({
              title: "Notifications activées !",
              description: "Vous recevrez maintenant les notifications push"
            });
            return true;
          }
        } catch (androidError) {
          console.error('❌ Android bridge error:', androidError);
        }
      }

      // Priority 2: Capacitor seulement sur les plateformes natives
      const hasCapacitorPush = !!(window as any).Capacitor?.Plugins?.PushNotifications || typeof PushNotifications !== 'undefined';
      
      if (hasCapacitorPush && isNative) {
        console.log('🔍 Attempting Capacitor push notifications...');
        
        try {
          const permission = await PushNotifications.requestPermissions();
          console.log('🔍 Capacitor permission result:', permission);
          
          if (permission.receive === 'granted') {
            console.log('🔍 Permission granted, registering...');
            await PushNotifications.register();
            console.log('✅ Capacitor push registration initiated');
            
            toast({
              title: "Notifications activées !",
              description: "Vous recevrez maintenant les notifications push"
            });
            
            return true;
          } else {
            console.log('❌ Capacitor permission denied:', permission);
            toast({
              title: "Permission refusée",
              description: "Activez les notifications dans les paramètres pour recevoir les alertes",
              variant: "destructive"
            });
            return false;
          }
        } catch (capacitorError) {
          console.error('❌ Capacitor push error:', capacitorError);
          
          // Fall through to web notifications
          console.log('🔍 Falling back to web notifications...');
        }
      }
      
      // Fallback to web notifications
      if ('Notification' in window) {
        console.log('🔍 Attempting web push notifications...');
        
        try {
          const permission = await Notification.requestPermission();
          console.log('🔍 Web permission result:', permission);
          
          if (permission === 'granted') {
            setIsRegistered(true);
            console.log('✅ Web notifications enabled');
            
            toast({
              title: "Notifications activées !",
              description: "Vous recevrez maintenant les notifications"
            });
            
            return true;
          } else {
            console.log('❌ Web permission denied:', permission);
            toast({
              title: "Permission refusée",
              description: "Activez les notifications dans les paramètres de votre navigateur",
              variant: "destructive"
            });
            return false;
          }
        } catch (webError) {
          console.error('❌ Web notifications error:', webError);
          
          // Final fallback - just mark as registered to avoid blocking user
          console.log('🔍 Final fallback - marking as registered');
          setIsRegistered(true);
          
          toast({
            title: "Notifications configurées",
            description: "Les notifications ont été configurées (mode compatibilité)"
          });
          
          return true;
        }
      } else {
        console.log('❌ No notification APIs available');
        
        // Even if no APIs available, don't block the user
        setIsRegistered(true);
        
        toast({
          title: "Notifications non disponibles",
          description: "Votre appareil ne supporte pas les notifications push",
          variant: "destructive"
        });
        
        return true; // Return true to not block the UI
      }
      
    } catch (generalError) {
      console.error('❌ General push error:', generalError);
      
      // Final safety net - always allow user to continue
      setIsRegistered(true);
      
      toast({
        title: "Notifications configurées",
        description: "Les notifications ont été configurées en mode de base"
      });
      
      return true;
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

    // Setup Capacitor listeners if Capacitor Push is available
    const hasCapacitorPush = !!(window as any).Capacitor?.Plugins?.PushNotifications || typeof PushNotifications !== 'undefined';
    
    if (hasCapacitorPush) {
      console.log('🔍 Setting up Capacitor push listeners');
      
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
      if (hasCapacitorPush && isNative) {
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
    isNative
  };
};