import { useState, useEffect, useCallback } from 'react';
import { PushNotifications } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from './use-toast';
import { useNavigate } from 'react-router-dom';

interface NotificationPermissionStatus {
  granted: boolean;
  denied: boolean;
  prompt: boolean;
}

export const usePushNotifications = () => {
  const [isRegistered, setIsRegistered] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermissionStatus>({
    granted: false,
    denied: false,
    prompt: true
  });
  
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  // DÉTECTION NATIVE CORRECTE - pas de faux positifs
  const isNative = Capacitor.isNativePlatform();
  const isSupported = isNative || ('Notification' in window);

  // Vérifier le statut des permissions
  const checkPermissionStatus = useCallback(async () => {
    try {
      if (isNative) {
        const status = await PushNotifications.checkPermissions();
        const granted = status.receive === 'granted';
        const denied = status.receive === 'denied';
        
        setPermissionStatus({
          granted,
          denied,
          prompt: !granted && !denied
        });
        
        setIsRegistered(granted);
      } else if ('Notification' in window) {
        const permission = Notification.permission;
        const granted = permission === 'granted';
        const denied = permission === 'denied';
        
        setPermissionStatus({
          granted,
          denied,
          prompt: permission === 'default'
        });
        
        setIsRegistered(granted);
      }
    } catch (error) {
      console.error('❌ Erreur vérification permissions:', error);
    }
  }, [isNative]);

  // Plugin Android pour Android 13+
  const requestAndroidNotifications = async (): Promise<boolean> => {
    try {
      console.log('🤖 Demande permissions Android via plugin...');
      
      // Utiliser le plugin personnalisé pour Android 13+ POST_NOTIFICATIONS
      const plugin = (window as any).CapacitorCustomPlugins?.PermissionsPlugin;
      if (plugin) {
        const result = await plugin.requestNotificationPermissions();
        console.log('📱 Résultat plugin Android:', result);
        
        if (result.granted) {
          // Tester avec une vraie notification locale
          await plugin.showLocalNotification({
            title: "RunConnect",
            body: "Notifications activées avec succès ! 🎉"
          });
          
          return true;
        } else {
          console.log('❌ Permissions Android refusées');
          return false;
        }
      }
    } catch (error) {
      console.error('❌ Erreur plugin Android:', error);
    }
    
    return false;
  };

  const requestPermissions = async (): Promise<boolean> => {
    console.log('🔔 Demande permissions notifications...');
    
    try {
      if (isNative) {
        // STRATÉGIE ANDROID NATIVE
        console.log('📱 Mode natif détecté');
        
        // 1. Essayer plugin Android en priorité (POST_NOTIFICATIONS)
        const androidSuccess = await requestAndroidNotifications();
        if (androidSuccess) {
          console.log('✅ Plugin Android réussi');
          setIsRegistered(true);
          toast({
            title: "Notifications activées !",
            description: "Vous recevrez les notifications push"
          });
          return true;
        }
        
        // 2. Fallback Capacitor standard
        console.log('🔄 Fallback Capacitor...');
        const permission = await PushNotifications.requestPermissions();
        
        if (permission.receive === 'granted') {
          console.log('✅ Capacitor réussi');
          await PushNotifications.register();
          setIsRegistered(true);
          
          toast({
            title: "Notifications activées !",
            description: "Vous recevrez les notifications push"
          });
          return true;
        } else {
          console.log('❌ Capacitor refusé:', permission.receive);
          toast({
            title: "Permission refusée",
            description: "Activez les notifications dans Paramètres > Applications > RunConnect > Notifications",
            variant: "destructive"
          });
          return false;
        }
      } else if ('Notification' in window) {
        // STRATÉGIE WEB
        console.log('🌐 Mode web détecté');
        const permission = await Notification.requestPermission();
        
        if (permission === 'granted') {
          console.log('✅ Web notifications accordées');
          setIsRegistered(true);
          
          // Tester avec une notification web
          if ('Notification' in window) {
            new Notification('RunConnect', {
              body: 'Notifications web activées ! 🎉',
              icon: '/favicon.png'
            });
          }
          
          toast({
            title: "Notifications activées !",
            description: "Vous recevrez les notifications"
          });
          return true;
        } else {
          console.log('❌ Web notifications refusées');
          toast({
            title: "Permission refusée",
            description: "Activez les notifications dans les paramètres du navigateur",
            variant: "destructive"
          });
          return false;
        }
      } else {
        console.log('❌ Notifications non supportées');
        toast({
          title: "Non supporté",
          description: "Les notifications ne sont pas disponibles sur cet appareil",
          variant: "destructive"
        });
        return false;
      }
    } catch (error) {
      console.error('🔔❌ ERREUR PERMISSIONS:', error);
      toast({
        title: "Erreur",
        description: "Impossible de configurer les notifications",
        variant: "destructive"
      });
      return false;
    }
  };

  // Sauvegarder le token push
  const savePushToken = useCallback(async (pushToken: string) => {
    if (!user) return;

    try {
      console.log('💾 Sauvegarde token push...');
      const { error } = await supabase
        .from('profiles')
        .update({ 
          push_token: pushToken,
          notifications_enabled: true 
        })
        .eq('user_id', user.id);
      
      if (error) {
        console.error('❌ Erreur sauvegarde token:', error);
      } else {
        console.log('✅ Token sauvegardé');
        setToken(pushToken);
      }
    } catch (error) {
      console.error('❌ Exception sauvegarde token:', error);
    }
  }, [user]);

  // Gestion des clics sur notification
  const handleNotificationTap = useCallback((data: any) => {
    console.log('👆 Notification cliquée:', data);
    
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
          console.log('Type notification inconnu:', actionData.type);
      }
    } catch (error) {
      console.error('❌ Erreur gestion clic notification:', error);
    }
  }, [navigate]);

  // Test de notification
  const testNotification = useCallback(async () => {
    if (!user) return;

    try {
      console.log('🧪 Test notification...');
      
      const { error } = await supabase.functions.invoke('send-push-notification', {
        body: {
          user_id: user.id,
          title: 'Test RunConnect',
          body: 'Vos notifications fonctionnent parfaitement ! 🎉',
          type: 'test',
          data: { test: true }
        }
      });

      if (error) {
        console.error('❌ Erreur test notification:', error);
        toast({
          title: "Erreur test",
          description: "Impossible d'envoyer la notification de test",
          variant: "destructive"
        });
      } else {
        console.log('✅ Test notification envoyé');
        toast({
          title: "Test envoyé",
          description: "Notification de test envoyée avec succès!"
        });
      }
    } catch (error) {
      console.error('❌ Exception test notification:', error);
    }
  }, [user, toast]);

  // Configuration des listeners
  useEffect(() => {
    if (!user) return;

    // Vérifier le statut au montage
    checkPermissionStatus();

    // Listeners natifs seulement
    if (isNative) {
      console.log('🎧 Configuration listeners push natifs...');
      
      const setupListeners = async () => {
        // Succès d'enregistrement
        const regListener = await PushNotifications.addListener('registration', (token) => {
          console.log('✅ Enregistrement push réussi:', token.value);
          setToken(token.value);
          setIsRegistered(true);
          savePushToken(token.value);
        });

        // Erreur d'enregistrement
        const regErrorListener = await PushNotifications.addListener('registrationError', (error) => {
          console.error('❌ Erreur enregistrement push:', error);
          setIsRegistered(false);
        });

        // Notification reçue
        const notifListener = await PushNotifications.addListener('pushNotificationReceived', (notification) => {
          console.log('📱 Notification reçue:', notification);
          
          toast({
            title: notification.title || "Nouvelle notification",
            description: notification.body || "",
          });
        });

        // Notification cliquée
        const actionListener = await PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
          console.log('👆 Notification action:', notification);
          handleNotificationTap(notification.notification);
        });

        return () => {
          regListener?.remove();
          regErrorListener?.remove();
          notifListener?.remove();
          actionListener?.remove();
        };
      };

      let cleanup: (() => void) | undefined;
      setupListeners().then(cleanupFn => cleanup = cleanupFn);

      return cleanup;
    }
  }, [user, isNative, savePushToken, handleNotificationTap, checkPermissionStatus, toast]);

  return {
    isRegistered,
    token,
    permissionStatus,
    requestPermissions,
    testNotification,
    isNative,
    isSupported
  };
};