package app.runconnect;

import android.Manifest;
import android.content.Intent;
import android.content.pm.ResolveInfo;
import android.content.pm.PackageManager;
import java.util.List;
import android.net.Uri;
import android.provider.Settings;
import android.os.Build;
import android.text.TextUtils;
import android.content.ComponentName;
import android.app.Activity;
import android.database.Cursor;
import android.provider.MediaStore;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import android.util.Log;
import androidx.activity.result.ActivityResult;
import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.contract.ActivityResultContracts;
import androidx.documentfile.provider.DocumentFile;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;

@CapacitorPlugin(
    name = "PermissionsPlugin",
    permissions = {
        @Permission(strings = { Manifest.permission.ACCESS_FINE_LOCATION }, alias = "location"),
        @Permission(strings = { Manifest.permission.ACCESS_COARSE_LOCATION }, alias = "coarseLocation"),
        @Permission(strings = { Manifest.permission.CAMERA }, alias = "camera"),
        @Permission(strings = { Manifest.permission.READ_MEDIA_IMAGES }, alias = "photos"),
        @Permission(strings = { Manifest.permission.READ_CONTACTS }, alias = "contacts"),
        @Permission(strings = { Manifest.permission.POST_NOTIFICATIONS }, alias = "notifications")
    }
)
public class PermissionsPluginFixed extends Plugin {

    private static final int PERMISSION_REQUEST_CODE = 9999;
    private static final int GALLERY_REQUEST_CODE = 9998;
    private static final int PHOTO_PICKER_REQUEST_CODE = 9997;
    private static final int SAF_REQUEST_CODE = 9996; // Storage Access Framework
    private PluginCall galleryCall;

    // ============ DÉTECTION VERSION & FABRICANT ============
    
    @PluginMethod
    public void getDeviceInfo(PluginCall call) {
        JSObject result = new JSObject();
        result.put("manufacturer", Build.MANUFACTURER);
        result.put("brand", Build.BRAND);
        result.put("model", Build.MODEL);
        result.put("device", Build.DEVICE);
        result.put("androidVersion", Build.VERSION.SDK_INT);
        result.put("androidRelease", Build.VERSION.RELEASE);
        result.put("isMIUI", isMIUI());
        result.put("isEmui", isEmui());
        result.put("isOneUI", isOneUI());
        result.put("isOxygenOS", isOxygenOS());
        result.put("isColorOS", isColorOS());
        result.put("strategy", getDeviceStrategy());
        call.resolve(result);
    }

    private String getDeviceStrategy() {
        String manufacturer = Build.MANUFACTURER.toLowerCase();
        String brand = Build.BRAND.toLowerCase();
        
        if (manufacturer.contains("xiaomi") || brand.contains("xiaomi") || isMIUI()) {
            return "miui";
        } else if (manufacturer.contains("samsung") || brand.contains("samsung")) {
            return "samsung";
        } else if (manufacturer.contains("huawei") || manufacturer.contains("honor") || 
                   brand.contains("huawei") || brand.contains("honor") || isEmui()) {
            return "huawei";
        } else if (manufacturer.contains("oneplus") || brand.contains("oneplus") || isOxygenOS()) {
            return "oneplus";
        } else if (manufacturer.contains("oppo") || manufacturer.contains("realme") ||
                   brand.contains("oppo") || brand.contains("realme") || isColorOS()) {
            return "oppo";
        } else if (manufacturer.contains("lg") || manufacturer.contains("lge")) {
            return "lg";
        } else {
            return "standard";
        }
    }
    
    private boolean isMIUI() {
        return !TextUtils.isEmpty(getSystemProperty("ro.miui.ui.version.name"));
    }
    
    private boolean isEmui() {
        return !TextUtils.isEmpty(getSystemProperty("ro.build.version.emui"));
    }
    
    private boolean isOneUI() {
        return !TextUtils.isEmpty(getSystemProperty("ro.build.version.oneui"));
    }
    
