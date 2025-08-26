export interface GPXTrackPoint {
  lat: number;
  lng: number;
  elevation?: number;
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

export const downloadGPXFile = (filename: string, gpxContent: string) => {
  const blob = new Blob([gpxContent], { type: 'application/gpx+xml' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.gpx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
};