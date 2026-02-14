

# Fix: Loading Screen Only Visible on Top Half (Mobile)

## Problem
The loading screen only covers the top half of the screen on mobile devices. This is caused by a conflict between:
- The mobile CSS rule that sets `html, body` to `position: fixed; height: 100%`
- The `#root` container with `height: 100%; overflow: auto`
- The `bg-pattern` class using `isolation: isolate` which creates a new stacking context that interferes with the `fixed` positioning

## Solution

### 1. LoadingScreen.tsx - Use viewport height units
Replace `fixed inset-0` with explicit `100dvh` (dynamic viewport height) sizing, which works reliably on all mobile browsers regardless of the parent container constraints.

```tsx
<div 
  className="fixed top-0 left-0 z-50 bg-secondary flex flex-col items-center justify-center px-6"
  style={{ width: '100vw', height: '100dvh' }}
>
```

Remove `bg-pattern` from the root container and add the pattern as an inline style or a separate inner div to avoid `isolation: isolate` breaking the fixed positioning.

### 2. Add pattern separately inside the container
Instead of using the `.bg-pattern` class (which adds `isolation: isolate`), add a dedicated pattern overlay div inside the loading screen:

```tsx
{/* Pattern overlay */}
<div 
  className="absolute inset-0 pointer-events-none"
  style={{
    backgroundImage: "url('/patterns/sports-pattern.png')",
    backgroundRepeat: 'repeat',
    backgroundSize: '256px 256px',
    opacity: 0.06
  }}
/>
```

This avoids the `isolation: isolate` stacking context issue entirely while keeping the pattern visible.

## Technical Details
- `100dvh` adapts to the actual visible viewport on mobile (accounts for URL bar, etc.)
- Removing `isolation: isolate` from the loading screen prevents the fixed positioning from being constrained
- The pattern is rendered as a child div instead of a `::before` pseudo-element, giving full control over layering
- `z-50` ensures it stays above all other content

