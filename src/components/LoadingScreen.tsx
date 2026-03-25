import { useState, useEffect, type CSSProperties } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  RUCONNECT_SPLASH_BLUE,
  RUCONNECT_SPLASH_ICON_URL,
  applyRuconnectSplashNativeChrome,
  applyRuconnectSplashWebChrome,
  restoreChromeAfterRuconnectSplash,
} from '@/lib/ruconnectSplashChrome';

interface LoadingScreenProps {
  onLoadingComplete: () => void;
}

export const LoadingScreen = ({ onLoadingComplete }: LoadingScreenProps) => {
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    applyRuconnectSplashWebChrome();
    void applyRuconnectSplashNativeChrome();

    let afterSplashApplied = false;
    const restoreAfterSplash = async () => {
      if (afterSplashApplied) return;
      afterSplashApplied = true;
      await restoreChromeAfterRuconnectSplash();
    };

    const exitTimer = setTimeout(() => setExiting(true), 1800);
    const completeTimer = setTimeout(onLoadingComplete, 2200);

    return () => {
      clearTimeout(exitTimer);
      clearTimeout(completeTimer);
      document.documentElement.style.removeProperty('background-color');
      document.body.style.removeProperty('background-color');
      void restoreAfterSplash();
    };
  }, [onLoadingComplete]);

  const splashLayerStyle: CSSProperties = {
    backgroundColor: RUCONNECT_SPLASH_BLUE,
  };

  /** Logo carré : borné par la hauteur d’écran (iPhone petits / grands) + largeur — présence premium stable */
  const logoBoxStyle: CSSProperties = {
    // Objectif: ~35-45% de la hauteur écran (sans déformation), avec bornes pour iPhone
    width: 'clamp(10rem, min(72vw, 40dvh), 19rem)',
    height: 'clamp(10rem, min(72vw, 40dvh), 19rem)',
    maxWidth: 'min(84vw, 19rem)',
    maxHeight: 'min(84vw, 19rem)',
  };

  /** Texte proportionné au bloc logo (même logique vmin / dvh) */
  const titleStyle: CSSProperties = {
    // Légère montée en taille pour mieux remplir l'écran
    fontSize: 'clamp(1.25rem, min(5.1vw, 3.9dvh), 1.95rem)',
    // Rapprocher optiquement le titre du logo
    marginTop: 'clamp(0.25rem, min(1.2dvh, 0.6rem), 0.6rem)',
    letterSpacing: '-0.02em',
  };

  return (
    <AnimatePresence>
      {!exiting ? (
        <motion.div
          key="splash"
          className="fixed inset-0 z-[100] flex min-h-0 flex-col overflow-hidden"
          style={splashLayerStyle}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.38, ease: [0.32, 0.72, 0, 1] }}
        >
          {/* Un seul fond bleu (pas de 2e calque coloré = pas de zone « carte » perceptible) */}
          <div
            className="flex min-h-0 min-w-0 flex-1 flex-col items-center justify-center px-5"
            style={{
              paddingTop: 'env(safe-area-inset-top, 0px)',
              paddingBottom: 'env(safe-area-inset-bottom, 0px)',
            }}
          >
            {/* Remontée optique : le centre géométrique paraît bas à cause du safe-area / indicateur d’accueil */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                type: 'spring',
                stiffness: 300,
                damping: 30,
                mass: 0.85,
              }}
              className="flex flex-col items-center"
            >
              {/* Calque statique : centrage optique (FM contrôle seul le transform du parent) */}
              <div
                className="flex flex-col items-center"
                style={{
                  // Ajustement "centrage optique" (pas seulement centré techniquement)
                  transform: 'translateY(calc(-1 * min(2.85dvh, 1.2rem)))',
                }}
              >
                <img
                  src={RUCONNECT_SPLASH_ICON_URL}
                  alt=""
                  draggable={false}
                  className="block shrink-0 select-none object-contain"
                  style={logoBoxStyle}
                />
                <motion.p
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    delay: 0.06,
                    type: 'spring',
                    stiffness: 340,
                    damping: 32,
                  }}
                  className="text-center font-semibold text-white"
                  style={titleStyle}
                >
                  RunConnect
                </motion.p>
              </div>
            </motion.div>
          </div>
        </motion.div>
      ) : (
        <motion.div
          key="splash-exit"
          className="pointer-events-none fixed inset-0 z-[100]"
          style={{ backgroundColor: RUCONNECT_SPLASH_BLUE }}
          initial={{ opacity: 1 }}
          animate={{ opacity: 0 }}
          transition={{ duration: 0.35, ease: [0.32, 0.72, 0, 1] }}
        />
      )}
    </AnimatePresence>
  );
};
