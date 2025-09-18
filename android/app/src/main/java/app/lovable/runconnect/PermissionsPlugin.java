package app.lovable.runconnect;

import android.Manifest;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.provider.Settings;
import android.os.Build;
import android.app.Activity;
import android.database.Cursor;
import android.provider.MediaStore;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

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
        @Permission(strings = { Manifest.permission.READ_CONTACTS }, alias = "contacts")
    }
)
public class PermissionsPlugin extends Plugin {

    private static final int PERMISSION_REQUEST_CODE = 9999;
    private static final int GALLERY_REQUEST_CODE = 9998;
    private PluginCall galleryCall;

    @PluginMethod
    public void forceRequestLocationPermissions(PluginCall call) {
        String[] permissions = {
            Manifest.permission.ACCESS_FINE_LOCATION,
            Manifest.permission.ACCESS_COARSE_LOCATION
        };
        
        if (!hasAllPermissions(permissions)) {
            // MIUI/Xiaomi: forcer la demande même si déjà refusée
            if (isMIUI()) {
                requestPermissionForAliases(permissions, call, "location");
            } else {
                requestPermissionForAliases(permissions, call, "location");
            }
        } else {
            JSObject result = new JSObject();
            result.put("granted", true);
            result.put("device", getDeviceInfo());
            call.resolve(result);
        }
    }

    @PluginMethod
    public void forceRequestCameraPermissions(PluginCall call) {
        String[] permissions = {
            Manifest.permission.CAMERA,
            Manifest.permission.READ_MEDIA_IMAGES
        };
        
        if (!hasAllPermissions(permissions)) {
            requestPermissionForAliases(permissions, call, "camera");
        } else {
            JSObject result = new JSObject();
            result.put("granted", true);
            result.put("device", getDeviceInfo());
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
            Intent intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
            Uri uri = Uri.fromParts("package", getActivity().getPackageName(), null);
            intent.setData(uri);
            getActivity().startActivity(intent);
            
            JSObject result = new JSObject();
            result.put("success", true);
            result.put("device", getDeviceInfo());
            call.resolve(result);
        } catch (Exception e) {
            call.reject("Impossible d'ouvrir les paramètres", e);
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
               Build.MODEL.toLowerCase().contains("mi ");
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
    }
}