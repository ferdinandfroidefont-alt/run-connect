// Global type declarations for Google Maps API
// The @types/google.maps package provides types but needs explicit reference
// due to the dotted package name not being auto-resolved by TypeScript

declare namespace google {
  export import maps = google.maps;
}

// Re-export from the actual @types/google.maps package
/// <reference path="../node_modules/@types/google.maps/index.d.ts" />
