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
public class PermissionsPlugin extends Plugin {

    private static final int PERMISSION_REQUEST_CODE = 9999;
    private static final int GALLERY_REQUEST_CODE = 9998;
    private static final int PHOTO_PICKER_REQUEST_CODE = 9997;
    private PluginCall galleryCall;
    private boolean isAndroid13Plus = Build.VERSION.SDK_INT >= 33;

    @PluginMethod
    public void forceRequestLocationPermissions(PluginCall call) {
        String[] permissions;
        
        // Android 10+ (API 29+) nécessite ACCESS_BACKGROUND_LOCATION
        if (Build.VERSION.SDK_INT >= 29) {
            permissions = new String[] {
                Manifest.permission.ACCESS_FINE_LOCATION,
                Manifest.permission.ACCESS_COARSE_LOCATION,
                Manifest.permission.ACCESS_BACKGROUND_LOCATION
            };
        } else {
            permissions = new String[] {
                Manifest.permission.ACCESS_FINE_LOCATION,
                Manifest.permission.ACCESS_COARSE_LOCATION
            };
        }
        
        if (!hasAllPermissions(permissions)) {
            // MIUI/Xiaomi: forcer la demande même si déjà refusée avec délais plus longs
            if (isMIUI() && Build.VERSION.SDK_INT >= 29) {
                // Android 10+ MIUI - Demander d'abord les permissions de base
                String[] basePermissions = {
                    Manifest.permission.ACCESS_FINE_LOCATION,
                    Manifest.permission.ACCESS_COARSE_LOCATION
                };
                requestPermissionForAliases(basePermissions, call, "location");
                
                // Programmer une seconde demande pour ACCESS_BACKGROUND_LOCATION avec délai
                new android.os.Handler(android.os.Looper.getMainLooper()).postDelayed(() -> {
                    if (Build.VERSION.SDK_INT >= 29) {
                        String[] bgPermissions = { Manifest.permission.ACCESS_BACKGROUND_LOCATION };
                        requestPermissionForAliases(bgPermissions, call, "location");
                    }
                }, 2000); // 2 secondes de délai pour MIUI
            } else {
                requestPermissionForAliases(permissions, call, "location");
            }
        } else {
            JSObject result = new JSObject();
            result.put("granted", true);
            result.put("device", getDeviceInfo());
            result.put("androidVersion", Build.VERSION.SDK_INT);
            result.put("backgroundLocationRequired", Build.VERSION.SDK_INT >= 29);
            call.resolve(result);
        }
    }

    @PluginMethod
    public void forceRequestLocationPermissionsAndroid10(PluginCall call) {
        // Méthode spéciale pour Android 10+ avec gestion séquentielle des permissions
        if (Build.VERSION.SDK_INT >= 29) {
            // Étape 1: Demander les permissions de base
            String[] basePermissions = {
                Manifest.permission.ACCESS_FINE_LOCATION,
                Manifest.permission.ACCESS_COARSE_LOCATION
            };
            
            if (!hasAllPermissions(basePermissions)) {
                requestPermissionForAliases(basePermissions, call, "location");
                return;
            }
            
            // Étape 2: Si permissions de base OK, demander background
            String[] bgPermissions = { Manifest.permission.ACCESS_BACKGROUND_LOCATION };
            if (!hasAllPermissions(bgPermissions)) {
                // Délai plus long pour MIUI Android 10+
                int delay = isMIUI() ? 3000 : 1000;
                new android.os.Handler(android.os.Looper.getMainLooper()).postDelayed(() -> {
                    requestPermissionForAliases(bgPermissions, call, "location");
                }, delay);
                return;
            }
            
            // Toutes les permissions OK
            JSObject result = new JSObject();
            result.put("granted", true);
            result.put("device", getDeviceInfo());
            result.put("method", "android10_sequential");
            call.resolve(result);
        } else {
            // Android < 10, utiliser méthode normale
            forceRequestLocationPermissions(call);
        }
    }

