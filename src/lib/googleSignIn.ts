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
 * ✅ DÉSACTIVÉ pour les WebView Google Play - utilise OAuth web standard
 */
export const isNativeGoogleSignInAvailable = async (): Promise<boolean> => {
  // ✅ TOUJOURS retourner false pour les WebView
  // Les WebView doivent utiliser OAuth web standard de Supabase
  // Cela évite l'erreur "SHA-1 mismatch" et utilise le flow OAuth déjà configuré
  console.log('🔥 Native Google Sign-In désactivé - utilisation OAuth web');
  return false;
};

/**
 * Lance le processus de connexion Google natif avec timeout de 120s
 * 🔥 CORRECTION #4: Timeout augmenté à 120s
 */
export const googleSignIn = (): Promise<GoogleSignInResult> => {
  return new Promise((resolve, reject) => {
    // Vérification synchrone (l'appel async a déjà été fait avant)
    if (typeof window.AndroidBridge?.googleSignIn !== 'function') {
      reject(new Error('Native Google Sign-In not available'));
      return;
    }

    // Timeout de 120 secondes (2 minutes)
    const timeout = setTimeout(() => {
      window.removeEventListener('googleSignInSuccess', successHandler as any);
      window.removeEventListener('googleSignInError', errorHandler as any);
      console.error('🔥⏱️ Google Sign-In timeout (120s)');
      reject(new Error('Google Sign-In timeout (120s)'));
    }, 120000);

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
