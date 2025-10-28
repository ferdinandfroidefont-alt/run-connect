/**
 * 🎨 Central Design System
 * Single source of truth for all UI constants
 */

export const UI_CONSTANTS = {
  // Border Radius
  borderRadius: {
    sm: '12px',
    md: '16px',
    lg: '20px',
    xl: '24px',
    full: '9999px'
  },

  // Shadows (soft, no harsh borders)
  shadows: {
    soft: '0 4px 20px rgba(0, 0, 0, 0.15)',
    medium: '0 8px 30px rgba(0, 0, 0, 0.20)',
    strong: '0 12px 40px rgba(0, 0, 0, 0.25)',
    glow: '0 0 30px 10px hsl(211 100% 58% / 0.3)',
    glowAccent: '0 0 30px 10px hsl(247 85% 70% / 0.3)'
  },

  // Blur
  blur: {
    glass: '10px',
    strong: '20px'
  },

  // Glassmorphism presets
  glass: {
    premium: {
      background: 'rgba(255, 255, 255, 0.08)',
      backdropFilter: 'blur(10px)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.5)'
    },
    floating: {
      background: 'rgba(255, 255, 255, 0.05)',
      backdropFilter: 'blur(8px)',
      border: '1px solid rgba(255, 255, 255, 0.08)',
      boxShadow: '0 8px 30px rgba(0, 0, 0, 0.4)'
    }
  },

  // Spacing (for consistency)
  spacing: {
    section: '2rem',    // 32px between sections
    card: '1rem',       // 16px padding inside cards
    element: '0.75rem'  // 12px between elements
  }
};

/**
 * Apply glassmorphism style to an element
 */
export const applyGlassmorphism = (preset: 'premium' | 'floating' = 'premium') => {
  const style = UI_CONSTANTS.glass[preset];
  return {
    background: style.background,
    backdropFilter: style.backdropFilter,
    WebkitBackdropFilter: style.backdropFilter,
    border: style.border,
    boxShadow: style.boxShadow
  };
};