    @PluginMethod
    public void forceRequestCameraPermissions(PluginCall call) {
        String[] permissions;
        
        if (Build.VERSION.SDK_INT >= 33) {
            // Android 13+ - Stratégie optimisée pour Photo Picker
            Log.d("PermissionsPlugin", "Android 13+ détecté - utilisation Photo Picker API");
            
            // Pour Android 13+, on ne demande que CAMERA si nécessaire
            // READ_MEDIA_VISUAL_USER_SELECTED sera géré par le Photo Picker
            permissions = new String[] {
                Manifest.permission.CAMERA
            };
            
            // Vérifier si Photo Picker est disponible
            if (isPhotoPickerAvailable()) {
                Log.d("PermissionsPlugin", "Photo Picker natif disponible");
                JSObject result = new JSObject();
                result.put("granted", true);
                result.put("device", getDeviceInfo());
                result.put("androidVersion", Build.VERSION.SDK_INT);
                result.put("photoPickerAvailable", true);
                result.put("strategy", "PHOTO_PICKER_ANDROID13");
                call.resolve(result);
                return;
            }
            
            // Fallback pour Android 13+ sans Photo Picker
            permissions = new String[] {
                Manifest.permission.CAMERA,
                Manifest.permission.READ_MEDIA_IMAGES
            };
            
        } else {
            // Android 6-12 - Méthode classique
            permissions = new String[] {
                Manifest.permission.CAMERA,
                Manifest.permission.READ_EXTERNAL_STORAGE
            };
        }
        
        if (!hasAllPermissions(permissions)) {
            Log.d("PermissionsPlugin", "Demande permissions: " + java.util.Arrays.toString(permissions));
            requestPermissionForAliases(permissions, call, "camera");
        } else {
            JSObject result = new JSObject();
            result.put("granted", true);
            result.put("device", getDeviceInfo());
            result.put("androidVersion", Build.VERSION.SDK_INT);
            result.put("permissionsRequested", java.util.Arrays.toString(permissions));
            result.put("strategy", isAndroid13Plus ? "ANDROID13_PERMISSIONS" : "LEGACY_PERMISSIONS");
            call.resolve(result);
        }
    }

    @PluginMethod  
    public void forceRequestContactsPermissions(PluginCall call) {
        String[] permissions = { Manifest.permission.READ_CONTACTS };
        
        if (!hasAllPermissions(permissions)) {
            requestPermissionForAliases(permissions, call, "contacts");
        } else {
            JSObject result = new JSObject();
            result.put("granted", true);
            result.put("device", getDeviceInfo());
            call.resolve(result);
        }
    }

    @PluginMethod
    public void openAppSettings(PluginCall call) {
        try {
            // Pour les appareils MIUI/Xiaomi, utiliser des intents spéciaux
            if (isMIUI()) {
                boolean opened = openMiuiPermissionSettings();
                if (opened) {
                    JSObject result = new JSObject();
                    result.put("success", true);
                    result.put("device", getDeviceInfo());
                    result.put("method", "MIUI_SPECIFIC");
                    call.resolve(result);
                    return;
                }
                // Si ça échoue, continue avec la méthode standard
            }
            
            // Méthode standard pour tous les autres appareils
            Intent intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
            Uri uri = Uri.fromParts("package", getActivity().getPackageName(), null);
            intent.setData(uri);
            getActivity().startActivity(intent);
            
            JSObject result = new JSObject();
            result.put("success", true);
            result.put("device", getDeviceInfo());
            result.put("method", "STANDARD");
            call.resolve(result);
        } catch (Exception e) {
            call.reject("Impossible d'ouvrir les paramètres", e);
        }
    }

    private boolean openMiuiPermissionSettings() {
        try {
            // Méthode 1: Intent direct vers les permissions MIUI (pour versions récentes)
            Intent intent = new Intent("miui.intent.action.APP_PERM_EDITOR");
            intent.setClassName("com.miui.securitycenter", "com.miui.permcenter.permissions.AppPermissionsEditorActivity");
            intent.putExtra("extra_pkgname", getActivity().getPackageName());
            intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            
            if (isIntentAvailable(intent)) {
                getActivity().startActivity(intent);
                return true;
            }
            
            // Méthode 2: Autre structure pour certaines versions MIUI
            intent = new Intent("miui.intent.action.APP_PERM_EDITOR");
            intent.setClassName("com.miui.securitycenter", "com.miui.permcenter.permissions.PermissionsEditorActivity");
            intent.putExtra("extra_pkgname", getActivity().getPackageName());
            intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            
            if (isIntentAvailable(intent)) {
                getActivity().startActivity(intent);
                return true;
            }
            
            // Méthode 3: Pour les très anciennes versions MIUI
            intent = new Intent();
            intent.setClassName("com.miui.securitycenter", "com.miui.permcenter.permissions.AppPermissionsEditorActivity");
            intent.putExtra("extra_pkgname", getActivity().getPackageName());
            intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            
            if (isIntentAvailable(intent)) {
                getActivity().startActivity(intent);
                return true;
            }
            
        } catch (Exception e) {
            Log.e("PermissionsPlugin", "Erreur ouverture paramètres MIUI: " + e.getMessage());
        }
        
        return false;
    }
    
    private boolean isIntentAvailable(Intent intent) {
        try {
            List<ResolveInfo> list = getActivity().getPackageManager().queryIntentActivities(intent, PackageManager.MATCH_DEFAULT_ONLY);
            return list.size() > 0;
        } catch (Exception e) {
            return false;
        }
    }

