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

public class MainActivity extends AppCompatActivity {
    private static final String TAG = "RunConnect";
    private static final int REQ_LOCATION = 1001;
    private static final int REQ_STORAGE = 1002;
    private static final int REQ_CONTACTS = 1003;
    private WebView webView;
    // URL configurée dynamiquement via variable d'environnement ou propriété système
    private final String START_URL = System.getProperty("app.start.url", 
        System.getenv("RUNCONNECT_URL") != null ? System.getenv("RUNCONNECT_URL") : 
        "https://run-connect.lovable.app");
    
    // Cache mémoire pour les contacts (évite relecture à chaque appel)
    private static class ContactsCache {
        private String cachedData = null;
        private long lastUpdateTime = 0;
        private static final long CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
        
        public boolean isValid() {
            return cachedData != null && (System.currentTimeMillis() - lastUpdateTime) < CACHE_DURATION;
        }
        
        public void update(String data) {
            this.cachedData = data;
            this.lastUpdateTime = System.currentTimeMillis();
        }
        
        public String getData() {
            return cachedData;
        }
        
        public void invalidate() {
            cachedData = null;
            lastUpdateTime = 0;
        }
    }
    
    private final ContactsCache contactsCache = new ContactsCache();

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
        
        Log.d(TAG, "🚀 RunConnect AAB - Starting MainActivity");
        Log.d(TAG, "📍 URL to load: " + START_URL);

        // ✅ Full screen immersif + transparent
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        if (Build.VERSION.SDK_INT >= 21) {
            getWindow().setStatusBarColor(Color.TRANSPARENT);
            getWindow().setNavigationBarColor(Color.TRANSPARENT);
            getWindow().getDecorView().setSystemUiVisibility(
                android.view.View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                | android.view.View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                | android.view.View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                | android.view.View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
            );
        }

        // ✅ WebView setup
        webView = new WebView(this);
        
        // ✅ Ajouter l'interface JavaScript AndroidBridge
        webView.addJavascriptInterface(new AndroidBridge(), "AndroidBridge");
        
