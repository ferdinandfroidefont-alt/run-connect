/**
 * Generates a custom RunConnect map marker as SVG string
 * with pin shape, gradient, glow effect, and circular profile photo
 */
export const generateRunConnectMarkerSVG = (
  profileImageUrl: string,
  size: number = 48
): string => {
  const height = size * 1.25; // Pin ratio 4:5 (48x60px)
  const photoRadius = size / 4;
  const photoCenterY = height * 0.28;
  
  return `
    <svg width="${size}" height="${height}" viewBox="0 0 ${size} ${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <!-- RunConnect gradient: deep blue to light blue -->
        <linearGradient id="pinGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:hsl(217, 91%, 65%);stop-opacity:1" />
          <stop offset="100%" style="stop-color:hsl(195, 100%, 70%);stop-opacity:1" />
        </linearGradient>
        
        <!-- Modern drop shadow effect -->
        <filter id="dropShadow">
          <feGaussianBlur in="SourceAlpha" stdDeviation="2"/>
          <feOffset dx="0" dy="2" result="offsetblur"/>
          <feComponentTransfer>
            <feFuncA type="linear" slope="0.3"/>
          </feComponentTransfer>
          <feMerge>
            <feMergeNode/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
        
        <!-- Circular clip for profile photo -->
        <clipPath id="circleClip-${profileImageUrl.substring(0, 8)}">
          <circle cx="${size/2}" cy="${photoCenterY}" r="${photoRadius}"/>
        </clipPath>
      </defs>
      
      <!-- Modern pin shape (Strava-style teardrop) -->
      <path d="M ${size/2} ${height}
               L ${size/2} ${height * 0.65}
               Q ${size/2 - size*0.15} ${height * 0.5} ${size/2 - size*0.35} ${height * 0.35}
               A ${size/2.5} ${size/2.5} 0 1 1 ${size/2 + size*0.35} ${height * 0.35}
               Q ${size/2 + size*0.15} ${height * 0.5} ${size/2} ${height * 0.65}
               Z" 
            fill="url(#pinGradient)" 
            filter="url(#dropShadow)" 
            stroke="none"/>
      
      <!-- Profile photo circle -->
      <image href="${profileImageUrl}" 
             x="${size/2 - photoRadius}" 
             y="${photoCenterY - photoRadius}" 
             width="${photoRadius * 2}" 
             height="${photoRadius * 2}" 
             clip-path="url(#circleClip-${profileImageUrl.substring(0, 8)})"
             preserveAspectRatio="xMidYMid slice"/>
      
      <!-- White border circle around photo (thicker for contrast) -->
      <circle cx="${size/2}" 
              cy="${photoCenterY}" 
              r="${photoRadius}" 
              fill="none" 
              stroke="white" 
              stroke-width="3"/>
    </svg>
  `.trim().replace(/\s+/g, ' ');
};

/**
 * Converts SVG string to base64 data URL for use as marker icon
 */
export const svgToDataUrl = (svgString: string): string => {
  const base64 = btoa(unescape(encodeURIComponent(svgString)));
  return `data:image/svg+xml;base64,${base64}`;
};

/**
 * Exports a RunConnect marker as PNG blob
 * @param scale - Multiplier for resolution (2 = high-res, 1.5 = optimized)
 */
export const exportMarkerAsPNG = async (
  profileImageUrl: string,
  scale: number = 2
): Promise<Blob> => {
  const svg = generateRunConnectMarkerSVG(profileImageUrl, 48 * scale);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  if (!ctx) {
    throw new Error('Canvas context not available');
  }
  
  const img = new Image();
  
  return new Promise((resolve, reject) => {
    img.onload = () => {
      canvas.width = 48 * scale;
      canvas.height = 60 * scale;
      ctx.drawImage(img, 0, 0);
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to create PNG blob'));
        }
      }, 'image/png');
    };
    img.onerror = () => reject(new Error('Failed to load SVG image'));
    img.src = svgToDataUrl(svg);
  });
};
