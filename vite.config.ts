import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  base: "./",
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    /** Évite deux copies de React (erreur runtime « Cannot read properties of null (reading 'useContext') »). */
    dedupe: ["react", "react-dom"],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          if (id.includes("mapbox-gl")) return "mapbox";
          if (id.includes("three") || id.includes("@react-three")) return "three";
          if (id.includes("date-fns")) return "date-utils";
          if (id.includes("@capacitor") || id.includes("@capacitor-community")) return "capacitor";
          if (id.includes("@supabase")) return "supabase";
          if (id.includes("react-router")) return "router";
          if (id.includes("framer-motion")) return "motion";
          if (id.includes("@radix-ui")) return "radix";
          if (id.includes("lucide-react")) return "icons";
          // Uniquement le cœur React — pas `id.includes("/react/")` (attrape @emotion/react, etc. → double React).
          if (/\/node_modules\/react\//.test(id)) return "react-vendor";
          if (/\/node_modules\/react-dom\//.test(id)) return "react-vendor";
          if (/\/node_modules\/scheduler\//.test(id)) return "react-vendor";
        },
      },
    },
    chunkSizeWarningLimit: 900,
  },
}));
