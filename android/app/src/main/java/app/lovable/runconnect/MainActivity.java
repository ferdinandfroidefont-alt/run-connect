package app.lovable.runconnect;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // Enregistrer le plugin de permissions personnalisé
        registerPlugin(PermissionsPlugin.class);
    }
}