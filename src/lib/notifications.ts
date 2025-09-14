import { PushNotifications } from '@capacitor/push-notifications';

// Demander la permission de recevoir des notifications
export async function requestNotificationPermission() {
  const permStatus = await PushNotifications.checkPermissions();

  if (permStatus.receive !== 'granted') {
    const request = await PushNotifications.requestPermissions();
    if (request.receive !== 'granted') {
      throw new Error('Permission notifications refusée');
    }
  }
}

// Initialiser les notifications
export async function initPushNotifications() {
  await requestNotificationPermission();

  // Enregistrement auprès du système (Android / iOS)
  await PushNotifications.register();

  // Écoute des notifications reçues
  PushNotifications.addListener('pushNotificationReceived', (notification) => {
    console.log('Notification reçue : ', notification);
  });

  // Quand l’utilisateur clique sur une notif
  PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
    console.log('Notification ouverte : ', notification);
  });
}
