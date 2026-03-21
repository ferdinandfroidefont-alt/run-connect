import { Capacitor } from "@capacitor/core";
import { useLayoutEffect, useState } from "react";

/**
 * True uniquement sur iPhone / iPod (app Capacitor iOS ou Safari mobile).
 * Exclut iPad, Android et desktop pour ne pas modifier leur layout.
 */
function checkIsIosPhone(): boolean {
  if (typeof window === "undefined") return false;
  const ua = navigator.userAgent || "";
  const isPad =
    /iPad/.test(ua) ||
    (navigator.platform === "MacIntel" &&
      Number((navigator as Navigator & { maxTouchPoints?: number }).maxTouchPoints) > 1);
  if (isPad) return false;
  try {
    if (Capacitor.getPlatform() === "ios") return true;
  } catch {
    /* Capacitor non chargé (web pur) */
  }
  return /iPhone|iPod/.test(ua);
}

export function useIsIosPhoneLayout(): boolean {
  const [value, setValue] = useState(false);
  useLayoutEffect(() => {
    setValue(checkIsIosPhone());
  }, []);
  return value;
}