    @PluginMethod
    public void forceOpenGallery(PluginCall call) {
        // Sauvegarder l'appel pour le résultat
        this.galleryCall = call;
        String strategy = getDeviceStrategy();
        
        try {
            Log.d("PermissionsPlugin", "Ouverture galerie - Android " + Build.VERSION.SDK_INT + ", Stratégie: " + strategy);
            
            // STRATÉGIE ANDROID 13+ : Photo Picker natif en priorité
            if (Build.VERSION.SDK_INT >= 33 && isPhotoPickerAvailable()) {
                Log.d("PermissionsPlugin", "Utilisation Photo Picker Android 13+");
                openPhotoPicker();
                return;
            }
            
            // STRATÉGIES SPÉCIFIQUES PAR FABRICANT
            switch (strategy) {
                case "samsung":
                    if (openGalleryWithSamsungStrategy()) return;
                    break;
                case "huawei":
                    if (openGalleryWithHuaweiStrategy()) return;
                    break;
                case "oneplus":
                    if (openGalleryWithOnePlusStrategy()) return;
                    break;
                case "oppo":
                    if (openGalleryWithOppoStrategy()) return;
                    break;
                case "lg":
                    if (openGalleryWithLGStrategy()) return;
                    break;
                case "miui":
                    if (openGalleryWithMIUIStrategy()) return;
                    break;
            }
            
            // FALLBACK : Méthodes alternatives
            if (openGalleryWithAlternativeMethod()) return;
            
            // DERNIER RECOURS : Stratégie standard
            Log.d("PermissionsPlugin", "Utilisation stratégie standard finale");
            openGalleryStandard();
            
        } catch (Exception e) {
            Log.e("PermissionsPlugin", "Erreur ouverture galerie", e);
            call.reject("Impossible d'ouvrir la galerie: " + e.getMessage(), e);
        }
    }

    // ============ ANDROID 13+ PHOTO PICKER API ============
    
    private boolean isPhotoPickerAvailable() {
        if (Build.VERSION.SDK_INT >= 33) {
            try {
                Intent intent = new Intent("android.provider.action.PICK_IMAGES");
                return intent.resolveActivity(getActivity().getPackageManager()) != null;
            } catch (Exception e) {
                Log.e("PermissionsPlugin", "Erreur vérification Photo Picker", e);
                return false;
            }
        }
        return false;
    }
    
    private void openPhotoPicker() {
        try {
            Intent intent = new Intent("android.provider.action.PICK_IMAGES");
            intent.setType("image/*");
            intent.putExtra("android.provider.extra.PICK_IMAGES_MAX", 1);
            
            if (intent.resolveActivity(getActivity().getPackageManager()) != null) {
                Log.d("PermissionsPlugin", "Lancement Photo Picker Android 13+");
                startActivityForResult(galleryCall, intent, "handlePhotoPickerResult");
            } else {
                Log.w("PermissionsPlugin", "Photo Picker non disponible, fallback");
                openGalleryWithMIUIStrategy();
            }
        } catch (Exception e) {
            Log.e("PermissionsPlugin", "Erreur Photo Picker", e);
            openGalleryWithMIUIStrategy();
        }
    }
    
    @com.getcapacitor.annotation.ActivityCallback
    private void handlePhotoPickerResult(PluginCall call, ActivityResult result) {
        if (result.getResultCode() == Activity.RESULT_OK && result.getData() != null) {
            Uri uri = result.getData().getData();
            if (uri != null) {
                JSObject ret = new JSObject();
                ret.put("success", true);
                ret.put("imageUri", uri.toString());
                ret.put("method", "PHOTO_PICKER_ANDROID13");
                Log.d("PermissionsPlugin", "Photo sélectionnée via Photo Picker: " + uri.toString());
                call.resolve(ret);
            } else {
                call.reject("URI null du Photo Picker");
            }
        } else {
            call.reject("Sélection annulée ou erreur");
        }
    }
    
    // ============ STRATÉGIE MIUI AMÉLIORÉE ============
    
    private boolean openGalleryWithSamsungStrategy() {
        try {
            Log.d("PermissionsPlugin", "Stratégie Samsung");
            
            // Samsung Gallery
            Intent intent = new Intent(Intent.ACTION_PICK);
            intent.setType("image/*");
            intent.setPackage("com.sec.android.gallery3d");
            
            if (intent.resolveActivity(getActivity().getPackageManager()) != null) {
                Log.d("PermissionsPlugin", "Utilisation Samsung Gallery");
                startActivityForResult(galleryCall, intent, "handleGalleryResult");
                return true;
            }
            
            // Samsung My Files
            intent = new Intent(Intent.ACTION_GET_CONTENT);
            intent.setType("image/*");
            intent.setPackage("com.sec.android.app.myfiles");
            if (intent.resolveActivity(getActivity().getPackageManager()) != null) {
                Log.d("PermissionsPlugin", "Utilisation Samsung My Files");
                startActivityForResult(galleryCall, intent, "handleGalleryResult");
                return true;
            }
            
        } catch (Exception e) {
            Log.e("PermissionsPlugin", "Erreur stratégie Samsung", e);
        }
        return false;
    }

