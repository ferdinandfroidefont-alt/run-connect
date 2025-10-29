package app.runconnect;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.graphics.Color;
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
    private static final String TAG = "RunConnectFCM";
    private static final String CHANNEL_ID = "runconnect_default";

    /**
     * Appelé quand un nouveau token FCM est généré ou mis à jour
     */
    @Override
    public void onNewToken(String token) {
        super.onNewToken(token);
        
        Log.d(TAG, "🎯 Nouveau token FCM: " + token);
        
        // 🔥 Injecter le token dans la WebView si l'app est ouverte
        try {
            String jsCode = "window.fcmToken = '" + token + "';" +
                "window.dispatchEvent(new CustomEvent('fcmTokenReady', { detail: { token: '" + token + "' } }));";
            MainActivity activity = MainActivityHolder.getInstance();
            if (activity != null && activity.webView != null) {
                activity.webView.post(() -> {
                    activity.webView.evaluateJavascript(jsCode, null);
                    Log.d(TAG, "✅ Token injecté dans WebView");
                });
            } else {
                Log.w(TAG, "⚠️ WebView non disponible pour injection token");
                // Stocker dans SharedPreferences pour récupération ultérieure
                getSharedPreferences("RunConnectPrefs", MODE_PRIVATE)
                    .edit()
                    .putString("fcm_token", token)
                    .apply();
            }
        } catch (Exception e) {
            Log.e(TAG, "❌ Erreur injection token JS:", e);
        }
    }

    /**
     * Appelé quand une notification est reçue pendant que l'app est au premier plan
     */
    @Override
    public void onMessageReceived(RemoteMessage remoteMessage) {
        super.onMessageReceived(remoteMessage);
        
        Log.d(TAG, "📩 Notification reçue: " + remoteMessage.getData());

        String title = "RunConnect";
        String body = "Nouvelle notification";

        if (remoteMessage.getNotification() != null) {
            title = remoteMessage.getNotification().getTitle();
            body = remoteMessage.getNotification().getBody();
        } else if (remoteMessage.getData().containsKey("title")) {
            title = remoteMessage.getData().get("title");
            body = remoteMessage.getData().get("body");
        }

        sendNotification(title, body, remoteMessage.getData());
    }

    /**
     * Affiche une notification système
     */
    private void sendNotification(String title, String messageBody, java.util.Map<String, String> data) {
        NotificationManager notificationManager =
                (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID,
                    "RunConnect Notifications",
                    NotificationManager.IMPORTANCE_HIGH);
            channel.setDescription("Notifications des activités et messages RunConnect");
            channel.enableLights(true);
            channel.setLightColor(Color.CYAN);
            channel.enableVibration(true);
            notificationManager.createNotificationChannel(channel);
        }

        Intent intent = new Intent(this, MainActivity.class);
        intent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP);
        
        // Ajouter les données de la notification à l'intent
        if (data != null) {
            for (java.util.Map.Entry<String, String> entry : data.entrySet()) {
                intent.putExtra(entry.getKey(), entry.getValue());
            }
        }
        
        PendingIntent pendingIntent = PendingIntent.getActivity(this, 0, intent,
                PendingIntent.FLAG_ONE_SHOT | PendingIntent.FLAG_IMMUTABLE);

        NotificationCompat.Builder notificationBuilder =
                new NotificationCompat.Builder(this, CHANNEL_ID)
                        .setSmallIcon(R.mipmap.ic_launcher)
                        .setContentTitle(title)
                        .setContentText(messageBody)
                        .setAutoCancel(true)
                        .setColor(Color.CYAN)
                        .setContentIntent(pendingIntent)
                        .setPriority(NotificationCompat.PRIORITY_HIGH);

        notificationManager.notify((int) System.currentTimeMillis(), notificationBuilder.build());
        Log.d(TAG, "✅ Notification affichée");
    }
}