    private boolean isOxygenOS() {
        return !TextUtils.isEmpty(getSystemProperty("ro.oxygen.version"));
    }
    
    private boolean isColorOS() {
        return !TextUtils.isEmpty(getSystemProperty("ro.build.version.opporom"));
    }

    private String getSystemProperty(String key) {
        try {
            Class<?> systemProperties = Class.forName("android.os.SystemProperties");
            return (String) systemProperties.getMethod("get", String.class).invoke(null, key);
        } catch (Exception e) {
            return "";
        }
    }

    // ============ PERMISSIONS PAR VERSION ANDROID ============

    @PluginMethod
    public void forceRequestContactsPermissions(PluginCall call) {
        String[] permissions = getContactsPermissionsByVersion();
        
        Log.d("PermissionsPlugin", "Android " + Build.VERSION.SDK_INT + " - Contacts Permissions: " + 
              java.util.Arrays.toString(permissions));
        
        if (!hasAllPermissions(permissions)) {
            requestPermissionForAliases(permissions, call, "contacts");
        } else {
            JSObject result = new JSObject();
            result.put("granted", true);
            result.put("device", getDeviceInfo());
            result.put("androidVersion", Build.VERSION.SDK_INT);
            result.put("permissionsRequested", java.util.Arrays.toString(permissions));
            result.put("strategy", getPermissionStrategy());
            call.resolve(result);
        }
    }

    private String[] getContactsPermissionsByVersion() {
        // READ_CONTACTS permission is consistent across Android versions
        return new String[] { Manifest.permission.READ_CONTACTS };
    }

    @PluginMethod
    public void forceRequestCameraPermissions(PluginCall call) {
        String[] permissions = getCameraPermissionsByVersion();
        
        Log.d("PermissionsPlugin", "Android " + Build.VERSION.SDK_INT + " - Permissions: " + 
              java.util.Arrays.toString(permissions));
        
        if (!hasAllPermissions(permissions)) {
            requestPermissionForAliases(permissions, call, "camera");
        } else {
            JSObject result = new JSObject();
            result.put("granted", true);
            result.put("device", getDeviceInfo());
            result.put("androidVersion", Build.VERSION.SDK_INT);
            result.put("permissionsRequested", java.util.Arrays.toString(permissions));
            result.put("strategy", getPermissionStrategy());
            call.resolve(result);
        }
    }

    private String[] getCameraPermissionsByVersion() {
        if (Build.VERSION.SDK_INT >= 33) {
            // Android 13+ : CAMERA + granular media permissions
            return new String[] {
                Manifest.permission.CAMERA,
                Manifest.permission.READ_MEDIA_IMAGES,
                Manifest.permission.READ_MEDIA_VISUAL_USER_SELECTED
            };
        } else if (Build.VERSION.SDK_INT >= 23) {
            // Android 6-12 : CAMERA + READ_EXTERNAL_STORAGE
            return new String[] {
                Manifest.permission.CAMERA,
                Manifest.permission.READ_EXTERNAL_STORAGE
            };
        } else {
            // Android < 6 : Permissions automatiques
            return new String[] { Manifest.permission.CAMERA };
        }
    }

    private String getPermissionStrategy() {
        if (Build.VERSION.SDK_INT >= 33) {
            return "ANDROID_13_PLUS";
        } else if (Build.VERSION.SDK_INT >= 29) {
            return "ANDROID_10_TO_12";
        } else if (Build.VERSION.SDK_INT >= 23) {
            return "ANDROID_6_TO_9";
        } else {
            return "LEGACY";
        }
    }

    // ============ GALERIE PAR VERSION ANDROID ============