        WebSettings s = webView.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setLoadWithOverviewMode(true);
        s.setUseWideViewPort(true);
        s.setAllowFileAccess(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setGeolocationEnabled(true);
        
        // ✅ MODE CACHE : Utiliser le cache si pas de connexion
        s.setCacheMode(WebSettings.LOAD_CACHE_ELSE_NETWORK);
        
        Log.d(TAG, "🌐 WebView configured with geolocation enabled");
        Log.d(TAG, "💾 Cache mode enabled: LOAD_CACHE_ELSE_NETWORK");

        // ✅ Géolocalisation sans blocage (Android < 12)
        String dir = this.getApplicationContext().getDir("geolocation", Context.MODE_PRIVATE).getPath();
        s.setGeolocationDatabasePath(dir);

        // ✅ Autoriser la géolocalisation sans popup
        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onGeolocationPermissionsShowPrompt(String origin, GeolocationPermissions.Callback callback) {
                Log.d(TAG, "📍 Geolocation permission requested for: " + origin);
                callback.invoke(origin, true, false); // toujours autoriser
            }
        });

        // ✅ Gérer deep links et lifecycle des pages
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                String url = uri.toString();
                String host = uri.getHost() != null ? uri.getHost() : "";
                
                // ✅ 1. Intercepter le callback OAuth (app.runconnect:// ou runconnect://)
                if (url.startsWith("app.runconnect://") || url.startsWith("runconnect://")) {
                    Log.d(TAG, "🔗 Deep link callback OAuth détecté: " + url);
                    
                    // 🔥 CORRECTION : Recharger l'URL dans le WebView au lieu de manipuler le hash
                    // Cela permet à Supabase de détecter correctement le callback OAuth
                    try {
                        // Convertir app.runconnect://auth/callback vers https://run-connect.lovable.app/auth/callback
                        String webUrl = url.replace("app.runconnect://", START_URL + "/")
                                           .replace("runconnect://", START_URL + "/");
                        
                        Log.d(TAG, "🔄 Redirection vers: " + webUrl);
                        view.loadUrl(webUrl);
                        
                        return true; // ✅ On intercepte, le WebView gère la suite
                    } catch (Exception e) {
                        Log.e(TAG, "❌ Erreur ouverture callback OAuth: " + e.getMessage());
                        // Fallback : essayer quand même handleDeepLink
                        handleDeepLink(url);
                        return true;
                    }
                }
                
                // ✅ 2. Ouvrir Google OAuth dans Custom Tabs (sécurisé et conforme)
                if (host.contains("accounts.google.com") || 
                    (url.contains("oauth") && host.contains("google"))) {
                    
                    boolean chromeAvailable = isChromeInstalled();
                    Log.d(TAG, "🔐 Ouverture OAuth Google dans Custom Tabs: " + url);
                    Log.d(TAG, "🌐 Chrome installé: " + chromeAvailable);
                    
                    try {
                        // Custom Tabs avec couleur de toolbar personnalisée
                        CustomTabsIntent customTabsIntent = new CustomTabsIntent.Builder()
                            .setShowTitle(true)
                            .setToolbarColor(Color.parseColor("#1A1F2C")) // Couleur RunConnect
                            .build();
                        customTabsIntent.launchUrl(MainActivity.this, uri);
                        Log.d(TAG, "✅ Custom Tabs lancé avec succès");
                        return true;
                    } catch (Exception e) {
                        // Fallback : ouvrir dans le navigateur par défaut
                        Log.e(TAG, "❌ Erreur Custom Tabs, fallback vers navigateur: " + e.getMessage());
                        Intent browserIntent = new Intent(Intent.ACTION_VIEW, uri);
                        startActivity(browserIntent);
                        return true;
                    }
                }
                
                // ✅ 3. Toutes les autres URLs restent dans le WebView
                return false;
            }
            
            @Override
            public void onReceivedError(WebView view, int errorCode, String description, String failingUrl) {
                Log.e(TAG, "❌ Erreur réseau: " + description + " (code: " + errorCode + ")");
                
                // Afficher la page offline uniquement pour les erreurs réseau
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
                Log.d(TAG, "📦 Page terminée - injection flags AAB avec délai");
                // Délai pour s'assurer que la page est prête
                new android.os.Handler(android.os.Looper.getMainLooper()).postDelayed(() -> {
                    injectAABFlags(view);
                    injectPermissionsState(view);
                    injectDeviceInfo(view);
                    
                    // Vérification que l'injection a réussi après 500ms
                    new android.os.Handler(android.os.Looper.getMainLooper()).postDelayed(() -> {
                        verifyInjection(view);
                    }, 500);
                }, 1000); // Délai augmenté à 1000ms
                
                // Notifier JavaScript que l'injection est terminée
                view.evaluateJavascript("window.androidInjectionComplete = true; console.log('🚀 Android injection completed');", null);
            }
        });

        // ✅ Demande de permissions géolocalisation si pas encore données
        if (!hasLocationPermission()) {
            Log.d(TAG, "🔐 Requesting location permissions...");
            ActivityCompat.requestPermissions(this,
                    new String[]{
                            Manifest.permission.ACCESS_FINE_LOCATION,
                            Manifest.permission.ACCESS_COARSE_LOCATION
                    },
                    REQ_LOCATION);
        } else {
            Log.d(TAG, "✅ Location permissions already granted");
        }

        // ✅ Demande de permissions galerie/stockage si pas encore données
        if (!hasStoragePermission()) {
            Log.d(TAG, "🔐 Requesting storage permissions...");
            String[] storagePermissions;
            if (Build.VERSION.SDK_INT >= 33) {
                // Android 13+ - Utiliser READ_MEDIA_IMAGES + Visual User Selected
                storagePermissions = new String[]{
                    Manifest.permission.READ_MEDIA_IMAGES,
                    Manifest.permission.READ_MEDIA_VISUAL_USER_SELECTED,
                    Manifest.permission.CAMERA
                };
            } else {
                // Android 6-12 - Utiliser READ_EXTERNAL_STORAGE
                storagePermissions = new String[]{
                    Manifest.permission.READ_EXTERNAL_STORAGE,
                    Manifest.permission.CAMERA
                };
            }
            ActivityCompat.requestPermissions(this, storagePermissions, REQ_STORAGE);
        } else {
            Log.d(TAG, "✅ Storage permissions already granted");
        }

        // ✅ Demande de permissions contacts si pas encore données
        if (!hasContactsPermission()) {
            Log.d(TAG, "🔐 Requesting contacts permissions...");
            ActivityCompat.requestPermissions(this,
                    new String[]{Manifest.permission.READ_CONTACTS},
                    REQ_CONTACTS);
        } else {
            Log.d(TAG, "✅ Contacts permissions already granted");
        }

        // ✅ Créer le canal de notification pour Firebase
        createNotificationChannels();
        
        // ✅ Charger le site
        Log.d(TAG, "🌐 Loading WebView with URL: " + START_URL);
        webView.loadUrl(START_URL);
        setContentView(webView);
        
        // Injecter immédiatement après le chargement de l'URL avec délai
        new android.os.Handler(android.os.Looper.getMainLooper()).postDelayed(() -> {
            Log.d(TAG, "🔄 Injection initiale forcée au démarrage");
            injectAABFlags(webView);
            injectPermissionsState(webView);
            injectDeviceInfo(webView);
            verifyInjection(webView);
        }, 2000); // 2 secondes pour laisser la page se charger
        
        Log.d(TAG, "🎯 MainActivity setup complete");
    }
    
    @Override
    protected void onResume() {
        super.onResume();
        Log.d(TAG, "🔄 onResume - Réinjection état permissions");
        
        if (webView != null) {
            // Réinjecter l'état des permissions au retour de l'app
            injectPermissionsState(webView);
            
            // Notifier JavaScript que les permissions ont été mises à jour
            webView.evaluateJavascript(
                "console.log('🔄 [ONRESUME] Avant dispatch event:', window.androidPermissions); " +
                "window.dispatchEvent(new CustomEvent('androidPermissionsUpdated', {detail: window.androidPermissions})); " +
                "console.log('🔄 [ONRESUME] Après dispatch event');",
                null
            );
        }
    }
    
    private void createNotificationChannels() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                "high_importance_channel",
                "Notifications RunConnect",
                NotificationManager.IMPORTANCE_HIGH
            );
            channel.setDescription("Notifications importantes de RunConnect");
            channel.enableVibration(true);
            channel.enableLights(true);
            
            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) {
                manager.createNotificationChannel(channel);
                Log.d(TAG, "🔔 Notification channel created: high_importance_channel");
            }
        }
    }
    
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

    private void handleDeepLink(String url) {
        try {
            Log.d(TAG, "🔗 Traitement du deep link: " + url);
            
            // Extraire les paramètres de l'URL
            Uri uri = Uri.parse(url);
            String fragment = uri.getFragment(); // Récupère la partie après #
            
            if (fragment != null && !fragment.isEmpty()) {
                // Construire le JavaScript pour traiter la callback OAuth
                String jsCode = String.format(
                    "if (window.handleOAuthCallback) {" +
                    "  window.handleOAuthCallback('%s');" +
                    "} else {" +
                    "  window.location.hash = '%s';" +
                    "  console.log('🔗 OAuth callback reçu:', '%s');" +
                    "}",
                    fragment, fragment, fragment
                );
                
                webView.evaluateJavascript(jsCode, null);
                Log.d(TAG, "✅ Deep link traité avec succès");
            }
        } catch (Exception e) {
            Log.e(TAG, "❌ Erreur traitement deep link", e);
        }
    }

    // ✅ Autoriser retour arrière dans la WebView
    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }

    // ✅ Gestion du retour d'autorisation
    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        
        Log.d(TAG, "🚀 onRequestPermissionsResult: " + requestCode + " - " + java.util.Arrays.toString(permissions));
        
        // Analyser les résultats
        boolean allGranted = true;
        for (int i = 0; i < permissions.length; i++) {
            String permission = permissions[i];
            int result = grantResults[i];
            boolean granted = result == PackageManager.PERMISSION_GRANTED;
            boolean shouldShow = ActivityCompat.shouldShowRequestPermissionRationale(this, permission);
            
            if (!granted) {
                allGranted = false;
            }
            
            Log.d(TAG, "🚀 Permission " + permission + ": granted=" + granted + ", shouldShow=" + shouldShow);
        }
        
        // Mettre à jour l'état des permissions dans le WebView
        if (webView != null) {
            injectPermissionsState(webView);
            injectDeviceInfo(webView);
            
            // Notifier JavaScript du changement de permissions
            webView.evaluateJavascript("window.androidPermissionsUpdated = true; " +
                                     "if (window.onAndroidPermissionsChanged) { window.onAndroidPermissionsChanged(window.androidPermissions); } " +
                                     "window.dispatchEvent(new CustomEvent('androidPermissionsUpdated', { detail: window.androidPermissions })); " +
                                     "console.log('🚀 Permissions updated, triggering callbacks');", null);
            
            // ✅ CRITIQUE: Notifier le résultat via le callback JavaScript après 200ms
            final boolean finalResult = allGranted;
            new android.os.Handler(android.os.Looper.getMainLooper()).postDelayed(() -> {
                // Déterminer le type de permission pour logger
                String permissionType = "unknown";
                if (requestCode == REQ_CONTACTS) {
                    permissionType = "contacts";
                } else if (requestCode == REQ_LOCATION) {
                    permissionType = "location";
                } else if (requestCode == REQ_STORAGE) {
                    permissionType = "storage";
                }
                
                Log.d(TAG, "✅ Callback JavaScript pour " + permissionType + ": " + (finalResult ? "GRANTED" : "DENIED"));
                notifyJavaScriptPermissionResult(finalResult);
            }, 200);
        }
    }

    // ✅ Interface JavaScript pour les permissions natives
    private class AndroidBridge {
        @android.webkit.JavascriptInterface
        public void requestContactsPermission() {
            Log.d(TAG, "👥 AndroidBridge: demande permission contacts depuis JavaScript");
            
            runOnUiThread(() -> {
                if (hasContactsPermission()) {
                    Log.d(TAG, "👥 Permission contacts déjà accordée");
                    injectPermissionsState(webView);
                    notifyJavaScriptPermissionResult(true);
                } else {
                    Log.d(TAG, "👥 Demande permission contacts à l'utilisateur");
                    ActivityCompat.requestPermissions(MainActivity.this,
                            new String[]{Manifest.permission.READ_CONTACTS},
                            REQ_CONTACTS);
                }
            });
        }
        
        @android.webkit.JavascriptInterface
        public void requestLocationPermission() {
            Log.d(TAG, "📍 AndroidBridge: demande permission localisation depuis JavaScript");
            
            runOnUiThread(() -> {
                if (hasLocationPermission()) {
                    Log.d(TAG, "📍 Permission localisation déjà accordée");
                    injectPermissionsState(webView);
                    notifyJavaScriptPermissionResult(true);
                } else {
                    Log.d(TAG, "📍 Demande permission localisation à l'utilisateur");
                    ActivityCompat.requestPermissions(MainActivity.this,
                            new String[]{
                                Manifest.permission.ACCESS_FINE_LOCATION,
                                Manifest.permission.ACCESS_COARSE_LOCATION
                            },
                            REQ_LOCATION);
                }
            });
        }
        
        @android.webkit.JavascriptInterface
        public void requestStoragePermission() {
            Log.d(TAG, "📸 AndroidBridge: demande permission stockage depuis JavaScript");
            
            runOnUiThread(() -> {
                if (hasStoragePermission()) {
                    Log.d(TAG, "📸 Permission stockage déjà accordée");
                    injectPermissionsState(webView);
                    notifyJavaScriptPermissionResult(true);
                } else {
                    Log.d(TAG, "📸 Demande permission stockage à l'utilisateur");
                    String[] storagePermissions;
                    if (Build.VERSION.SDK_INT >= 33) {
                        storagePermissions = new String[]{
                            Manifest.permission.READ_MEDIA_IMAGES,
                            Manifest.permission.READ_MEDIA_VISUAL_USER_SELECTED,
                            Manifest.permission.CAMERA
                        };
                    } else {
                        storagePermissions = new String[]{
                            Manifest.permission.READ_EXTERNAL_STORAGE,
                            Manifest.permission.CAMERA
                        };
                    }
                ActivityCompat.requestPermissions(MainActivity.this, storagePermissions, REQ_STORAGE);
                }
            });
        }
        
        @android.webkit.JavascriptInterface
        public void getContacts() {
            Log.d(TAG, "👥 AndroidBridge: récupération contacts (asynchrone)");
            
            // Vérifier permission
            if (!hasContactsPermission()) {
                Log.d(TAG, "👥❌ Permission contacts refusée");
                notifyContactsResult("{\"error\": \"Permission denied\"}");
                return;
            }
            
            // ✅ Vérifier le cache d'abord (instantané)
            if (contactsCache.isValid()) {
                Log.d(TAG, "👥⚡ Utilisation cache contacts");
                notifyContactsResult(contactsCache.getData());
                return;
            }
            
            // ✅ LANCER LA RÉCUPÉRATION EN ARRIÈRE-PLAN (NON-BLOQUANT)
            new Thread(() -> {
                long startTime = System.currentTimeMillis();
                Log.d(TAG, "👥🔄 Début récupération contacts en background thread");
                
                try {
                    String result = fetchContactsSync();
                    long elapsed = System.currentTimeMillis() - startTime;
                    Log.d(TAG, "👥✅ Contacts chargés en " + elapsed + " ms");
                    
                    // ✅ Mettre à jour le cache
                    contactsCache.update(result);
                    
                    // ✅ Notifier JavaScript sur le UI thread
                    notifyContactsResult(result);
                    
                } catch (Exception e) {
                    Log.e(TAG, "👥❌ Erreur récupération contacts", e);
                    notifyContactsResult("{\"error\": \"" + e.getMessage() + "\"}");
                }
            }).start();
        }

        // Méthode synchrone appelée uniquement dans le thread background
        private String fetchContactsSync() throws Exception {
            JSONArray contactsArray = new JSONArray();
            ContentResolver cr = getContentResolver();
            
            // ✅ OPTIMISATION: Utiliser une projection limitée (colonnes nécessaires seulement)
            String[] projection = new String[]{
                ContactsContract.Contacts._ID,
                ContactsContract.Contacts.DISPLAY_NAME,
                ContactsContract.Contacts.HAS_PHONE_NUMBER
            };
            
            Cursor cursor = cr.query(
                ContactsContract.Contacts.CONTENT_URI,
                projection,
                null,
                null,
                ContactsContract.Contacts.DISPLAY_NAME + " ASC" // Tri SQL (plus rapide)
            );
            
            if (cursor != null && cursor.moveToFirst()) {
                int idIndex = cursor.getColumnIndex(ContactsContract.Contacts._ID);
                int nameIndex = cursor.getColumnIndex(ContactsContract.Contacts.DISPLAY_NAME);
                int hasPhoneIndex = cursor.getColumnIndex(ContactsContract.Contacts.HAS_PHONE_NUMBER);
                
                do {
                    String contactId = cursor.getString(idIndex);
                    String displayName = cursor.getString(nameIndex);
                    
                    JSONObject contact = new JSONObject();
                    contact.put("contactId", contactId);
                    contact.put("displayName", displayName);
                    
                    // ✅ Récupérer téléphones UNIQUEMENT si hasPhoneNumber = true
                    JSONArray phoneArray = new JSONArray();
                    if (cursor.getInt(hasPhoneIndex) > 0) {
                        Cursor phoneCursor = cr.query(
                            ContactsContract.CommonDataKinds.Phone.CONTENT_URI,
                            new String[]{ContactsContract.CommonDataKinds.Phone.NUMBER},
                            ContactsContract.CommonDataKinds.Phone.CONTACT_ID + " = ?",
                            new String[]{contactId},
                            null
                        );
                        
                        if (phoneCursor != null) {
                            while (phoneCursor.moveToNext()) {
                                JSONObject phone = new JSONObject();
                                phone.put("number", phoneCursor.getString(0));
                                phoneArray.put(phone);
                            }
                            phoneCursor.close();
                        }
                    }
                    contact.put("phoneNumbers", phoneArray);
                    
                    // ✅ Récupérer emails (optimisé avec projection)
                    JSONArray emailArray = new JSONArray();
                    Cursor emailCursor = cr.query(
                        ContactsContract.CommonDataKinds.Email.CONTENT_URI,
                        new String[]{ContactsContract.CommonDataKinds.Email.ADDRESS},
                        ContactsContract.CommonDataKinds.Email.CONTACT_ID + " = ?",
                        new String[]{contactId},
                        null
                    );
                    
                    if (emailCursor != null) {
                        while (emailCursor.moveToNext()) {
                            JSONObject emailObj = new JSONObject();
                            emailObj.put("address", emailCursor.getString(0));
                            emailArray.put(emailObj);
                        }
                        emailCursor.close();
                    }
                    contact.put("emails", emailArray);
                    
                    contactsArray.put(contact);
                } while (cursor.moveToNext());
                
                cursor.close();
            }
            
            return contactsArray.toString();
        }

        // Méthode pour notifier JavaScript depuis n'importe quel thread
        private void notifyContactsResult(String result) {
            runOnUiThread(() -> {
                if (webView != null) {
                    String escapedResult = result.replace("\\", "\\\\").replace("'", "\\'").replace("\n", "\\n").replace("\r", "\\r");
                    String jsCode = "window.dispatchEvent(new CustomEvent('contactsLoaded', { detail: '" + escapedResult + "' }));";
                    webView.evaluateJavascript(jsCode, null);
                }
            });
        }

        @android.webkit.JavascriptInterface
        public void invalidateContactsCache() {
            Log.d(TAG, "👥🗑️ Cache contacts invalidé");
            contactsCache.invalidate();
        }
    }
    
    private void notifyJavaScriptPermissionResult(boolean granted) {
        if (webView != null) {
            String jsCode = String.format(
                "if (window.onNativePermissionResult) { window.onNativePermissionResult(%s); }",
                granted ? "true" : "false"
            );
            webView.evaluateJavascript(jsCode, null);
        }
    }
}