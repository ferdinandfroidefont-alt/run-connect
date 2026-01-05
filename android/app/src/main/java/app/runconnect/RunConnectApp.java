package app.runconnect;

import android.app.Application;
import android.content.Context;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;
import android.widget.Toast;

/**
 * 🔥 Application globale RunConnect
 * 
 * Gère:
 * - Exception handler global pour éviter les crashes brutaux
 * - Détection des appareils problématiques (Xiaomi, Samsung, Huawei)
 * - Optimisations spécifiques par fabricant
 */
public class RunConnectApp extends Application {
    private static final String TAG = "RunConnectApp";
    private static Context appContext;
    private Thread.UncaughtExceptionHandler defaultHandler;
    
    // Informations sur l'appareil pour debug
    private static String deviceManufacturer;
    private static String deviceModel;
    private static int androidApiLevel;

    @Override
    public void onCreate() {
        super.onCreate();
        appContext = getApplicationContext();
        
        // Collecter les infos appareil au démarrage
        deviceManufacturer = Build.MANUFACTURER;
        deviceModel = Build.MODEL;
        androidApiLevel = Build.VERSION.SDK_INT;
        
        Log.d(TAG, "═══════════════════════════════════════════════════════════");
        Log.d(TAG, "🚀 RunConnect Application Starting...");
        Log.d(TAG, "📱 Device: " + deviceManufacturer + " " + deviceModel);
        Log.d(TAG, "📱 Android: " + Build.VERSION.RELEASE + " (API " + androidApiLevel + ")");
        Log.d(TAG, "📱 Product: " + Build.PRODUCT);
        Log.d(TAG, "📱 Brand: " + Build.BRAND);
        Log.d(TAG, "═══════════════════════════════════════════════════════════");
        
        // Installer le gestionnaire d'exceptions global
        installGlobalExceptionHandler();
        
        // Appliquer les fixes spécifiques au fabricant
        applyManufacturerFixes();
        
        Log.d(TAG, "✅ RunConnectApp initialized successfully");
    }
    
    /**
     * 🛡️ Installe un handler global pour capturer toutes les exceptions non gérées
     * Évite les crashs brutaux "L'application s'est arrêtée"
     */
    private void installGlobalExceptionHandler() {
        // Sauvegarder le handler par défaut
        defaultHandler = Thread.getDefaultUncaughtExceptionHandler();
        
        Thread.setDefaultUncaughtExceptionHandler(new Thread.UncaughtExceptionHandler() {
            @Override
            public void uncaughtException(Thread thread, Throwable throwable) {
                try {
                    Log.e(TAG, "═══════════════════════════════════════════════════════════");
                    Log.e(TAG, "💥 CRASH INTERCEPTÉ!");
                    Log.e(TAG, "📱 Device: " + deviceManufacturer + " " + deviceModel);
                    Log.e(TAG, "📱 Android: " + Build.VERSION.RELEASE + " (API " + androidApiLevel + ")");
                    Log.e(TAG, "💥 Thread: " + thread.getName());
                    Log.e(TAG, "💥 Exception: " + throwable.getClass().getSimpleName());
                    Log.e(TAG, "💥 Message: " + throwable.getMessage());
                    Log.e(TAG, "═══════════════════════════════════════════════════════════");
                    
                    // Log stack trace complet
                    throwable.printStackTrace();
                    
                    // Afficher un message utilisateur amical (sur le main thread)
                    showCrashToast();
                    
                    // Attendre que le toast s'affiche
                    Thread.sleep(2000);
                    
                } catch (Exception e) {
                    Log.e(TAG, "💥 Erreur dans le crash handler: " + e.getMessage());
                } finally {
                    // Déléguer au handler par défaut pour un arrêt propre
                    if (defaultHandler != null) {
                        defaultHandler.uncaughtException(thread, throwable);
                    } else {
                        // Dernier recours: forcer l'arrêt
                        android.os.Process.killProcess(android.os.Process.myPid());
                        System.exit(1);
                    }
                }
            }
        });
        
        Log.d(TAG, "✅ Global exception handler installed");
    }
    