    @PluginMethod
    public void forceOpenGallery(PluginCall call) {
        this.galleryCall = call;
        String strategy = getDeviceStrategy();
        
        Log.d("PermissionsPlugin", "Galerie - Android " + Build.VERSION.SDK_INT + 
              ", Fabricant: " + strategy);
        
        try {
            // ANDROID 13+ : Photo Picker en priorité
            if (Build.VERSION.SDK_INT >= 33) {
                if (openGalleryAndroid13Plus()) return;
            }
            
            // ANDROID 10-12 : Storage Access Framework optimisé
            if (Build.VERSION.SDK_INT >= 29 && Build.VERSION.SDK_INT <= 32) {
                if (openGalleryAndroid10To12()) return;
            }
            
            // ANDROID 6-9 : Stratégies fabricant + standard
            if (Build.VERSION.SDK_INT >= 23 && Build.VERSION.SDK_INT <= 28) {
                if (openGalleryAndroid6To9(strategy)) return;
            }
            
            // FALLBACK UNIVERSEL
            openGalleryFallback();
            
        } catch (Exception e) {
            Log.e("PermissionsPlugin", "Erreur galerie", e);
            call.reject("Erreur galerie: " + e.getMessage(), e);
        }
    }

    // ============ ANDROID 13+ : PHOTO PICKER ============
    
    private boolean openGalleryAndroid13Plus() {
        try {
            Log.d("PermissionsPlugin", "Tentative Photo Picker Android 13+");
            
            // Vérifier disponibilité Photo Picker
            Intent intent = new Intent(MediaStore.ACTION_PICK_IMAGES);
            intent.setType("image/*");
            intent.putExtra(MediaStore.EXTRA_PICK_IMAGES_MAX, 1);
            
            if (intent.resolveActivity(getActivity().getPackageManager()) != null) {
                Log.d("PermissionsPlugin", "Photo Picker disponible");
                getActivity().startActivityForResult(intent, PHOTO_PICKER_REQUEST_CODE);
                return true;
            }
            
            // Fallback : Intent traditionnel avec action PICK_IMAGES
            intent = new Intent("android.provider.action.PICK_IMAGES");
            if (intent.resolveActivity(getActivity().getPackageManager()) != null) {
                Log.d("PermissionsPlugin", "Photo Picker alternatif disponible");
                getActivity().startActivityForResult(intent, PHOTO_PICKER_REQUEST_CODE);
                return true;
            }
            
        } catch (Exception e) {
            Log.e("PermissionsPlugin", "Erreur Photo Picker", e);
        }
        return false;
    }

    // ============ ANDROID 10-12 : STORAGE ACCESS FRAMEWORK ============
    
    private boolean openGalleryAndroid10To12() {
        try {
            Log.d("PermissionsPlugin", "Stratégie Android 10-12 avec SAF");
            
            // Storage Access Framework optimisé
            Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT);
            intent.addCategory(Intent.CATEGORY_OPENABLE);
            intent.setType("image/*");
            intent.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, false);
            
