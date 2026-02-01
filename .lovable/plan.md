
# Plan : Correction détection native intermittente pour notifications push

## Problème identifié

La fonction `isReallyNative()` dans `src/lib/nativeDetection.ts` ne vérifie **pas** la présence de `AndroidBridge`, qui est pourtant l'indicateur le plus fiable pour détecter l'app Android native.

**Code actuel :**
```typescript
export const isReallyNative = (): boolean => {
  if ((window as any).CapacitorForceNative === true) {
    return true;
  }
  if (Capacitor.isNativePlatform()) {
    return true;
  }
  return false;  // ❌ Pas de vérification AndroidBridge !
};
```

**Problème :** Quand `CapacitorForceNative` n'est pas encore injecté et que `Capacitor.isNativePlatform()` retourne `false` (bug AAB Play Store), la détection échoue même si `AndroidBridge` est disponible.

---

## Solution

Mettre à jour `isReallyNative()` pour inclure la vérification de `AndroidBridge` comme critère supplémentaire, aligné avec la logique déjà présente dans `main.tsx` et `usePushNotifications.tsx`.

### Modification du fichier : `src/lib/nativeDetection.ts`

```typescript
import { Capacitor } from '@capacitor/core';

// ✅ DÉTECTION MULTI-PLATEFORME : Android + iOS
export const isReallyNative = (): boolean => {
  // Flag déjà défini par main.tsx
  if ((window as any).CapacitorForceNative === true) {
    return true;
  }
  
  // Détection Capacitor native (fonctionne pour iOS et Android)
  if (Capacitor.isNativePlatform()) {
    return true;
  }
  
  // ✅ NOUVEAU: Détection AndroidBridge (injecté par MainActivity.java)
  // C'est le critère le plus fiable pour Android WebView
  if (typeof (window as any).AndroidBridge !== 'undefined') {
    console.log('🤖 [NATIVE] AndroidBridge détecté - mode natif confirmé');
    return true;
  }
  
  // ✅ NOUVEAU: Détection via fcmToken injecté (indicateur Android natif)
  if (typeof (window as any).fcmToken !== 'undefined') {
    console.log('🔔 [NATIVE] fcmToken détecté - mode natif confirmé');
    return true;
  }
  
  return false;
};
```

---

## Impact

Cette correction affecte tous les composants qui utilisent `isReallyNative()` :

| Fichier | Utilisation |
|---------|-------------|
| `src/components/ui/use-toast.ts` | Filtrage des toasts sur Android |
| `src/components/ui/sonner.tsx` | Filtrage des toasts Sonner |
| `src/components/ui/enhanced-toast.tsx` | Filtrage des toasts améliorés |
| `src/lib/nativeInit.ts` | Initialisation native |

La correction garantit que même si `CapacitorForceNative` ou `Capacitor.isNativePlatform()` ne sont pas encore prêts, la présence de `AndroidBridge` ou `fcmToken` déclenche correctement le mode natif.

---

## Résumé des modifications

| Fichier | Modification |
|---------|--------------|
| `src/lib/nativeDetection.ts` | Ajouter vérification `AndroidBridge` et `fcmToken` dans `isReallyNative()` |
