package app.lovable.runconnect;

import android.Manifest;
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

import androidx.appcompat.app.AppCompatActivity;
import androidx.browser.customtabs.CustomTabsIntent;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import androidx.core.view.WindowCompat;

public class MainActivity extends AppCompatActivity {
    private static final String TAG = "RunConnect";
    private static final int REQ_LOCATION = 1001;
    private WebView webView;
    private final String START_URL = "https://91401b07-9cff-4f05-94e7-3eb42a9b7a7a.lovableproject.com?forceHideBadge=true&forceNative=true";

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
        WebSettings s = webView.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setLoadWithOverviewMode(true);
        s.setUseWideViewPort(true);
        s.setAllowFileAccess(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setGeolocationEnabled(true);
        
        Log.d(TAG, "🌐 WebView configured with geolocation enabled");

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
            
            @Override
            public void onPageStarted(WebView view, String url, android.graphics.Bitmap favicon) {
                super.onPageStarted(view, url, favicon);
                Log.d(TAG, "📄 Page loading started: " + url);
                
                // Injecter les flags dès le début du chargement
                injectAABFlags(view);
            }
            
            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                Log.d(TAG, "✅ Page loaded successfully: " + url);
                
                // Réinjecter les flags à la fin pour être sûr
                injectAABFlags(view);
                
                // Vérifier et injecter l'état des permissions
                injectPermissionsState(view);
            }
        });

        // ✅ Gérer redirection Google OAuth en dehors de WebView
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                String host = uri.getHost() != null ? uri.getHost() : "";
                String url = uri.toString();
                if (host.contains("accounts.google.com") || url.contains("oauth")) {
                    CustomTabsIntent tabs = new CustomTabsIntent.Builder().build();
                    tabs.launchUrl(MainActivity.this, uri);
                    return true;
                }
                return false; // continue dans le WebView
            }
        });

        // ✅ Demande de permissions si pas encore données
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

        // ✅ Charger le site
        Log.d(TAG, "🌐 Loading WebView with URL: " + START_URL);
        webView.loadUrl(START_URL);
        setContentView(webView);
        
        Log.d(TAG, "🎯 MainActivity setup complete");
    }
    
    private boolean hasLocationPermission() {
        return ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED
                && ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED;
    }
    
    private void injectAABFlags(WebView view) {
        String jsCode = "window.CapacitorForceNative = true; " +
                       "window.isAABBuild = true; " +
                       "window.AndroidNativeEnvironment = true; " +
                       "console.log('🚀 AAB: Flags natifs injectés par MainActivity');";
        view.evaluateJavascript(jsCode, null);
        Log.d(TAG, "🔥 Flags AAB injectés");
    }
    
    private void injectPermissionsState(WebView view) {
        boolean hasLocation = hasLocationPermission();
        boolean hasCamera = ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED;
        
        String jsCode = "window.androidPermissions = {" +
                       "location: " + hasLocation + ", " +
                       "camera: " + hasCamera + ", " +
                       "timestamp: " + System.currentTimeMillis() + "}; " +
                       "console.log('🔐 Permissions Android injectées:', window.androidPermissions);";
        view.evaluateJavascript(jsCode, null);
        Log.d(TAG, "🔐 État des permissions injecté - Location: " + hasLocation + ", Camera: " + hasCamera);
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
        if (requestCode == REQ_LOCATION) {
            if (grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
                Log.d(TAG, "✅ Location permission granted - updating WebView");
                // Réinjecter les permissions et recharger si nécessaire
                injectPermissionsState(webView);
                
                // Notifier JavaScript que les permissions ont changé
                String jsCode = "window.dispatchEvent(new CustomEvent('androidPermissionsUpdated', {" +
                               "detail: { location: true, timestamp: " + System.currentTimeMillis() + " }})); " +
                               "console.log('🔐 Permissions mises à jour - Location accordée');";
                webView.evaluateJavascript(jsCode, null);
                
                // Optionnel: recharger la page pour relancer la géolocalisation
                webView.reload();
            } else {
                Log.w(TAG, "❌ Location permission denied");
                // Informer JavaScript du refus
                String jsCode = "window.dispatchEvent(new CustomEvent('androidPermissionsUpdated', {" +
                               "detail: { location: false, timestamp: " + System.currentTimeMillis() + " }})); " +
                               "console.log('🚫 Permissions mises à jour - Location refusée');";
                webView.evaluateJavascript(jsCode, null);
            }
        }
    }
}