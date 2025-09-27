package app.runconnect;

import android.Manifest;
import android.content.Intent;
import android.content.pm.ResolveInfo;
import java.util.List;
import android.net.Uri;
import android.provider.Settings;
import android.os.Build;
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
    private PluginCall galleryCall;

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
            // Android 13+ - Utiliser READ_MEDIA_IMAGES
            permissions = new String[] {
                Manifest.permission.CAMERA,
                Manifest.permission.READ_MEDIA_IMAGES
            };
        } else {
            // Android 6-12 - Utiliser READ_EXTERNAL_STORAGE
            permissions = new String[] {
                Manifest.permission.CAMERA,
                Manifest.permission.READ_EXTERNAL_STORAGE
            };
        }
        
        if (!hasAllPermissions(permissions)) {
            requestPermissionForAliases(permissions, call, "camera");
        } else {
            JSObject result = new JSObject();
            result.put("granted", true);
            result.put("device", getDeviceInfo());
            result.put("androidVersion", Build.VERSION.SDK_INT);
            result.put("permissionsRequested", java.util.Arrays.toString(permissions));
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
        
        try {
            // Sur MIUI/Xiaomi, utiliser Intent direct pour contourner les bugs Capacitor
            if (isMIUI()) {
                openGalleryWithIntent();
            } else {
                // Autres appareils Android - méthode standard
                openGalleryStandard();
            }
        } catch (Exception e) {
            call.reject("Impossible d'ouvrir la galerie", e);
        }
    }

    private void openGalleryWithIntent() {
        try {
            // Méthode MIUI - Intent direct vers la galerie
            Intent intent = new Intent(Intent.ACTION_PICK);
            intent.setType("image/*");
            
            // Essayer d'abord la galerie MIUI spécifique
            intent.setPackage("com.miui.gallery");
            
            // Si la galerie MIUI n'existe pas, utiliser le sélecteur système
            if (intent.resolveActivity(getActivity().getPackageManager()) == null) {
                intent.setPackage(null); // Retirer le package spécifique
                intent = Intent.createChooser(intent, "Sélectionner une image");
            }
            
            getActivity().startActivityForResult(intent, GALLERY_REQUEST_CODE);
            
        } catch (Exception e) {
            // Fallback vers méthode standard si MIUI échoue
            openGalleryStandard();
        }
    }

    private void openGalleryStandard() {
        try {
            // Méthode standard Android
            Intent intent = new Intent(Intent.ACTION_PICK, MediaStore.Images.Media.EXTERNAL_CONTENT_URI);
            intent.setType("image/*");
            
            // Vérifier que l'intent peut être résolu
            if (intent.resolveActivity(getActivity().getPackageManager()) != null) {
                getActivity().startActivityForResult(intent, GALLERY_REQUEST_CODE);
            } else {
                // Fallback vers GET_CONTENT si PICK échoue
                Intent fallbackIntent = new Intent(Intent.ACTION_GET_CONTENT);
                fallbackIntent.setType("image/*");
                fallbackIntent.addCategory(Intent.CATEGORY_OPENABLE);
                
                if (fallbackIntent.resolveActivity(getActivity().getPackageManager()) != null) {
                    getActivity().startActivityForResult(fallbackIntent, GALLERY_REQUEST_CODE);
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

    // ESSENTIEL: Traiter les résultats de l'activité galerie
    public void handleActivityResult(int requestCode, int resultCode, Intent data) {
        if (requestCode == GALLERY_REQUEST_CODE && galleryCall != null) {
            if (resultCode == Activity.RESULT_OK && data != null) {
                Uri selectedImage = data.getData();
                if (selectedImage != null) {
                    try {
                        // Obtenir le chemin réel de l'image
                        String imagePath = getRealImagePath(selectedImage);
                        
                        JSObject result = new JSObject();
                        result.put("success", true);
                        result.put("imageUri", selectedImage.toString());
                        result.put("imagePath", imagePath);
                        result.put("method", isMIUI() ? "miui-intent" : "standard-intent");
                        result.put("device", getDeviceInfo());
                        
                        galleryCall.resolve(result);
                        
                    } catch (Exception e) {
                        galleryCall.reject("Erreur traitement image: " + e.getMessage(), e);
                    }
                } else {
                    galleryCall.reject("URI image null");
                }
            } else {
                galleryCall.reject("Sélection annulée ou échouée");
            }
            
            galleryCall = null;
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

    @PluginMethod
    public void requestNotificationPermissions(PluginCall call) {
        try {
            // Demander les permissions de notifications Android
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                // Android 13+ nécessite permission EXPLICIT
                if (ContextCompat.checkSelfPermission(getActivity(), 
                    Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
                    
                    requestPermissionForAlias("notifications", call, "requestNotificationPermissions");
                    return;
                }
            }
            
            // Vérifier si les notifications sont activées
            boolean areEnabled = areNotificationsEnabled();
            
            JSObject result = new JSObject();
            result.put("granted", areEnabled);
            result.put("device", getDeviceInfo());
            result.put("sdkVersion", Build.VERSION.SDK_INT);
            
            if (areEnabled) {
                call.resolve(result);
            } else {
                result.put("needsSettings", true);
                result.put("advice", isMIUI() ? 
                    "Sur MIUI, allez dans Paramètres > Apps > RunConnect > Notifications" :
                    "Activez les notifications dans Paramètres > Apps > RunConnect");
                call.resolve(result);
            }
            
        } catch (Exception e) {
            call.reject("Erreur demande permissions notifications", e);
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
            
            NotificationCompat.Builder builder = new NotificationCompat.Builder(getActivity(), "runconnect_channel")
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
            CharSequence name = "RunConnect Notifications";
            String description = "Notifications pour RunConnect";
            int importance = NotificationManager.IMPORTANCE_HIGH;
            NotificationChannel channel = new NotificationChannel("runconnect_channel", name, importance);
            channel.setDescription(description);
            channel.enableLights(true);
            channel.enableVibration(true);
            
            NotificationManager notificationManager = getActivity().getSystemService(NotificationManager.class);
            notificationManager.createNotificationChannel(channel);
        }
    }
    
    private boolean areNotificationsEnabled() {
        NotificationManagerCompat notificationManager = NotificationManagerCompat.from(getActivity());
        return notificationManager.areNotificationsEnabled();
    }
}
}