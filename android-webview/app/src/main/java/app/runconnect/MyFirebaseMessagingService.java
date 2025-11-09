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
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import org.json.JSONObject;

public class MyFirebaseMessagingService extends FirebaseMessagingService {
    private static final String TAG = "RunConnectFCM";
    private static final String CHANNEL_ID = "runconnect_channel";

    @Override
    public void onNewToken(String token) {
        super.onNewToken(token);
        Log.d(TAG, "🔥 [WebView AAB] Nouveau token FCM: " + token);
        
        // Sauvegarder dans SharedPreferences (backup permanent)
        try {
            android.content.SharedPreferences prefs = getSharedPreferences("RunConnectPrefs", android.content.Context.MODE_PRIVATE);
            prefs.edit().putString("fcm_token", token).apply();
            Log.d(TAG, "✅ Token sauvegardé dans SharedPreferences");
        } catch (Exception e) {
            Log.e(TAG, "❌ Erreur sauvegarde SharedPreferences:", e);
        }
        
        // 🆕 NIVEAU 11 : Sauvegarder directement dans Supabase
        savePushTokenToSupabase(token);
        
        // ✅ NIVEAU 7 : Vérifier si React est prêt AVANT d'injecter
        if (MainActivity.instance != null && MainActivity.instance.webView != null) {
            try {
                // Vérifier si React listener est prêt
                String checkJs = "typeof window.__fcmListenerReady !== 'undefined' && window.__fcmListenerReady === true";
                
                MainActivity.instance.webView.post(() -> {
                    MainActivity.instance.webView.evaluateJavascript(checkJs, result -> {
                        Log.d(TAG, "📋 [onNewToken] React listener prêt ? " + result);
                        
                        if ("true".equals(result)) {
                            // React est prêt, on peut injecter
                            String jsCode = "window.fcmToken = '" + token + "';" +
                                "window.dispatchEvent(new CustomEvent('fcmTokenReady', { detail: { token: '" + token + "', platform: 'android' } }));" +
                                "console.log('✅ [onNewToken] Token injecté et événement dispatché');";
                            
                            MainActivity.instance.webView.post(() -> 
                                MainActivity.instance.webView.evaluateJavascript(jsCode, null)
                            );
                            Log.d(TAG, "✅ Token injecté dans WebView via onNewToken (React prêt)");
                        } else {
                            // React pas prêt, on laisse MainActivity le faire via retry
                            Log.w(TAG, "⚠️ React listener pas prêt, token sauvegardé dans SharedPreferences, MainActivity le restaurera");
                        }
                    });
                });
            } catch (Exception e) {
                Log.e(TAG, "❌ Erreur injection token:", e);
            }
        } else {
            Log.w(TAG, "⚠️ MainActivity non disponible, token sauvegardé dans SharedPreferences uniquement");
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
    
    /**
     * 🆕 NIVEAU 11 : Sauvegarde le token FCM directement dans Supabase via l'API REST
     * Indépendant de React pour éviter les race conditions
     */
    private void savePushTokenToSupabase(String token) {
        // Exécuter dans un thread séparé pour éviter NetworkOnMainThreadException
        new Thread(() -> {
            try {
                Log.d(TAG, "💾 [SUPABASE] Début sauvegarde token...");
                
                // 1. Récupérer le user_id depuis SharedPreferences
                android.content.SharedPreferences prefs = getSharedPreferences("RunConnectPrefs", MODE_PRIVATE);
                String userId = prefs.getString("user_id", null);
                
                if (userId == null || userId.isEmpty()) {
                    Log.w(TAG, "⚠️ [SUPABASE] user_id non trouvé dans SharedPreferences, sauvegarde impossible");
                    return;
                }
                
                Log.d(TAG, "👤 [SUPABASE] user_id: " + userId);
                
                // 2. Préparer la requête PATCH vers Supabase
                String supabaseUrl = "https://dbptgehpknjsoisirviz.supabase.co";
                String apiKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRicHRnZWhwa25qc29pc2lydml6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ2NjIxNDUsImV4cCI6MjA3MDIzODE0NX0.D1uw0ui_auBAi-dvodv6j2a9x3lvMnY69cDa9Wupjcs";
                
                URL url = new URL(supabaseUrl + "/rest/v1/profiles?user_id=eq." + userId);
                HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                
                // 3. Configurer la requête
                conn.setRequestMethod("PATCH");
                conn.setRequestProperty("Content-Type", "application/json");
                conn.setRequestProperty("apikey", apiKey);
                conn.setRequestProperty("Authorization", "Bearer " + apiKey);
                conn.setRequestProperty("Prefer", "return=minimal");
                conn.setDoOutput(true);
                
                // 4. Construire le JSON body
                JSONObject json = new JSONObject();
                json.put("push_token", token);
                json.put("push_token_platform", "android");
                json.put("push_token_updated_at", "now()");
                
                String jsonBody = json.toString();
                Log.d(TAG, "📤 [SUPABASE] Envoi: " + jsonBody);
                
                // 5. Envoyer la requête
                OutputStream os = conn.getOutputStream();
                os.write(jsonBody.getBytes(StandardCharsets.UTF_8));
                os.flush();
                os.close();
                
                // 6. Vérifier la réponse
                int responseCode = conn.getResponseCode();
                Log.d(TAG, "📥 [SUPABASE] Response code: " + responseCode);
                
                if (responseCode == 200 || responseCode == 204) {
                    Log.d(TAG, "✅ [SUPABASE] Token FCM sauvegardé avec succès !");
                    
                    // Sauvegarder la date de mise à jour dans SharedPreferences
                    prefs.edit().putLong("fcm_token_updated_at", System.currentTimeMillis()).apply();
                } else {
                    Log.e(TAG, "❌ [SUPABASE] Erreur HTTP: " + responseCode);
                }
                
                conn.disconnect();
                
            } catch (Exception e) {
                Log.e(TAG, "❌ [SUPABASE] Exception lors de la sauvegarde:", e);
            }
        }).start();
    }
}
