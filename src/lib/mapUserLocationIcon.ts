/**
 * Icône carte « position utilisateur » alignée sur InteractiveMap (point bleu + halo).
 * Retourne une data URL PNG pour google.maps.Marker.icon.url
 */
export function createUserLocationMapIconDataUrl(): string {
  const size = 60;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  const gradient = ctx.createRadialGradient(size / 2, size / 2, 5, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, 'rgba(59, 130, 246, 0.6)');
  gradient.addColorStop(0.5, 'rgba(59, 130, 246, 0.3)');
  gradient.addColorStop(1, 'rgba(59, 130, 246, 0)');

  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2, 0, 2 * Math.PI);
  ctx.fill();

  ctx.fillStyle = '#3b82f6';
  ctx.shadowColor = 'rgba(59, 130, 246, 0.8)';
  ctx.shadowBlur = 10;
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, 8, 0, 2 * Math.PI);
  ctx.fill();

  ctx.strokeStyle = 'white';
  ctx.lineWidth = 3;
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, 8, 0, 2 * Math.PI);
  ctx.stroke();

  return canvas.toDataURL('image/png');
}

/** Options Marker identiques à InteractiveMap (hors animation de pulsation). Appeler après chargement de l’API Maps. */
export function getUserLocationMarkerIcon(): {
  url: string;
  scaledSize: google.maps.Size;
  anchor: google.maps.Point;
} {
  return {
    url: createUserLocationMapIconDataUrl(),
    scaledSize: new google.maps.Size(60, 60),
    anchor: new google.maps.Point(30, 30),
  };
}
