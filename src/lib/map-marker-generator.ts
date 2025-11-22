/**
 * Converts an image URL to base64 data URL
 */
export const imageUrlToBase64 = async (url: string): Promise<string> => {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('Failed to convert image to base64:', error);
    // Return a default placeholder if image fails to load
    return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSIxMiIgY3k9IjEyIiByPSIxMCIgZmlsbD0iI0UwRTBFMCIvPjxwYXRoIGQ9Ik0xMiAxMkM5LjI0IDEyIDcgOS43NiA3IDdDNyA0LjI0IDkuMjQgMiAxMiAyQzE0Ljc2IDIgMTcgNC4yNCAxNyA3QzE3IDkuNzYgMTQuNzYgMTIgMTIgMTJaTTEyIDE0QzE2LjQyIDE0IDIwIDE1Ljc5IDIwIDE4VjIwSDRWMThDNCAxNS43OSA3LjU4IDE0IDEyIDE0WiIgZmlsbD0iIzk5OTk5OSIvPjwvc3ZnPg==';
  }
};

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
    <svg width="${size}" height="${height}" viewBox="0 0 ${size} ${height}" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
      <defs>
        <!-- RunConnect gradient: deep blue to light blue (premium 3-stop) -->
        <linearGradient id="pinGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:hsl(217, 95%, 62%);stop-opacity:1" />
          <stop offset="50%" style="stop-color:hsl(205, 100%, 65%);stop-opacity:1" />
          <stop offset="100%" style="stop-color:hsl(195, 100%, 72%);stop-opacity:1" />
        </linearGradient>
        
        <!-- Premium double shadow: subtle outer + strong inner -->
        <filter id="premiumShadow" x="-50%" y="-50%" width="200%" height="200%">
          <!-- Outer soft shadow (halo effect) -->
          <feGaussianBlur in="SourceAlpha" stdDeviation="4" result="outerBlur"/>
          <feOffset dx="0" dy="2" result="outerOffset"/>
          <feComponentTransfer>
            <feFuncA type="linear" slope="0.2"/>
          </feComponentTransfer>
          <feComposite in2="outerOffset" operator="in" result="outerShadow"/>
          
          <!-- Inner strong shadow (depth) -->
          <feGaussianBlur in="SourceAlpha" stdDeviation="2" result="innerBlur"/>
          <feOffset dx="0" dy="4" result="innerOffset"/>
          <feComponentTransfer>
            <feFuncA type="linear" slope="0.6"/>
          </feComponentTransfer>
          <feComposite in2="innerOffset" operator="in" result="innerShadow"/>
          
          <!-- Merge both shadows -->
          <feMerge>
            <feMergeNode in="outerShadow"/>
            <feMergeNode in="innerShadow"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
        
        <!-- Circular clip for profile photo -->
        <clipPath id="circleClip-${profileImageUrl.substring(0, 8)}">
          <circle cx="${size/2}" cy="${photoCenterY}" r="${photoRadius}"/>
        </clipPath>
      </defs>
      
      <!-- Modern pin shape with rounded tip -->
      <path d="M ${size/2} ${height}
               Q ${size/2 - size*0.02} ${height * 0.9} ${size/2} ${height * 0.65}
               Q ${size/2 - size*0.15} ${height * 0.5} ${size/2 - size*0.35} ${height * 0.35}
               A ${size/2.5} ${size/2.5} 0 1 1 ${size/2 + size*0.35} ${height * 0.35}
               Q ${size/2 + size*0.15} ${height * 0.5} ${size/2} ${height * 0.65}
               Z" 
            fill="url(#pinGradient)" 
            filter="url(#premiumShadow)" 
            stroke="none"/>
      
      <!-- Subtle white outline for contrast on any map background -->
      <path d="M ${size/2} ${height}
               Q ${size/2 - size*0.02} ${height * 0.9} ${size/2} ${height * 0.65}
               Q ${size/2 - size*0.15} ${height * 0.5} ${size/2 - size*0.35} ${height * 0.35}
               A ${size/2.5} ${size/2.5} 0 1 1 ${size/2 + size*0.35} ${height * 0.35}
               Q ${size/2 + size*0.15} ${height * 0.5} ${size/2} ${height * 0.65}
               Z" 
            fill="none" 
            stroke="rgba(255, 255, 255, 0.5)" 
            stroke-width="1"/>
      
      <!-- Profile photo circle -->
      <image xlink:href="${profileImageUrl}" 
             x="${size/2 - photoRadius}" 
             y="${photoCenterY - photoRadius}" 
             width="${photoRadius * 2}" 
             height="${photoRadius * 2}" 
             clip-path="url(#circleClip-${profileImageUrl.substring(0, 8)})"
             preserveAspectRatio="xMidYMid slice"/>
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
