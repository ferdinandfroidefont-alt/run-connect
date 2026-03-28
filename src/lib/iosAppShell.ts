/** iPhone / iPad / iPadOS desktop class — WebKit app shell (pas les barres système, seulement le cadran UI). */
export function isIosAppShell(): boolean {
  if (typeof navigator === "undefined") return false;
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}