    private boolean openGalleryWithHuaweiStrategy() {
        try {
            Log.d("PermissionsPlugin", "Stratégie Huawei/Honor");
            
            // Huawei Gallery
            Intent intent = new Intent(Intent.ACTION_PICK);
            intent.setType("image/*");
            intent.setPackage("com.android.gallery3d");
            
            if (intent.resolveActivity(getActivity().getPackageManager()) != null) {
                Log.d("PermissionsPlugin", "Utilisation Huawei Gallery");
                startActivityForResult(galleryCall, intent, "handleGalleryResult");
                return true;
            }
            
            // Huawei File Manager
            intent = new Intent(Intent.ACTION_GET_CONTENT);
            intent.setType("image/*");
            intent.setPackage("com.huawei.hidisk");
            if (intent.resolveActivity(getActivity().getPackageManager()) != null) {
                Log.d("PermissionsPlugin", "Utilisation Huawei File Manager");
                startActivityForResult(galleryCall, intent, "handleGalleryResult");
                return true;
            }
            
        } catch (Exception e) {
            Log.e("PermissionsPlugin", "Erreur stratégie Huawei", e);
        }
        return false;
    }

    private boolean openGalleryWithOnePlusStrategy() {
        try {
            Log.d("PermissionsPlugin", "Stratégie OnePlus");
            
            // OnePlus Gallery
            Intent intent = new Intent(Intent.ACTION_PICK);
            intent.setType("image/*");
            intent.setPackage("com.oneplus.gallery");
            
            if (intent.resolveActivity(getActivity().getPackageManager()) != null) {
                Log.d("PermissionsPlugin", "Utilisation OnePlus Gallery");
                startActivityForResult(galleryCall, intent, "handleGalleryResult");
                return true;
            }
            
            // OnePlus File Manager
            intent = new Intent(Intent.ACTION_GET_CONTENT);
            intent.setType("image/*");
            intent.setPackage("com.oneplus.filemanager");
            if (intent.resolveActivity(getActivity().getPackageManager()) != null) {
                Log.d("PermissionsPlugin", "Utilisation OnePlus File Manager");
                startActivityForResult(galleryCall, intent, "handleGalleryResult");
                return true;
            }
            
        } catch (Exception e) {
            Log.e("PermissionsPlugin", "Erreur stratégie OnePlus", e);
        }
        return false;
    }

    private boolean openGalleryWithOppoStrategy() {
        try {
            Log.d("PermissionsPlugin", "Stratégie Oppo/Realme");
            
            // Oppo Gallery (ColorOS)
            Intent intent = new Intent(Intent.ACTION_PICK);
            intent.setType("image/*");
            intent.setPackage("com.coloros.gallery3d");
            
            if (intent.resolveActivity(getActivity().getPackageManager()) != null) {
                Log.d("PermissionsPlugin", "Utilisation Oppo Gallery");
                startActivityForResult(galleryCall, intent, "handleGalleryResult");
                return true;
            }
            
            // Oppo File Manager
            intent = new Intent(Intent.ACTION_GET_CONTENT);
            intent.setType("image/*");
            intent.setPackage("com.coloros.filemanager");
            if (intent.resolveActivity(getActivity().getPackageManager()) != null) {
                Log.d("PermissionsPlugin", "Utilisation Oppo File Manager");
                startActivityForResult(galleryCall, intent, "handleGalleryResult");
                return true;
            }
            
        } catch (Exception e) {
            Log.e("PermissionsPlugin", "Erreur stratégie Oppo", e);
        }
        return false;
    }

    private boolean openGalleryWithLGStrategy() {
        try {
            Log.d("PermissionsPlugin", "Stratégie LG");
            
            // LG Gallery
            Intent intent = new Intent(Intent.ACTION_PICK);
            intent.setType("image/*");
            intent.setPackage("com.lge.gallery");
            
            if (intent.resolveActivity(getActivity().getPackageManager()) != null) {
                Log.d("PermissionsPlugin", "Utilisation LG Gallery");
                startActivityForResult(galleryCall, intent, "handleGalleryResult");
                return true;
            }
            
            // LG File Manager
            intent = new Intent(Intent.ACTION_GET_CONTENT);
            intent.setType("image/*");
            intent.setPackage("com.lge.filemanager");
            if (intent.resolveActivity(getActivity().getPackageManager()) != null) {
                Log.d("PermissionsPlugin", "Utilisation LG File Manager");
                startActivityForResult(galleryCall, intent, "handleGalleryResult");
                return true;
            }
            
        } catch (Exception e) {
            Log.e("PermissionsPlugin", "Erreur stratégie LG", e);
        }
        return false;
    }