            if (intent.resolveActivity(getActivity().getPackageManager()) != null) {
                Log.d("PermissionsPlugin", "SAF disponible");
                getActivity().startActivityForResult(intent, SAF_REQUEST_CODE);
                return true;
            }
            
        } catch (Exception e) {
            Log.e("PermissionsPlugin", "Erreur SAF", e);
        }
        return false;
    }

    // ============ ANDROID 6-9 : STRATÉGIES FABRICANT ============
    
    private boolean openGalleryAndroid6To9(String strategy) {
        try {
            Log.d("PermissionsPlugin", "Stratégie Android 6-9: " + strategy);
            
            switch (strategy) {
                case "miui":
                    return openGalleryMIUI();
                case "samsung":
                    return openGallerySamsung();
                case "huawei":
                    return openGalleryHuawei();
                case "oneplus":
                    return openGalleryOnePlus();
                case "oppo":
                    return openGalleryOppo();
                case "lg":
                    return openGalleryLG();
                default:
                    return openGalleryStandard();
            }
            
        } catch (Exception e) {
            Log.e("PermissionsPlugin", "Erreur stratégie fabricant", e);
            return false;
        }
    }

    // ============ STRATÉGIES SPÉCIFIQUES FABRICANTS ============
    
    private boolean openGalleryMIUI() {
        try {
            Log.d("PermissionsPlugin", "Stratégie MIUI/Xiaomi");
            
            // MIUI Gallery
            Intent intent = new Intent(Intent.ACTION_PICK);
            intent.setType("image/*");
            intent.setPackage("com.miui.gallery");
            
            if (intent.resolveActivity(getActivity().getPackageManager()) != null) {
                getActivity().startActivityForResult(intent, GALLERY_REQUEST_CODE);
                return true;
            }
            
            // Xiaomi File Manager
            intent = new Intent(Intent.ACTION_GET_CONTENT);
            intent.setType("image/*");
            intent.setPackage("com.mi.android.globalFileexplorer");
            
            if (intent.resolveActivity(getActivity().getPackageManager()) != null) {
                getActivity().startActivityForResult(intent, GALLERY_REQUEST_CODE);
                return true;
            }
            
        } catch (Exception e) {
            Log.e("PermissionsPlugin", "Erreur MIUI", e);
        }
        return false;
    }
    
    private boolean openGallerySamsung() {
        try {
            Log.d("PermissionsPlugin", "Stratégie Samsung");
            
            // Samsung Gallery
            Intent intent = new Intent(Intent.ACTION_PICK);
            intent.setType("image/*");
            intent.setPackage("com.sec.android.gallery3d");
            
            if (intent.resolveActivity(getActivity().getPackageManager()) != null) {
                getActivity().startActivityForResult(intent, GALLERY_REQUEST_CODE);
                return true;
            }
            
            // Samsung My Files
            intent = new Intent(Intent.ACTION_GET_CONTENT);
            intent.setType("image/*");
            intent.setPackage("com.sec.android.app.myfiles");
            
            if (intent.resolveActivity(getActivity().getPackageManager()) != null) {
                getActivity().startActivityForResult(intent, GALLERY_REQUEST_CODE);
                return true;
            }
            
        } catch (Exception e) {
            Log.e("PermissionsPlugin", "Erreur Samsung", e);
        }
        return false;
    }
    
    private boolean openGalleryHuawei() {
        try {
            Log.d("PermissionsPlugin", "Stratégie Huawei/Honor");
            
            // Huawei Gallery
            Intent intent = new Intent(Intent.ACTION_PICK);
            intent.setType("image/*");
            intent.setPackage("com.android.gallery3d");
            
            if (intent.resolveActivity(getActivity().getPackageManager()) != null) {
                getActivity().startActivityForResult(intent, GALLERY_REQUEST_CODE);
                return true;
            }
            
            // Huawei File Manager
            intent = new Intent(Intent.ACTION_GET_CONTENT);
            intent.setType("image/*");
            intent.setPackage("com.huawei.hidisk");
            
            if (intent.resolveActivity(getActivity().getPackageManager()) != null) {
                getActivity().startActivityForResult(intent, GALLERY_REQUEST_CODE);
                return true;
            }
            
        } catch (Exception e) {
            Log.e("PermissionsPlugin", "Erreur Huawei", e);
        }
        return false;
    }
    
    private boolean openGalleryOnePlus() {
        try {
            Log.d("PermissionsPlugin", "Stratégie OnePlus");
            
            // OnePlus Gallery
            Intent intent = new Intent(Intent.ACTION_PICK);
            intent.setType("image/*");
            intent.setPackage("com.oneplus.gallery");
            
            if (intent.resolveActivity(getActivity().getPackageManager()) != null) {
                getActivity().startActivityForResult(intent, GALLERY_REQUEST_CODE);
                return true;
            }
            
            // OnePlus File Manager
            intent = new Intent(Intent.ACTION_GET_CONTENT);
            intent.setType("image/*");
            intent.setPackage("com.oneplus.filemanager");
            
            if (intent.resolveActivity(getActivity().getPackageManager()) != null) {
                getActivity().startActivityForResult(intent, GALLERY_REQUEST_CODE);
                return true;
            }
            
        } catch (Exception e) {
            Log.e("PermissionsPlugin", "Erreur OnePlus", e);
        }
        return false;
    }
    
    private boolean openGalleryOppo() {
        try {
            Log.d("PermissionsPlugin", "Stratégie Oppo/Realme");
            
            // ColorOS Gallery
            Intent intent = new Intent(Intent.ACTION_PICK);
            intent.setType("image/*");
            intent.setPackage("com.coloros.gallery3d");
            
            if (intent.resolveActivity(getActivity().getPackageManager()) != null) {
                getActivity().startActivityForResult(intent, GALLERY_REQUEST_CODE);
                return true;
            }
            
            // Oppo File Manager
            intent = new Intent(Intent.ACTION_GET_CONTENT);
            intent.setType("image/*");
            intent.setPackage("com.coloros.filemanager");
            
            if (intent.resolveActivity(getActivity().getPackageManager()) != null) {
                getActivity().startActivityForResult(intent, GALLERY_REQUEST_CODE);
                return true;
            }
            
        } catch (Exception e) {
            Log.e("PermissionsPlugin", "Erreur Oppo", e);
        }
        return false;
    }
    
    private boolean openGalleryLG() {
        try {
            Log.d("PermissionsPlugin", "Stratégie LG");
            
            // LG Gallery
            Intent intent = new Intent(Intent.ACTION_PICK);
            intent.setType("image/*");
            intent.setPackage("com.lge.gallery");
            
            if (intent.resolveActivity(getActivity().getPackageManager()) != null) {
                getActivity().startActivityForResult(intent, GALLERY_REQUEST_CODE);
                return true;
            }
            
        } catch (Exception e) {
            Log.e("PermissionsPlugin", "Erreur LG", e);
        }
        return false;
    }

    // ============ GALERIE STANDARD ============
    
    private boolean openGalleryStandard() {
        try {
            Log.d("PermissionsPlugin", "Stratégie standard");
            
            Intent intent = new Intent(Intent.ACTION_PICK);
            intent.setType("image/*");
            
            if (intent.resolveActivity(getActivity().getPackageManager()) != null) {
                getActivity().startActivityForResult(intent, GALLERY_REQUEST_CODE);
                return true;
            }
            
        } catch (Exception e) {
            Log.e("PermissionsPlugin", "Erreur standard", e);
        }
        return false;
    }

    // ============ FALLBACK UNIVERSEL ============
    
    private void openGalleryFallback() {
        try {
            Log.d("PermissionsPlugin", "Fallback universel");
            
            // Intent GET_CONTENT le plus générique
            Intent intent = new Intent(Intent.ACTION_GET_CONTENT);
            intent.setType("image/*");
            intent.addCategory(Intent.CATEGORY_OPENABLE);
            
            if (intent.resolveActivity(getActivity().getPackageManager()) != null) {
                getActivity().startActivityForResult(intent, GALLERY_REQUEST_CODE);
            } else {
                galleryCall.reject("Aucune application de galerie trouvée");
            }
            
        } catch (Exception e) {
            Log.e("PermissionsPlugin", "Erreur fallback", e);
            galleryCall.reject("Erreur fallback: " + e.getMessage());
        }
    }

    // ============ GESTION RÉSULTATS ============
    
    public void handleActivityResult(int requestCode, int resultCode, Intent data) {
        if (galleryCall == null) {
            Log.w("PermissionsPlugin", "Pas d'appel galerie en cours");
            return;
        }
        
        Log.d("PermissionsPlugin", "Result: requestCode=" + requestCode + ", resultCode=" + resultCode);
        
        if (resultCode == Activity.RESULT_OK && data != null) {
            Uri imageUri = data.getData();
            if (imageUri != null) {
                Log.d("PermissionsPlugin", "Image sélectionnée: " + imageUri);
                
                JSObject result = new JSObject();
                result.put("success", true);
                result.put("imageUri", imageUri.toString());
                result.put("requestCode", requestCode);
                result.put("androidVersion", Build.VERSION.SDK_INT);
                result.put("strategy", getStrategyByRequestCode(requestCode));
                
                galleryCall.resolve(result);
            } else {
                galleryCall.reject("URI image null");
            }
        } else {
            galleryCall.reject("Sélection annulée ou erreur");
        }
        
        galleryCall = null;
    }
    
    private String getStrategyByRequestCode(int requestCode) {
        switch (requestCode) {
            case PHOTO_PICKER_REQUEST_CODE:
                return "PHOTO_PICKER_ANDROID13";
            case SAF_REQUEST_CODE:
                return "SAF_ANDROID10TO12";
            case GALLERY_REQUEST_CODE:
                return "MANUFACTURER_" + getDeviceStrategy().toUpperCase();
            default:
                return "UNKNOWN";
        }
    }

    // ============ MÉTHODES UTILITAIRES ============
    
    private boolean hasAllPermissions(String[] permissions) {
        for (String permission : permissions) {
            if (ContextCompat.checkSelfPermission(getActivity(), permission) != PackageManager.PERMISSION_GRANTED) {
                return false;
            }
        }
        return true;
    }

    // ============ PERMISSIONS EXISTANTES ============
    
    @PluginMethod
    public void forceRequestLocationPermissions(PluginCall call) {
        String[] permissions = {
            Manifest.permission.ACCESS_FINE_LOCATION,
            Manifest.permission.ACCESS_COARSE_LOCATION
        };
    
        if (!hasAllPermissions(permissions)) {
            requestPermissionForAliases(permissions, call, "location", "coarseLocation");
        } else {
            JSObject result = new JSObject();
            result.put("granted", true);
            call.resolve(result);
        }
    }

    @PluginMethod  
    public void forceRequestContactsPermissions(PluginCall call) {
        String[] permissions = {
            Manifest.permission.READ_CONTACTS
        };
    
        if (!hasAllPermissions(permissions)) {
            requestPermissionForAliases(permissions, call, "contacts");
        } else {
            JSObject result = new JSObject();
            result.put("granted", true);
            call.resolve(result);
        }
    }

    @PluginMethod
    public void openAppSettings(PluginCall call) {
        try {
            Intent intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
            Uri uri = Uri.fromParts("package", getContext().getPackageName(), null);
            intent.setData(uri);
            startActivityForResult(call, intent, PERMISSION_REQUEST_CODE);
            call.resolve();
        } catch (Exception ex) {
            call.reject("Unable to open app settings screen", ex);
        }
    }

    @PluginMethod
    public void requestNotificationPermissions(PluginCall call) {
        String[] permissions = { Manifest.permission.POST_NOTIFICATIONS };
    
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (!hasAllPermissions(permissions)) {
                requestPermissionForAliases(permissions, call, "notifications");
            } else {
                JSObject result = new JSObject();
                result.put("granted", true);
                call.resolve(result);
            }
        } else {
            JSObject result = new JSObject();
            result.put("granted", true);
            call.resolve(result);
        }
    }

    @PluginMethod
    public void showLocalNotification(PluginCall call) {
        String title = call.getString("title", "Notification");
        String body = call.getString("body", "This is a local notification");
        String channelId = "default_channel_id";
    
        // Create a notification channel (required for Android 8.0 and higher)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                channelId,
                "Default Channel",
                NotificationManager.IMPORTANCE_DEFAULT
            );
            NotificationManager notificationManager = getContext().getSystemService(NotificationManager.class);
            notificationManager.createNotificationChannel(channel);
        }
    
        // Build the notification
        NotificationCompat.Builder builder = new NotificationCompat.Builder(getContext(), channelId)
            .setSmallIcon(getContext().getApplicationInfo().icon)
            .setContentTitle(title)
            .setContentText(body)
            .setPriority(NotificationCompat.PRIORITY_DEFAULT)
            .setAutoCancel(true);
    
        // Show the notification
        NotificationManagerCompat notificationManager = NotificationManagerCompat.from(getContext());
        if (ActivityCompat.checkSelfPermission(getContext(), Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
            Log.w("PermissionsPlugin", "Notification permission not granted");
            return;
        }
        notificationManager.notify(1, builder.build());
        call.resolve();
    }
}
