package app.runconnect;

import android.app.Activity;
import android.content.Intent;
import android.os.Bundle;
import android.os.Handler;
import android.widget.ProgressBar;
import android.widget.TextView;

public class SplashActivity extends Activity {
    private static final int SPLASH_DURATION = 2500; // 2,5 secondes
    private static final int UPDATE_INTERVAL = 10; // Mise à jour toutes les 10ms
    
    private ProgressBar progressBar;
    private TextView progressText;
    private Handler handler = new Handler();
    private int progressStatus = 0;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // 🎯 FULLSCREEN IMMERSIF (masquer status bar + navigation bar)
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.R) {
            // Android 11+ (API 30+)
            getWindow().setDecorFitsSystemWindows(false);
            getWindow().getInsetsController().hide(
                android.view.WindowInsets.Type.statusBars() | 
                android.view.WindowInsets.Type.navigationBars()
            );
            getWindow().getInsetsController().setSystemBarsBehavior(
                android.view.WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
            );
        } else {
            // Android 10 et inférieur
            getWindow().getDecorView().setSystemUiVisibility(
                android.view.View.SYSTEM_UI_FLAG_FULLSCREEN |
                android.view.View.SYSTEM_UI_FLAG_HIDE_NAVIGATION |
                android.view.View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY |
                android.view.View.SYSTEM_UI_FLAG_LAYOUT_STABLE |
                android.view.View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN |
                android.view.View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
            );
        }
        
        // Charger le layout
        setContentView(R.layout.activity_splash);
        
        // Récupérer les vues
        progressBar = findViewById(R.id.progress_bar);
        progressText = findViewById(R.id.progress_text);
        
        // Démarrer l'animation de la barre de progression
        startProgressAnimation();
    }
    
    private void startProgressAnimation() {
        new Thread(new Runnable() {
            @Override
            public void run() {
                int totalSteps = SPLASH_DURATION / UPDATE_INTERVAL;
                int increment = 100 / totalSteps;
                
                while (progressStatus < 100) {
                    progressStatus += increment;
                    
                    if (progressStatus > 100) {
                        progressStatus = 100;
                    }
                    
                    // ✅ Utiliser final pour accès depuis inner class
                    final int currentProgress = progressStatus;
                    
                    handler.post(new Runnable() {
                        @Override
                        public void run() {
                            try {
                                progressBar.setProgress(currentProgress);
                                progressText.setText(currentProgress + "%");
                            } catch (Exception e) {
                                android.util.Log.e("SplashActivity", "Erreur update progress: " + e.getMessage());
                            }
                        }
                    });
                    
                    try {
                        Thread.sleep(UPDATE_INTERVAL);
                    } catch (InterruptedException e) {
                        android.util.Log.e("SplashActivity", "Thread interrompu", e);
                        break;
                    }
                }
                
                // Attendre 300ms après 100%
                try {
                    Thread.sleep(300);
                } catch (InterruptedException e) {
                    e.printStackTrace();
                }
                
                // Lancer MainActivity
                handler.post(new Runnable() {
                    @Override
                    public void run() {
                        Intent intent = new Intent(SplashActivity.this, MainActivity.class);
                        startActivity(intent);
                        overridePendingTransition(android.R.anim.fade_in, android.R.anim.fade_out);
                        finish();
                    }
                });
            }
        }).start();
    }
}