    private boolean openGalleryWithMIUIStrategy() {
        try {
            Log.d("PermissionsPlugin", "Stratégie MIUI - Android " + Build.VERSION.SDK_INT);
            
            // Méthode 1: Gallery MIUI native
            Intent intent = new Intent(Intent.ACTION_PICK);
            intent.setType("image/*");
            intent.setPackage("com.miui.gallery");
            
            if (intent.resolveActivity(getActivity().getPackageManager()) != null) {
                Log.d("PermissionsPlugin", "Utilisation galerie MIUI native");
                startActivityForResult(galleryCall, intent, "handleGalleryResult");
                return true;
            }
            
            // Méthode 2: Intent MIUI spécialisé
            intent = new Intent("miui.intent.action.GALLERY_PICK");
            intent.setType("image/*");
            if (intent.resolveActivity(getActivity().getPackageManager()) != null) {
                Log.d("PermissionsPlugin", "Utilisation intent MIUI spécialisé");
                startActivityForResult(galleryCall, intent, "handleGalleryResult");
                return true;
            }
            
            // Méthode 3: File Manager MIUI pour Android 13+
            if (Build.VERSION.SDK_INT >= 33) {
                intent = new Intent(Intent.ACTION_GET_CONTENT);
                intent.setType("image/*");
                intent.setPackage("com.mi.android.globalFileexplorer");
                if (intent.resolveActivity(getActivity().getPackageManager()) != null) {
                    Log.d("PermissionsPlugin", "Utilisation File Manager MIUI");
                    startActivityForResult(galleryCall, intent, "handleGalleryResult");
                    return true;
                }
            }
            
        } catch (Exception e) {
            Log.e("PermissionsPlugin", "Erreur stratégie MIUI", e);
        }
        return false;
    }

    private boolean openGalleryWithAlternativeMethod() {
        try {
            Log.d("PermissionsPlugin", "Méthodes alternatives");
            
            // Méthode ACTION_GET_CONTENT générique
            Intent intent = new Intent(Intent.ACTION_GET_CONTENT);
            intent.setType("image/*");
            intent.addCategory(Intent.CATEGORY_OPENABLE);
            
            if (intent.resolveActivity(getActivity().getPackageManager()) != null) {
                Log.d("PermissionsPlugin", "Utilisation ACTION_GET_CONTENT");
                startActivityForResult(galleryCall, intent, "handleGalleryResult");
                return true;
            }
            
            // Document picker comme dernier recours
            intent = new Intent(Intent.ACTION_OPEN_DOCUMENT);
            intent.setType("image/*");
            intent.addCategory(Intent.CATEGORY_OPENABLE);
            if (intent.resolveActivity(getActivity().getPackageManager()) != null) {
                Log.d("PermissionsPlugin", "Utilisation ACTION_OPEN_DOCUMENT");
                startActivityForResult(galleryCall, intent, "handleGalleryResult");
                return true;
            }
            
        } catch (Exception e) {
            Log.e("PermissionsPlugin", "Erreur méthodes alternatives", e);
        }
        return false;
    }

    private void openGalleryStandard() {
        try {
            // Méthode standard Android
            Intent intent = new Intent(Intent.ACTION_PICK, MediaStore.Images.Media.EXTERNAL_CONTENT_URI);
            intent.setType("image/*");
            
            // Vérifier que l'intent peut être résolu
            if (intent.resolveActivity(getActivity().getPackageManager()) != null) {
                startActivityForResult(galleryCall, intent, "handleGalleryResult");
            } else {
                // Fallback vers GET_CONTENT si PICK échoue
                Intent fallbackIntent = new Intent(Intent.ACTION_GET_CONTENT);
                fallbackIntent.setType("image/*");
                fallbackIntent.addCategory(Intent.CATEGORY_OPENABLE);
                
                if (fallbackIntent.resolveActivity(getActivity().getPackageManager()) != null) {
                    startActivityForResult(galleryCall, fallbackIntent, "handleGalleryResult");
                } else {
                    throw new Exception("Aucune application galerie trouvée");
                }
            }
            
        } catch (Exception e) {
            if (galleryCall != null) {
                galleryCall.reject("Galerie standard échouée: " + e.getMessage(), e);
                galleryCall = null;
            }
        }
    }

