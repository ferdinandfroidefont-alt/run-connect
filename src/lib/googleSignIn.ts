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
 * Vérifie si Google Sign-In natif est disponible
 */
export const isNativeGoogleSignInAvailable = (): boolean => {
  return typeof window !== 'undefined' && 
         typeof window.AndroidBridge?.googleSignIn === 'function';
};

/**
 * Lance le processus de connexion Google natif
 */
export const googleSignIn = (): Promise<GoogleSignInResult> => {
  return new Promise((resolve, reject) => {
    if (!isNativeGoogleSignInAvailable()) {
      reject(new Error('Native Google Sign-In not available'));
      return;
    }

    const successHandler = (event: CustomEvent<GoogleSignInResult>) => {
      window.removeEventListener('googleSignInSuccess', successHandler as any);
      window.removeEventListener('googleSignInError', errorHandler as any);
      console.log('🔥✅ Google Sign-In success:', event.detail);
      resolve(event.detail);
    };

    const errorHandler = (event: CustomEvent<string>) => {
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
  if (!isNativeGoogleSignInAvailable()) {
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
