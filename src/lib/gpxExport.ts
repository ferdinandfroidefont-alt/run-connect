import { Capacitor } from '@capacitor/core';

export interface GPXTrackPoint {
  lat: number;
  lng: number;
  elevation?: number;
}

/** Nom de fichier sûr (sans extension .gpx). */
export function sanitizeGpxFilename(routeName: string): string {
  const s = routeName
    .replace(/[^a-z0-9._-]/gi, '_')
    .replace(/_+/g, '_')
    .replace(/^[_.]+|[_.]+$/g, '')
    .toLowerCase()
    .slice(0, 80);
  return s.trim() || 'itineraire';
}

export const exportToGPX = (
  routeName: string,
  coordinates: GPXTrackPoint[],
  description?: string
): string => {
  const formatCoordinate = (coord: number) => coord.toFixed(6);

  const trackPoints = coordinates.map(point => {
    const elevationAttr = point.elevation !== undefined
      ? `\n        <ele>${point.elevation.toFixed(1)}</ele>`
      : '';

    return `      <trkpt lat="${formatCoordinate(point.lat)}" lon="${formatCoordinate(point.lng)}">${elevationAttr}
      </trkpt>`;
  }).join('\n');

  const gpxContent = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="SportConnect" 
     xsi:schemaLocation="http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd"
     xmlns="http://www.topografix.com/GPX/1/1" 
     xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <metadata>
    <name>${escapeXml(routeName)}</name>
    <desc>${escapeXml(description || 'Itinéraire exporté depuis SportConnect')}</desc>
    <time>${new Date().toISOString()}</time>
  </metadata>
  <trk>
    <name>${escapeXml(routeName)}</name>
    <desc>${escapeXml(description || '')}</desc>
    <trkseg>
${trackPoints}
    </trkseg>
  </trk>
</gpx>`;

  return gpxContent;
};

const escapeXml = (text: string): string => {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};

/** Téléchargement navigateur (desktop / secours). `filename` = base sans `.gpx`. */
export const downloadGPXFile = (filename: string, gpxContent: string) => {
  const blob = new Blob([gpxContent], { type: 'application/gpx+xml' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = `${sanitizeGpxFilename(filename)}.gpx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
};

function isLikelyMobileBrowser(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent || '');
}

function isUserCancelledShare(error: unknown): boolean {
  if (error instanceof DOMException && error.name === 'AbortError') return true;
  if (error && typeof error === 'object' && 'name' in error && (error as { name: string }).name === 'AbortError') {
    return true;
  }
  return false;
}

async function shareGpxViaCapacitor(filenameBase: string, gpxContent: string, title: string): Promise<void> {
  const { Filesystem, Directory, Encoding } = await import('@capacitor/filesystem');
  const { Share } = await import('@capacitor/share');

  const safe = sanitizeGpxFilename(filenameBase);
  const path = `runconnect_gpx_${Date.now()}_${safe}.gpx`;

  await Filesystem.writeFile({
    path,
    data: gpxContent,
    directory: Directory.Cache,
    encoding: Encoding.UTF8,
  });

  const { uri } = await Filesystem.getUri({
    path,
    directory: Directory.Cache,
  });

  await Share.share({
    title: title || 'Itinéraire GPX',
    text: 'Trace GPX RunConnect — enregistrer dans Fichiers ou partager.',
    files: [uri],
  });
}

async function shareGpxViaWebShareApi(filenameBase: string, gpxContent: string, title: string): Promise<boolean> {
  if (typeof navigator === 'undefined' || typeof File === 'undefined' || !navigator.share) {
    return false;
  }

  const name = `${sanitizeGpxFilename(filenameBase)}.gpx`;
  const file = new File([gpxContent], name, { type: 'application/gpx+xml' });

  const payload: ShareData = {
    title: title || 'Itinéraire GPX',
    text: 'Trace GPX',
    files: [file],
  };

  if (navigator.canShare && !navigator.canShare({ files: [file] })) {
    return false;
  }

  try {
    await navigator.share(payload);
    return true;
  } catch (e: unknown) {
    if (isUserCancelledShare(e)) return true;
    return false;
  }
}

/**
 * Mobile natif (Capacitor) : écriture cache + feuille de partage système (Fichiers, apps, etc.).
 * Mobile Safari / Chrome : Web Share API avec `File` si disponible.
 * Sinon : téléchargement classique (desktop principalement).
 */
export async function shareOrDownloadGPX(
  filenameBase: string,
  gpxContent: string,
  options?: { title?: string }
): Promise<void> {
  const title = options?.title?.trim() || 'Itinéraire GPX';

  if (Capacitor.isNativePlatform()) {
    try {
      await shareGpxViaCapacitor(filenameBase, gpxContent, title);
    } catch (e: unknown) {
      if (isUserCancelledShare(e)) return;
      console.warn('[gpxExport] Partage natif échoué, téléchargement de secours', e);
      downloadGPXFile(filenameBase, gpxContent);
    }
    return;
  }

  if (isLikelyMobileBrowser()) {
    const shared = await shareGpxViaWebShareApi(filenameBase, gpxContent, title);
    if (shared) return;
  }

  downloadGPXFile(filenameBase, gpxContent);
}
