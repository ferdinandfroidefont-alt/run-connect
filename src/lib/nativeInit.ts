import { isReallyNative } from './nativeDetection';
import { useState, useEffect } from 'react';

// SYSTÈME D'INITIALISATION NATIVE SIMPLIFIÉ
class NativeManager {
  private static instance: NativeManager;
  private isNativeConfirmed: boolean | null = null;
  private initPromise: Promise<boolean> | null = null;

  private constructor() {}

  public static getInstance(): NativeManager {
    if (!NativeManager.instance) {
      NativeManager.instance = new NativeManager();
    }
    return NativeManager.instance;
  }

  public async ensureNativeStatus(): Promise<boolean> {
    // Si déjà déterminé, retourner immédiatement
    if (this.isNativeConfirmed !== null) {
      return this.isNativeConfirmed;
    }

    // Si init en cours, attendre
    if (this.initPromise) {
      return this.initPromise;
    }

    // Démarrer l'init
    this.initPromise = this.performNativeDetection();
    return this.initPromise;
  }

  private async performNativeDetection(): Promise<boolean> {
    console.log('🎯 INITIALISATION NATIVE SIMPLIFIÉE...');

    try {
      // Attendre un peu que Capacitor soit prêt
      await new Promise(resolve => setTimeout(resolve, 200));

      const isNative = isReallyNative();
      this.isNativeConfirmed = isNative;
      
      if (isNative) {
        (window as any).CapacitorForceNative = true;
        console.log('🎯✅ MODE NATIF CONFIRMÉ');
      } else {
        console.log('🎯ℹ️ MODE WEB CONFIRMÉ');
      }

      return isNative;
    } catch (error) {
      console.error('❌ Erreur init native:', error);
      // En cas d'erreur, assume web mais permettre retry
      this.isNativeConfirmed = false;
      return false;
    }
  }

  public getNativeStatus(): boolean | null {
    return this.isNativeConfirmed;
  }

  public forceNativeMode(): void {
    console.log('🎯🔧 FORCE MODE NATIF');
    this.isNativeConfirmed = true;
    (window as any).CapacitorForceNative = true;
  }

  public reset(): void {
    console.log('🎯🔄 RESET NATIVE MANAGER');
    this.isNativeConfirmed = null;
    this.initPromise = null;
  }
}

export const nativeManager = NativeManager.getInstance();

// Hook utilitaire simplifié
export const useNativeStatus = () => {
  const [isNative, setIsNative] = useState<boolean | null>(null);
  
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const native = await nativeManager.ensureNativeStatus();
        setIsNative(native);
      } catch (error) {
        console.error('❌ Erreur useNativeStatus:', error);
        setIsNative(false);
      }
    };
    
    checkStatus();
  }, []);
  
  return isNative;
};