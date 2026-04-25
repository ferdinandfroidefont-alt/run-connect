/**
 * URL avatar en meilleure résolution possible pour l’aperçu plein écran
 * (retire des paramètres de redimensionnement courants sur CDN / stockage).
 */
export function getProfileAvatarDisplayUrl(url: string | null | undefined): string {
  if (!url?.trim()) return "";
  const t = url.trim();
  if (!/^https?:\/\//i.test(t) && !t.startsWith("blob:")) return t;
  try {
    const u = new URL(t);
    const strip = [
      "width",
      "height",
      "w",
      "h",
      "resize",
      "quality",
      "q",
      "format",
      "f",
      "dpr",
    ];
    for (const k of strip) u.searchParams.delete(k);
    return u.toString();
  } catch {
    return t;
  }
}
