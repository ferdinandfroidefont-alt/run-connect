import { isReallyNative } from './nativeDetection';

// SYSTÈME D'INITIALISATION NATIVE GLOBAL
class NativeManager {
  private static instance: NativeManager;
  private isNativeConfirmed: boolean | null = null;
  private initPromise: Promise<boolean> | null = null;
  private listeners: ((isNative: boolean) => void)[] = [];

  private constructor() {}

  public static getInstance(): NativeManager {
    if (!NativeManager.instance) {
      NativeManager.instance = new NativeManager();
    }
    return NativeManager.instance;
  }

  public async ensureNativeStatus(): Promise<boolean> {
    if (this.isNativeConfirmed !== null) {
      return this.isNativeConfirmed;
    }

    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = this.performNativeDetection();
    return this.initPromise;
  }

  private async performNativeDetection(): Promise<boolean> {
    console.log('🎯 INITIALISATION DÉTECTION NATIVE GLOBALE...');

    // Attendre un peu que tout soit chargé
    await new Promise(resolve => setTimeout(resolve, 200));

    const isNative = isReallyNative();
    
    this.isNativeConfirmed = isNative;
    
    if (isNative) {
      // Définir le flag global
      (window as any).CapacitorForceNative = true;
      console.log('🎯✅ STATUT NATIF CONFIRMÉ GLOBALEMENT');
    } else {
      console.log('🎯ℹ️ STATUT WEB CONFIRMÉ GLOBALEMENT');
    }

    // Notifier tous les listeners
    this.listeners.forEach(listener => {
      try {
        listener(isNative);
      } catch (error) {
        console.error('Erreur listener native status:', error);
      }
    });

    return isNative;
  }

  public onNativeStatusReady(callback: (isNative: boolean) => void): void {
    if (this.isNativeConfirmed !== null) {
      callback(this.isNativeConfirmed);
    } else {
      this.listeners.push(callback);
    }
  }

  public getNativeStatus(): boolean | null {
    return this.isNativeConfirmed;
  }

  public forceNativeMode(): void {
    console.log('🎯🔧 FORCE MODE NATIF DEMANDÉ');
    this.isNativeConfirmed = true;
    (window as any).CapacitorForceNative = true;
    
    this.listeners.forEach(listener => {
      try {
        listener(true);
      } catch (error) {
        console.error('Erreur listener force native:', error);
      }
    });
  }
}

export const nativeManager = NativeManager.getInstance();

// Hook utilitaire pour les composants
export const useNativeStatus = () => {
  const [isNative, setIsNative] = useState<boolean | null>(null);
  
  useEffect(() => {
    const checkStatus = async () => {
      const native = await nativeManager.ensureNativeStatus();
      setIsNative(native);
    };
    
    checkStatus();
    
    // Écouter les changements
    nativeManager.onNativeStatusReady(setIsNative);
  }, []);
  
  return isNative;
};

// Import React pour le hook
import { useState, useEffect } from 'react';