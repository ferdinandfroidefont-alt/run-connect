/**
 * Encodage polyline (algorithme Google) pour l'API Mapbox Static Images (overlay path).
 * Entrée : points { lat, lng }.
 */
export function encodePolyline(points: Array<{ lat: number; lng: number }>): string {
  if (!points.length) return '';

  const encodeSigned = (num: number) => {
    let sgn = num << 1;
    if (num < 0) sgn = ~sgn;
    let out = '';
    while (sgn >= 0x20) {
      out += String.fromCharCode((0x20 | (sgn & 0x1f)) + 63);
      sgn >>= 5;
    }
    out += String.fromCharCode(sgn + 63);
    return out;
  };

  let lastLat = 0;
  let lastLng = 0;
  let result = '';

  for (const p of points) {
    const lat = Math.round(p.lat * 1e5);
    const lng = Math.round(p.lng * 1e5);
    const dLat = lat - lastLat;
    const dLng = lng - lastLng;
    lastLat = lat;
    lastLng = lng;
    result += encodeSigned(dLat) + encodeSigned(dLng);
  }

  return result;
}
