package app.runconnect;

import android.webkit.GeolocationPermissions;
import android.webkit.WebChromeClient;

public class CustomWebChromeClient extends WebChromeClient {
    @Override
    public void onGeolocationPermissionsShowPrompt(String origin, GeolocationPermissions.Callback callback) {
        // ✅ Autoriser automatiquement la géolocalisation
        callback.invoke(origin, true, false);
    }
}