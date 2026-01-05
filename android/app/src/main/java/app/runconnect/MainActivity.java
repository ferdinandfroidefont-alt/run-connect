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
import android.provider.Settings;
import android.util.Log;
import android.webkit.GeolocationPermissions;
import android.webkit.WebChromeClient;
import android.webkit.ValueCallback;
import android.webkit.PermissionRequest;
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
import android.os.Message;
import android.util.Base64;
import android.widget.ProgressBar;
import android.widget.RelativeLayout;
import android.widget.TextView;
import android.widget.LinearLayout;
import android.widget.ImageView;
import android.view.animation.Animation;
import android.view.animation.AnimationUtils;

import androidx.appcompat.app.AppCompatActivity;
import androidx.browser.customtabs.CustomTabsIntent;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import androidx.core.view.WindowCompat;

import com.google.firebase.messaging.FirebaseMessaging;
import com.google.android.gms.tasks.OnCompleteListener;
import com.google.android.gms.tasks.Task;
import androidx.annotation.NonNull;
import com.google.android.gms.auth.api.signin.GoogleSignIn;
import com.google.android.gms.auth.api.signin.GoogleSignInAccount;
import com.google.android.gms.auth.api.signin.GoogleSignInClient;
import com.google.android.gms.auth.api.signin.GoogleSignInOptions;
import com.google.android.gms.common.api.ApiException;
import com.google.android.gms.common.ConnectionResult;

public class MainActivity extends AppCompatActivity {
    private static final String TAG = "RunConnect";
    private static final int REQ_LOCATION = 1001;
    private static final int REQ_STORAGE = 1002;
    private static final int REQ_CONTACTS = 1003;
    private static final int REQ_CAMERA = 1004; // 📹 Code pour caméra
    private static final int REQ_MICROPHONE = 1005; // 🎤 Code pour microphone
    private static final int REQ_NOTIFICATIONS = 1006; // ✅ Code unique pour notifications
    private static final int FILE_CHOOSER_REQUEST_CODE = 3000; // 🖼️ Code pour file chooser
    private static final int GOOGLE_SIGN_IN_REQUEST_CODE = 9001; // 🔐 Code pour Google Sign-In
    private ValueCallback<Uri[]> filePathCallback; // 🖼️ Callback pour récupérer l'URI du fichier
    public WebView webView;
    public static MainActivity instance;
    private final String START_URL = "https://run-connect.lovable.app";
    private GoogleSignInClient mGoogleSignInClient; // 🔥 Client Google Sign-In
    
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
    private String cachedFCMToken = null; // 🔥 NIVEAU 22 : Stocker le token pour injection différée
    
    // 🎨 Références pour le splash overlay
    private RelativeLayout splashOverlay;
    private ProgressBar splashProgressBar;
    private TextView splashProgressText;
    
    // 🎬 Animations du splash
    private Animation logoAnimation;
    private Animation welcomeTextAnimation;
    private Animation titleAnimation;
    private Animation progressAnimation;
    private Animation shimmerAnimation;

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

    /**
     * 🔥 CORRECTION #2: Vérifier la disponibilité de Google Play Services
     */
    private boolean checkGooglePlayServices() {
        com.google.android.gms.common.GoogleApiAvailability availability = 
            com.google.android.gms.common.GoogleApiAvailability.getInstance();
        int resultCode = availability.isGooglePlayServicesAvailable(this);
        
        if (resultCode != com.google.android.gms.common.ConnectionResult.SUCCESS) {
            Log.e(TAG, "❌ Google Play Services indisponible (code: " + resultCode + ")");
            if (availability.isUserResolvableError(resultCode)) {
                availability.getErrorDialog(this, resultCode, 9000).show();
            }
            return false;
        }
        Log.d(TAG, "✅ Google Play Services disponible");
        return true;
    }

    /**
     * 🎯 Configure status bar visibility - Show status bar, hide navigation bar
     * Uses WindowInsetsControllerCompat for maximum compatibility across all Android versions
     */
    private void setupImmersiveMode() {
        try {
            // Use AndroidX WindowInsetsControllerCompat for Android 15/16 compatibility
            androidx.core.view.WindowInsetsControllerCompat insetsController = 
                new androidx.core.view.WindowInsetsControllerCompat(getWindow(), getWindow().getDecorView());
            
            // 🎯 SHOW status bar (time, battery, network) - HIDE navigation bar only
            insetsController.show(androidx.core.view.WindowInsetsCompat.Type.statusBars());
            insetsController.hide(androidx.core.view.WindowInsetsCompat.Type.navigationBars());
            insetsController.setSystemBarsBehavior(
                androidx.core.view.WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
            );
            
            // Set status bar to dark icons on light background (or light icons on dark)
            insetsController.setAppearanceLightStatusBars(true);
            
            // Make content extend behind status bar
            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.R) {
                getWindow().setDecorFitsSystemWindows(true);
            }
            
            Log.d(TAG, "✅ Status bar visible, navigation bar hidden via WindowInsetsControllerCompat");
        } catch (Exception e) {
            Log.w(TAG, "⚠️ WindowInsetsControllerCompat failed, falling back to legacy mode: " + e.getMessage());
            // Fallback to legacy flags - show status bar, hide navigation
            getWindow().getDecorView().setSystemUiVisibility(
                android.view.View.SYSTEM_UI_FLAG_HIDE_NAVIGATION |
                android.view.View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY |
                android.view.View.SYSTEM_UI_FLAG_LAYOUT_STABLE |
                android.view.View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
            );
            Log.d(TAG, "✅ Status bar visible via legacy SystemUiVisibility");
        }
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        // 🎯 Android 16 Fix: Opt-out de l'edge-to-edge enforcement AVANT super.onCreate()
        if (android.os.Build.VERSION.SDK_INT >= 35) {
            try {
                getTheme().applyStyle(R.style.OptOutEdgeToEdgeEnforcement, false);
                Log.d(TAG, "✅ Android 16: OptOutEdgeToEdgeEnforcement applied");
            } catch (Exception e) {
                Log.w(TAG, "⚠️ Could not apply OptOutEdgeToEdgeEnforcement: " + e.getMessage());
            }
        }
        
        super.onCreate(savedInstanceState);
        
        // ⚠️ IMPORTANT: Charger le layout D'ABORD (Android 15 fix)
        setContentView(R.layout.activity_main);
        
        // 🎯 FULLSCREEN IMMERSIF - APRÈS setContentView pour éviter NullPointerException sur Android 15
        setupImmersiveMode();
        
        // Stocker l'instance pour accès depuis MessagingService
        instance = this;
        
        // Handle deep link if activity was started with one
        handleIntent(getIntent());
        
        Log.d(TAG, "═══════════════════════════════════════════════════════════");
        Log.d(TAG, "🚀 RunConnect AAB - Starting MainActivity");
        Log.d(TAG, "📱 Device: " + Build.MANUFACTURER + " " + Build.MODEL);
        Log.d(TAG, "📱 Android: " + Build.VERSION.RELEASE + " (API " + Build.VERSION.SDK_INT + ")");
        Log.d(TAG, "📍 URL to load: " + START_URL);
        Log.d(TAG, "═══════════════════════════════════════════════════════════");
        
