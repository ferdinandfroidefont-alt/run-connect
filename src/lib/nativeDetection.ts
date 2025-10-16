// ✅ DÉTECTION ULTRA-SIMPLIFIÉE : Le flag a été défini de façon synchrone dans main.tsx
export const isReallyNative = (): boolean => {
  return (window as any).CapacitorForceNative === true;
};

export const waitForCapacitorAndDetect = async (maxWait: number = 2000): Promise<boolean> => {
  return isReallyNative();
};