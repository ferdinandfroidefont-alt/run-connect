package app.runconnect;

/**
 * Holder pour accéder à l'instance MainActivity depuis MessagingService
 * Permet à MessagingService d'injecter le token FCM dans la WebView
 */
public class MainActivityHolder {
    private static MainActivity instance;

    public static void setInstance(MainActivity activity) {
        instance = activity;
    }

    public static MainActivity getInstance() {
        return instance;
    }
}
