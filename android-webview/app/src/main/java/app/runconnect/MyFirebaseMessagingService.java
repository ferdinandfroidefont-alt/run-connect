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

public class MyFirebaseMessagingService extends FirebaseMessagingService {
    private static final String TAG = "RunConnectFCM";
    private static final String CHANNEL_ID = "runconnect_channel";

    @Override
    public void onNewToken(String token) {
        super.onNewToken(token);
        Log.d(TAG, "🔥 [WebView AAB] Nouveau token FCM: " + token);
        
        // Injecter dans la WebView si disponible
        try {
            String jsCode = "window.fcmToken = '" + token + "';" +
                "window.dispatchEvent(new CustomEvent('fcmTokenReady', { detail: { token: '" + token + "' } }));";
            
            if (MainActivity.instance != null && MainActivity.instance.webView != null) {
                MainActivity.instance.webView.post(() -> 
                    MainActivity.instance.webView.evaluateJavascript(jsCode, null)
                );
            }
        } catch (Exception e) {
            Log.e(TAG, "❌ Erreur injection token:", e);
        }
    }

    @Override
    public void onMessageReceived(RemoteMessage remoteMessage) {
        super.onMessageReceived(remoteMessage);
        Log.d(TAG, "📬 [WebView AAB] Notification reçue");
        Log.d(TAG, "  - Notification payload: " + (remoteMessage.getNotification() != null));
        Log.d(TAG, "  - Data payload: " + remoteMessage.getData().size() + " keys");

        String title = "RunConnect";
        String body = "Nouvelle notification";

        // Priorité 1 : notification payload (envoi via console Firebase)
        if (remoteMessage.getNotification() != null) {
            title = remoteMessage.getNotification().getTitle();
            body = remoteMessage.getNotification().getBody();
            Log.d(TAG, "  ✅ Notification payload détecté");
        } 
        // Priorité 2 : data payload (envoi via API FCM)
        else if (remoteMessage.getData().size() > 0) {
            title = remoteMessage.getData().getOrDefault("title", "RunConnect");
            body = remoteMessage.getData().getOrDefault("body", "Nouvelle notification");
            Log.d(TAG, "  ✅ Data payload détecté");
        }

        Log.d(TAG, "  📝 Titre: " + title);
        Log.d(TAG, "  💬 Body: " + body);

        showNotification(title, body);
    }

    private void showNotification(String title, String body) {
        createNotificationChannel();

        Intent intent = new Intent(this, MainActivity.class);
        intent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        
        int flags = PendingIntent.FLAG_ONE_SHOT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            flags |= PendingIntent.FLAG_IMMUTABLE;
        }
        
        PendingIntent pendingIntent = PendingIntent.getActivity(this, 0, intent, flags);

        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentTitle(title)
            .setContentText(body)
            .setStyle(new NotificationCompat.BigTextStyle().bigText(body))
            .setAutoCancel(true)
            .setColor(Color.parseColor("#3B82F6"))
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setDefaults(NotificationCompat.DEFAULT_ALL)
            .setContentIntent(pendingIntent)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC);

        NotificationManager manager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (manager != null) {
            manager.notify((int) System.currentTimeMillis(), builder.build());
            Log.d(TAG, "✅ [WebView AAB] Notification système affichée");
        }
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                "RunConnect Notifications",
                NotificationManager.IMPORTANCE_HIGH
            );
            channel.setDescription("Notifications des messages, sessions et activités");
            channel.enableVibration(true);
            channel.enableLights(true);
            channel.setLightColor(Color.CYAN);
            channel.setShowBadge(true);
            
            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) {
                manager.createNotificationChannel(channel);
            }
        }
    }
}
