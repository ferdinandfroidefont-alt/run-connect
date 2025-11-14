package app.runconnect;

import android.app.Activity;
import android.content.Intent;
import android.os.Bundle;
import android.os.Handler;
import android.widget.ProgressBar;
import android.widget.TextView;

public class SplashActivity extends Activity {
    private static final int SPLASH_DURATION = 1000; // 1 seconde
    private static final int UPDATE_INTERVAL = 10; // Mise à jour toutes les 10ms
    
    private ProgressBar progressBar;
    private TextView progressText;
    private Handler handler = new Handler();
    private int progressStatus = 0;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
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
                // Calculer l'incrément pour atteindre 100% en 1 seconde
                int totalSteps = SPLASH_DURATION / UPDATE_INTERVAL;
                int increment = 100 / totalSteps;
                
                while (progressStatus < 100) {
                    progressStatus += increment;
                    
                    // S'assurer de ne pas dépasser 100
                    if (progressStatus > 100) {
                        progressStatus = 100;
                    }
                    
                    // Mettre à jour l'UI sur le thread principal
                    handler.post(new Runnable() {
                        @Override
                        public void run() {
                            progressBar.setProgress(progressStatus);
                            progressText.setText(progressStatus + "%");
                        }
                    });
                    
                    // Attendre avant la prochaine mise à jour
                    try {
                        Thread.sleep(UPDATE_INTERVAL);
                    } catch (InterruptedException e) {
                        e.printStackTrace();
                    }
                }
                
                // Une fois terminé, lancer MainActivity avec fade
                handler.post(new Runnable() {
                    @Override
                    public void run() {
                        Intent intent = new Intent(SplashActivity.this, MainActivity.class);
                        overridePendingTransition(android.R.anim.fade_in, android.R.anim.fade_out);
                        startActivity(intent);
                        finish();
                    }
                });
            }
        }).start();
    }
}
