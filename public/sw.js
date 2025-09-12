// Service Worker pour les notifications push web
self.addEventListener('install', (event) => {
  console.log('Service Worker installing');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker activating');
  event.waitUntil(self.clients.claim());
});

// Gérer les messages push reçus en arrière-plan
self.addEventListener('push', (event) => {
  console.log('Push message received:', event);
  
  let title = 'Nouvelle notification';
  let body = 'Vous avez reçu une nouvelle notification';
  let icon = '/favicon.png';
  
  if (event.data) {
    try {
      const data = event.data.json();
      title = data.title || title;
      body = data.body || body;
      icon = data.icon || icon;
    } catch (e) {
      console.error('Error parsing push data:', e);
    }
  }
  
  const options = {
    body,
    icon,
    badge: '/favicon.png',
    vibrate: [200, 100, 200],
    data: event.data ? event.data.json() : {},
    actions: [
      {
        action: 'open',
        title: 'Ouvrir'
      },
      {
        action: 'close',
        title: 'Fermer'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Gérer les clics sur les notifications
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event);
  
  event.notification.close();
  
  if (event.action === 'close') {
    return;
  }
  
  // Ouvrir ou focus sur l'application
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clients) => {
      // Si l'app est déjà ouverte dans un onglet, la focus
      for (const client of clients) {
        if (client.url.includes(self.location.origin)) {
          return client.focus();
        }
      }
      // Sinon, ouvrir un nouvel onglet
      return self.clients.openWindow('/');
    })
  );
});