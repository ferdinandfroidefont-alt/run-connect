package app.runconnect;

import android.app.Activity;
import android.content.Intent;
import android.os.Bundle;
import android.os.Handler;

public class SplashActivity extends Activity {
    private static final int SPLASH_DURATION = 1000; // 1 seconde

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // Lancer la transition après 1 seconde
        new Handler().postDelayed(new Runnable() {
            @Override
            public void run() {
                // Créer l'intent pour MainActivity
                Intent intent = new Intent(SplashActivity.this, MainActivity.class);
                
                // Animation de fade
                overridePendingTransition(android.R.anim.fade_in, android.R.anim.fade_out);
                
                startActivity(intent);
                finish(); // Fermer SplashActivity
            }
        }, SPLASH_DURATION);
    }
}
