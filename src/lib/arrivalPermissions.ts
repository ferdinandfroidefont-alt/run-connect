import { Capacitor } from "@capacitor/core";
import { Geolocation } from "@capacitor/geolocation";
import { PushNotifications } from "@capacitor/push-notifications";
import type { ArrivalPermissionOutcome } from "@/lib/arrivalFlowStorage";

/**
 * Demande la localisation « when in use » après un écran explicatif in-app.
 * Web : déclenche la demande navigateur via getCurrentPosition.
 */
export async function requestArrivalGeolocationPermission(): Promise<ArrivalPermissionOutcome> {
  try {
    if (Capacitor.isNativePlatform()) {
      const { location } = await Geolocation.requestPermissions();
      if (location === "granted") return "granted";
      if (location === "denied") return "denied";
      return "denied";
    }

    if (!navigator.geolocation) return "unavailable";

    await new Promise<void>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        () => resolve(),
        (err) => reject(err),
        { enableHighAccuracy: false, maximumAge: 120_000, timeout: 20_000 }
      );
    });
    return "granted";
  } catch (e: unknown) {
    const err = e as { code?: number };
    if (typeof err?.code === "number" && err.code === 1) return "denied";
    return "denied";
  }
}

/**
 * Demande les notifications push après écran explicatif.
 * Web : Notification API si disponible.
 */
export async function requestArrivalNotificationPermission(): Promise<ArrivalPermissionOutcome> {
  try {
    if (Capacitor.isNativePlatform()) {
      const res = await PushNotifications.requestPermissions();
      if (res.receive === "granted") {
        try {
          await PushNotifications.register();
        } catch {
          /* register peut échouer sans bloquer l’état permission */
        }
        return "granted";
      }
      if (res.receive === "denied") return "denied";
      return "denied";
    }

    if (typeof window === "undefined" || !("Notification" in window)) {
      return "unavailable";
    }

    const current = Notification.permission;
    if (current === "granted") return "granted";
    if (current === "denied") return "denied";

    const next = await Notification.requestPermission();
    if (next === "granted") return "granted";
    if (next === "denied") return "denied";
    return "denied";
  } catch {
    return "denied";
  }
}