    // ✅ CALLBACK CAPACITOR MODERNE POUR GALERIE
    @com.getcapacitor.annotation.ActivityCallback
    private void handleGalleryResult(PluginCall call, ActivityResult result) {
        try {
            if (result.getResultCode() == Activity.RESULT_OK && result.getData() != null) {
                Uri selectedImage = result.getData().getData();
                
                // Photo Picker peut aussi retourner multiple URIs
                if (selectedImage == null && result.getData().getClipData() != null && result.getData().getClipData().getItemCount() > 0) {
                    selectedImage = result.getData().getClipData().getItemAt(0).getUri();
                }
                
                if (selectedImage != null) {
                    // Obtenir le chemin réel de l'image
                    String imagePath = getRealImagePath(selectedImage);
                    
                    JSObject resultObj = new JSObject();
                    resultObj.put("success", true);
                    resultObj.put("imageUri", selectedImage.toString());
                    resultObj.put("imagePath", imagePath);
                    resultObj.put("method", isMIUI() ? "miui-intent" : "standard-intent");
                    resultObj.put("device", getDeviceInfo());
                    resultObj.put("androidVersion", Build.VERSION.SDK_INT);
                    
                    Log.d("PermissionsPlugin", "Galerie succès: " + selectedImage.toString());
                    call.resolve(resultObj);
                } else {
                    Log.w("PermissionsPlugin", "Galerie: URI null");
                    call.reject("URI image null");
                }
            } else {
                Log.d("PermissionsPlugin", "Galerie: sélection annulée");
                call.reject("Sélection annulée ou échouée");
            }
        } catch (Exception e) {
            Log.e("PermissionsPlugin", "Erreur galerie", e);
            call.reject("Erreur traitement image: " + e.getMessage(), e);
        }
    }

    private String getRealImagePath(Uri uri) {
        String result = null;
        String[] projection = { MediaStore.Images.Media.DATA };
        
        try {
            Cursor cursor = getActivity().getContentResolver().query(uri, projection, null, null, null);
            if (cursor != null) {
                if (cursor.moveToFirst()) {
                    int columnIndex = cursor.getColumnIndexOrThrow(MediaStore.Images.Media.DATA);
                    result = cursor.getString(columnIndex);
                }
                cursor.close();
            }
        } catch (Exception e) {
            // Si on ne peut pas obtenir le chemin réel, utiliser l'URI
            result = uri.toString();
        }
        
        return result != null ? result : uri.toString();
    }

    private JSObject getDeviceInfo() {
        JSObject device = new JSObject();
        device.put("manufacturer", Build.MANUFACTURER);
        device.put("model", Build.MODEL);
        device.put("version", Build.VERSION.RELEASE);
        device.put("sdkInt", Build.VERSION.SDK_INT);
        device.put("isMIUI", isMIUI());
        return device;
    }

    private boolean isMIUI() {
        return "Xiaomi".equalsIgnoreCase(Build.MANUFACTURER) || 
               "Redmi".equalsIgnoreCase(Build.MANUFACTURER) ||
               Build.MODEL.toLowerCase().contains("redmi") ||
               Build.MODEL.toLowerCase().contains("mi ") ||
               Build.MODEL.toLowerCase().contains("poco") ||
               hasSystemProperty("ro.miui.ui.version.name");
    }
    
    private boolean hasSystemProperty(String property) {
        try {
            Class<?> systemProperties = Class.forName("android.os.SystemProperties");
            java.lang.reflect.Method get = systemProperties.getMethod("get", String.class);
            String value = (String) get.invoke(null, property);
            return value != null && !value.isEmpty();
        } catch (Exception e) {
            return false;
        }
    }

    private boolean hasAllPermissions(String[] permissions) {
        for (String permission : permissions) {
            if (ContextCompat.checkSelfPermission(getActivity(), permission) != PackageManager.PERMISSION_GRANTED) {
                return false;
            }
        }
        return true;
    }

    @Override
    protected void handleRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.handleRequestPermissionsResult(requestCode, permissions, grantResults);
        
