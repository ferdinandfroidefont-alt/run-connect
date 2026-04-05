import { useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { AdMob } from "@capacitor-community/admob";

/**
 * Native-only AdMob bootstrap. Safe no-op on web.
 */
export const AdMobInitializer = () => {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    void (async () => {
      try {
        await AdMob.initialize();
        const tracking = await AdMob.trackingAuthorizationStatus();
        if (Capacitor.getPlatform() === "ios" && tracking.status === "notDetermined") {
          await AdMob.requestTrackingAuthorization();
        }
        const consentInfo = await AdMob.requestConsentInfo();
        if (!consentInfo.canRequestAds && consentInfo.isConsentFormAvailable) {
          await AdMob.showConsentForm();
        }
      } catch (error) {
        console.warn("[AdMob] initialization skipped:", error);
      }
    })();
  }, []);

  return null;
};
