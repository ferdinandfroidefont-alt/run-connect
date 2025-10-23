/**
 * 🔥 Google Sign-In Native Helper
 * Utilise AndroidBridge pour l'authentification Google native sur Android
 */

export interface GoogleSignInResult {
  idToken: string;
  email: string;
  displayName: string;
}

/**
 * Vérifie si Google Sign-In natif est disponible (attend max 3s que AndroidBridge soit chargé)
 */
export const isNativeGoogleSignInAvailable = async (): Promise<boolean> => {
  if (typeof window === 'undefined') return false;
  
  // Attendre max 3 secondes que AndroidBridge soit chargé
  for (let i = 0; i < 30; i++) {
    if (typeof window.AndroidBridge?.googleSignIn === 'function') {
      console.log('🔥 AndroidBridge.googleSignIn détecté après', i * 100, 'ms');
      return true;
    }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  console.log('🔥 AndroidBridge.googleSignIn NON disponible après 3s');
  return false;
};

/**
 * Lance le processus de connexion Google natif avec timeout de 60s
 */
export const googleSignIn = (): Promise<GoogleSignInResult> => {
  return new Promise((resolve, reject) => {
    // Vérification synchrone (l'appel async a déjà été fait avant)
    if (typeof window.AndroidBridge?.googleSignIn !== 'function') {
      reject(new Error('Native Google Sign-In not available'));
      return;
    }

    // Timeout de 60 secondes
    const timeout = setTimeout(() => {
      window.removeEventListener('googleSignInSuccess', successHandler as any);
      window.removeEventListener('googleSignInError', errorHandler as any);
      console.error('🔥⏱️ Google Sign-In timeout (60s)');
      reject(new Error('Google Sign-In timeout (60s)'));
    }, 60000);

    const successHandler = (event: CustomEvent<GoogleSignInResult>) => {
      clearTimeout(timeout);
      window.removeEventListener('googleSignInSuccess', successHandler as any);
      window.removeEventListener('googleSignInError', errorHandler as any);
      console.log('🔥✅ Google Sign-In success:', event.detail);
      resolve(event.detail);
    };

    const errorHandler = (event: CustomEvent<string>) => {
      clearTimeout(timeout);
      window.removeEventListener('googleSignInSuccess', successHandler as any);
      window.removeEventListener('googleSignInError', errorHandler as any);
      console.error('🔥❌ Google Sign-In error:', event.detail);
      reject(new Error(event.detail));
    };

    window.addEventListener('googleSignInSuccess', successHandler as any);
    window.addEventListener('googleSignInError', errorHandler as any);

    console.log('🔥 Calling AndroidBridge.googleSignIn()');
    window.AndroidBridge!.googleSignIn();
  });
};

/**
 * Déconnexion Google
 */
export const googleSignOut = async (): Promise<void> => {
  const available = await isNativeGoogleSignInAvailable();
  if (!available) {
    console.log('🔥 Native Google Sign-Out not available, skipping');
    return;
  }

  return new Promise((resolve) => {
    const successHandler = () => {
      window.removeEventListener('googleSignOutSuccess', successHandler);
      console.log('🔥✅ Google Sign-Out success');
      resolve();
    };

    window.addEventListener('googleSignOutSuccess', successHandler);
    
    console.log('🔥 Calling AndroidBridge.googleSignOut()');
    window.AndroidBridge!.googleSignOut();
    
    // Timeout de sécurité
    setTimeout(() => {
      window.removeEventListener('googleSignOutSuccess', successHandler);
      resolve();
    }, 2000);
  });
};