        // 🔥 GESTION SPÉCIFIQUE POUR LES NOTIFICATIONS (code 2001)
        if (requestCode == 2001) {
            PluginCall savedCall = getSavedCall();
            if (savedCall == null) {
                Log.w("PermissionsPlugin", "⚠️ Pas de savedCall pour notifications");
                return;
            }
            
            boolean granted = grantResults.length > 0 && 
                             grantResults[0] == PackageManager.PERMISSION_GRANTED;
            
            Log.d("PermissionsPlugin", "📱 Résultat popup notifications: " + (granted ? "ACCORDÉ ✅" : "REFUSÉ ❌"));
            
            JSObject result = new JSObject();
            result.put("granted", granted);
            result.put("device", getDeviceInfo());
            result.put("sdkVersion", Build.VERSION.SDK_INT);
            
            if (granted) {
                Log.d("PermissionsPlugin", "🔥 Permission accordée, déclenchement Firebase...");
                triggerFirebaseRegistration();
                savedCall.resolve(result);
            } else {
                Log.d("PermissionsPlugin", "❌ Permission refusée par l'utilisateur");
                result.put("needsSettings", true);
                result.put("advice", isMIUI() ? 
                    "Sur MIUI, allez dans Paramètres > Apps > RunConnect > Notifications" :
                    "Activez les notifications dans Paramètres > Apps > RunConnect");
                savedCall.resolve(result); // Résoudre quand même, pas reject
            }
            return;
        }
        
