package app.runconnect;

import android.app.ActivityManager;
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
 * - Exception handler global pour éviter les crashs brutaux
 * - Détection des appareils problématiques (Xiaomi, Samsung, Huawei)
 * - Détection MIUI, Android Go, version WebView
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
    private static String miuiVersion = null;
    private static boolean isLowRamDevice = false;

    @Override
    public void onCreate() {
        super.onCreate();
        appContext = getApplicationContext();
        
        // Collecter les infos appareil au démarrage
        deviceManufacturer = Build.MANUFACTURER;
        deviceModel = Build.MODEL;
        androidApiLevel = Build.VERSION.SDK_INT;
        
        // Détecter MIUI
        miuiVersion = detectMIUIVersion();
        
        // Détecter appareil low memory (Android Go)
        detectLowMemoryDevice();
        
        // Logger toutes les infos système au démarrage
        logFullSystemInfo();
        
        // Installer le gestionnaire d'exceptions global
        installGlobalExceptionHandler();
        
        // Appliquer les fixes spécifiques au fabricant
        applyManufacturerFixes();
        
        Log.d(TAG, "✅ RunConnectApp initialized successfully");
    }
    
    /**
     * 📊 Log complet des informations système pour debug
     */
    private void logFullSystemInfo() {
        Log.d(TAG, "══════════════════ SYSTEM INFO ══════════════════");
        Log.d(TAG, "📱 Manufacturer: " + deviceManufacturer);
        Log.d(TAG, "📱 Model: " + deviceModel);
        Log.d(TAG, "📱 Product: " + Build.PRODUCT);
        Log.d(TAG, "📱 Brand: " + Build.BRAND);
        Log.d(TAG, "📱 Device: " + Build.DEVICE);
        Log.d(TAG, "📱 Board: " + Build.BOARD);
        Log.d(TAG, "📱 Hardware: " + Build.HARDWARE);
        Log.d(TAG, "📱 Android: " + Build.VERSION.RELEASE + " (API " + androidApiLevel + ")");
        Log.d(TAG, "📱 SDK_INT: " + Build.VERSION.SDK_INT);
        if (Build.VERSION.SDK_INT >= 23) {
            Log.d(TAG, "📱 Security Patch: " + Build.VERSION.SECURITY_PATCH);
        }
        Log.d(TAG, "📱 MIUI Version: " + (miuiVersion != null ? miuiVersion : "Non MIUI"));
        Log.d(TAG, "📱 Low RAM Device: " + isLowRamDevice);
        Log.d(TAG, "📱 Fingerprint: " + Build.FINGERPRINT);
        Log.d(TAG, "═══════════════════════════════════════════════════");
    }
    
    /**
     * 🔍 Détecte la version MIUI (Xiaomi) via SystemProperties
     */
    private String detectMIUIVersion() {
        try {
            Class<?> systemProperties = Class.forName("android.os.SystemProperties");
            java.lang.reflect.Method get = systemProperties.getMethod("get", String.class);
            
            String miuiName = (String) get.invoke(null, "ro.miui.ui.version.name");
            String miuiCode = (String) get.invoke(null, "ro.miui.ui.version.code");
            
            if (miuiName != null && !miuiName.isEmpty()) {
                Log.d(TAG, "📱 MIUI détecté: " + miuiName + " (code: " + miuiCode + ")");
                return miuiName;
            }
        } catch (Exception e) {
            Log.d(TAG, "📱 Pas de MIUI détecté (normal si pas Xiaomi)");
        }
        return null;
    }
    
    /**
     * 🔍 Détecte si l'appareil a peu de RAM (Android Go / entrée de gamme)
     */
    private void detectLowMemoryDevice() {
        try {
            ActivityManager am = (ActivityManager) getSystemService(Context.ACTIVITY_SERVICE);
            if (am != null) {
                isLowRamDevice = am.isLowRamDevice();
                if (isLowRamDevice) {
                    Log.w(TAG, "⚠️ Appareil à mémoire limitée détecté (Android Go / Low RAM)");
                }
            }
        } catch (Exception e) {
            Log.w(TAG, "⚠️ Impossible de détecter le type de mémoire: " + e.getMessage());
        }
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
                    Log.e(TAG, "📱 MIUI: " + (miuiVersion != null ? miuiVersion : "N/A"));
                    Log.e(TAG, "📱 Low RAM: " + isLowRamDevice);
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
            if (miuiVersion != null) {
                Log.d(TAG, "📱 MIUI Version: " + miuiVersion);
            }
            // MIUI peut avoir des problèmes avec les WebView et les permissions agressives
        }
        
        // 🔵 Samsung (OneUI)
        else if (manufacturer.contains("samsung")) {
            Log.d(TAG, "📱 Appareil Samsung détecté - Mode compatibilité Samsung");
        }
        
        // 🟢 Huawei / Honor (HMS au lieu de GMS)
        else if (manufacturer.contains("huawei") || manufacturer.contains("honor")) {
            Log.d(TAG, "📱 Appareil Huawei/Honor détecté - Vérification GMS/HMS");
        }
        
        // 🟠 OPPO / Vivo / Realme / OnePlus
        else if (manufacturer.contains("oppo") || manufacturer.contains("vivo") || 
                 manufacturer.contains("realme") || manufacturer.contains("oneplus")) {
            Log.d(TAG, "📱 Appareil " + manufacturer + " détecté");
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
     * 🔍 Retourne la version MIUI si détectée
     */
    public static String getMIUIVersion() {
        return miuiVersion;
    }
    
    /**
     * 🔍 Vérifie si l'appareil est MIUI (Xiaomi/Redmi/POCO)
     */
    public static boolean isMIUI() {
        return miuiVersion != null && !miuiVersion.isEmpty();
    }
    
    /**
     * 🔍 Vérifie si l'appareil a peu de RAM
     */
    public static boolean isLowMemoryDevice() {
        return isLowRamDevice;
    }
    
    /**
     * 🔍 Vérifie si l'appareil est connu pour avoir des problèmes WebView
     */
    public static boolean isProblematicWebViewDevice() {
        if (deviceManufacturer == null) return false;
        
        String manufacturer = deviceManufacturer.toLowerCase();
        String model = deviceModel != null ? deviceModel.toLowerCase() : "";
        
        // Samsung avec Android < 8
        if (manufacturer.contains("samsung") && androidApiLevel < 26) {
            return true;
        }
        
        // Xiaomi Redmi 6/7 series (problèmes connus)
        if (manufacturer.contains("xiaomi") && (model.contains("redmi 6") || model.contains("redmi 7"))) {
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
        
        // Appareils low memory = mode compatibilité
        if (isLowRamDevice) {
            return true;
        }
        
        return false;
    }
    
    /**
     * 🔍 Vérifie si l'appareil a probablement Google Play Services
     */
    public static boolean mightHaveGooglePlayServices() {
        if (deviceManufacturer == null) return true;
        
        String manufacturer = deviceManufacturer.toLowerCase();
        
        // Huawei post-2019 et Honor n'ont généralement pas GMS
        if (manufacturer.contains("huawei") || manufacturer.contains("honor")) {
            Log.d(TAG, "⚠️ Appareil Huawei/Honor - GMS peut être absent");
            return false;
        }
        
        return true;
    }
    
    /**
     * 📊 Retourne un résumé des infos système pour injection JS
     */
    public static String getSystemInfoJson() {
        try {
            return String.format(
                "{\"manufacturer\":\"%s\",\"model\":\"%s\",\"android\":\"%s\",\"api\":%d,\"miui\":\"%s\",\"lowRam\":%b}",
                deviceManufacturer != null ? deviceManufacturer : "unknown",
                deviceModel != null ? deviceModel : "unknown",
                Build.VERSION.RELEASE,
                androidApiLevel,
                miuiVersion != null ? miuiVersion : "none",
                isLowRamDevice
            );
        } catch (Exception e) {
            return "{\"error\":\"" + e.getMessage() + "\"}";
        }
    }
}
