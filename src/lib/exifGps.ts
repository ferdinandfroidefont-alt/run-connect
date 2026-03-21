import exifr from 'exifr';

/**
 * Lit les coordonnées GPS EXIF d’un fichier image (JPEG / HEIC / WebP selon support navigateur + exifr).
 */
export async function extractGpsFromImageFile(file: File): Promise<{ lat: number; lng: number } | null> {
  try {
    const gps = await exifr.gps(file);
    if (gps == null || typeof gps !== 'object') return null;
    const lat = (gps as { latitude?: number }).latitude;
    const lng = (gps as { longitude?: number }).longitude;
    if (typeof lat !== 'number' || typeof lng !== 'number' || Number.isNaN(lat) || Number.isNaN(lng)) {
      return null;
    }
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
    return { lat, lng };
  } catch {
    return null;
  }
}
