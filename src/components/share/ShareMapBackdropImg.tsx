import { useEffect, useState } from 'react';
import { SHARE_MAP_FALLBACK_URL } from '@/lib/shareMapFallbackUrl';

type Props = {
  mapUrl: string | null | undefined;
  className?: string;
  style?: React.CSSProperties;
};

/**
 * Fond carte pour artboards : URL Mapbox si dispo, sinon SVG bundlé (Vite).
 * Repli automatique si l’URL externe échoue (token, réseau, CORS).
 */
export function ShareMapBackdropImg({ mapUrl, className, style }: Props) {
  const primary = mapUrl?.trim() ?? '';
  const [src, setSrc] = useState(() => (primary ? primary : SHARE_MAP_FALLBACK_URL));

  useEffect(() => {
    setSrc(primary ? primary : SHARE_MAP_FALLBACK_URL);
  }, [primary]);

  const isMapbox = src.startsWith('https://api.mapbox.com');

  return (
    <img
      src={src}
      alt=""
      draggable={false}
      {...(isMapbox ? { crossOrigin: 'anonymous' as const } : {})}
      onError={(e) => {
        console.warn('[ShareMapBackdropImg] image load failed →', (e.currentTarget as HTMLImageElement).src);
        setSrc((current) => (current === SHARE_MAP_FALLBACK_URL ? current : SHARE_MAP_FALLBACK_URL));
      }}
      onLoad={() => {
        if (src.startsWith('https://api.mapbox.com')) {
          console.info('[ShareMapBackdropImg] Mapbox image loaded ✓');
        }
      }}
      className={className}
      style={style}
    />
  );
}
