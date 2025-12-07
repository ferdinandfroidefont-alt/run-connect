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
 * Generates a simple round profile photo marker as SVG string
 * Just the photo in a circle with subtle shadow - no pin shape
 */
export const generateRoundProfileMarkerSVG = (
  profileImageUrl: string,
  size: number = 48
): string => {
  const radius = size / 2;
  const borderWidth = 3;
  
  return `
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
      <defs>
        <!-- Shadow for depth -->
        <filter id="profileShadow" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="#000" flood-opacity="0.3"/>
        </filter>
        
        <!-- Circular clip for profile photo -->
        <clipPath id="profileClip-${size}">
          <circle cx="${radius}" cy="${radius}" r="${radius - borderWidth}"/>
        </clipPath>
      </defs>
      
      <!-- White border circle with shadow -->
      <circle cx="${radius}" cy="${radius}" r="${radius - 1}" 
              fill="white" 
              filter="url(#profileShadow)"/>
      
      <!-- Profile photo -->
      <image xlink:href="${profileImageUrl}" 
             x="${borderWidth}" 
             y="${borderWidth}" 
             width="${size - borderWidth * 2}" 
             height="${size - borderWidth * 2}" 
             clip-path="url(#profileClip-${size})"
             preserveAspectRatio="xMidYMid slice"/>
    </svg>
  `.trim().replace(/\s+/g, ' ');
};

/**
 * Generates a custom RunConnect map marker as SVG string
 * with pin shape, gradient, glow effect, and circular profile photo
 * @deprecated Use generateRoundProfileMarkerSVG instead for cleaner look
 */
export const generateRunConnectMarkerSVG = (
  profileImageUrl: string,
  size: number = 48
): string => {
  // Now just returns round profile marker
  return generateRoundProfileMarkerSVG(profileImageUrl, size);
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
