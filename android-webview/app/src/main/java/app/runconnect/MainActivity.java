package app.runconnect;

import android.Manifest;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.Context;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.util.Log;
import android.webkit.GeolocationPermissions;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.ValueCallback;
import android.content.Intent;
import android.provider.ContactsContract;
import android.database.Cursor;
import android.content.ContentResolver;
import org.json.JSONArray;
import org.json.JSONObject;
import org.json.JSONException;

import androidx.appcompat.app.AppCompatActivity;
import androidx.browser.customtabs.CustomTabsIntent;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import androidx.core.view.WindowCompat;
import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.contract.ActivityResultContracts;

import com.google.android.gms.auth.api.signin.GoogleSignIn;
import com.google.android.gms.auth.api.signin.GoogleSignInAccount;
import com.google.android.gms.auth.api.signin.GoogleSignInClient;
import com.google.android.gms.auth.api.signin.GoogleSignInOptions;
import com.google.android.gms.common.api.ApiException;
import com.google.android.gms.tasks.Task;

import com.google.firebase.FirebaseApp;
import com.google.firebase.messaging.FirebaseMessaging;
import com.google.android.gms.common.GoogleApiAvailability;
import com.google.android.gms.common.ConnectionResult;

import androidx.core.app.NotificationCompat;

public class MainActivity extends AppCompatActivity {
    private static final String TAG = "RunConnect";
    public static MainActivity instance;
    private static final int REQ_LOCATION = 1001;
    private static final int REQ_STORAGE = 1002;
    private static final int REQ_CONTACTS = 1003;
    private static final int REQ_MICROPHONE = 1004;
    private static final int REQ_NOTIFICATIONS = 9999;
    public WebView webView;
    private ValueCallback<Uri[]> filePathCallback;
    
    // URL configurée depuis BuildConfig (modifié par le workflow)
    private final String START_URL = "https://run-connect.lovable.app";

    /**
     * Vérifie si Chrome est installé sur l'appareil
     */
    private boolean isChromeInstalled() {
        try {
            getPackageManager().getPackageInfo("com.android.chrome", 0);
            return true;
        } catch (PackageManager.NameNotFoundException e) {
            return false;
        }
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        instance = this;
        
        Log.d(TAG, "🚀 RunConnect AAB - Starting MainActivity");
        Log.d(TAG, "📍 URL to load: " + START_URL);

        // Full screen immersif + transparent
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        if (Build.VERSION.SDK_INT >= 21) {
            getWindow().setStatusBarColor(Color.TRANSPARENT);
            getWindow().setNavigationBarColor(Color.TRANSPARENT);
        }

        // WebView setup
        webView = new WebView(this);
        webView.setLayerType(WebView.LAYER_TYPE_SOFTWARE, null);
        
        WebSettings s = webView.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);  // ✅ DOM Storage (sessionStorage)
        s.setDatabaseEnabled(true);     // ✅ Enable Web SQL Database for localStorage
        s.setSupportMultipleWindows(true); // ✅ Support des popups OAuth
        s.setLoadWithOverviewMode(true);
        s.setUseWideViewPort(true);
        s.setAllowFileAccess(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setGeolocationEnabled(true);
        
        // ✅ ACTIVER LES SERVICE WORKERS POUR FIREBASE
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            android.webkit.ServiceWorkerController swController = android.webkit.ServiceWorkerController.getInstance();
            android.webkit.ServiceWorkerWebSettings swSettings = swController.getServiceWorkerWebSettings();
            swSettings.setAllowContentAccess(true);
            swSettings.setAllowFileAccess(true);
            swSettings.setCacheMode(WebSettings.LOAD_DEFAULT);
            Log.d(TAG, "✅ Service Worker activé pour Firebase");
        }
        
        // ✅ Configuration explicite du localStorage path
        String databasePath = getApplicationContext().getDir("database", Context.MODE_PRIVATE).getPath();
        s.setDatabasePath(databasePath);
        
        // MODE CACHE : Utiliser le cache si pas de connexion
        s.setCacheMode(WebSettings.LOAD_CACHE_ELSE_NETWORK);
        
        if (Build.VERSION.SDK_INT >= 21) {
            s.setMixedContentMode(WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE);
        }
        
        Log.d(TAG, "💾 Cache mode enabled: LOAD_CACHE_ELSE_NETWORK");
        Log.d(TAG, "💾 LocalStorage database path: " + databasePath);

        // Cookies
        android.webkit.CookieManager cm = android.webkit.CookieManager.getInstance();
        cm.setAcceptCookie(true);
        if (Build.VERSION.SDK_INT >= 21) cm.setAcceptThirdPartyCookies(webView, true);

        // WebChromeClient avec géoloc + file picker
        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onGeolocationPermissionsShowPrompt(String origin, GeolocationPermissions.Callback callback) {
                Log.d(TAG, "📍 Geolocation permission requested for: " + origin);
                callback.invoke(origin, true, false);
            }

            @Override
            public boolean onShowFileChooser(WebView webView, ValueCallback<Uri[]> filePathCallback, FileChooserParams fileChooserParams) {
                MainActivity.this.filePathCallback = filePathCallback;
                Intent intent = fileChooserParams.createIntent();
                try {
                    fileChooserLauncher.launch(intent);
                } catch (Exception e) {
                    filePathCallback.onReceiveValue(null);
                    return false;
                }
                return true;
            }

            @Override
            public boolean onCreateWindow(WebView view, boolean isDialog, boolean isUserGesture, android.os.Message resultMsg) {
                Log.d(TAG, "🪟 onCreateWindow appelé - Gestion popup OAuth dans WebView");
                
                // Créer une nouvelle WebView pour la popup OAuth
                WebView newWebView = new WebView(MainActivity.this);
                WebSettings settings = newWebView.getSettings();
                settings.setJavaScriptEnabled(true);
                settings.setDomStorageEnabled(true);
                settings.setSupportMultipleWindows(false);
                settings.setGeolocationEnabled(true);
                
                // Réutiliser le même WebChromeClient
                newWebView.setWebChromeClient(this);
                
                // Réutiliser le même WebViewClient pour intercepter les redirections
                newWebView.setWebViewClient(new WebViewClient() {
                    @Override
                    public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                        String url = request.getUrl().toString();
                        Log.d(TAG, "🔗 [POPUP] URL interceptée: " + url);
                        
                        // Si c'est un callback OAuth, charger dans la WebView PRINCIPALE
                        if (url.startsWith("app.runconnect://") || url.contains("auth/callback") || url.contains("oauth/callback")) {
                            Log.d(TAG, "✅ Callback OAuth détecté dans popup, chargement dans WebView principale");
                            MainActivity.this.webView.loadUrl(url);
                            // Fermer la popup
                            view.destroy();
                            return true;
                        }
                        
                        // Charger dans la popup
                        return false;
                    }
                });
                
