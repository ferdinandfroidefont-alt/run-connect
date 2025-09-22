package app.lovable.runconnect;

import android.os.Bundle;
import android.content.Intent;
import android.app.Activity;

import com.getcapacitor.BridgeActivity;

// ✅ Import du plugin
import app.lovable.runconnect.PermissionsPlugin;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // ✅ Enregistrer le plugin de permissions personnalisé
        registerPlugin(PermissionsPlugin.class);
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);

        // ✅ Transmettre les résultats au plugin de permissions
        PermissionsPlugin plugin = getPlugin(PermissionsPlugin.class);
        if (plugin != null) {
            plugin.handleActivityResult(requestCode, resultCode, data);
        }
    }
}