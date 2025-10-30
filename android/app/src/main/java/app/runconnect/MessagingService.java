package app.runconnect;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Intent;
import android.os.Build;
import android.util.Log;
import androidx.core.app.NotificationCompat;
import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;

/**
 * Service personnalisé pour Firebase Cloud Messaging
 * Gère la réception des tokens FCM et des notifications push
 */
public class MessagingService extends FirebaseMessagingService {
    private static final String TAG = "RunConnect-FCM";
    private static final String CHANNEL_ID = "high_importance_channel";
    private static final String GROUP_KEY = "runconnect_group";
    private static int notificationCounter = 0;

    /**
     * Appelé quand un nouveau token FCM est généré ou mis à jour
     */
    @Override
    public void onNewToken(String token) {
        super.onNewToken(token);
        
        Log.d(TAG, "🔥🔥🔥 [FCM] NOUVEAU TOKEN REÇU !");
        Log.d(TAG, "🔥 [FCM] Token: " + token);
        
        // Créer le canal de notification si nécessaire
        createNotificationChannel();
        
        // Envoyer le token à JavaScript via l'événement window
        try {
        // Injecter le token dans window pour que React puisse le récupérer
            String jsCode = String.format(
                "window.fcmToken = '%s'; " +
                "window.dispatchEvent(new CustomEvent('fcmTokenReady', {detail: {token: '%s'}})); " +
                "window.dispatchEvent(new CustomEvent('pushNotificationRegistration', {detail: {value: {token: '%s'}}})); " +
                "console.log('🔥 [FCM Service] Token injecté dans window:', '%s');",
                token, token, token, token.substring(0, 30) + "..."
            );
            
            Log.d(TAG, "✅ [FCM] Token prêt à être injecté dans JavaScript");
            
            // Stocker le token globalement pour qu'il soit accessible
            if (MainActivity.instance != null && MainActivity.instance.webView != null) {
                MainActivity.instance.runOnUiThread(() -> {
                    MainActivity.instance.webView.evaluateJavascript(jsCode, null);
                    Log.d(TAG, "✅ [FCM] Token injecté dans WebView");
                });
            } else {
                Log.w(TAG, "⚠️ [FCM] MainActivity ou WebView non disponible, token stocké temporairement");
                // Stocker dans SharedPreferences pour récupération ultérieure
                getSharedPreferences("RunConnectPrefs", MODE_PRIVATE)
                    .edit()
                    .putString("fcm_token", token)
                    .apply();
            }
        } catch (Exception e) {
            Log.e(TAG, "❌ [FCM] Erreur injection token:", e);
        }
        
        // Envoyer au serveur via Capacitor PushNotifications plugin
        // Le plugin Capacitor s'occupera de dispatcher l'événement 'registration'
    }

    /**
     * Appelé quand une notification est reçue pendant que l'app est au premier plan
     */
    @Override
    public void onMessageReceived(RemoteMessage remoteMessage) {
        super.onMessageReceived(remoteMessage);
        
        Log.d(TAG, "📱 [FCM] Message reçu de: " + remoteMessage.getFrom());
        
        // Vérifier si le message contient une notification
        if (remoteMessage.getNotification() != null) {
            String title = remoteMessage.getNotification().getTitle();
            String body = remoteMessage.getNotification().getBody();
            
            Log.d(TAG, "📬 [FCM] Notification reçue:");
            Log.d(TAG, "  📝 Titre: " + title);
            Log.d(TAG, "  💬 Body: " + body);
            
            // Afficher la notification
            showNotification(title, body, remoteMessage.getData());
        }
        
        // Vérifier si le message contient des données
        if (remoteMessage.getData().size() > 0) {
            Log.d(TAG, "📦 [FCM] Données reçues: " + remoteMessage.getData());
        }
    }

    /**
     * Affiche une notification système
     */
    private void showNotification(String title, String body, java.util.Map<String, String> data) {
        // Créer le canal de notification
        createNotificationChannel();
        
        // Intent pour ouvrir l'app quand on clique sur la notification
        Intent intent = new Intent(this, MainActivity.class);
        intent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        
        // Ajouter les données à l'intent
        for (java.util.Map.Entry<String, String> entry : data.entrySet()) {
            intent.putExtra(entry.getKey(), entry.getValue());
        }
        
        // ✅ MODIFIÉ: FLAG_IMMUTABLE pour Android 12+
        int flags = PendingIntent.FLAG_ONE_SHOT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            flags |= PendingIntent.FLAG_IMMUTABLE;
        } else {
            flags |= PendingIntent.FLAG_UPDATE_CURRENT;
        }
        
        PendingIntent pendingIntent = PendingIntent.getActivity(
            this, 
            0, 
            intent, 
            flags
        );
        
        // Increment counter for grouping
        notificationCounter++;
        
        // ✅ MODIFIÉ: Notification plus riche avec groupement
        NotificationCompat.Builder notificationBuilder = new NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentTitle(title != null ? title : "RunConnect")
            .setContentText(body != null ? body : "Nouvelle notification")
            .setStyle(new NotificationCompat.BigTextStyle().bigText(body)) // ← Texte long
            .setAutoCancel(true)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setDefaults(NotificationCompat.DEFAULT_ALL) // ← Son + vibration + LED
            .setContentIntent(pendingIntent)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC) // ← Affichage écran verrouillé
            .setCategory(NotificationCompat.CATEGORY_MESSAGE)
            .setColor(0xFF3B82F6) // ← Couleur primaire (bleu)
            .setGroup(GROUP_KEY); // ← Groupement des notifications
        
        NotificationManager notificationManager = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
        
        if (notificationManager != null) {
            int notificationId = (int) System.currentTimeMillis();
            notificationManager.notify(notificationId, notificationBuilder.build());
            
            Log.d(TAG, "✅ [FCM] Notification affichée (ID: " + notificationId + ")");
            
            // Create summary notification if we have multiple notifications
            if (notificationCounter > 1) {
                createSummaryNotification(notificationManager);
            }
        } else {
            Log.e(TAG, "❌ [FCM] NotificationManager non disponible");
        }
    }

    /**
     * Crée une notification récapitulative pour grouper plusieurs notifications
     */
    private void createSummaryNotification(NotificationManager notificationManager) {
        NotificationCompat.Builder summaryBuilder = new NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentTitle("RunConnect")
            .setContentText(notificationCounter + " nouvelles notifications")
            .setGroup(GROUP_KEY)
            .setGroupSummary(true)
            .setAutoCancel(true)
            .setColor(0xFF3B82F6);
        
        notificationManager.notify(0, summaryBuilder.build());
        Log.d(TAG, "✅ [FCM] Notification récapitulative créée (" + notificationCounter + " notifications)");
    }

    /**
     * Crée le canal de notification pour Android O+
     */
    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                "Notifications RunConnect",
                NotificationManager.IMPORTANCE_HIGH
            );
            channel.setDescription("Notifications importantes de RunConnect");
            channel.enableVibration(true);
            channel.enableLights(true);
            channel.setShowBadge(true);
            
            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) {
                manager.createNotificationChannel(channel);
                Log.d(TAG, "✅ [FCM] Canal de notification créé: " + CHANNEL_ID);
            }
        }
    }
}
