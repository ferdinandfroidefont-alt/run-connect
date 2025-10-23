/**
 * 🔥 Google Sign-In via AndroidBridge (natif)
 */

export interface GoogleSignInResult {
  idToken: string;
  email: string;
  displayName: string;
}

declare global {
  interface Window {
    AndroidBridge?: {
      googleSignIn: () => void;
      googleSignOut: () => void;
    };
  }
}

export const googleSignIn = (): Promise<GoogleSignInResult> => {
  return new Promise((resolve, reject) => {
    if (!window.AndroidBridge?.googleSignIn) {
      reject(new Error('AndroidBridge not available'));
      return;
    }

    const successHandler = (event: CustomEvent<GoogleSignInResult>) => {
      window.removeEventListener('googleSignInSuccess', successHandler as any);
      window.removeEventListener('googleSignInError', errorHandler as any);
      resolve(event.detail);
    };

    const errorHandler = (event: CustomEvent<string>) => {
      window.removeEventListener('googleSignInSuccess', successHandler as any);
      window.removeEventListener('googleSignInError', errorHandler as any);
      reject(new Error(event.detail));
    };

    window.addEventListener('googleSignInSuccess', successHandler as any);
    window.addEventListener('googleSignInError', errorHandler as any);

    window.AndroidBridge.googleSignIn();
  });
};

export const googleSignOut = (): Promise<void> => {
  return new Promise((resolve) => {
    if (!window.AndroidBridge?.googleSignOut) {
      resolve();
      return;
    }

    window.AndroidBridge.googleSignOut();
    resolve();
  });
};
