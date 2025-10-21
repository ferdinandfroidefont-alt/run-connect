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

public class MainActivity extends AppCompatActivity {
    private static final String TAG = "RunConnect";
    private static final int REQ_LOCATION = 1001;
    private static final int REQ_STORAGE = 1002;
    private static final int REQ_CONTACTS = 1003;
    private WebView webView;
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
        
        Log.d(TAG, "🚀 RunConnect AAB - Starting MainActivity");
        Log.d(TAG, "📍 URL to load: " + START_URL);

        // Full screen immersif + transparent
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        if (Build.VERSION.SDK_INT >= 21) {
            getWindow().setStatusBarColor(Color.TRANSPARENT);
            getWindow().setNavigationBarColor(Color.TRANSPARENT);
        }

        // Demander les permissions au démarrage
        requestAllPermissions();

        // WebView setup
        webView = new WebView(this);
        webView.setLayerType(WebView.LAYER_TYPE_SOFTWARE, null);
        
        WebSettings s = webView.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setSupportMultipleWindows(true); // ✅ Support des popups OAuth
        s.setLoadWithOverviewMode(true);
        s.setUseWideViewPort(true);
        s.setAllowFileAccess(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setGeolocationEnabled(true);
        
        // MODE CACHE : Utiliser le cache si pas de connexion
        s.setCacheMode(WebSettings.LOAD_CACHE_ELSE_NETWORK);
        
        if (Build.VERSION.SDK_INT >= 21) {
            s.setMixedContentMode(WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE);
        }
        
        Log.d(TAG, "💾 Cache mode enabled: LOAD_CACHE_ELSE_NETWORK");

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

        // WebViewClient AVEC CUSTOM TABS POUR GOOGLE OAUTH
        webView.setWebViewClient(new WebViewClient() {
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

        // Repassage en hardware après 1s
        webView.postDelayed(() -> {
            try { webView.setLayerType(WebView.LAYER_TYPE_HARDWARE, null); } catch (Throwable ignored) {}
        }, 1000);
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

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }

    private void requestAllPermissions() {
        String[] permissions = new String[] {
                Manifest.permission.ACCESS_FINE_LOCATION,
                Manifest.permission.ACCESS_COARSE_LOCATION,
                Manifest.permission.READ_EXTERNAL_STORAGE,
                Manifest.permission.CAMERA,
                Manifest.permission.READ_CONTACTS,
                Manifest.permission.VIBRATE,
        };

        if (Build.VERSION.SDK_INT >= 33) {
            permissions = append(permissions, Manifest.permission.READ_MEDIA_IMAGES);
            permissions = append(permissions, Manifest.permission.POST_NOTIFICATIONS);
        }

        ActivityCompat.requestPermissions(this, permissions, 123);
    }

    private String[] append(String[] arr, String permission) {
        String[] result = new String[arr.length + 1];
        System.arraycopy(arr, 0, result, 0, arr.length);
        result[arr.length] = permission;
        return result;
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, androidx.annotation.NonNull String[] permissions, androidx.annotation.NonNull int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
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
