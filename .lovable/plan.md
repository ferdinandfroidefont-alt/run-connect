

# Background Pattern for RunConnect

## Approach

Use the Nano banana pro image generation model (`google/gemini-3-pro-image-preview`) via a Supabase Edge Function to generate a high-quality seamless tile pattern matching the specifications.

## Implementation

### 1. Create Edge Function `generate-pattern`

A one-time-use edge function that calls the image generation API with the detailed prompt, saves the result to Supabase Storage, and returns the public URL.

### 2. Save Pattern Asset

Save the generated image as `public/patterns/sports-pattern.png` for use across the app.

### 3. Integrate into the App

Add the pattern as a subtle background texture on key screens:

- **`src/index.css`**: Add a `.bg-pattern` utility class that applies the pattern at 5-6% opacity
- **`src/components/Layout.tsx`**: Apply the pattern behind the main content area
- **Dark mode compatible**: The pattern is monochrome dark grey, so it works natively on dark backgrounds. For light mode, use CSS `filter: invert(1)` with the same low opacity.

### Technical Details

- **Generation prompt**: The exact prompt from the request, optimized for the model
- **Format**: PNG, 512x512 square tile
- **Usage**: CSS `background-image` with `background-repeat: repeat` at `opacity: 0.05`
- **Performance**: Single small image file, cached by browser, minimal impact

### Files Created
- `supabase/functions/generate-pattern/index.ts` (temporary, for generation)
- `public/patterns/sports-pattern.png` (the asset)

### Files Modified
- `src/index.css` -- add `.bg-pattern` utility
- `src/components/Layout.tsx` -- apply pattern to app background