        // 🛡️ TRY-CATCH GLOBAL pour éviter les crashs au démarrage
        try {
            initializeAppSafely();
        } catch (Exception e) {
            Log.e(TAG, "💥 ERREUR CRITIQUE dans onCreate: " + e.getMessage(), e);
            handleCriticalError(e);
        }
    }
    
    /**
     * 🛡️ Initialise l'application de manière sécurisée
     * Toute la logique d'init est ici pour pouvoir être catchée
     */
    private void initializeAppSafely() {
        
        // 🔥 Initialiser Google Sign-In Client (avec protection)
        initializeGoogleSignInSafely();

        // ✅ Status bar visible avec couleur du thème
        WindowCompat.setDecorFitsSystemWindows(getWindow(), true);
        if (Build.VERSION.SDK_INT >= 21) {
            // Status bar avec couleur primaire de l'app
            getWindow().setStatusBarColor(0xFF5B7CFF); // colorPrimary
            getWindow().setNavigationBarColor(Color.BLACK);
            // Ne cacher que la barre de navigation
            getWindow().getDecorView().setSystemUiVisibility(
                android.view.View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                | android.view.View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                | android.view.View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
            );
        }

        // ✅ Récupérer les références des vues
        webView = findViewById(R.id.webview);
        splashOverlay = findViewById(R.id.splash_overlay);
        splashProgressBar = findViewById(R.id.splash_progress_bar);
        splashProgressText = findViewById(R.id.splash_progress_text);
        
        // Fond bleu pendant le chargement pour éviter l'écran blanc
        webView.setBackgroundColor(0xFF5B7CFF); // Couleur colorPrimary (corrigée)
        
        // ✅ Créer le canal de notification au démarrage
        createNotificationChannelAtStartup();
        
        // 🔥 NIVEAU 20: Forcer la génération du token FCM au démarrage
        forceFCMTokenGeneration();
        
        // ✅ Ajouter l'interface JavaScript AndroidBridge
        webView.addJavascriptInterface(new AndroidBridge(), "AndroidBridge");
        
        WebSettings s = webView.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setSupportMultipleWindows(true);
        s.setLoadWithOverviewMode(true);
        s.setUseWideViewPort(true);
        s.setAllowFileAccess(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setGeolocationEnabled(true);
        
        // ✅ MODE CACHE : Utiliser le cache si pas de connexion
        s.setCacheMode(WebSettings.LOAD_CACHE_ELSE_NETWORK);
        
        // 🛡️ Compatibilité multi-versions Android
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            s.setMixedContentMode(WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE);
            Log.d(TAG, "📱 Mixed content mode: COMPATIBILITY (Android 5.0+)");
        }
        
        // 🛡️ Désactiver hardware acceleration sur appareils problématiques
        if (isProblematicWebViewDevice()) {
            webView.setLayerType(android.view.View.LAYER_TYPE_SOFTWARE, null);
            Log.w(TAG, "⚠️ Hardware acceleration DÉSACTIVÉE pour compatibilité");
        }
        
        Log.d(TAG, "🌐 WebView configured with geolocation enabled");
        Log.d(TAG, "💾 Cache mode enabled: LOAD_CACHE_ELSE_NETWORK");

        // ✅ Géolocalisation sans blocage (Android < 12)
        String dir = this.getApplicationContext().getDir("geolocation", Context.MODE_PRIVATE).getPath();
        s.setGeolocationDatabasePath(dir);

        // ✅ Autoriser la géolocalisation sans popup + Gérer les popups OAuth + File Chooser
        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onGeolocationPermissionsShowPrompt(String origin, GeolocationPermissions.Callback callback) {
                Log.d(TAG, "📍 Geolocation permission requested for: " + origin);
                callback.invoke(origin, true, false); // toujours autoriser
            }
            
            // 🎯 NOUVEAU : Connecter la progression réelle de la WebView au splash
            @Override
            public void onProgressChanged(WebView view, int newProgress) {
                Log.d(TAG, "🔄 WebView loading progress: " + newProgress + "%");
                
                // Mettre à jour le splash si visible
                if (splashOverlay != null && splashOverlay.getVisibility() == android.view.View.VISIBLE) {
                    splashProgressBar.setProgress(newProgress);
                    splashProgressText.setText(newProgress + "%");
                    
                    // Masquer le splash quand la page est complètement chargée
                    if (newProgress >= 100) {
                        Log.d(TAG, "✅ WebView loaded, hiding splash overlay");
                        
                        // 🎬 ARRÊTER toutes les animations avant de masquer le splash
                        ImageView appLogo = findViewById(R.id.app_logo);
                        if (appLogo != null && logoAnimation != null) {
                            appLogo.clearAnimation();
                        }
                        if (splashProgressBar != null && shimmerAnimation != null) {
                            splashProgressBar.clearAnimation();
                        }
                        
                        // Attendre 300ms pour une transition fluide
                        new android.os.Handler().postDelayed(new Runnable() {
                            @Override
                            public void run() {
                                splashOverlay.setVisibility(android.view.View.GONE);
                            }
                        }, 300);
                    }
                }
            }
            
            @Override
            public boolean onCreateWindow(WebView view, boolean isDialog, boolean isUserGesture, Message resultMsg) {
                Log.d(TAG, "🪟 onCreateWindow appelé - Bloqué (utilise Chrome Custom Tabs)");
                return false; // Bloquer les popups, on gère via Custom Tabs
            }
            
            // 🖼️ GÉRER L'OUVERTURE DE FICHIERS / GALERIE
            @Override
            public boolean onShowFileChooser(
                WebView webView,
                ValueCallback<Uri[]> filePathCallback,
                FileChooserParams fileChooserParams
            ) {
                Log.d(TAG, "🖼️ [FILE CHOOSER] onShowFileChooser appelé");
                
                // Si un callback existe déjà, l'annuler
                if (MainActivity.this.filePathCallback != null) {
                    MainActivity.this.filePathCallback.onReceiveValue(null);
                }
                
                MainActivity.this.filePathCallback = filePathCallback;
                
                try {
                    // Créer un Intent pour ouvrir la galerie
                    Intent intent = new Intent(Intent.ACTION_PICK);
                    intent.setType("image/*");
                    intent.putExtra(Intent.EXTRA_MIME_TYPES, new String[]{"image/jpeg", "image/png", "image/jpg"});
                    
                    Log.d(TAG, "🖼️ [FILE CHOOSER] Lancement Intent.ACTION_PICK");
                    startActivityForResult(intent, FILE_CHOOSER_REQUEST_CODE);
                    return true;
                    
                } catch (Exception e) {
                    Log.e(TAG, "🖼️❌ [FILE CHOOSER] Erreur ouverture galerie", e);
                    MainActivity.this.filePathCallback = null;
                    return false;
                }
            }
            
            /**
             * 🎤 GÉRER LES PERMISSIONS WEBVIEW (MICROPHONE, CAMÉRA)
             */
            @Override
            public void onPermissionRequest(final PermissionRequest request) {
                Log.d(TAG, "🎤 [PERMISSION REQUEST] Demande de permission WebView");
                
                if (request.getResources() == null || request.getResources().length == 0) {
                    Log.w(TAG, "🎤⚠️ [PERMISSION REQUEST] Aucune ressource demandée");
                    request.deny();
                    return;
                }

                for (String resource : request.getResources()) {
                    Log.d(TAG, "🎤 [PERMISSION REQUEST] Ressource demandée: " + resource);
                    
                    // Gérer le microphone
                    if (resource.equals(PermissionRequest.RESOURCE_AUDIO_CAPTURE)) {
                        if (ContextCompat.checkSelfPermission(MainActivity.this, Manifest.permission.RECORD_AUDIO) 
                            == PackageManager.PERMISSION_GRANTED) {
                            Log.d(TAG, "🎤✅ [PERMISSION REQUEST] Permission RECORD_AUDIO accordée, autorisation WebView");
                            request.grant(request.getResources());
                            return;
                        } else {
                            Log.d(TAG, "🎤⚠️ [PERMISSION REQUEST] Permission RECORD_AUDIO manquante, demande popup Android");
                            ActivityCompat.requestPermissions(
                                MainActivity.this,
                                new String[]{Manifest.permission.RECORD_AUDIO},
                                REQ_MICROPHONE
                            );
                            request.deny();
                            return;
                        }
                    }
                    
                    // Gérer la caméra
                    if (resource.equals(PermissionRequest.RESOURCE_VIDEO_CAPTURE)) {
                        if (ContextCompat.checkSelfPermission(MainActivity.this, Manifest.permission.CAMERA) 
                            == PackageManager.PERMISSION_GRANTED) {
                            Log.d(TAG, "📹✅ [PERMISSION REQUEST] Permission CAMERA accordée, autorisation WebView");
                            request.grant(request.getResources());
                            return;
                        } else {
                            Log.d(TAG, "📹⚠️ [PERMISSION REQUEST] Permission CAMERA manquante, demande popup Android");
                            ActivityCompat.requestPermissions(
                                MainActivity.this,
                                new String[]{Manifest.permission.CAMERA},
                                REQ_CAMERA
                            );
                            request.deny();
                            return;
                        }
                    }
                }
                
                Log.w(TAG, "⚠️ [PERMISSION REQUEST] Ressource non gérée, refus");
                request.deny();
            }
        });

        // ✅ Gérer deep links et lifecycle des pages
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                String url = request.getUrl().toString();
                Log.d(TAG, "🔗 URL interceptée: " + url);

                // ✅ LOG DE DEBUG : Vérifier qu'aucune URL OAuth Google n'est interceptée
                if (url.contains("accounts.google.com")) {
                    Log.e(TAG, "❌❌❌ URL GOOGLE OAUTH INTERCEPTÉE - NE DEVRAIT JAMAIS ARRIVER AVEC FIREBASE AUTH NATIF !");
                }


                // ✅ Si callback OAuth (app.runconnect://), charger dans la WebView
                if (url.startsWith("app.runconnect://") || url.startsWith("runconnect://")) {
                    Log.d(TAG, "✅ Callback OAuth détecté: " + url);
                    
                    try {
                        // Convertir app.runconnect://auth/callback vers https://run-connect.lovable.app/auth/callback
                        String webUrl = url.replace("app.runconnect://", START_URL + "/")
                                           .replace("runconnect://", START_URL + "/");
                        
                        Log.d(TAG, "🔄 Redirection vers: " + webUrl);
                        view.loadUrl(webUrl);
                        
                        return true;
                    } catch (Exception e) {
                        Log.e(TAG, "❌ Erreur ouverture callback OAuth: " + e.getMessage());
                        handleDeepLink(url);
                        return true;
                    }
                }

                // ✅ Si lien externe (http/https), ouvrir dans le navigateur
                if (url.startsWith("http://") || url.startsWith("https://")) {
                    if (!url.contains("run-connect.lovable.app") && 
                        !url.contains("lovableproject.com") &&
                        !url.contains("supabase.co") &&
                        !url.contains("accounts.google.com")) {
                        Log.d(TAG, "🌐 Lien externe détecté, ouverture dans le navigateur");
                        Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
                        startActivity(intent);
                        return true;
                    }
                }

                // ✅ Charger dans la WebView par défaut
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
                // Retirer le fond bleu une fois la page chargée
                view.setBackgroundColor(Color.TRANSPARENT);
                // Délai pour s'assurer que la page est prête
                new android.os.Handler(android.os.Looper.getMainLooper()).postDelayed(() -> {
                    injectAABFlags(view);
                    injectPermissionsState(view);
                    injectDeviceInfo(view);
                    
                    // 🔥 NIVEAU 23 : Réinjecter le token FCM + retry automatique
                    if (cachedFCMToken != null && !cachedFCMToken.isEmpty()) {
                        Log.d(TAG, "🔥 [PAGE-FINISHED] Réinjection du token FCM: " + cachedFCMToken.substring(0, 40) + "...");
                        injectFCMTokenIntoWebView(cachedFCMToken);
                    } else {
                        Log.d(TAG, "⏳ [PAGE-FINISHED] Token FCM pas encore disponible, retry dans 2s...");
                        
                        // Retry après 2 secondes (Firebase peut être lent)
                        new android.os.Handler(android.os.Looper.getMainLooper()).postDelayed(() -> {
                            if (cachedFCMToken != null && !cachedFCMToken.isEmpty()) {
                                Log.d(TAG, "🔥 [RETRY] Token disponible au retry, injection...");
                                injectFCMTokenIntoWebView(cachedFCMToken);
                            } else {
                                Log.e(TAG, "❌ [RETRY] Token toujours null après 2s - problème Firebase");
                            }
                        }, 2000);
                    }
                    
                    // Vérification que l'injection a réussi après 500ms
                    new android.os.Handler(android.os.Looper.getMainLooper()).postDelayed(() -> {
                        verifyInjection(view);
                    }, 500);
                }, 1000); // Délai augmenté à 1000ms
                
                // Notifier JavaScript que l'injection est terminée
                view.evaluateJavascript("window.androidInjectionComplete = true; console.log('🚀 Android injection completed');", null);
            }
        });


        // ✅ RÉACTIVÉ - Demande automatique de permissions au démarrage
        // Affiche les pop-ups Android natives dès le premier lancement
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

        if (!hasStoragePermission()) {
            Log.d(TAG, "🔐 Requesting storage permissions...");
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
            ActivityCompat.requestPermissions(this, storagePermissions, REQ_STORAGE);
        } else {
            Log.d(TAG, "✅ Storage permissions already granted");
        }

        if (!hasContactsPermission()) {
            Log.d(TAG, "🔐 Requesting contacts permissions...");
            ActivityCompat.requestPermissions(this,
                    new String[]{Manifest.permission.READ_CONTACTS},
                    REQ_CONTACTS);
        } else {
            Log.d(TAG, "✅ Contacts permissions already granted");
        }

        if (Build.VERSION.SDK_INT >= 23 && 
            ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
            Log.d(TAG, "🔐 Requesting microphone permissions...");
            ActivityCompat.requestPermissions(this,
                    new String[]{Manifest.permission.RECORD_AUDIO},
                    1004);
        } else {
            Log.d(TAG, "✅ Microphone permissions already granted");
        }

        // ✅ Créer le canal de notification pour Firebase
        createNotificationChannels();
        
        // 🔥 INITIALISER FIREBASE ET RÉCUPÉRER LE TOKEN FCM
        initializeFirebaseMessaging();
        
        // ✅ Vérifier si notifications déjà autorisées au démarrage
        checkNotificationPermissionAtStartup();
        
        // 🔥 NIVEAU 28: Injecter les flags AVANT le chargement de l'URL
        Log.d(TAG, "🔥 [NIVEAU 28] Injection précoce des flags AAB AVANT loadUrl");
        injectAABFlags(webView);
        
        // ✅ Charger le site
        Log.d(TAG, "🌐 Loading WebView with URL: " + START_URL);
        webView.loadUrl(START_URL);
        
        // 🔥 NOUVEAU: Vérifier la version WebView installée
        checkWebViewVersion();
        
        // ⏱️ TIMEOUT: Afficher page offline si chargement trop long (15s)
        new android.os.Handler(android.os.Looper.getMainLooper()).postDelayed(() -> {
            if (splashOverlay != null && splashOverlay.getVisibility() == android.view.View.VISIBLE) {
                if (splashProgressBar != null && splashProgressBar.getProgress() < 30) {
                    Log.w(TAG, "⏱️ TIMEOUT WebView - Progression bloquée à " + splashProgressBar.getProgress() + "%");
                    Log.w(TAG, "⏱️ Affichage de la page offline");
                    webView.loadUrl("file:///android_asset/offline.html");
                    splashOverlay.setVisibility(android.view.View.GONE);
                }
            }
        }, 15000);
        
        // Injecter immédiatement après le chargement de l'URL avec délai
        new android.os.Handler(android.os.Looper.getMainLooper()).postDelayed(() -> {
            Log.d(TAG, "🔄 Injection initiale forcée au démarrage");
            injectAABFlags(webView);
            injectPermissionsState(webView);
            injectDeviceInfo(webView);
            verifyInjection(webView);
        }, 1000); // ✅ Réduit à 1s pour que AndroidBridge soit disponible plus rapidement
        
        Log.d(TAG, "🎯 MainActivity setup complete");
    }
    
    /**
     * 📦 Vérifie la version de WebView installée sur l'appareil
     */
    private void checkWebViewVersion() {
        try {
            // Essayer les différents packages WebView
            String[] webViewPackages = {
                "com.google.android.webview",
                "com.android.webview",
                "com.google.android.trichromelibrary"
            };
            
            for (String packageName : webViewPackages) {
                try {
                    android.content.pm.PackageInfo webViewPackage = getPackageManager()
                        .getPackageInfo(packageName, 0);
                    
                    long versionCode;
                    if (Build.VERSION.SDK_INT >= 28) {
                        versionCode = webViewPackage.getLongVersionCode();
                    } else {
                        versionCode = webViewPackage.versionCode;
                    }
                    
                    Log.d(TAG, "📦 WebView Package: " + packageName);
                    Log.d(TAG, "📦 WebView Version: " + webViewPackage.versionName + " (code: " + versionCode + ")");
                    
                    // Alerter si version très ancienne (< version 80, environ code 4000000)
                    if (versionCode < 4000000 && versionCode > 0) {
                        Log.w(TAG, "⚠️ WebView très ancienne détectée - compatibilité limitée possible");
                    }
                    
                    return; // Trouvé, on arrête
                } catch (android.content.pm.PackageManager.NameNotFoundException e) {
                    // Ce package n'existe pas, essayer le suivant
                }
            }
            
            Log.w(TAG, "⚠️ Impossible de détecter le package WebView");
        } catch (Exception e) {
            Log.w(TAG, "⚠️ Erreur lors de la vérification WebView: " + e.getMessage());
        }
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
    
    /**
     * 🔥 HANDLE NEW INTENT - Pour gérer les deep links Strava
     */
    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        Log.d(TAG, "🔗 onNewIntent appelé");
        setIntent(intent);
        handleIntent(intent);
    }
    
    /**
     * 🔥 HANDLE INTENT - Gérer les deep links (Strava, etc.)
     */
    private void handleIntent(Intent intent) {
        if (intent == null) {
            Log.d(TAG, "🔗 Intent null, aucun deep link");
            return;
        }
        
        Uri data = intent.getData();
        if (data == null) {
            Log.d(TAG, "🔗 Pas de données dans l'intent");
            return;
        }
        
        String deepLink = data.toString();
        Log.d(TAG, "🔗 Deep link reçu: " + deepLink);
        
        // 👤 GÉRER LES LIENS PROFIL PUBLIC: app.runconnect://profile/<username>
        String scheme = data.getScheme();
        String host = data.getHost();
        if ("app.runconnect".equals(scheme) && "profile".equals(host)) {
            String username = data.getLastPathSegment();
            if (username != null) {
                String webUrl = START_URL + "/p/" + username;
                Log.d(TAG, "👤 [DEEP LINK PROFILE] Redirection vers: " + webUrl);
                if (webView != null) {
                    webView.post(() -> webView.loadUrl(webUrl));
                }
                return;
            }
        }
        
        // Vérifier si c'est un callback Strava
        if (deepLink.contains("strava/success")) {
            Log.d(TAG, "✅ Callback Strava détecté !");
            
            // Injecter un événement JavaScript pour notifier l'app web
            if (webView != null) {
                webView.post(() -> {
                    String script = "window.dispatchEvent(new CustomEvent('stravaAuthSuccess', { detail: { success: true } }));";
                    webView.evaluateJavascript(script, value -> {
                        Log.d(TAG, "✅ Événement stravaAuthSuccess injecté dans la WebView");
                    });
                    
                    // Rediriger vers la page de profil
                    webView.loadUrl(START_URL + "/profile");
                });
            }
            
            return;
        }
        
        // 🔑 GÉRER LES LIENS PASSWORD RESET SUPABASE
        if (deepLink.contains("run-connect.lovable.app") || 
            deepLink.contains("lovableproject.com")) {
            
            Log.d(TAG, "🔑 Lien password reset / auth détecté !");
            
            // Extraire l'URL complète avec tous les paramètres
            Uri uri = Uri.parse(deepLink);
            String path = uri.getPath(); // ex: /auth
            String query = uri.getQuery(); // ex: code=xxx&...
            
            // Construire l'URL finale pour la WebView (effectively final pour lambda)
            String finalUrl = START_URL + path + (query != null && !query.isEmpty() ? "?" + query : "");
            
            Log.d(TAG, "🔑 Redirection vers WebView: " + finalUrl);
            
            // Charger dans la WebView
            if (webView != null) {
                webView.post(() -> {
                    webView.loadUrl(finalUrl);
                });
            }
            
            return;
        }
        
        // Gérer d'autres deep links si nécessaire
        Log.d(TAG, "🔗 Deep link non géré: " + deepLink);
    }
    
    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        Log.d(TAG, "📸 onActivityResult called - requestCode: " + requestCode + ", resultCode: " + resultCode);
        
        // 🖼️ GÉRER LE RÉSULTAT DU FILE CHOOSER
        if (requestCode == FILE_CHOOSER_REQUEST_CODE) {
            Log.d(TAG, "🖼️ [FILE CHOOSER] onActivityResult - requestCode=" + requestCode + ", resultCode=" + resultCode);
            
            if (filePathCallback == null) {
                Log.w(TAG, "🖼️⚠️ [FILE CHOOSER] filePathCallback est null");
                return;
            }
            
            Uri[] results = null;
            
            // Vérifier si l'utilisateur a sélectionné un fichier
            if (resultCode == RESULT_OK && data != null) {
                String dataString = data.getDataString();
                
                if (dataString != null) {
                    results = new Uri[]{Uri.parse(dataString)};
                    Log.d(TAG, "🖼️✅ [FILE CHOOSER] Fichier sélectionné: " + dataString);
                } else {
                    Log.w(TAG, "🖼️⚠️ [FILE CHOOSER] dataString est null");
                }
            } else if (resultCode == RESULT_CANCELED) {
                Log.d(TAG, "🖼️ℹ️ [FILE CHOOSER] Sélection annulée par l'utilisateur");
            } else {
                Log.w(TAG, "🖼️⚠️ [FILE CHOOSER] Résultat inattendu: " + resultCode);
            }
            
            // Toujours appeler onReceiveValue, même si results est null
            filePathCallback.onReceiveValue(results);
            filePathCallback = null;
            return;
        }
        
        // 🔥 GÉRER LE RÉSULTAT GOOGLE SIGN-IN
        if (requestCode == GOOGLE_SIGN_IN_REQUEST_CODE) {
            Log.d(TAG, "🔥 [GOOGLE SIGN-IN] onActivityResult");
            Log.d(TAG, "🔥 [GOOGLE SIGN-IN] resultCode=" + resultCode + " (OK=" + RESULT_OK + ", CANCELED=" + RESULT_CANCELED + ")");
            Log.d(TAG, "🔥 [GOOGLE SIGN-IN] data=" + (data != null ? data.toString() : "null"));
            
            // 🔥 CORRECTION #6: Améliorer les logs RESULT_CANCELED
            if (resultCode == RESULT_CANCELED) {
                Log.e(TAG, "❌ [GOOGLE SIGN-IN] RESULT_CANCELED détecté");
                Log.e(TAG, "❌ [GOOGLE SIGN-IN] Cause possible:");
                Log.e(TAG, "❌   1. SHA-1 certificate hash incorrect dans Firebase Console");
                Log.e(TAG, "❌   2. Client OAuth Android non configuré dans Google Cloud Console");
                Log.e(TAG, "❌   3. Web Client ID manquant dans strings.xml");
                Log.e(TAG, "❌   4. Google Play Services obsolète ou non disponible");
                
                // ✅ NOUVEAU : Essayer d'extraire l'erreur détaillée
                if (data != null) {
                    Task<GoogleSignInAccount> task = GoogleSignIn.getSignedInAccountFromIntent(data);
                    try {
                        task.getResult(ApiException.class);
                    } catch (ApiException e) {
                        Log.e(TAG, "❌ RESULT_CANCELED avec ApiException StatusCode: " + e.getStatusCode());
                        Log.e(TAG, "❌ ApiException Message: " + e.getMessage());
                        
                        // Si StatusCode 10 → SHA-1 incorrect
                        if (e.getStatusCode() == 10) {
                            Log.e(TAG, "❌❌❌ CAUSE CONFIRMÉE : SHA-1 NE CORRESPOND PAS");
                            notifyGoogleSignInError("SHA-1 certificate mismatch - Vérifier Firebase Console");
                            return;
                        }
                    }
                }
                
                notifyGoogleSignInError("User canceled (voir logs Logcat pour déboguer)");
                return;
            }
            
            if (resultCode != RESULT_OK) {
                Log.e(TAG, "❌ [GOOGLE SIGN-IN] resultCode inattendu: " + resultCode);
                notifyGoogleSignInError("Unexpected result code: " + resultCode);
                return;
            }
            
            Task<GoogleSignInAccount> task = GoogleSignIn.getSignedInAccountFromIntent(data);
            try {
                GoogleSignInAccount account = task.getResult(ApiException.class);
                String idToken = account.getIdToken();
                String email = account.getEmail();
                String displayName = account.getDisplayName();
                
                Log.d(TAG, "🔥✅ Google Sign-In réussi - Email: " + email);
                Log.d(TAG, "🔥✅ ID Token présent: " + (idToken != null));
                
                if (idToken == null) {
                    Log.e(TAG, "❌ No ID Token received from Google");
                    Log.e(TAG, "❌ Web Client ID utilisé: " + getString(R.string.default_web_client_id));
                    notifyGoogleSignInError("No ID Token (vérifier Web Client ID dans Firebase)");
                } else {
                    notifyGoogleSignInSuccess(idToken, email, displayName);
                }
            } catch (ApiException e) {
                int statusCode = e.getStatusCode();
                Log.e(TAG, "❌ Google Sign-In failed with ApiException");
                Log.e(TAG, "❌ Status Code: " + statusCode);
                Log.e(TAG, "❌ Message: " + e.getMessage());
                
                String errorMessage;
                if (statusCode == 10) {
                    errorMessage = "Erreur de configuration (SHA-1 ou OAuth Client)";
                    Log.e(TAG, "❌ SHA-1 actuel du keystore ne correspond PAS à Firebase/Google Cloud");
                    Log.e(TAG, "❌ Vérifier:");
                    Log.e(TAG, "❌   1. Certificat Play App Signing dans Play Console");
                    Log.e(TAG, "❌   2. SHA-1 enregistré dans Firebase Console");
                    Log.e(TAG, "❌   3. Client OAuth Android dans Google Cloud Console");
                    
                    // 🔥 CORRECTION #5: Nettoyer le cache après erreur
                    mGoogleSignInClient.signOut();
                } else if (statusCode == 12501) {
                    errorMessage = "User canceled (ApiException)";
                } else if (statusCode == 12500) {
                    errorMessage = "Sign-in configuration error";
                    // 🔥 CORRECTION #5: Nettoyer le cache après erreur
                    mGoogleSignInClient.signOut();
                } else {
                    errorMessage = "Sign-in failed (code " + statusCode + ")";
                }
                
                notifyGoogleSignInError(errorMessage);
            }
            return;
        }
        
        // Les autres résultats sont automatiquement transmis au plugin Capacitor
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
            channel.setShowBadge(true);
            
            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) {
                manager.createNotificationChannel(channel);
                Log.d(TAG, "🔔 Notification channel created: high_importance_channel");
            }
        }
    }
    
    /**
     * 🔥 INITIALISER FIREBASE MESSAGING ET RÉCUPÉRER LE TOKEN FCM
     */
    private void initializeFirebaseMessaging() {
        Log.d(TAG, "🔥 [FIREBASE INIT] Initialisation Firebase Cloud Messaging...");
        
        // Récupérer le token FCM existant
        FirebaseMessaging.getInstance().getToken()
            .addOnCompleteListener(new OnCompleteListener<String>() {
                @Override
                public void onComplete(@NonNull Task<String> task) {
                    if (!task.isSuccessful()) {
                        Log.w(TAG, "❌ [FIREBASE INIT] Échec récupération token FCM", task.getException());
                        return;
                    }

                    // Récupérer le token
                    String token = task.getResult();
                    Log.d(TAG, "🔥🔥🔥 [FIREBASE INIT] TOKEN FCM RÉCUPÉRÉ !");
                    Log.d(TAG, "🔥 [FIREBASE INIT] Token: " + token);
                    
                    // Injecter le token dans JavaScript
                    injectFCMToken(webView, token);
                }
            });
        
        // Écouter les mises à jour du token
        Log.d(TAG, "🔥 [FIREBASE INIT] Configuration listener token refresh...");
        // Note: Le listener onNewToken dans MessagingService gérera les nouveaux tokens
    }
    
    /**
     * 🔥 VÉRIFIER SI NOTIFICATIONS DÉJÀ AUTORISÉES AU DÉMARRAGE
     */
    private void checkNotificationPermissionAtStartup() {
        if (Build.VERSION.SDK_INT >= 33) {
            boolean hasNotificationPermission = ContextCompat.checkSelfPermission(this, 
                Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED;
            
            if (hasNotificationPermission) {
                Log.d(TAG, "✅ [NOTIF CHECK] Notifications déjà autorisées au démarrage");
                
                // Récupérer immédiatement le token FCM
                FirebaseMessaging.getInstance().getToken()
                    .addOnCompleteListener(new OnCompleteListener<String>() {
                        @Override
                        public void onComplete(@NonNull Task<String> task) {
                            if (task.isSuccessful() && task.getResult() != null) {
                                String token = task.getResult();
                                Log.d(TAG, "🔥 [NOTIF CHECK] Token FCM au démarrage: " + token);
                                injectFCMToken(webView, token);
                            } else {
                                Log.w(TAG, "⚠️ [NOTIF CHECK] Échec récupération token au démarrage");
                            }
                        }
                    });
            } else {
                Log.d(TAG, "ℹ️ [NOTIF CHECK] Notifications non autorisées au démarrage");
            }
        } else {
            Log.d(TAG, "ℹ️ [NOTIF CHECK] Android < 13, pas de vérification POST_NOTIFICATIONS");
        }
    }
    
    /**
     * 🔥 INJECTER LE TOKEN FCM DANS JAVASCRIPT
     */
    public void injectFCMToken(WebView view, String token) {
        if (view == null || token == null) {
            Log.w(TAG, "⚠️ [FCM INJECT] WebView ou token null, injection impossible");
            return;
        }
        
        String jsCode = String.format(
            "window.fcmToken = '%s'; " +
            "window.dispatchEvent(new CustomEvent('fcmTokenReady', {detail: {token: '%s'}})); " +
            "console.log('🔥 [MainActivity] Token FCM injecté:', '%s');",
            token, token, token.substring(0, 30) + "..."
        );
        
        view.post(() -> {
            view.evaluateJavascript(jsCode, null);
            Log.d(TAG, "✅ [FCM INJECT] Token FCM injecté dans JavaScript");
        });
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
        
        // 🔥 NIVEAU 28: Auto-reload intelligent si React déjà chargé
        String jsCode = "window.CapacitorForceNative = true; " +
                       "window.isAABBuild = true; " +
                       "window.AndroidNativeEnvironment = true; " +
                       "window.capacitorReady = true; " +
                       "console.log('🚀 [NIVEAU 28] Flags AAB injectés:', {" +
                       "  CapacitorForceNative: window.CapacitorForceNative, " +
                       "  isAABBuild: window.isAABBuild, " +
                       "  AndroidNativeEnvironment: window.AndroidNativeEnvironment, " +
                       "  capacitorReady: window.capacitorReady" +
                       "}); " +
                       "if (window.reactAlreadyLoaded && !window.nativeModeActivated) {" +
                       "  console.log('🔥 CORRECTION TARDIVE: React déjà chargé, reload nécessaire');" +
                       "  window.location.reload();" +
                       "}";
        
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
    
    // ✅ NOUVELLE MÉTHODE: Créer le canal de notification au démarrage
    private void createNotificationChannelAtStartup() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                "high_importance_channel",
                "Notifications RunConnect",
                NotificationManager.IMPORTANCE_HIGH
            );
            channel.setDescription("Notifications importantes de RunConnect");
            channel.enableVibration(true);
            channel.enableLights(true);
            channel.setLightColor(Color.BLUE);
            channel.setShowBadge(true);
            
            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) {
                manager.createNotificationChannel(channel);
                Log.d(TAG, "✅ [NOTIF CHANNEL] Canal créé au démarrage");
            }
        }
    }
    
    // ✅ NOUVELLE MÉTHODE: Vérifier et enregistrer Firebase si nécessaire
    private void checkAndRegisterFirebase() {
        Log.d(TAG, "🔥 [FCM] Vérification enregistrement Firebase...");
        
        // Vérifier si un token existe déjà dans SharedPreferences
        String existingToken = getSharedPreferences("RunConnectPrefs", MODE_PRIVATE)
            .getString("fcm_token", null);
        
        if (existingToken != null && !existingToken.isEmpty()) {
            Log.d(TAG, "🔥 [FCM] Token existant trouvé: " + existingToken.substring(0, 30) + "...");
            
            // Réinjecter dans la WebView
            webView.evaluateJavascript(
                String.format(
                    "window.fcmToken = '%s'; " +
                    "window.dispatchEvent(new CustomEvent('fcmTokenReady', {detail: {token: '%s'}})); " +
                    "console.log('🔥 [FCM] Token réinjecté:', '%s');",
                    existingToken, existingToken, existingToken.substring(0, 30) + "..."
                ),
                null
            );
        } else {
            Log.d(TAG, "🔥 [FCM] Aucun token, demande à Firebase...");
            
            // Demander un nouveau token à Firebase
            FirebaseMessaging.getInstance().getToken()
                .addOnCompleteListener(new OnCompleteListener<String>() {
                    @Override
                    public void onComplete(@NonNull Task<String> task) {
                        if (!task.isSuccessful()) {
                            Log.e(TAG, "❌ [FCM] Échec récupération token", task.getException());
                            return;
                        }
                        
                        String token = task.getResult();
                        Log.d(TAG, "✅ [FCM] Nouveau token reçu: " + token.substring(0, 30) + "...");
                        
                        // Sauvegarder dans SharedPreferences
                        getSharedPreferences("RunConnectPrefs", MODE_PRIVATE)
                            .edit()
                            .putString("fcm_token", token)
                            .apply();
                        
                        // Injecter dans WebView
                        runOnUiThread(() -> {
                            webView.evaluateJavascript(
                                String.format(
                                    "window.fcmToken = '%s'; " +
                                    "window.dispatchEvent(new CustomEvent('fcmTokenReady', {detail: {token: '%s'}})); " +
                                    "window.dispatchEvent(new CustomEvent('pushNotificationRegistration', {detail: {value: {token: '%s'}}})); " +
                                    "console.log('🔥 [FCM] Nouveau token injecté:', '%s');",
                                    token, token, token, token.substring(0, 30) + "..."
                                ),
                                null
                            );
                        });
                    }
                });
        }
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
                } else if (requestCode == REQ_NOTIFICATIONS) {
                    permissionType = "notifications";
                }
                
                Log.d(TAG, "✅ Callback JavaScript pour " + permissionType + ": " + (finalResult ? "GRANTED" : "DENIED"));
                
                // ✅ CRITIQUE: Si notifications accordées, forcer enregistrement Firebase
                if (requestCode == REQ_NOTIFICATIONS && finalResult) {
                    Log.d(TAG, "✅ [NOTIF] Permission accordée, enregistrement Firebase...");
                    checkAndRegisterFirebase();
                }
                
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
        
        // ✅ SOLUTION 3: Méthode directe pour demander permission notifications
        @android.webkit.JavascriptInterface
        public void requestNotificationPermissions() {
            Log.d(TAG, "🔔 AndroidBridge: demande permission notifications depuis JavaScript");
            
            runOnUiThread(() -> {
                // Créer le canal dès maintenant
                createNotificationChannelAtStartup();
                
                // Vérifier si Android 13+ (POST_NOTIFICATIONS requis)
                if (Build.VERSION.SDK_INT >= 33) {
                    int notificationPermission = ContextCompat.checkSelfPermission(MainActivity.this, Manifest.permission.POST_NOTIFICATIONS);
                    
                    if (notificationPermission == PackageManager.PERMISSION_GRANTED) {
                        Log.d(TAG, "🔔 Permission notifications déjà accordée");
                        injectPermissionsState(webView);
                        
                        // ✅ CRITIQUE: Forcer l'enregistrement Firebase si pas encore fait
                        checkAndRegisterFirebase();
                        
                        notifyJavaScriptPermissionResult(true);
                    } else if (!ActivityCompat.shouldShowRequestPermissionRationale(MainActivity.this, Manifest.permission.POST_NOTIFICATIONS)) {
                        // Permission refusée définitivement
                        boolean wasRequested = getSharedPreferences("RunConnectPrefs", MODE_PRIVATE)
                            .getBoolean("notification_permission_requested", false);
                        
                        if (wasRequested) {
                            // Déjà demandé et refusé → Rediriger vers paramètres
                            Log.d(TAG, "🔔 Permission refusée définitivement, ouverture paramètres...");
                            Intent intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
                            Uri uri = Uri.fromParts("package", getPackageName(), null);
                            intent.setData(uri);
                            startActivity(intent);
                            notifyJavaScriptPermissionResult(false);
                        } else {
                            // Première demande
                            Log.d(TAG, "🔔 Première demande popup POST_NOTIFICATIONS");
                            getSharedPreferences("RunConnectPrefs", MODE_PRIVATE)
                                .edit()
                                .putBoolean("notification_permission_requested", true)
                                .apply();
                            
                            ActivityCompat.requestPermissions(MainActivity.this,
                                    new String[]{Manifest.permission.POST_NOTIFICATIONS},
                                    REQ_NOTIFICATIONS);
                        }
                    } else {
                        Log.d(TAG, "🔔 Demande popup système POST_NOTIFICATIONS pour Android 13+");
                        ActivityCompat.requestPermissions(MainActivity.this,
                                new String[]{Manifest.permission.POST_NOTIFICATIONS},
                                REQ_NOTIFICATIONS);
                    }
                } else {
                    // Android < 13: vérifier l'état réel
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                        NotificationManager notificationManager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
                        boolean areEnabled = notificationManager.areNotificationsEnabled();
                        Log.d(TAG, "🔔 Android < 13: notifications " + (areEnabled ? "activées" : "désactivées"));
                        
                        if (!areEnabled) {
                            // Rediriger vers paramètres pour Android 10-12
                            Log.d(TAG, "🔔 Redirection vers paramètres pour activer notifications");
                            Intent intent = new Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS);
                            intent.putExtra(Settings.EXTRA_APP_PACKAGE, getPackageName());
                            startActivity(intent);
                            notifyJavaScriptPermissionResult(false);
                        } else {
                            // Notifications activées, forcer enregistrement Firebase
                            checkAndRegisterFirebase();
                            notifyJavaScriptPermissionResult(true);
                        }
                    } else {
                        Log.d(TAG, "🔔 Android < 8: notifications toujours autorisées");
                        checkAndRegisterFirebase();
                        notifyJavaScriptPermissionResult(true);
                    }
                }
            });
        }
        
        @android.webkit.JavascriptInterface
        public void sendTestNotification(String title, String body) {
            Log.d(TAG, "🔔 [TEST] Envoi notification test locale");
            
            runOnUiThread(() -> {
                // Créer le canal si nécessaire
                createNotificationChannelAtStartup();
                
                // Créer l'intent pour ouvrir l'app
                Intent intent = new Intent(MainActivity.this, MainActivity.class);
                intent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
                
                int flags = android.app.PendingIntent.FLAG_ONE_SHOT;
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                    flags |= android.app.PendingIntent.FLAG_IMMUTABLE;
                } else {
                    flags |= android.app.PendingIntent.FLAG_UPDATE_CURRENT;
                }
                
                android.app.PendingIntent pendingIntent = android.app.PendingIntent.getActivity(
                    MainActivity.this, 
                    0, 
                    intent, 
                    flags
                );
                
                // Créer la notification
                androidx.core.app.NotificationCompat.Builder builder = new androidx.core.app.NotificationCompat.Builder(MainActivity.this, "high_importance_channel")
                    .setSmallIcon(R.mipmap.ic_launcher)
                    .setContentTitle(title != null ? title : "Test RunConnect")
                    .setContentText(body != null ? body : "Ceci est une notification test")
                    .setStyle(new androidx.core.app.NotificationCompat.BigTextStyle().bigText(body))
                    .setAutoCancel(true)
                    .setPriority(androidx.core.app.NotificationCompat.PRIORITY_HIGH)
                    .setDefaults(androidx.core.app.NotificationCompat.DEFAULT_ALL)
                    .setContentIntent(pendingIntent)
                    .setVisibility(androidx.core.app.NotificationCompat.VISIBILITY_PUBLIC)
                    .setCategory(androidx.core.app.NotificationCompat.CATEGORY_MESSAGE)
                    .setColor(0xFF3B82F6);
                
                NotificationManager notificationManager = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
                
                if (notificationManager != null) {
                    int notificationId = (int) System.currentTimeMillis();
                    notificationManager.notify(notificationId, builder.build());
                    
                    Log.d(TAG, "✅ [TEST] Notification test affichée (ID: " + notificationId + ")");
                    
                    // Notifier JavaScript
                    webView.evaluateJavascript(
                        "window.dispatchEvent(new CustomEvent('testNotificationSent', {detail: {success: true}})); " +
                        "console.log('✅ [TEST] Notification test envoyée');",
                        null
                    );
                } else {
                    Log.e(TAG, "❌ [TEST] NotificationManager non disponible");
                    webView.evaluateJavascript(
                        "window.dispatchEvent(new CustomEvent('testNotificationSent', {detail: {success: false}}));",
                        null
                    );
                }
            });
        }
        
        @android.webkit.JavascriptInterface
        public void openSettings() {
            runOnUiThread(() -> {
                Log.d(TAG, "🔧 Ouverture des paramètres de l'application");
                try {
                    Intent intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
                    Uri uri = Uri.fromParts("package", getPackageName(), null);
                    intent.setData(uri);
                    startActivity(intent);
                } catch (Exception e) {
                    Log.e(TAG, "❌ Erreur ouverture paramètres: " + e.getMessage());
                    // Fallback: ouvrir les paramètres généraux
                    Intent intent = new Intent(Settings.ACTION_SETTINGS);
                    startActivity(intent);
                }
            });
        }
        
        @android.webkit.JavascriptInterface
        public void shareText(String text, String url) {
            Log.d(TAG, "📤 AndroidBridge: partage système natif");
            
            runOnUiThread(() -> {
                try {
                    Intent shareIntent = new Intent(Intent.ACTION_SEND);
                    shareIntent.setType("text/plain");
                    shareIntent.putExtra(Intent.EXTRA_TEXT, text);
                    if (url != null && !url.isEmpty()) {
                        shareIntent.putExtra(Intent.EXTRA_SUBJECT, "Rejoins-moi sur RunConnect");
                    }
                    
                    // Créer le chooser pour afficher la share sheet système
                    Intent chooser = Intent.createChooser(shareIntent, "Partager mon profil");
                    chooser.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    startActivity(chooser);
                    
                    Log.d(TAG, "✅ Share sheet système ouverte");
                } catch (Exception e) {
                    Log.e(TAG, "❌ Erreur partage: " + e.getMessage());
                }
            });
        }
        
        @android.webkit.JavascriptInterface
        public boolean hasGooglePlayServices() {
            try {
                com.google.android.gms.common.GoogleApiAvailability availability = 
                    com.google.android.gms.common.GoogleApiAvailability.getInstance();
                int resultCode = availability.isGooglePlayServicesAvailable(MainActivity.this);
                boolean available = resultCode == com.google.android.gms.common.ConnectionResult.SUCCESS;
                Log.d(TAG, "🔍 Google Play Services: " + (available ? "disponibles ✅" : "NON disponibles ❌"));
                return available;
            } catch (Exception e) {
                Log.e(TAG, "❌ Erreur vérification Google Play Services:", e);
                return false;
            }
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
            Cursor cursor = null;
            
            try {
                // ✅ OPTIMISATION: Utiliser une projection limitée
                String[] projection = new String[]{
                    ContactsContract.Contacts._ID,
                    ContactsContract.Contacts.DISPLAY_NAME,
                    ContactsContract.Contacts.HAS_PHONE_NUMBER
                };
                
                cursor = cr.query(
                    ContactsContract.Contacts.CONTENT_URI,
                    projection,
                    null,
                    null,
                    ContactsContract.Contacts.DISPLAY_NAME + " ASC"
                );
                
                if (cursor == null) {
                    Log.w(TAG, "👥⚠️ Cursor contacts est null");
                    return "[]"; // Retourner tableau vide au lieu d'une exception
                }
                
                if (!cursor.moveToFirst()) {
                    Log.d(TAG, "👥 Aucun contact trouvé");
                    return "[]";
                }
                
                int idIndex = cursor.getColumnIndex(ContactsContract.Contacts._ID);
                int nameIndex = cursor.getColumnIndex(ContactsContract.Contacts.DISPLAY_NAME);
                int hasPhoneIndex = cursor.getColumnIndex(ContactsContract.Contacts.HAS_PHONE_NUMBER);
                
                // Vérifier que les colonnes existent
                if (idIndex < 0 || nameIndex < 0 || hasPhoneIndex < 0) {
                    Log.e(TAG, "👥❌ Colonnes contacts invalides");
                    return "[]";
                }
                
                do {
                    try {
                        String contactId = cursor.getString(idIndex);
                        String displayName = cursor.getString(nameIndex);
                        
                        JSONObject contact = new JSONObject();
                        contact.put("contactId", contactId);
                        contact.put("displayName", displayName != null ? displayName : "");
                        
                        // ✅ Récupérer téléphones
                        JSONArray phoneArray = new JSONArray();
                        if (cursor.getInt(hasPhoneIndex) > 0) {
                            Cursor phoneCursor = null;
                            try {
                                phoneCursor = cr.query(
                                    ContactsContract.CommonDataKinds.Phone.CONTENT_URI,
                                    new String[]{ContactsContract.CommonDataKinds.Phone.NUMBER},
                                    ContactsContract.CommonDataKinds.Phone.CONTACT_ID + " = ?",
                                    new String[]{contactId},
                                    null
                                );
                                
                                if (phoneCursor != null) {
                                    while (phoneCursor.moveToNext()) {
                                        String phoneNumber = phoneCursor.getString(0);
                                        if (phoneNumber != null && !phoneNumber.isEmpty()) {
                                            JSONObject phone = new JSONObject();
                                            phone.put("number", phoneNumber);
                                            phoneArray.put(phone);
                                        }
                                    }
                                }
                            } catch (Exception e) {
                                Log.w(TAG, "👥⚠️ Erreur lecture téléphone contact " + contactId, e);
                            } finally {
                                if (phoneCursor != null) {
                                    phoneCursor.close();
                                }
                            }
                        }
                        contact.put("phoneNumbers", phoneArray);
                        
                        // ✅ Récupérer emails
                        JSONArray emailArray = new JSONArray();
                        Cursor emailCursor = null;
                        try {
                            emailCursor = cr.query(
                                ContactsContract.CommonDataKinds.Email.CONTENT_URI,
                                new String[]{ContactsContract.CommonDataKinds.Email.ADDRESS},
                                ContactsContract.CommonDataKinds.Email.CONTACT_ID + " = ?",
                                new String[]{contactId},
                                null
                            );
                            
                            if (emailCursor != null) {
                                while (emailCursor.moveToNext()) {
                                    String emailAddress = emailCursor.getString(0);
                                    if (emailAddress != null && !emailAddress.isEmpty()) {
                                        JSONObject emailObj = new JSONObject();
                                        emailObj.put("address", emailAddress);
                                        emailArray.put(emailObj);
                                    }
                                }
                            }
                        } catch (Exception e) {
                            Log.w(TAG, "👥⚠️ Erreur lecture email contact " + contactId, e);
                        } finally {
                            if (emailCursor != null) {
                                emailCursor.close();
                            }
                        }
                        contact.put("emails", emailArray);
                        
                        contactsArray.put(contact);
                        
                    } catch (Exception e) {
                        // Si un contact pose problème, continuer avec les autres
                        Log.w(TAG, "👥⚠️ Erreur traitement d'un contact, on continue...", e);
                    }
                } while (cursor.moveToNext());
                
                Log.d(TAG, "👥✅ " + contactsArray.length() + " contacts récupérés avec succès");
                return contactsArray.toString();
                
            } catch (SecurityException e) {
                Log.e(TAG, "👥❌ Permission refusée pour accéder aux contacts", e);
                throw new Exception("Permission refusée");
            } catch (Exception e) {
                Log.e(TAG, "👥❌ Erreur globale récupération contacts", e);
                throw new Exception("Erreur lecture contacts: " + e.getMessage());
            } finally {
                if (cursor != null) {
                    cursor.close();
                }
            }
        }

        // Méthode pour notifier JavaScript depuis n'importe quel thread
        private void notifyContactsResult(String result) {
            runOnUiThread(() -> {
                if (webView != null) {
                    try {
                        // ✅ Encoder en Base64 pour éviter tout problème d'échappement
                        String base64Result = Base64.encodeToString(
                            result.getBytes("UTF-8"), 
                            Base64.NO_WRAP
                        );
                        
                        String jsCode = "window.dispatchEvent(new CustomEvent('contactsLoaded', { detail: atob('" + base64Result + "') }));";
                        webView.evaluateJavascript(jsCode, null);
                        Log.d(TAG, "👥✅ Résultat contacts envoyé au JavaScript (Base64)");
                    } catch (Exception e) {
                        Log.e(TAG, "👥❌ Erreur encodage résultat contacts", e);
                        String errorJson = "{\"error\": \"Erreur encodage données\"}";
                        String jsCode = "window.dispatchEvent(new CustomEvent('contactsLoaded', { detail: '" + errorJson + "' }));";
                        webView.evaluateJavascript(jsCode, null);
                    }
                }
            });
        }

        @android.webkit.JavascriptInterface
        public void invalidateContactsCache() {
            Log.d(TAG, "👥🗑️ Cache contacts invalidé");
            contactsCache.invalidate();
        }
        
        /**
         * 🔥 GOOGLE SIGN-IN: Lancer la connexion Google native
         * 🔥 CORRECTION #3 et #7: Vérifier Play Services + Forcer sélection compte
         */
        @android.webkit.JavascriptInterface
        public void googleSignIn() {
            Log.d(TAG, "🔥 AndroidBridge: Google Sign-In demandé depuis JavaScript");
            
            runOnUiThread(() -> {
                if (mGoogleSignInClient == null) {
                    Log.e(TAG, "❌ GoogleSignInClient not initialized");
                    notifyGoogleSignInError("GoogleSignInClient not initialized");
                    return;
                }
                
                // 🔥 CORRECTION #3: Vérifier Google Play Services avant de continuer
                if (!checkGooglePlayServices()) {
                    notifyGoogleSignInError("Google Play Services unavailable");
                    return;
                }
                
                // 🔥 CORRECTION #3: Vérifier et nettoyer le cache de compte existant
                GoogleSignInAccount existingAccount = GoogleSignIn.getLastSignedInAccount(MainActivity.this);
                if (existingAccount != null) {
                    Log.d(TAG, "🔥 Compte Google déjà connecté détecté, déconnexion préventive");
                }
                
                // ✅ FORCER SIGN-OUT avant sign-in pour éviter les conflits
                Log.d(TAG, "🔥 Nettoyage cache + lancement Sign-In");
                mGoogleSignInClient.signOut().addOnCompleteListener(task -> {
                    try {
                        Intent signInIntent = mGoogleSignInClient.getSignInIntent();
                        // Le sign-out ci-dessus suffit à forcer le choix de compte
                        startActivityForResult(signInIntent, GOOGLE_SIGN_IN_REQUEST_CODE);
                        Log.d(TAG, "🚀 Google Sign-In Intent lancé");
                    } catch (Exception e) {
                        Log.e(TAG, "❌ Error launching Google Sign-In", e);
                        notifyGoogleSignInError("Error launching sign-in: " + e.getMessage());
                    }
                });
            });
        }
        
        /**
         * 🔥 GOOGLE SIGN-OUT: Déconnexion Google
         */
        @android.webkit.JavascriptInterface
        public void googleSignOut() {
            Log.d(TAG, "🚪 AndroidBridge: Google Sign-Out demandé depuis JavaScript");
            
            runOnUiThread(() -> {
                if (mGoogleSignInClient == null) {
                    Log.e(TAG, "❌ GoogleSignInClient not initialized");
                    return;
                }
                
                mGoogleSignInClient.signOut().addOnCompleteListener(task -> {
                    if (task.isSuccessful()) {
                        Log.d(TAG, "✅ Google Sign-Out réussi");
                        webView.evaluateJavascript(
                            "window.dispatchEvent(new CustomEvent('googleSignOutSuccess'));", 
                            null
                        );
                    } else {
                        Log.e(TAG, "❌ Google Sign-Out échoué");
                    }
                });
            });
        }
    }
    
    private void notifyJavaScriptPermissionResult(boolean granted) {
        if (webView != null) {
            String jsCode = String.format(
                "window.dispatchEvent(new CustomEvent('androidPermissionsUpdated', { detail: { granted: %s } }));",
                granted ? "true" : "false"
            );
            webView.evaluateJavascript(jsCode, null);
            Log.d(TAG, "✅ Événement androidPermissionsUpdated envoyé avec granted=" + granted);
        }
    }
    
    /**
     * 🔥 Notifier JavaScript du résultat Google Sign-In
     */
    private void notifyGoogleSignInSuccess(String idToken, String email, String displayName) {
        if (webView != null) {
            runOnUiThread(() -> {
                try {
                    JSONObject result = new JSONObject();
                    result.put("idToken", idToken);
                    result.put("email", email != null ? email : "");
                    result.put("displayName", displayName != null ? displayName : "");
                    
                    String base64Result = Base64.encodeToString(
                        result.toString().getBytes("UTF-8"),
                        Base64.NO_WRAP
                    );
                    
                    String jsCode = "window.dispatchEvent(new CustomEvent('googleSignInSuccess', { detail: JSON.parse(atob('" + base64Result + "')) }));";
                    webView.evaluateJavascript(jsCode, null);
                    Log.d(TAG, "🔥✅ Google Sign-In success event dispatched");
                } catch (Exception e) {
                    Log.e(TAG, "❌ Error encoding Google Sign-In result", e);
                    notifyGoogleSignInError("Error encoding result");
                }
            });
        }
    }
    
    private void notifyGoogleSignInError(String error) {
        if (webView != null) {
            runOnUiThread(() -> {
                String jsCode = "window.dispatchEvent(new CustomEvent('googleSignInError', { detail: '" + error.replace("'", "\\'") + "' }));";
                webView.evaluateJavascript(jsCode, null);
                Log.d(TAG, "🔥❌ Google Sign-In error event dispatched: " + error);
            });
        }
    }
    
    /**
     * 🔥 NIVEAU 20: Force Firebase à générer un token FCM au démarrage
     * Sans cette étape, Firebase ne génère jamais de token automatiquement
     */
    private void forceFCMTokenGeneration() {
        Log.d(TAG, "🔥 [FCM-GEN] Démarrage génération token FCM...");
        
        // Vérifier que Google Play Services est disponible
        com.google.android.gms.common.GoogleApiAvailability availability = 
            com.google.android.gms.common.GoogleApiAvailability.getInstance();
        int resultCode = availability.isGooglePlayServicesAvailable(this);
        
        if (resultCode != com.google.android.gms.common.ConnectionResult.SUCCESS) {
            Log.e(TAG, "❌ [FCM-GEN] Google Play Services indisponible (code: " + resultCode + ")");
            return;
        }
        
        // Demander explicitement le token à Firebase
        FirebaseMessaging.getInstance().getToken()
            .addOnCompleteListener(new OnCompleteListener<String>() {
                @Override
                public void onComplete(@NonNull Task<String> task) {
                    if (!task.isSuccessful()) {
                        Log.e(TAG, "❌ [FCM-GEN] Échec génération token:", task.getException());
                        return;
                    }
                    
                    String token = task.getResult();
                    if (token != null && !token.isEmpty()) {
                        Log.d(TAG, "✅✅✅ [FCM-GEN] TOKEN GÉNÉRÉ: " + token.substring(0, 40) + "...");
                        
                        // 🔥 NIVEAU 22 : Stocker le token pour injection différée
                        cachedFCMToken = token;
                        
                        // Injecter immédiatement dans la WebView (si elle est déjà prête)
                        injectFCMTokenIntoWebView(token);
                    } else {
                        Log.e(TAG, "❌ [FCM-GEN] Token vide ou null");
                    }
                }
            });
    }

    /**
     * 🔥 NIVEAU 20: Injecte le token FCM dans la WebView pour que React puisse le récupérer
     */
    private void injectFCMTokenIntoWebView(final String token) {
        if (webView == null) {
            Log.e(TAG, "❌ [FCM-INJECT] WebView null");
            return;
        }
        
        runOnUiThread(new Runnable() {
            @Override
            public void run() {
                String jsCode = String.format(
                    "window.fcmToken = '%s'; " +
                    "window.fcmTokenPlatform = 'android'; " +
                    "window.dispatchEvent(new CustomEvent('fcmTokenReady', {detail: {token: '%s'}})); " +
                    "window.dispatchEvent(new CustomEvent('pushNotificationRegistration', {detail: {value: {token: '%s'}}})); " +
                    "console.log('🔥✅ [MainActivity] Token FCM injecté:', '%s');",
                    token, token, token, token.substring(0, 40) + "..."
                );
                
                webView.evaluateJavascript(jsCode, null);
                Log.d(TAG, "✅ [FCM-INJECT] Token injecté dans WebView");
            }
        });
    }
    
    /**
     * 🛡️ Initialise Google Sign-In de manière sécurisée
     * Évite les crashs si Google Play Services n'est pas disponible
     */
    private void initializeGoogleSignInSafely() {
        try {
            // Vérifier d'abord si Google Play Services est disponible
            boolean hasPlayServices = checkGooglePlayServicesQuietly();
            
            if (!hasPlayServices) {
                Log.w(TAG, "⚠️ Google Play Services indisponible - Google Sign-In désactivé");
                return;
            }
            
            String webClientId = getString(R.string.default_web_client_id);
            Log.d(TAG, "🔑 Initializing Google Sign-In with Web Client ID");
            
            GoogleSignInOptions gso = new GoogleSignInOptions.Builder(GoogleSignInOptions.DEFAULT_SIGN_IN)
                .requestIdToken(webClientId)
                .requestServerAuthCode(webClientId)
                .requestEmail()
                .requestProfile()
                .build();
            
            mGoogleSignInClient = GoogleSignIn.getClient(this, gso);
            Log.d(TAG, "✅ Google Sign-In Client initialized successfully");
            
        } catch (Exception e) {
            Log.e(TAG, "❌ Error initializing Google Sign-In (non-fatal): " + e.getMessage());
            // Ne pas crasher - l'utilisateur pourra toujours utiliser l'auth par email
        }
    }
    
    /**
     * 🔍 Vérifie Google Play Services sans afficher de dialog (silencieux)
     */
    private boolean checkGooglePlayServicesQuietly() {
        try {
            com.google.android.gms.common.GoogleApiAvailability availability = 
                com.google.android.gms.common.GoogleApiAvailability.getInstance();
            int resultCode = availability.isGooglePlayServicesAvailable(this);
            boolean available = (resultCode == com.google.android.gms.common.ConnectionResult.SUCCESS);
            Log.d(TAG, "📱 Google Play Services: " + (available ? "✅ disponible" : "❌ indisponible (code: " + resultCode + ")"));
            return available;
        } catch (Exception e) {
            Log.e(TAG, "❌ Erreur vérification Google Play Services: " + e.getMessage());
            return false;
        }
    }
    
    /**
     * 💥 Gère les erreurs critiques au démarrage
     * Affiche une page d'erreur plutôt que de crasher
     */
    private void handleCriticalError(Exception e) {
        Log.e(TAG, "💥 handleCriticalError appelé: " + e.getMessage(), e);
        
        try {
            // Essayer d'afficher une page d'erreur dans la WebView
            if (webView == null) {
                webView = findViewById(R.id.webview);
            }
            
            if (webView != null) {
                webView.loadUrl("file:///android_asset/error.html");
                Log.d(TAG, "📄 Page d'erreur chargée");
            } else {
                // Dernier recours : Toast + fermer
                android.widget.Toast.makeText(
                    this, 
                    "Erreur de démarrage. Veuillez réessayer.", 
                    android.widget.Toast.LENGTH_LONG
                ).show();
            }
        } catch (Exception ex) {
            Log.e(TAG, "💥 Impossible d'afficher la page d'erreur: " + ex.getMessage());
            // Dernier recours absolu
            android.widget.Toast.makeText(
                this, 
                "Erreur critique", 
                android.widget.Toast.LENGTH_LONG
            ).show();
        }
    }
    
    /**
     * 🧹 Gestion de la mémoire - Libère les ressources quand le système le demande
     */
    @Override
    public void onTrimMemory(int level) {
        super.onTrimMemory(level);
        
        Log.d(TAG, "📉 onTrimMemory level: " + level);
        
        // TRIM_MEMORY_MODERATE = 60, TRIM_MEMORY_COMPLETE = 80
        if (level >= android.content.ComponentCallbacks2.TRIM_MEMORY_MODERATE) {
            // Libérer le cache WebView
            if (webView != null) {
                try {
                    webView.clearCache(false);
                    Log.d(TAG, "🧹 WebView cache cleared (level: " + level + ")");
                } catch (Exception e) {
                    Log.w(TAG, "⚠️ Erreur clearCache: " + e.getMessage());
                }
            }
        }
        
        if (level >= android.content.ComponentCallbacks2.TRIM_MEMORY_COMPLETE) {
            Log.w(TAG, "⚠️ Système en manque critique de mémoire");
            System.gc();
        }
    }
    
    /**
     * 🧹 Appelé quand le système est très bas en mémoire
     */
    @Override
    public void onLowMemory() {
        super.onLowMemory();
        Log.w(TAG, "⚠️ onLowMemory appelé - Libération des ressources");
        
        if (webView != null) {
            try {
                webView.clearCache(true);
                webView.clearHistory();
                Log.d(TAG, "🧹 WebView cache et history effacés");
            } catch (Exception e) {
                Log.w(TAG, "⚠️ Erreur libération mémoire WebView: " + e.getMessage());
            }
        }
        
        System.gc();
    }
    
    /**
     * 🔍 Vérifie si l'appareil est connu pour avoir des problèmes WebView
     */
    private boolean isProblematicWebViewDevice() {
        String manufacturer = Build.MANUFACTURER.toLowerCase();
        String model = Build.MODEL.toLowerCase();
        int apiLevel = Build.VERSION.SDK_INT;
        
        // Samsung avec Android < 8 (API 26)
        if (manufacturer.contains("samsung") && apiLevel < 26) {
            return true;
        }
        
        // Xiaomi Redmi 6 series (problèmes WebView connus)
        if (manufacturer.contains("xiaomi") && model.contains("redmi 6")) {
            return true;
        }
        
        // Huawei avec Android < 7 (API 25)
        if (manufacturer.contains("huawei") && apiLevel < 25) {
            return true;
        }
        
        // Appareils très anciens (Android 6.0)
        if (apiLevel == 23) {
            return true;
        }
        
        return false;
    }
}