                // Transporter la nouvelle WebView
                ((WebView.WebViewTransport) resultMsg.obj).setWebView(newWebView);
                resultMsg.sendToTarget();
                
                Log.d(TAG, "✅ Popup WebView créée avec succès");
                return true;
            }
        });

        // ✅ AJOUTER L'INTERFACE JAVASCRIPT ANDROIDBRIDGE
        webView.addJavascriptInterface(new AndroidBridge(), "AndroidBridge");
        Log.d(TAG, "✅ AndroidBridge interface ajoutée à la WebView");

        // 🔥 VÉRIFIER GOOGLE PLAY SERVICES AVANT FIREBASE
        try {
            GoogleApiAvailability apiAvailability = GoogleApiAvailability.getInstance();
            int resultCode = apiAvailability.isGooglePlayServicesAvailable(this);
            
            if (resultCode != ConnectionResult.SUCCESS) {
                Log.e(TAG, "❌ Google Play Services non disponible (code: " + resultCode + ")");
                Log.e(TAG, "❌ FCM ne fonctionnera PAS sur cet appareil !");
                
                // Injecter l'erreur dans JavaScript
                String errorJs = "window.fcmError = 'PLAY_SERVICES_UNAVAILABLE';" +
                                "window.fcmErrorCode = " + resultCode + ";" +
                                "console.error('❌ Google Play Services indisponible, code:', " + resultCode + ");";
                
                new android.os.Handler(getMainLooper()).postDelayed(() -> {
                    if (webView != null) {
                        webView.post(() -> webView.evaluateJavascript(errorJs, null));
                    }
                }, 2000);
                
                // Ne PAS continuer l'initialisation Firebase
                return;
            }
            
            Log.d(TAG, "✅ Google Play Services disponible");
            
            // Initialiser Firebase
            FirebaseApp.initializeApp(this);
            Log.d(TAG, "🔥 Firebase initialisé avec succès");
            
            // Vérifier le token sauvegardé
            android.content.SharedPreferences prefs = getSharedPreferences("RunConnectPrefs", MODE_PRIVATE);
            String savedToken = prefs.getString("fcm_token", null);
            
            if (savedToken != null && !savedToken.isEmpty()) {
                Log.d(TAG, "🔥 Token FCM récupéré depuis SharedPreferences: " + savedToken.substring(0, 30) + "...");
            } else {
                Log.w(TAG, "⚠️ Aucun token FCM sauvegardé, il sera généré par Firebase");
            }
        } catch (Exception e) {
            Log.e(TAG, "❌ Erreur initialisation Firebase:", e);
            
            // Injecter l'erreur dans JavaScript
            String errorJs = "window.fcmError = 'FIREBASE_INIT_FAILED';" +
                            "window.fcmErrorMessage = '" + e.getMessage() + "';" +
                            "console.error('❌ Erreur init Firebase:', '" + e.getMessage() + "');";
            
            new android.os.Handler(getMainLooper()).postDelayed(() -> {
                if (webView != null) {
                    webView.post(() -> webView.evaluateJavascript(errorJs, null));
                }
            }, 2000);
        }

        // 🔥 NOUVEAU : Attendre que React signale que le listener est prêt
        new android.os.Handler(getMainLooper()).postDelayed(() -> {
            waitForReactListenerReady(0);
        }, 1000); // Commencer à vérifier après 1 seconde

        // WebViewClient AVEC CUSTOM TABS POUR GOOGLE OAUTH
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public void onPageStarted(WebView view, String url, android.graphics.Bitmap favicon) {
                super.onPageStarted(view, url, favicon);
                Log.d(TAG, "📄 Page loading started: " + url);
                
                // Injecter les flags dès le début du chargement
                injectAABFlags(view);
                injectPermissionsState(view);
                injectDeviceInfo(view);
            }
            
            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                
                // ✅ Injection retardée pour s'assurer que React est monté
                if (url.contains("run-connect.lovable.app") || url.contains("lovableproject.com")) {
                    Log.d(TAG, "🔥 [PAGE_LOADED] Page principale chargée");
                    
                    new android.os.Handler(getMainLooper()).postDelayed(() -> {
                        injectAABFlags(view);
                        injectPermissionsState(view);
                        injectDeviceInfo(view);
                        verifyInjection(view);
                        
                        // 🔥 NIVEAU 15: Injecter le token FCM si disponible en cache
                        String cachedToken = getSharedPreferences("RunConnectPrefs", MODE_PRIVATE)
                            .getString("fcm_token", null);
                        
                        if (cachedToken != null) {
                            Log.d(TAG, "🔥 [FCM] Token trouvé en cache, injection dans WebView");
                            injectFCMTokenIntoWebView(cachedToken);
                        }
                        
                        Log.d(TAG, "✅ [PAGE_LOADED] Flags injectés avec delay de 500ms");
                    }, 500);
                }
            }
            
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                String url = uri.toString();
                String host = uri.getHost() != null ? uri.getHost() : "";
                
                Log.d(TAG, "🔗 shouldOverrideUrlLoading: " + url);
                
                // 1. INTERCEPTER LE CALLBACK OAUTH (app.runconnect://)
                if (url.startsWith("app.runconnect://auth") ||
                    url.startsWith("app.runconnect://oauth") ||
                    url.contains("auth/callback")) {
                    Log.d(TAG, "✅ Deep link OAuth intercepté : " + url);
                    view.loadUrl(url);
                    return true;
                }
                
                // 2. GARDER GOOGLE OAUTH DANS LA WEBVIEW (pas Custom Tabs)
                if (host.contains("accounts.google.com") || 
                    (url.contains("oauth") && host.contains("google")) ||
                    host.contains("googleapis.com")) {
                    
                    Log.d(TAG, "🔐 Chargement OAuth Google DANS la WebView : " + url);
                    view.loadUrl(url); // ✅ RESTER DANS LA WEBVIEW
                    return false; // false = géré par la WebView
                }
                
                // 3. Ouvrir Strava en EXTERNE (navigateur)
                if (host.contains("strava.com")) {
                    Log.d(TAG, "🚴 Ouverture Strava dans navigateur externe : " + url);
                    Intent i = new Intent(Intent.ACTION_VIEW, uri);
                    startActivity(i);
                    return true;
                }
                
                // 4. Intercepter Supabase/Firebase DANS la WebView
                if (host.contains("supabase.co") || host.contains("firebaseapp.com")) {
                    Log.d(TAG, "✅ URL Supabase/Firebase chargée dans WebView : " + url);
                    view.loadUrl(url);
                    return false;
                }
                
                // 6. Ouvrir les liens externes dans le navigateur
                if (!host.contains("run-connect.lovable.app") &&
                    !host.contains("app.runconnect") &&
                    !host.isEmpty()) {
                    Log.d(TAG, "🌐 Lien externe, ouverture navigateur : " + url);
                    Intent i = new Intent(Intent.ACTION_VIEW, uri);
                    startActivity(i);
                    return true;
                }
                
                // 7. Tous les autres liens restent dans la WebView
                Log.d(TAG, "🔄 Chargement dans WebView : " + url);
                return false;
            }
            
            @Override
            public void onReceivedError(WebView view, int errorCode, String description, String failingUrl) {
                Log.e(TAG, "❌ Erreur réseau: " + description + " (code: " + errorCode + ")");
                
                if (errorCode == WebViewClient.ERROR_HOST_LOOKUP || 
                    errorCode == WebViewClient.ERROR_CONNECT || 
                    errorCode == WebViewClient.ERROR_TIMEOUT) {
                    
                    Log.d(TAG, "🔴 Chargement page offline");
                    view.loadUrl("file:///android_asset/offline.html");
                }
            }
            
            @Override
            public void onReceivedError(WebView view, WebResourceRequest request, android.webkit.WebResourceError error) {
                if (Build.VERSION.SDK_INT >= 23) {
                    onReceivedError(view, error.getErrorCode(), error.getDescription().toString(), request.getUrl().toString());
                }
            }
        });

        webView.loadUrl(START_URL);
        setContentView(webView);
        
        // 🔥 NIVEAU 10: Injection initiale des flags au démarrage
        new android.os.Handler(getMainLooper()).postDelayed(() -> {
            injectAABFlags(webView);
            injectPermissionsState(webView);
            injectDeviceInfo(webView);
            verifyInjection(webView);
            Log.d(TAG, "✅ [STARTUP] Injection initiale des flags effectuée");
        }, 1000);

        // ✅ CRÉATION DU CANAL DE NOTIFICATION (obligatoire Android 8+)
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                NotificationChannel channel = new NotificationChannel(
                    "runconnect_channel",
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
                    Log.d(TAG, "✅ Canal de notification créé");
                }
            }
        } catch (Exception e) {
            Log.e(TAG, "❌ Erreur création canal notification:", e);
        }

        // ✅ DEMANDER LA PERMISSION NOTIFICATIONS AU DÉMARRAGE (Android 13+)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) 
                != PackageManager.PERMISSION_GRANTED) {
                
                Log.d(TAG, "📱 [STARTUP] Demande permission POST_NOTIFICATIONS au démarrage...");
                ActivityCompat.requestPermissions(this, 
                    new String[]{Manifest.permission.POST_NOTIFICATIONS}, 
                    REQ_NOTIFICATIONS);
            } else {
                Log.d(TAG, "✅ [STARTUP] Permission POST_NOTIFICATIONS déjà accordée");
            }
        } else {
            Log.d(TAG, "ℹ️ [STARTUP] Android < 13, permission POST_NOTIFICATIONS non requise");
        }

        // 🔥 NIVEAU 15: Forcer la récupération du token FCM au démarrage
        forceFetchFCMToken();

        // Repassage en hardware après 1s
        webView.postDelayed(() -> {
            try { webView.setLayerType(WebView.LAYER_TYPE_HARDWARE, null); } catch (Throwable ignored) {}
        }, 1000);
    }

    // ✅ MÉTHODE HELPER POUR INJECTER LE TOKEN AVEC RETRY AUTOMATIQUE
    private void injectTokenIntoWebView(String token, int retryCount) {
        if (retryCount >= 3) {
            Log.e(TAG, "❌ Échec injection token après 3 tentatives");
            return;
        }
        
        String jsCode = "try {" +
            "  console.log('🔥 [NATIVE] Début injection token FCM (tentative " + (retryCount + 1) + ")');" +
            "  window.fcmToken = '" + token + "';" +
            "  window.fcmTokenPlatform = 'android';" +
            "  console.log('🔥 [FCM] Token injecté:', window.fcmToken.substring(0, 30) + '...');" +
            "  window.dispatchEvent(new CustomEvent('fcmTokenReady', { detail: { token: '" + token + "', platform: 'android' } }));" +
            "  console.log('🔥 [FCM] Événement fcmTokenReady dispatché');" +
            "  'SUCCESS';" +
            "} catch(e) {" +
            "  console.error('❌ [NATIVE] Erreur injection:', e);" +
            "  'ERROR:' + e.message;" +
            "}";
        
        webView.post(() -> {
            webView.evaluateJavascript(jsCode, result -> {
                Log.d(TAG, "📋 [INJECT] Résultat JavaScript: " + result);
                
                if (result != null && result.contains("SUCCESS")) {
                    Log.d(TAG, "✅ [INJECT] Token injecté avec succès");
                } else {
                    Log.e(TAG, "❌ [INJECT] Échec injection, retry dans 1s...");
                    webView.postDelayed(() -> injectTokenIntoWebView(token, retryCount + 1), 1000);
                }
            });
        });
    }

    // File Chooser Launcher
    private final ActivityResultLauncher<Intent> fileChooserLauncher = registerForActivityResult(
            new ActivityResultContracts.StartActivityForResult(),
            result -> {
                if (filePathCallback == null) return;
                Uri[] results = null;
                if (result.getResultCode() == android.app.Activity.RESULT_OK && result.getData() != null) {
                    results = new Uri[]{result.getData().getData()};
                }
                filePathCallback.onReceiveValue(results);
                filePathCallback = null;
            }
    );

    // ✅ GOOGLE SIGN-IN LAUNCHER
    private final ActivityResultLauncher<Intent> googleSignInLauncher = registerForActivityResult(
            new ActivityResultContracts.StartActivityForResult(),
            result -> {
                if (result.getResultCode() == RESULT_OK && result.getData() != null) {
                    Task<GoogleSignInAccount> task = GoogleSignIn.getSignedInAccountFromIntent(result.getData());
                    try {
                        GoogleSignInAccount account = task.getResult(ApiException.class);
                        String idToken = account.getIdToken();
                        String email = account.getEmail();
                        String displayName = account.getDisplayName() != null ? account.getDisplayName() : "";
                        
                        Log.d(TAG, "🔥✅ Google Sign-In réussi");
                        Log.d(TAG, "📧 Email: " + email);
                        Log.d(TAG, "👤 Display Name: " + displayName);
                        Log.d(TAG, "🎫 ID Token (premiers 50 char): " + idToken.substring(0, Math.min(50, idToken.length())) + "...");
                        
                        // Envoyer les données à la WebView via JavaScript
                        String js = String.format(
                            "window.dispatchEvent(new CustomEvent('googleSignInSuccess', {detail: {idToken:'%s', email:'%s', displayName:'%s'}}));",
                            idToken, email, displayName
                        );
                        webView.post(() -> webView.evaluateJavascript(js, null));
                    } catch (ApiException e) {
                        Log.e(TAG, "❌ Google Sign-In error: " + e.getMessage());
                        String errorJs = "window.dispatchEvent(new CustomEvent('googleSignInError', {detail: '" + 
                                        e.getMessage().replace("'", "\\'") + "'}));";
                        webView.post(() -> webView.evaluateJavascript(errorJs, null));
                    }
                } else {
                    Log.w(TAG, "⚠️ Google Sign-In annulé");
                    String cancelJs = "window.dispatchEvent(new CustomEvent('googleSignInError', {detail: 'User canceled'}));";
                    webView.post(() -> webView.evaluateJavascript(cancelJs, null));
                }
            }
    );

    // ✅ ANDROIDBRIDGE - Interface JavaScript pour Google Sign-In natif
    private class AndroidBridge {
        @android.webkit.JavascriptInterface
        public void googleSignIn() {
            Log.d(TAG, "🔥 AndroidBridge.googleSignIn() appelé");
            runOnUiThread(() -> {
                GoogleSignInOptions gso = new GoogleSignInOptions.Builder(GoogleSignInOptions.DEFAULT_SIGN_IN)
                    .requestIdToken("220304658307-dhf5bgbrogt9cfhj7c6l6pden8ofdmd0.apps.googleusercontent.com")  // ✅ Android OAuth Client ID (lié au SHA-1)
                    .requestEmail()
                    .build();
                
                GoogleSignInClient client = GoogleSignIn.getClient(MainActivity.this, gso);
                Intent signInIntent = client.getSignInIntent();
                googleSignInLauncher.launch(signInIntent);
                Log.d(TAG, "🔥 Google Sign-In Intent lancé");
            });
        }
        
        @android.webkit.JavascriptInterface
        public void googleSignOut() {
            Log.d(TAG, "🔥 AndroidBridge.googleSignOut() appelé");
            runOnUiThread(() -> {
                GoogleSignInOptions gso = new GoogleSignInOptions.Builder(GoogleSignInOptions.DEFAULT_SIGN_IN)
                    .requestIdToken("220304658307-dhf5bgbrogt9cfhj7c6l6pden8ofdmd0.apps.googleusercontent.com")  // ✅ Android OAuth Client ID (lié au SHA-1)
                    .requestEmail()
                    .build();
                
                GoogleSignInClient client = GoogleSignIn.getClient(MainActivity.this, gso);
                client.signOut().addOnCompleteListener(task -> {
                    Log.d(TAG, "✅ Google Sign-Out réussi");
                    String js = "window.dispatchEvent(new CustomEvent('googleSignOutSuccess'));";
                    webView.post(() -> webView.evaluateJavascript(js, null));
                });
            });
        }
        
        @android.webkit.JavascriptInterface
        public void sendTestNotification(String title, String message) {
            Log.d(TAG, "🔔 [TEST] Envoi notification test locale...");
            
            runOnUiThread(() -> {
                try {
                    NotificationManager manager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
                    if (manager != null) {
                        // Créer le canal si nécessaire
                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                            NotificationChannel channel = new NotificationChannel(
                                "runconnect_channel",
                                "RunConnect Notifications",
                                NotificationManager.IMPORTANCE_HIGH
                            );
                            channel.setDescription("Notifications importantes de RunConnect");
                            channel.enableVibration(true);
                            channel.enableLights(true);
                            manager.createNotificationChannel(channel);
                        }
                        
                        // Créer la notification
                        NotificationCompat.Builder builder = new NotificationCompat.Builder(MainActivity.this, "runconnect_channel")
                            .setSmallIcon(android.R.drawable.ic_dialog_info)
                            .setContentTitle(title)
                            .setContentText(message)
                            .setPriority(NotificationCompat.PRIORITY_HIGH)
                            .setAutoCancel(true);
                        
                        manager.notify((int) System.currentTimeMillis(), builder.build());
                        
                        // Dispatcher événement de succès
                        String jsEvent = "window.dispatchEvent(new CustomEvent('testNotificationSent', { detail: { success: true } }));";
                        webView.post(() -> webView.evaluateJavascript(jsEvent, null));
                        
                        Log.d(TAG, "✅ [TEST] Notification test envoyée");
                    }
                } catch (Exception e) {
                    Log.e(TAG, "❌ [TEST] Erreur envoi notification test:", e);
                    
                    // Dispatcher événement d'erreur
                    String jsEvent = "window.dispatchEvent(new CustomEvent('testNotificationSent', { detail: { success: false } }));";
                    webView.post(() -> webView.evaluateJavascript(jsEvent, null));
                }
            });
        }
        
        @android.webkit.JavascriptInterface
        public String getFCMToken() {
            Log.d(TAG, "📱 [AndroidBridge] getFCMToken() appelé depuis JavaScript");
            
            // ✅ NIVEAU 7 : Vérifier d'abord SharedPreferences pour un token déjà sauvegardé
            try {
                android.content.SharedPreferences prefs = getSharedPreferences("RunConnectPrefs", MODE_PRIVATE);
                String savedToken = prefs.getString("fcm_token", null);
                
                if (savedToken != null && !savedToken.isEmpty()) {
                    Log.d(TAG, "✅ [AndroidBridge.getFCMToken] Token trouvé dans SharedPreferences: " + savedToken.substring(0, 30) + "...");
                    return savedToken; // Retour synchrone
                }
            } catch (Exception e) {
                Log.e(TAG, "❌ [AndroidBridge] Erreur lecture SharedPreferences:", e);
            }
            
            // Si pas de token sauvegardé, récupérer de manière asynchrone via Firebase
            runOnUiThread(() -> {
                try {
                    FirebaseMessaging.getInstance().getToken()
                        .addOnCompleteListener(task -> {
                            if (task.isSuccessful() && task.getResult() != null) {
                                String token = task.getResult();
                                Log.d(TAG, "✅ [AndroidBridge.getFCMToken] Token FCM récupéré via Firebase: " + token.substring(0, Math.min(30, token.length())) + "...");
                                
                                // Sauvegarder dans SharedPreferences
                                try {
                                    android.content.SharedPreferences prefs = getSharedPreferences("RunConnectPrefs", MODE_PRIVATE);
                                    prefs.edit().putString("fcm_token", token).apply();
                                    Log.d(TAG, "✅ [AndroidBridge.getFCMToken] Token sauvegardé dans SharedPreferences");
                                } catch (Exception e) {
                                    Log.e(TAG, "❌ [AndroidBridge.getFCMToken] Erreur sauvegarde:", e);
                                }
                                
                                // Injecter dans WebView
                                String jsCode = "window.fcmToken = '" + token + "';" +
                                    "window.fcmTokenPlatform = 'android';" +
                                    "console.log('🔥 [AndroidBridge] Token réinjecté:', window.fcmToken.substring(0, 30) + '...');" +
                                    "window.dispatchEvent(new CustomEvent('fcmTokenReady', { detail: { token: '" + token + "', platform: 'android' } }));" +
                                    "console.log('🔥 [FCM] Événement fcmTokenReady dispatché');";
                                webView.post(() -> webView.evaluateJavascript(jsCode, null));
                            } else {
                                Log.e(TAG, "❌ [AndroidBridge] Échec récupération token FCM", task.getException());
                            }
                        });
                } catch (Exception e) {
                    Log.e(TAG, "❌ [AndroidBridge] Erreur getFCMToken:", e);
                }
            });
            
            return "requesting"; // Indique que la demande est en cours (async)
        }
        
        @android.webkit.JavascriptInterface
        public void onFCMTokenInjected(String token) {
            Log.d(TAG, "✅ [CALLBACK] React confirme réception token: " + token.substring(0, 30) + "...");
            // Cette méthode permet à React de confirmer immédiatement qu'il a bien reçu le token
        }
        
        /**
         * 🆕 NIVEAU 11 : Sauvegarde user_id pour permettre à MyFirebaseMessagingService
         * de mettre à jour Supabase directement
         */
        @android.webkit.JavascriptInterface
        public void saveUserIdForFCM(String userId) {
            Log.d(TAG, "💾 [AndroidBridge] Sauvegarde user_id pour FCM: " + userId);
            
            android.content.SharedPreferences prefs = getSharedPreferences("RunConnectPrefs", MODE_PRIVATE);
            prefs.edit().putString("user_id", userId).apply();
            
            Log.d(TAG, "✅ [AndroidBridge] user_id sauvegardé dans SharedPreferences");
        }
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, @androidx.annotation.NonNull String[] permissions, @androidx.annotation.NonNull int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        
        // 🔔 TRAITEMENT SPÉCIAL POUR LE CODE 9999 (demande auto au démarrage)
        if (requestCode == 9999) {
            boolean granted = grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED;
            
            Log.d(TAG, "📱 [STARTUP] Permission POST_NOTIFICATIONS: " + (granted ? "ACCORDÉE ✅" : "REFUSÉE ❌"));
            
            if (granted) {
                // Dispatcher événement JavaScript pour initialiser FCM
                String jsEvent = "window.dispatchEvent(new CustomEvent('androidNotificationPermissionGranted'));";
                webView.post(() -> webView.evaluateJavascript(jsEvent, null));
            }
            
            return; // Ne pas traiter avec le code générique ci-dessous
        }
        
        
        // 📱 CODE GÉNÉRIQUE POUR LES AUTRES PERMISSIONS (location, camera, etc.)
        StringBuilder resultJson = new StringBuilder("{");
        for (int i = 0; i < permissions.length; i++) {
            String permission = permissions[i];
            boolean granted = grantResults[i] == PackageManager.PERMISSION_GRANTED;
            
            // Mapper les permissions Android vers des noms simples
            String permName = "unknown";
            if (permission.equals(Manifest.permission.ACCESS_FINE_LOCATION) || 
                permission.equals(Manifest.permission.ACCESS_COARSE_LOCATION)) {
                permName = "location";
            } else if (permission.equals(Manifest.permission.CAMERA)) {
                permName = "camera";
            } else if (permission.equals(Manifest.permission.READ_CONTACTS)) {
                permName = "contacts";
            } else if (permission.equals(Manifest.permission.POST_NOTIFICATIONS)) {
                permName = "notifications";
            } else if (permission.equals(Manifest.permission.READ_EXTERNAL_STORAGE) || 
                       permission.equals(Manifest.permission.READ_MEDIA_IMAGES)) {
                permName = "storage";
            } else if (permission.equals(Manifest.permission.RECORD_AUDIO)) {
                permName = "microphone";
            }
            
            if (i > 0) resultJson.append(",");
            resultJson.append("\"").append(permName).append("\":").append(granted);
            
            Log.d(TAG, "📱 Permission " + permission + " → " + (granted ? "ACCORDÉE ✅" : "REFUSÉE ❌"));
        }
        resultJson.append("}");
        
        // Injecter les résultats dans JavaScript
        final String jsCode = "window.androidPermissions = " + resultJson.toString() + ";" +
                             "window.dispatchEvent(new CustomEvent('androidPermissionsUpdated', { detail: window.androidPermissions }));";
        
        if (webView != null) {
            webView.post(() -> {
                webView.evaluateJavascript(jsCode, null);
                Log.d(TAG, "✅ Résultats permissions injectés dans JavaScript");
            });
        }
    }

    // 🔥 ATTENDRE QUE REACT SIGNALE QUE LE LISTENER EST PRÊT
    private void waitForReactListenerReady(int checkAttempt) {
        if (checkAttempt >= 30) {
            Log.e(TAG, "❌ [LISTENER_WAIT] React listener pas prêt après 15 secondes, démarrage forcé du retry");
            startTokenInjectionRetry(0);
            return;
        }
        
        // ✅ NOUVEAU : Vérifier que la WebView est bien attachée
        if (webView == null) {
            Log.w(TAG, "⏳ [SYNC] WebView pas encore attachée, retry dans 500ms...");
            new android.os.Handler(getMainLooper()).postDelayed(() -> {
                waitForReactListenerReady(checkAttempt + 1);
            }, 500);
            return;
        }
        
        Log.d(TAG, "🔍 [SYNC] Vérification React listener (" + (checkAttempt + 1) + "/30)...");
        
        String checkJs = "typeof window.__fcmListenerReady !== 'undefined' && window.__fcmListenerReady === true";
        
        webView.post(() -> {
            webView.evaluateJavascript(checkJs, result -> {
                Log.d(TAG, "📋 [SYNC] Résultat: " + result);
                
                if ("true".equals(result)) {
                    Log.d(TAG, "🟢 [SYNC] WebView attachée et React listener prêt - démarrage injection token FCM");
                    startTokenInjectionRetry(0);
                } else {
                    Log.d(TAG, "⏳ [SYNC] React pas encore prêt, nouvelle vérification dans 500ms...");
                    // Revérifier dans 500ms
                    new android.os.Handler(getMainLooper()).postDelayed(() -> {
                        waitForReactListenerReady(checkAttempt + 1);
                    }, 500);
                }
            });
        });
    }

    // 🔥 MÉTHODE DE RETRY AGRESSIVE POUR L'INJECTION DU TOKEN
    private void startTokenInjectionRetry(int attemptNumber) {
        if (attemptNumber >= 30) {
            Log.e(TAG, "❌ [TOKEN_RETRY] Abandon après 30 tentatives");
            return;
        }
        
        Log.d(TAG, "🔁 [TOKEN_RETRY] Tentative " + (attemptNumber + 1) + "/30...");
        
        // Vérifier si le token a déjà été reçu côté JavaScript
        String checkJs = "typeof window.__fcmTokenReceived !== 'undefined' && window.__fcmTokenReceived === true";
        
        webView.post(() -> {
            webView.evaluateJavascript(checkJs, result -> {
                Log.d(TAG, "📋 [TOKEN_RETRY] Token déjà reçu ? " + result);
                
                if ("true".equals(result)) {
                    Log.d(TAG, "✅ [TOKEN_RETRY] Token déjà reçu côté JavaScript, arrêt du retry");
                    return;
                }
                
                // 🔥 NOUVEAU : Prioriser SharedPreferences pour restaurer un token sauvegardé
                String token = null;
                boolean isRestoredToken = false;
                
                try {
                    android.content.SharedPreferences prefs = getSharedPreferences("RunConnectPrefs", MODE_PRIVATE);
                    token = prefs.getString("fcm_token", null);
                    
                    if (token != null && !token.isEmpty()) {
                        Log.d(TAG, "✅ [TOKEN_RETRY] Token FCM restauré depuis SharedPreferences: " + token.substring(0, 30) + "...");
                        isRestoredToken = true;
                    }
                } catch (Exception e) {
                    Log.e(TAG, "❌ [TOKEN_RETRY] Erreur lecture SharedPreferences:", e);
                }
                
                // Si pas de token sauvegardé, on essaye de le récupérer via Firebase
                if (token == null || token.isEmpty()) {
                    Log.d(TAG, "🔄 [TOKEN_RETRY] Aucun token sauvegardé, récupération via Firebase...");
                    
                    FirebaseMessaging.getInstance().getToken()
                        .addOnCompleteListener(task -> {
                            if (task.isSuccessful() && task.getResult() != null) {
                                String freshToken = task.getResult();
                                Log.d(TAG, "🔥 [TOKEN_RETRY] Token Firebase récupéré: " + freshToken.substring(0, 30) + "...");
                                injectTokenIntoWebView(freshToken, attemptNumber, false);
                            } else {
                                // ✅ NOUVEAU : Logger l'exception réelle
                                Exception exception = task.getException();
                                if (exception != null) {
                                    Log.e(TAG, "❌ [TOKEN_RETRY] Erreur Firebase détaillée:", exception);
                                    Log.e(TAG, "  → Type: " + exception.getClass().getSimpleName());
                                    Log.e(TAG, "  → Message: " + exception.getMessage());
                                } else {
                                    Log.e(TAG, "❌ [TOKEN_RETRY] Échec Firebase sans exception (task.getResult() == null)");
                                }
                                
                                // Injecter l'erreur dans JavaScript pour diagnostic
                                String errorJs = "window.fcmError = 'FIREBASE_TOKEN_FAILED';" +
                                               "window.fcmErrorDetails = '" + (exception != null ? exception.getMessage() : "Unknown") + "';" +
                                               "console.error('❌ Firebase getToken() échoué:', '" + (exception != null ? exception.getMessage() : "Unknown") + "');";
                                
                                webView.post(() -> webView.evaluateJavascript(errorJs, null));
                                
                                // Retry après 2 secondes (pas 1s pour éviter le spam)
                                new android.os.Handler(getMainLooper()).postDelayed(() -> {
                                    startTokenInjectionRetry(attemptNumber + 1);
                                }, 2000);
                            }
                        });
                } else {
                    // On a un token sauvegardé, on l'injecte directement
                    injectTokenIntoWebView(token, attemptNumber, isRestoredToken);
                }
            });
        });
    }

    // 🔥 NOUVELLE MÉTHODE : Injecter le token dans la WebView
    private void injectTokenIntoWebView(String token, int attemptNumber, boolean isRestored) {
        String source = isRestored ? "SharedPreferences" : "Firebase";
        Log.d(TAG, "💉 [TOKEN_INJECT] Injection token depuis " + source + ": " + token.substring(0, 30) + "...");
        
        String jsCode = 
            "try {" +
            "  console.log('🔥 [RETRY " + (attemptNumber + 1) + "] Injection token FCM (source: " + source + ")');" +
            "  window.fcmToken = '" + token + "';" +
            "  window.fcmTokenPlatform = 'android';" +
            "  window.dispatchEvent(new CustomEvent('fcmTokenReady', { " +
            "    detail: { token: '" + token + "', platform: 'android', attempt: " + (attemptNumber + 1) + ", restored: " + isRestored + " }" +
            "  }));" +
            "  console.log('✅ [RETRY " + (attemptNumber + 1) + "] Événement fcmTokenReady dispatché');" +
            // ✅ NOUVEAU : Callback immédiat vers Android
            "  if (typeof AndroidBridge !== 'undefined' && AndroidBridge.onFCMTokenInjected) {" +
            "    AndroidBridge.onFCMTokenInjected('" + token + "');" +
            "  }" +
            "  'INJECTED';" +
            "} catch(e) {" +
            "  console.error('❌ [RETRY] Erreur:', e);" +
            "  'ERROR:' + e.message;" +
            "}";
        
        webView.post(() -> {
            webView.evaluateJavascript(jsCode, injectResult -> {
                Log.d(TAG, "📋 [TOKEN_INJECT] Résultat injection: " + injectResult);
                
                if (!"\"INJECTED\"".equals(injectResult)) {
                    Log.w(TAG, "⚠️ [TOKEN_INJECT] Injection ratée, retry dans 1s...");
                    new android.os.Handler(getMainLooper()).postDelayed(() -> {
                        startTokenInjectionRetry(attemptNumber + 1);
                    }, 1000);
                } else {
                    Log.d(TAG, "✅ [TOKEN_INJECT] Token injecté avec succès, vérification réception React dans 500ms...");
                    
                    // ✅ NIVEAU 7 : Après injection, attendre 500ms puis vérifier si React a confirmé
                    new android.os.Handler(getMainLooper()).postDelayed(() -> {
                        String checkConfirmJs = "typeof window.__fcmTokenReceived !== 'undefined' && window.__fcmTokenReceived === true";
                        
                        webView.post(() -> {
                            webView.evaluateJavascript(checkConfirmJs, confirmResult -> {
                                Log.d(TAG, "📋 [TOKEN_INJECT] React a confirmé ? " + confirmResult);
                                
                                if (!"true".equals(confirmResult)) {
                                    Log.w(TAG, "⚠️ [TOKEN_INJECT] React n'a pas confirmé la réception, retry...");
                                    startTokenInjectionRetry(attemptNumber + 1);
                                } else {
                                    Log.d(TAG, "🎉 [TOKEN_INJECT] React a confirmé la réception du token, arrêt du retry");
                                }
                            });
                        });
                    }, 500);
                }
            });
        });
    }

    // 🔥 NIVEAU 10: Méthodes d'injection des flags natifs
    private void injectAABFlags(WebView view) {
        Log.d(TAG, "🚀 Injection des flags AAB");
        
        String jsCode = "window.CapacitorForceNative = true; " +
                       "window.isAABBuild = true; " +
                       "window.AndroidNativeEnvironment = true; " +
                       "window.capacitorReady = true; " +
                       "console.log('🚀 Flags AAB injectés:', {CapacitorForceNative: window.CapacitorForceNative, isAABBuild: window.isAABBuild, AndroidNativeEnvironment: window.AndroidNativeEnvironment, capacitorReady: window.capacitorReady});";
        
        view.evaluateJavascript(jsCode, null);
    }
    
    private void injectPermissionsState(WebView view) {
        boolean hasLocation = hasLocationPermission();
        boolean hasCamera = ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED;
        boolean hasContacts = ContextCompat.checkSelfPermission(this, Manifest.permission.READ_CONTACTS) == PackageManager.PERMISSION_GRANTED;
        boolean hasStorage = hasStoragePermission();
        
        // Vérifier les permissions notifications (Android 13+)
        boolean hasNotifications = true; // Par défaut accordé pour Android < 13
        boolean notificationsPermanentlyDenied = false;
        if (Build.VERSION.SDK_INT >= 33) {
            hasNotifications = ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED;
            notificationsPermanentlyDenied = !hasNotifications && !ActivityCompat.shouldShowRequestPermissionRationale(this, Manifest.permission.POST_NOTIFICATIONS);
        }
        
        // Détecter si les permissions ont été refusées définitivement
        boolean locationPermanentlyDenied = !hasLocation && !ActivityCompat.shouldShowRequestPermissionRationale(this, Manifest.permission.ACCESS_FINE_LOCATION);
        boolean cameraPermanentlyDenied = !hasCamera && !ActivityCompat.shouldShowRequestPermissionRationale(this, Manifest.permission.CAMERA);
        boolean contactsPermanentlyDenied = !hasContacts && !ActivityCompat.shouldShowRequestPermissionRationale(this, Manifest.permission.READ_CONTACTS);
        
        // Pour le stockage, vérifier selon la version Android
        boolean storagePermanentlyDenied;
        if (Build.VERSION.SDK_INT >= 33) {
            storagePermanentlyDenied = !hasStorage && !ActivityCompat.shouldShowRequestPermissionRationale(this, Manifest.permission.READ_MEDIA_IMAGES);
        } else {
            storagePermanentlyDenied = !hasStorage && !ActivityCompat.shouldShowRequestPermissionRationale(this, Manifest.permission.READ_EXTERNAL_STORAGE);
        }
        
        Log.d(TAG, "🚀 Injection état permissions - Location: " + hasLocation + " (permanent: " + locationPermanentlyDenied + "), Camera: " + hasCamera + ", Storage: " + hasStorage + " (permanent: " + storagePermanentlyDenied + "), Contacts: " + hasContacts + " (permanent: " + contactsPermanentlyDenied + "), Notifications: " + hasNotifications + " (permanent: " + notificationsPermanentlyDenied + ")");
        
        String jsCode = "window.androidPermissions = {" +
                       "location: '" + (hasLocation ? "granted" : "denied") + "', " +
                       "locationPermanentlyDenied: " + locationPermanentlyDenied + ", " +
                       "camera: '" + (hasCamera ? "granted" : "denied") + "', " +
                       "cameraPermanentlyDenied: " + cameraPermanentlyDenied + ", " +
                       "storage: '" + (hasStorage ? "granted" : "denied") + "', " +
                       "storagePermanentlyDenied: " + storagePermanentlyDenied + ", " +
                       "contacts: '" + (hasContacts ? "granted" : "denied") + "', " +
                       "contactsPermanentlyDenied: " + contactsPermanentlyDenied + ", " +
                       "notifications: '" + (hasNotifications ? "granted" : "denied") + "', " +
                       "notificationsPermanentlyDenied: " + notificationsPermanentlyDenied + ", " +
                       "timestamp: " + System.currentTimeMillis() + "}; " +
                       "console.log('🔐 Permissions Android injectées:', window.androidPermissions);";
        
        view.evaluateJavascript(jsCode, null);
    }

    private void injectDeviceInfo(WebView view) {
        String manufacturer = Build.MANUFACTURER != null ? Build.MANUFACTURER : "unknown";
        String model = Build.MODEL != null ? Build.MODEL : "unknown";
        String version = Build.VERSION.RELEASE != null ? Build.VERSION.RELEASE : "unknown";
        int sdkInt = Build.VERSION.SDK_INT;
        
        // Détection étendue des fabricants
        boolean isMIUI = manufacturer.toLowerCase().contains("xiaomi") || manufacturer.toLowerCase().contains("redmi") || manufacturer.toLowerCase().contains("poco");
        boolean isSamsung = manufacturer.toLowerCase().contains("samsung");
        boolean isOnePlus = manufacturer.toLowerCase().contains("oneplus");
        boolean isOppo = manufacturer.toLowerCase().contains("oppo");
        boolean isVivo = manufacturer.toLowerCase().contains("vivo");
        boolean isHuawei = manufacturer.toLowerCase().contains("huawei") || manufacturer.toLowerCase().contains("honor");
        
        String deviceScript = String.format(
            "window.AndroidDeviceInfo = {" +
            "  manufacturer: '%s'," +
            "  model: '%s'," +
            "  version: '%s'," +
            "  sdkInt: %d," +
            "  isMIUI: %s," +
            "  isSamsung: %s," +
            "  isOnePlus: %s," +
            "  isOppo: %s," +
            "  isVivo: %s," +
            "  isHuawei: %s," +
            "  needsSpecialHandling: %s" +
            "};",
            manufacturer.toLowerCase(), 
            model.toLowerCase(), 
            version,
            sdkInt,
            isMIUI ? "true" : "false",
            isSamsung ? "true" : "false",
            isOnePlus ? "true" : "false",
            isOppo ? "true" : "false",
            isVivo ? "true" : "false",
            isHuawei ? "true" : "false",
            (isMIUI || isSamsung || isOnePlus || isOppo || isVivo || isHuawei) ? "true" : "false"
        );
        
        Log.d(TAG, "📱 Injection info périphérique étendue: " + deviceScript);
        view.evaluateJavascript(deviceScript, null);
    }

    private void verifyInjection(WebView view) {
        String verificationScript = 
            "console.log('🔍 Vérification injection:', {" +
            "  CapacitorForceNative: window.CapacitorForceNative," +
            "  isAABBuild: window.isAABBuild," +
            "  AndroidDeviceInfo: window.AndroidDeviceInfo," +
            "  androidPermissions: window.androidPermissions" +
            "});";
            
        view.evaluateJavascript(verificationScript, null);
    }
    
    // 🔥 NIVEAU 10: Méthodes utilitaires de vérification des permissions
    private boolean hasLocationPermission() {
        return ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED
                && ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED;
    }
    
    private boolean hasStoragePermission() {
        boolean hasCamera = ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED;
        
        if (Build.VERSION.SDK_INT >= 33) {
            // Android 13+ - Vérifier READ_MEDIA_IMAGES
            boolean hasMediaImages = ContextCompat.checkSelfPermission(this, Manifest.permission.READ_MEDIA_IMAGES) == PackageManager.PERMISSION_GRANTED;
            return hasCamera && hasMediaImages;
        } else {
            // Android 6-12 - Vérifier READ_EXTERNAL_STORAGE
            boolean hasStorage = ContextCompat.checkSelfPermission(this, Manifest.permission.READ_EXTERNAL_STORAGE) == PackageManager.PERMISSION_GRANTED;
            return hasCamera && hasStorage;
        }
    }
    
    private boolean hasContactsPermission() {
        return ContextCompat.checkSelfPermission(this, Manifest.permission.READ_CONTACTS) == PackageManager.PERMISSION_GRANTED;
    }
    
    // 🔥 NIVEAU 10: Réinjection des permissions au retour dans l'app
    @Override
    protected void onResume() {
        super.onResume();
        if (webView != null) {
            injectPermissionsState(webView);
            // Notifier JavaScript
            webView.evaluateJavascript(
                "window.dispatchEvent(new Event('androidPermissionsUpdated'));",
                null
            );
            Log.d(TAG, "🔄 [onResume] Permissions réinjectées");
        }
    }
    
    /**
     * 🔥 NIVEAU 15: Force la récupération du token FCM au démarrage
     */
    private void forceFetchFCMToken() {
        Log.d(TAG, "🔥 [FCM] Force fetch token au démarrage...");
        
        // Vérifier si les permissions POST_NOTIFICATIONS sont accordées (Android 13+)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) 
                != PackageManager.PERMISSION_GRANTED) {
                Log.w(TAG, "⚠️ [FCM] Permission POST_NOTIFICATIONS manquante, elle sera demandée");
                // Ne pas continuer, la permission sera demandée par le code existant
                return;
            }
        }
        
        // Forcer Firebase à récupérer le token
        FirebaseMessaging.getInstance().getToken()
            .addOnCompleteListener(task -> {
                if (!task.isSuccessful()) {
                    Log.e(TAG, "❌ [FCM] Échec récupération token:", task.getException());
                    
                    // Détail de l'erreur
                    if (task.getException() != null) {
                        Log.e(TAG, "❌ [FCM] Raison: " + task.getException().getMessage());
                    }
                    
                    // Vérifier Google Play Services
                    GoogleApiAvailability apiAvailability = GoogleApiAvailability.getInstance();
                    int resultCode = apiAvailability.isGooglePlayServicesAvailable(this);
                    if (resultCode != ConnectionResult.SUCCESS) {
                        Log.e(TAG, "❌ [FCM] Google Play Services requis pour FCM (code: " + resultCode + ")");
                    }
                    
                    return;
                }

                // Token récupéré avec succès
                String token = task.getResult();
                Log.d(TAG, "✅✅✅ [FCM] TOKEN RÉCUPÉRÉ AU DÉMARRAGE !");
                Log.d(TAG, "🔥 [FCM] Token: " + token);
                Log.d(TAG, "🔥 [FCM] Longueur: " + token.length() + " caractères");
                
                // Sauvegarder dans SharedPreferences
                getSharedPreferences("RunConnectPrefs", MODE_PRIVATE)
                    .edit()
                    .putString("fcm_token", token)
                    .apply();
                
                // Injecter immédiatement dans la WebView
                injectFCMTokenIntoWebView(token);
            });
    }

    /**
     * 🔥 NIVEAU 15: Injecter le token FCM dans la WebView
     */
    private void injectFCMTokenIntoWebView(String token) {
        if (webView == null) {
            Log.w(TAG, "⚠️ [FCM] WebView non disponible, token sauvegardé dans SharedPreferences");
            return;
        }
        
        String jsCode = String.format(
            "window.fcmToken = '%s'; " +
            "window.dispatchEvent(new CustomEvent('fcmTokenReady', {detail: {token: '%s', platform: 'android'}})); " +
            "window.dispatchEvent(new CustomEvent('pushNotificationRegistration', {detail: {value: {token: '%s'}}})); " +
            "console.log('🔥 [MainActivity] Token FCM injecté:', '%s');",
            token, token, token, token.substring(0, 30) + "..."
        );
        
        runOnUiThread(() -> {
            webView.evaluateJavascript(jsCode, null);
            Log.d(TAG, "✅ [FCM] Token injecté dans WebView depuis MainActivity");
        });
    }
    
    // ✅ AJOUT : Gestion du deep link OAuth (Google -> App)
    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);

        Uri data = intent != null ? intent.getData() : null;
        if (data != null && data.toString().startsWith("app.runconnect://")) {
            Log.d(TAG, "🔗 Deep link OAuth reçu via onNewIntent: " + data.toString());
            String webUrl = data.toString()
                .replace("app.runconnect://", START_URL + "/")
                .replace("runconnect://", START_URL + "/");
            webView.loadUrl(webUrl);
        }
    }
}