    /**
     * 📱 Applique des corrections spécifiques aux fabricants connus pour avoir des problèmes
     */
    private void applyManufacturerFixes() {
        String manufacturer = deviceManufacturer.toLowerCase();
        
        // 🔴 Xiaomi / Redmi / POCO (MIUI)
        if (manufacturer.contains("xiaomi") || manufacturer.contains("redmi") || manufacturer.contains("poco")) {
            Log.d(TAG, "📱 Appareil Xiaomi/MIUI détecté - Préparation des adaptations");
            // MIUI peut avoir des problèmes avec les WebView et les permissions agressives
            // Les fixes spécifiques sont appliqués dans MainActivity
        }
        
        // 🔵 Samsung (OneUI)
        else if (manufacturer.contains("samsung")) {
            Log.d(TAG, "📱 Appareil Samsung détecté - Mode compatibilité Samsung");
            // Samsung a parfois des problèmes avec hardware acceleration sur vieux modèles
        }
        
        // 🟢 Huawei / Honor (HMS au lieu de GMS)
        else if (manufacturer.contains("huawei") || manufacturer.contains("honor")) {
            Log.d(TAG, "📱 Appareil Huawei/Honor détecté - Vérification GMS/HMS");
            // Ces appareils peuvent ne pas avoir Google Play Services
        }
        
        // 🟠 OPPO / Vivo / Realme / OnePlus
        else if (manufacturer.contains("oppo") || manufacturer.contains("vivo") || 
                 manufacturer.contains("realme") || manufacturer.contains("oneplus")) {
            Log.d(TAG, "📱 Appareil " + manufacturer + " détecté");
            // ColorOS/FunTouchOS ont une gestion agressive de la batterie
        }
        
        // 🟣 Autres fabricants
        else {
            Log.d(TAG, "📱 Fabricant standard: " + manufacturer);
        }
    }
    
    /**
     * 🔔 Affiche un toast en cas de crash (sur le main thread)
     */
    private void showCrashToast() {
        try {
            new Handler(Looper.getMainLooper()).post(new Runnable() {
                @Override
                public void run() {
                    try {
                        Toast.makeText(
                            appContext,
                            "Une erreur est survenue. L'application va redémarrer.",
                            Toast.LENGTH_LONG
                        ).show();
                    } catch (Exception e) {
                        // Ignorer les erreurs de Toast
                        Log.e(TAG, "⚠️ Impossible d'afficher le toast: " + e.getMessage());
                    }
                }
            });
        } catch (Exception e) {
            Log.e(TAG, "⚠️ Erreur showCrashToast: " + e.getMessage());
        }
    }
    
    /**
     * 🔧 Getters statiques pour accès depuis d'autres classes
     */
    public static Context getAppContext() {
        return appContext;
    }
    
    public static String getDeviceManufacturer() {
        return deviceManufacturer;
    }
    
    public static String getDeviceModel() {
        return deviceModel;
    }
    
    public static int getAndroidApiLevel() {
        return androidApiLevel;
    }
    
    /**
     * 🔍 Vérifie si l'appareil est connu pour avoir des problèmes WebView
     */
    public static boolean isProblematicWebViewDevice() {
        String manufacturer = deviceManufacturer.toLowerCase();
        String model = deviceModel.toLowerCase();
        
        // Samsung avec Android < 8
        if (manufacturer.contains("samsung") && androidApiLevel < 26) {
            return true;
        }
        
        // Xiaomi Redmi 6 series (problèmes connus)
        if (manufacturer.contains("xiaomi") && model.contains("redmi 6")) {
            return true;
        }
        
        // Huawei avec Android < 7
        if (manufacturer.contains("huawei") && androidApiLevel < 25) {
            return true;
        }
        
        // Appareils très anciens (Android 6.0-6.0.1)
        if (androidApiLevel == 23) {
            return true;
        }
        
        return false;
    }
    
    /**
     * 🔍 Vérifie si l'appareil a probablement Google Play Services
     */
    public static boolean mightHaveGooglePlayServices() {
        String manufacturer = deviceManufacturer.toLowerCase();
        
        // Huawei post-2019 et Honor n'ont généralement pas GMS
        if (manufacturer.contains("huawei") || manufacturer.contains("honor")) {
            Log.d(TAG, "⚠️ Appareil Huawei/Honor - GMS peut être absent");
            return false;
        }
        
        return true;
    }
}
