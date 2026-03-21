/**
 * Approximation lat/lng depuis un point écran sur la carte (vue 2D, non inclinée).
 * Utilisé pour l’appui long tactile lorsque l’événement Maps ne fournit pas latLng.
 */
export function clientXYToLatLng(
  map: google.maps.Map,
  clientX: number,
  clientY: number
): google.maps.LatLng | null {
  const bounds = map.getBounds();
  if (!bounds) return null;
  const div = map.getDiv();
  const rect = div.getBoundingClientRect();
  const nx = (clientX - rect.left) / rect.width;
  const ny = (clientY - rect.top) / rect.height;
  if (nx < 0 || nx > 1 || ny < 0 || ny > 1) return null;
  const ne = bounds.getNorthEast();
  const sw = bounds.getSouthWest();
  const lat = ne.lat() - ny * (ne.lat() - sw.lat());
  const lng = sw.lng() + nx * (ne.lng() - sw.lng());
  return new google.maps.LatLng(lat, lng);
}
