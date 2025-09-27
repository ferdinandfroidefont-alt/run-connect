import { useState, useEffect, useCallback } from 'react';
import { PushNotifications } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { enhancedToast } from '@/components/ui/enhanced-toast';
import { useNavigate } from 'react-router-dom';

interface NotificationPermissionStatus {
  granted: boolean;
  denied: boolean;
  prompt: boolean;
}

interface PushNotificationHook {
  isRegistered: boolean;
  token: string | null;
  permissionStatus: NotificationPermissionStatus;
  requestPermissions: () => Promise<boolean>;
  isNative: boolean;
  isSupported: boolean;
  registerForNotifications: () => Promise<void>;
  testNotification: () => Promise<void>;
}

export const usePushNotificationsEnhanced = (): PushNotificationHook => {
  const [isRegistered, setIsRegistered] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermissionStatus>({
    granted: false,
    denied: false,
    prompt: true
  });
  
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const isNative = Capacitor.isNativePlatform();
  const isSupported = isNative || ('Notification' in window && 'serviceWorker' in navigator);

  // Check current permission status
  const checkPermissionStatus = useCallback(async () => {
    try {
      if (isNative) {
        // Capacitor native
        const status = await PushNotifications.checkPermissions();
        const granted = status.receive === 'granted';
        const denied = status.receive === 'denied';
        
        setPermissionStatus({
          granted,
          denied,
          prompt: !granted && !denied
        });
      } else if ('Notification' in window) {
        // Web notifications
        const permission = Notification.permission;
        setPermissionStatus({
          granted: permission === 'granted',
          denied: permission === 'denied',
          prompt: permission === 'default'
        });
      }
    } catch (error) {
      console.error('❌ Error checking permission status:', error);
    }
  }, [isNative]);

  // Save push token to Supabase
  const savePushToken = useCallback(async (pushToken: string) => {
    if (!user) return;

    try {
      console.log('💾 Saving push token to profile...');
      
      const { error } = await supabase
        .from('profiles')
        .update({ 
          push_token: pushToken,
          notifications_enabled: true 
        })
        .eq('user_id', user.id);

      if (error) {
        console.error('❌ Error saving push token:', error);
        enhancedToast.error({
          title: 'Erreur',
          description: 'Impossible de sauvegarder le token de notification'
        });
      } else {
        console.log('✅ Push token saved successfully');
      }
    } catch (error) {
      console.error('❌ Exception saving push token:', error);
    }
  }, [user]);

  // Request permissions and register
  const requestPermissions = useCallback(async (): Promise<boolean> => {
    console.log('🔐 Requesting push notification permissions...');
    
    try {
      if (isNative) {
        // Capacitor native permissions
        const permission = await PushNotifications.requestPermissions();
        
        if (permission.receive === 'granted') {
          console.log('✅ Native permissions granted');
          await registerForNotifications();
          return true;
        } else {
          console.log('❌ Native permissions denied');
          enhancedToast.error({
            title: 'Permissions refusées',
            description: 'Les notifications push ont été refusées. Vous pouvez les activer dans les paramètres de l\'app.'
          });
          return false;
        }
      } else if ('Notification' in window) {
        // Web notifications
        const permission = await Notification.requestPermission();
        
        if (permission === 'granted') {
          console.log('✅ Web permissions granted');
          // Register service worker and get token
          await registerWebPushNotifications();
          return true;
        } else {
          console.log('❌ Web permissions denied');
          enhancedToast.error({
            title: 'Permissions refusées',
            description: 'Les notifications ont été refusées. Vous pouvez les activer dans les paramètres du navigateur.'
          });
          return false;
        }
      } else {
        enhancedToast.warning({
          title: 'Non supporté',
          description: 'Les notifications push ne sont pas supportées sur ce dispositif.'
        });
        return false;
      }
    } catch (error) {
      console.error('❌ Error requesting permissions:', error);
      enhancedToast.error({
        title: 'Erreur',
        description: 'Erreur lors de la demande de permissions'
      });
      return false;
    }
  }, [isNative, savePushToken]);

  // Register for native push notifications
  const registerForNotifications = useCallback(async () => {
    if (!isNative) return;

    try {
      console.log('📱 Registering for native push notifications...');
      await PushNotifications.register();
    } catch (error) {
      console.error('❌ Error registering for push notifications:', error);
      enhancedToast.error({
        title: 'Erreur d\'enregistrement',
        description: 'Impossible de s\'enregistrer pour les notifications push'
      });
    }
  }, [isNative]);

  // Register web push notifications
  const registerWebPushNotifications = useCallback(async () => {
    try {
      if (!('serviceWorker' in navigator)) {
        throw new Error('Service Workers not supported');
      }

      // Register service worker
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('✅ Service Worker registered:', registration);

      // For web, we'll use a simple identifier as token
      const webToken = `web_${user?.id}_${Date.now()}`;
      setToken(webToken);
      await savePushToken(webToken);
      
      setIsRegistered(true);
      enhancedToast.success({
        title: 'Notifications activées',
        description: 'Vous recevrez maintenant des notifications push'
      });

    } catch (error) {
      console.error('❌ Error registering web push:', error);
      enhancedToast.error({
        title: 'Erreur',
        description: 'Impossible d\'activer les notifications web'
      });
    }
  }, [user?.id, savePushToken]);

  // Test notification
  const testNotification = useCallback(async () => {
    if (!user) return;

    try {
      console.log('🔔 Sending test notification...');
      
      const { error } = await supabase.functions.invoke('send-push-notification', {
        body: {
          user_id: user.id,
          title: 'Test notification',
          body: 'Ceci est une notification de test de RunConnect!',
          type: 'test',
          data: { test: true }
        }
      });

      if (error) {
        console.error('❌ Error sending test notification:', error);
        enhancedToast.error({
          title: 'Erreur de test',
          description: 'Impossible d\'envoyer la notification de test'
        });
      } else {
        enhancedToast.success({
          title: 'Test envoyé',
          description: 'Notification de test envoyée avec succès!'
        });
      }
    } catch (error) {
      console.error('❌ Exception sending test notification:', error);
    }
  }, [user]);

  // Handle notification tap
  const handleNotificationTap = useCallback((data: any) => {
    console.log('👆 Notification tapped:', data);
    
    try {
      const actionData = data?.actionData || data?.data || {};
      
      switch (actionData.type) {
        case 'message':
          if (actionData.conversation_id) {
            navigate(`/messages?conversation=${actionData.conversation_id}`);
          } else {
            navigate('/messages');
          }
          break;
        case 'follow_request':
          navigate('/profile');
          break;
        case 'session_request':
          navigate('/');
          break;
        default:
          console.log('Unknown notification type:', actionData.type);
      }
    } catch (error) {
      console.error('❌ Error handling notification tap:', error);
    }
  }, [navigate]);

  // Setup event listeners
  useEffect(() => {
    if (!isNative || !user) return;

    console.log('🎧 Setting up push notification listeners...');

    // Setup listeners with proper awaiting
    let registrationListener: any;
    let registrationErrorListener: any;
    let notificationReceivedListener: any;
    let notificationActionListener: any;

    const setupListeners = async () => {
      // Registration success
      registrationListener = await PushNotifications.addListener('registration', (token) => {
        console.log('✅ Push registration success:', token.value);
        setToken(token.value);
        setIsRegistered(true);
        savePushToken(token.value);
        
        enhancedToast.success({
          title: 'Notifications activées',
          description: 'Vous recevrez maintenant des notifications push'
        });
      });

      // Registration error
      registrationErrorListener = await PushNotifications.addListener('registrationError', (error) => {
        console.error('❌ Push registration error:', error);
        enhancedToast.error({
          title: 'Erreur d\'enregistrement',
          description: 'Impossible de s\'enregistrer pour les notifications push'
        });
      });

      // Notification received
      notificationReceivedListener = await PushNotifications.addListener('pushNotificationReceived', (notification) => {
        console.log('📱 Push notification received:', notification);
        
        // Show local notification on web if needed
        if (!isNative && 'Notification' in window && Notification.permission === 'granted') {
          new Notification(notification.title || 'RunConnect', {
            body: notification.body || '',
            icon: '/favicon.png',
            badge: '/favicon.png'
          });
        }
      });

      // Notification tapped
      notificationActionListener = await PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
        console.log('👆 Push notification action performed:', notification);
        handleNotificationTap(notification.notification);
      });
    };

    setupListeners();

    // Check permission status on mount
    checkPermissionStatus();

    // Cleanup listeners
    return () => {
      registrationListener?.remove();
      registrationErrorListener?.remove();
      notificationReceivedListener?.remove();
      notificationActionListener?.remove();
    };
  }, [isNative, user, savePushToken, handleNotificationTap, checkPermissionStatus]);

  // Web notification listener
  useEffect(() => {
    if (isNative || !('Notification' in window)) return;

    const handleWebNotificationClick = (event: Event) => {
      const notification = event.target as Notification;
      notification.close();
      
      // Handle web notification click
      window.focus();
    };

    // Add event listener for web notifications
    if ('Notification' in window) {
      checkPermissionStatus();
    }

    return () => {
      // Cleanup if needed
    };
  }, [isNative, checkPermissionStatus]);

  return {
    isRegistered,
    token,
    permissionStatus,
    requestPermissions,
    isNative,
    isSupported,
    registerForNotifications,
    testNotification
  };
};