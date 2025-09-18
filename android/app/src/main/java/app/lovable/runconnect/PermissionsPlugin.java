package app.lovable.runconnect;

import android.Manifest;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.provider.Settings;
import android.os.Build;
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
    public void getDeviceInfo(PluginCall call) {
        JSObject result = new JSObject();
        result.put("device", getDeviceInfo());
        call.resolve(result);
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