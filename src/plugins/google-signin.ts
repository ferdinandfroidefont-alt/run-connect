import { registerPlugin } from '@capacitor/core';

export interface GoogleSignInPlugin {
  /**
   * Open native Google Sign-In dialog and return the ID token
   */
  signIn(): Promise<{ 
    idToken: string; 
    email: string;
    displayName: string;
  }>;
  
  /**
   * Sign out from Google account
   */
  signOut(): Promise<void>;
}

const GoogleSignIn = registerPlugin<GoogleSignInPlugin>('GoogleSignIn');

export default GoogleSignIn;
