package app.runconnect;

import android.Manifest;
import android.app.Activity;
import android.content.pm.PackageManager;
import com.google.firebase.FirebaseApp;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.util.Log;
import android.webkit.CookieManager;
import android.webkit.GeolocationPermissions;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.contract.ActivityResultContracts;
import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.app.ActivityCompat;
import androidx.core.view.WindowCompat;

public class MainActivity extends AppCompatActivity {

    private static final String TAG = "RunConnect";
    private WebView webView;
    private final String START_URL = "https://run-connect.lovable.app";
    private ValueCallback<Uri[]> filePathCallback;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Edge-to-edge UI
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        if (Build.VERSION.SDK_INT >= 21) {
            getWindow().setStatusBarColor(Color.TRANSPARENT);
            getWindow().setNavigationBarColor(Color.TRANSPARENT);
        }

        // Demander dynamiquement les permissions sensibles
        requestAllPermissions();

        // Création du WebView
        webView = new WebView(this);
        webView.setLayerType(WebView.LAYER_TYPE_SOFTWARE, null);

        WebSettings s = webView.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setLoadWithOverviewMode(true);
        s.setUseWideViewPort(true);
        s.setAllowFileAccess(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        if (Build.VERSION.SDK_INT >= 21) {
            s.setMixedContentMode(WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE);
        }
        
        // ✅ MODE CACHE : Utiliser le cache si pas de connexion
        s.setCacheMode(WebSettings.LOAD_CACHE_ELSE_NETWORK);
        Log.d(TAG, "💾 Cache mode enabled: LOAD_CACHE_ELSE_NETWORK");

        CookieManager cm = CookieManager.getInstance();
        cm.setAcceptCookie(true);
        if (Build.VERSION.SDK_INT >= 21) cm.setAcceptThirdPartyCookies(webView, true);

        // Gère les URL OAuth (Google, etc.) + gestion erreur réseau
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                return false;
            }
            
            @Override
            public void onReceivedError(WebView view, int errorCode, String description, String failingUrl) {
                Log.e(TAG, "❌ Erreur réseau détectée: " + description);
                
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
        });

        // WebChromeClient avec géoloc, fichier, etc.
        webView.setWebChromeClient(new WebChromeClient() {

            // Gestion géolocalisation
            @Override
            public void onGeolocationPermissionsShowPrompt(String origin, GeolocationPermissions.Callback callback) {
                callback.invoke(origin, true, false);
            }

            // Gestion input type="file"
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
        });

        webView.loadUrl(START_URL);
        setContentView(webView);

        // ✅ Forcer l'initialisation Firebase au démarrage
        try {
            Log.d(TAG, "🔥 Initialisation Firebase Push Notifications au démarrage...");
            
            // Vérifier si Firebase est déjà initialisé
            if (FirebaseApp.getApps(this).isEmpty()) {
                Log.w(TAG, "⚠️ Firebase n'est pas initialisé automatiquement, initialisation manuelle...");
                FirebaseApp.initializeApp(this);
            }
            
            Log.d(TAG, "✅ Firebase initialisé avec succès");
        } catch (Exception e) {
            Log.e(TAG, "❌ Erreur initialisation Firebase: " + e.getMessage(), e);
        }

        // Repassage en hardware après 1s
        webView.postDelayed(() -> {
            try { webView.setLayerType(WebView.LAYER_TYPE_HARDWARE, null); } catch (Throwable ignored) {}
        }, 1000);
    }

    // Choix de fichier via intent
    private final ActivityResultLauncher<Intent> fileChooserLauncher = registerForActivityResult(
            new ActivityResultContracts.StartActivityForResult(),
            result -> {
                if (filePathCallback == null) return;
                Uri[] results = null;
                if (result.getResultCode() == Activity.RESULT_OK && result.getData() != null) {
                    results = new Uri[]{result.getData().getData()};
                }
                filePathCallback.onReceiveValue(results);
                filePathCallback = null;
            }
    );

    // Gestion du bouton retour
    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }

    // Demande toutes les permissions utiles à l'app
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

    // Petite fonction pour ajouter dynamiquement des permissions dans le tableau
    private String[] append(String[] arr, String permission) {
        String[] result = new String[arr.length + 1];
        System.arraycopy(arr, 0, result, 0, arr.length);
        result[arr.length] = permission;
        return result;
    }

    // Optionnel : retour sur autorisations
    @Override
    public void onRequestPermissionsResult(int requestCode, @NonNull String[] permissions, @NonNull int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        // Tu peux ici afficher un toast si une permission est refusée
    }
}