        // Gestion des autres permissions (géolocalisation, caméra, contacts)
        if (requestCode == PERMISSION_REQUEST_CODE) {
            PluginCall savedCall = getSavedCall();
            if (savedCall == null) {
                return;
            }

            boolean allGranted = true;
            for (int result : grantResults) {
                if (result != PackageManager.PERMISSION_GRANTED) {
                    allGranted = false;
                    break;
                }
            }

            JSObject result = new JSObject();
            result.put("granted", allGranted);
            result.put("device", getDeviceInfo());
            
            if (allGranted) {
                savedCall.resolve(result);
            } else {
                // Sur MIUI, même si refusé, on peut diriger vers les paramètres
                if (isMIUI()) {
                    result.put("miuiAdvice", "Ouvrez Paramètres > Apps > RunConnect > Autorisations pour autoriser manuellement");
                }
                savedCall.reject("Permissions refusées - vérifiez les paramètres MIUI si Xiaomi/Redmi");
            }
        }
    }

    @PluginMethod
    public void requestNotificationPermissions(PluginCall call) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                // Android 13+ : vérifier si déjà accordé
                if (ContextCompat.checkSelfPermission(getActivity(), 
                    Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED) {
                    
                    Log.d("PermissionsPlugin", "✅ Notifications déjà autorisées");
                    triggerFirebaseRegistration();
                    
                    JSObject result = new JSObject();
                    result.put("granted", true);
                    result.put("device", getDeviceInfo());
                    result.put("sdkVersion", Build.VERSION.SDK_INT);
                    call.resolve(result);
                    return;
                }
                
                // 🔥 DÉCLENCHER LA POPUP SYSTÈME ANDROID 13+
                Log.d("PermissionsPlugin", "🔔 Demande popup système POST_NOTIFICATIONS pour Android 13+");
                saveCall(call); // Sauvegarder pour le callback
                ActivityCompat.requestPermissions(getActivity(),
                    new String[]{Manifest.permission.POST_NOTIFICATIONS},
                    2001); // Code unique pour notifications
                return;
            }
            
            // Android < 13 : pas besoin de permission explicite, vérifier si activées
            boolean areEnabled = areNotificationsEnabled();
            
            JSObject result = new JSObject();
            result.put("granted", areEnabled);
            result.put("device", getDeviceInfo());
            result.put("sdkVersion", Build.VERSION.SDK_INT);
            
            if (areEnabled) {
                Log.d("PermissionsPlugin", "✅ Notifications activées (Android < 13)");
                triggerFirebaseRegistration();
                call.resolve(result);
            } else {
                Log.d("PermissionsPlugin", "⚠️ Notifications désactivées dans les paramètres");
                result.put("needsSettings", true);
                result.put("advice", isMIUI() ? 
                    "Sur MIUI, allez dans Paramètres > Apps > RunConnect > Notifications" :
                    "Activez les notifications dans Paramètres > Apps > RunConnect");
                call.resolve(result);
            }
            
        } catch (Exception e) {
            Log.e("PermissionsPlugin", "❌ Erreur demande permissions notifications", e);
            call.reject("Erreur demande permissions notifications", e);
        }
    }
    
    /**
     * 🔥 DÉCLENCHER L'ENREGISTREMENT FIREBASE APRÈS PERMISSION ACCORDÉE
     */
    private void triggerFirebaseRegistration() {
        try {
            Log.d("PermissionsPlugin", "🔥 [TRIGGER FCM] Démarrage récupération token FCM...");
            
            if (getActivity() instanceof MainActivity) {
                MainActivity mainActivity = (MainActivity) getActivity();
                
                mainActivity.runOnUiThread(() -> {
                    // 🔥 RÉCUPÉRER LE TOKEN FCM DIRECTEMENT EN JAVA !
                    com.google.firebase.messaging.FirebaseMessaging.getInstance().getToken()
                        .addOnCompleteListener(new com.google.android.gms.tasks.OnCompleteListener<String>() {
                            @Override
                            public void onComplete(@androidx.annotation.NonNull com.google.android.gms.tasks.Task<String> task) {
                                if (!task.isSuccessful()) {
                                    Log.w("PermissionsPlugin", "❌ [TRIGGER FCM] Échec récupération token", task.getException());
                                    return;
                                }
                                
                                String token = task.getResult();
                                if (token != null && !token.isEmpty()) {
                                    Log.d("PermissionsPlugin", "🔥🔥🔥 [TRIGGER FCM] TOKEN FCM RÉCUPÉRÉ !");
                                    Log.d("PermissionsPlugin", "🔥 [TRIGGER FCM] Token: " + token.substring(0, 30) + "...");
                                    
                                    // Injecter dans JavaScript via MainActivity
                                    mainActivity.injectFCMToken(mainActivity.webView, token);
                                    Log.d("PermissionsPlugin", "✅ [TRIGGER FCM] Token injecté dans JavaScript");
                                } else {
                                    Log.w("PermissionsPlugin", "⚠️ [TRIGGER FCM] Token vide ou null");
                                }
                            }
                        });
                });
            }
        } catch (Exception e) {
            Log.e("PermissionsPlugin", "❌ [TRIGGER FCM] Exception:", e);
        }
    }
    
    @PluginMethod
    public void showLocalNotification(PluginCall call) {
        try {
            String title = call.getString("title", "RunConnect");
            String body = call.getString("body", "Nouvelle notification");
            String icon = call.getString("icon", "ic_notification");
            
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                createNotificationChannel();
            }
            
            NotificationCompat.Builder builder = new NotificationCompat.Builder(getActivity(), "high_importance_channel")
                .setSmallIcon(android.R.drawable.ic_dialog_info) // Icône par défaut
                .setContentTitle(title)
                .setContentText(body)
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setAutoCancel(true);
                
            // Intent pour ouvrir l'app quand on clique sur la notification
            Intent intent = new Intent(getActivity(), getActivity().getClass());
            intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK);
            
            PendingIntent pendingIntent = PendingIntent.getActivity(getActivity(), 0, intent, 
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
            builder.setContentIntent(pendingIntent);
            
            NotificationManagerCompat notificationManager = NotificationManagerCompat.from(getActivity());
            
            // Vérifier les permissions avant d'afficher
            if (ActivityCompat.checkSelfPermission(getActivity(), 
                Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED || 
                Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) {
                
                notificationManager.notify(1001, builder.build());
                
                JSObject result = new JSObject();
                result.put("success", true);
                result.put("device", getDeviceInfo());
                call.resolve(result);
            } else {
                call.reject("Permission notifications requise");
            }
            
        } catch (Exception e) {
            call.reject("Erreur affichage notification", e);
        }
    }
    
    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            // Utiliser le même canal que MainActivity pour cohérence
            CharSequence name = "Notifications RunConnect";
            String description = "Notifications importantes de RunConnect";
            int importance = NotificationManager.IMPORTANCE_HIGH;
            NotificationChannel channel = new NotificationChannel("high_importance_channel", name, importance);
            channel.setDescription(description);
            channel.enableLights(true);
            channel.enableVibration(true);
            channel.setShowBadge(true);
            
            NotificationManager notificationManager = getActivity().getSystemService(NotificationManager.class);
            notificationManager.createNotificationChannel(channel);
            Log.d("PermissionsPlugin", "✅ Canal de notification créé: high_importance_channel");
        }
    }
    
    private boolean areNotificationsEnabled() {
        NotificationManagerCompat notificationManager = NotificationManagerCompat.from(getActivity());
        return notificationManager.areNotificationsEnabled();
    }

    /**
     * Get device-specific strategy for gallery access
     */
    private String getDeviceStrategy() {
        String manufacturer = Build.MANUFACTURER.toLowerCase();
        String brand = Build.BRAND.toLowerCase();

        if (manufacturer.contains("xiaomi") || manufacturer.contains("redmi") || brand.contains("redmi") || manufacturer.contains("poco")) {
            return "MIUI";
        } else if (manufacturer.contains("samsung")) {
            return "Samsung";
        } else if (manufacturer.contains("huawei") || manufacturer.contains("honor")) {
            return "Huawei";
        } else if (manufacturer.contains("oneplus")) {
            return "OnePlus";
        } else if (manufacturer.contains("oppo") || manufacturer.contains("realme")) {
            return "Oppo";
        } else if (manufacturer.contains("lg")) {
            return "LG";
        } else if (Build.VERSION.SDK_INT >= 33) {
            return "Android13Plus";
        } else {
            return "Standard";
        }
    }
}