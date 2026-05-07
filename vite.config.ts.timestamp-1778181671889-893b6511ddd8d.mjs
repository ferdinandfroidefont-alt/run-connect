// vite.config.ts
import { defineConfig } from "file:///C:/Users/ordi2322802/Desktop/run-connect/node_modules/vite/dist/node/index.js";
import react from "file:///C:/Users/ordi2322802/Desktop/run-connect/node_modules/@vitejs/plugin-react-swc/index.js";
import path from "path";
import { componentTagger } from "file:///C:/Users/ordi2322802/Desktop/run-connect/node_modules/lovable-tagger/dist/index.js";
var __vite_injected_original_dirname = "C:\\Users\\ordi2322802\\Desktop\\run-connect";
var vite_config_default = defineConfig(({ mode }) => ({
  base: "./",
  server: {
    host: "::",
    port: 8080
  },
  plugins: [
    react(),
    mode === "development" && componentTagger()
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__vite_injected_original_dirname, "./src")
    },
    /** Évite deux copies de React (erreur runtime « Cannot read properties of null (reading 'useContext') »). */
    dedupe: ["react", "react-dom"]
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
          if (/\/node_modules\/react\//.test(id)) return "react-vendor";
          if (/\/node_modules\/react-dom\//.test(id)) return "react-vendor";
          if (/\/node_modules\/scheduler\//.test(id)) return "react-vendor";
        }
      }
    },
    chunkSizeWarningLimit: 900
  }
}));
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxvcmRpMjMyMjgwMlxcXFxEZXNrdG9wXFxcXHJ1bi1jb25uZWN0XCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxvcmRpMjMyMjgwMlxcXFxEZXNrdG9wXFxcXHJ1bi1jb25uZWN0XFxcXHZpdGUuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9DOi9Vc2Vycy9vcmRpMjMyMjgwMi9EZXNrdG9wL3J1bi1jb25uZWN0L3ZpdGUuY29uZmlnLnRzXCI7aW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSBcInZpdGVcIjtcclxuaW1wb3J0IHJlYWN0IGZyb20gXCJAdml0ZWpzL3BsdWdpbi1yZWFjdC1zd2NcIjtcclxuaW1wb3J0IHBhdGggZnJvbSBcInBhdGhcIjtcclxuaW1wb3J0IHsgY29tcG9uZW50VGFnZ2VyIH0gZnJvbSBcImxvdmFibGUtdGFnZ2VyXCI7XHJcblxyXG4vLyBodHRwczovL3ZpdGVqcy5kZXYvY29uZmlnL1xyXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoKHsgbW9kZSB9KSA9PiAoe1xyXG4gIGJhc2U6IFwiLi9cIixcclxuICBzZXJ2ZXI6IHtcclxuICAgIGhvc3Q6IFwiOjpcIixcclxuICAgIHBvcnQ6IDgwODAsXHJcbiAgfSxcclxuICBwbHVnaW5zOiBbXHJcbiAgICByZWFjdCgpLFxyXG4gICAgbW9kZSA9PT0gJ2RldmVsb3BtZW50JyAmJlxyXG4gICAgY29tcG9uZW50VGFnZ2VyKCksXHJcbiAgXS5maWx0ZXIoQm9vbGVhbiksXHJcbiAgcmVzb2x2ZToge1xyXG4gICAgYWxpYXM6IHtcclxuICAgICAgXCJAXCI6IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsIFwiLi9zcmNcIiksXHJcbiAgICB9LFxyXG4gICAgLyoqIFx1MDBDOXZpdGUgZGV1eCBjb3BpZXMgZGUgUmVhY3QgKGVycmV1ciBydW50aW1lIFx1MDBBQiBDYW5ub3QgcmVhZCBwcm9wZXJ0aWVzIG9mIG51bGwgKHJlYWRpbmcgJ3VzZUNvbnRleHQnKSBcdTAwQkIpLiAqL1xyXG4gICAgZGVkdXBlOiBbXCJyZWFjdFwiLCBcInJlYWN0LWRvbVwiXSxcclxuICB9LFxyXG4gIGJ1aWxkOiB7XHJcbiAgICByb2xsdXBPcHRpb25zOiB7XHJcbiAgICAgIG91dHB1dDoge1xyXG4gICAgICAgIG1hbnVhbENodW5rcyhpZCkge1xyXG4gICAgICAgICAgaWYgKCFpZC5pbmNsdWRlcyhcIm5vZGVfbW9kdWxlc1wiKSkgcmV0dXJuO1xyXG4gICAgICAgICAgaWYgKGlkLmluY2x1ZGVzKFwibWFwYm94LWdsXCIpKSByZXR1cm4gXCJtYXBib3hcIjtcclxuICAgICAgICAgIGlmIChpZC5pbmNsdWRlcyhcInRocmVlXCIpIHx8IGlkLmluY2x1ZGVzKFwiQHJlYWN0LXRocmVlXCIpKSByZXR1cm4gXCJ0aHJlZVwiO1xyXG4gICAgICAgICAgaWYgKGlkLmluY2x1ZGVzKFwiZGF0ZS1mbnNcIikpIHJldHVybiBcImRhdGUtdXRpbHNcIjtcclxuICAgICAgICAgIGlmIChpZC5pbmNsdWRlcyhcIkBjYXBhY2l0b3JcIikgfHwgaWQuaW5jbHVkZXMoXCJAY2FwYWNpdG9yLWNvbW11bml0eVwiKSkgcmV0dXJuIFwiY2FwYWNpdG9yXCI7XHJcbiAgICAgICAgICBpZiAoaWQuaW5jbHVkZXMoXCJAc3VwYWJhc2VcIikpIHJldHVybiBcInN1cGFiYXNlXCI7XHJcbiAgICAgICAgICBpZiAoaWQuaW5jbHVkZXMoXCJyZWFjdC1yb3V0ZXJcIikpIHJldHVybiBcInJvdXRlclwiO1xyXG4gICAgICAgICAgaWYgKGlkLmluY2x1ZGVzKFwiZnJhbWVyLW1vdGlvblwiKSkgcmV0dXJuIFwibW90aW9uXCI7XHJcbiAgICAgICAgICBpZiAoaWQuaW5jbHVkZXMoXCJAcmFkaXgtdWlcIikpIHJldHVybiBcInJhZGl4XCI7XHJcbiAgICAgICAgICBpZiAoaWQuaW5jbHVkZXMoXCJsdWNpZGUtcmVhY3RcIikpIHJldHVybiBcImljb25zXCI7XHJcbiAgICAgICAgICAvLyBVbmlxdWVtZW50IGxlIGNcdTAxNTN1ciBSZWFjdCBcdTIwMTQgcGFzIGBpZC5pbmNsdWRlcyhcIi9yZWFjdC9cIilgIChhdHRyYXBlIEBlbW90aW9uL3JlYWN0LCBldGMuIFx1MjE5MiBkb3VibGUgUmVhY3QpLlxyXG4gICAgICAgICAgaWYgKC9cXC9ub2RlX21vZHVsZXNcXC9yZWFjdFxcLy8udGVzdChpZCkpIHJldHVybiBcInJlYWN0LXZlbmRvclwiO1xyXG4gICAgICAgICAgaWYgKC9cXC9ub2RlX21vZHVsZXNcXC9yZWFjdC1kb21cXC8vLnRlc3QoaWQpKSByZXR1cm4gXCJyZWFjdC12ZW5kb3JcIjtcclxuICAgICAgICAgIGlmICgvXFwvbm9kZV9tb2R1bGVzXFwvc2NoZWR1bGVyXFwvLy50ZXN0KGlkKSkgcmV0dXJuIFwicmVhY3QtdmVuZG9yXCI7XHJcbiAgICAgICAgfSxcclxuICAgICAgfSxcclxuICAgIH0sXHJcbiAgICBjaHVua1NpemVXYXJuaW5nTGltaXQ6IDkwMCxcclxuICB9LFxyXG59KSk7XHJcbiJdLAogICJtYXBwaW5ncyI6ICI7QUFBb1QsU0FBUyxvQkFBb0I7QUFDalYsT0FBTyxXQUFXO0FBQ2xCLE9BQU8sVUFBVTtBQUNqQixTQUFTLHVCQUF1QjtBQUhoQyxJQUFNLG1DQUFtQztBQU16QyxJQUFPLHNCQUFRLGFBQWEsQ0FBQyxFQUFFLEtBQUssT0FBTztBQUFBLEVBQ3pDLE1BQU07QUFBQSxFQUNOLFFBQVE7QUFBQSxJQUNOLE1BQU07QUFBQSxJQUNOLE1BQU07QUFBQSxFQUNSO0FBQUEsRUFDQSxTQUFTO0FBQUEsSUFDUCxNQUFNO0FBQUEsSUFDTixTQUFTLGlCQUNULGdCQUFnQjtBQUFBLEVBQ2xCLEVBQUUsT0FBTyxPQUFPO0FBQUEsRUFDaEIsU0FBUztBQUFBLElBQ1AsT0FBTztBQUFBLE1BQ0wsS0FBSyxLQUFLLFFBQVEsa0NBQVcsT0FBTztBQUFBLElBQ3RDO0FBQUE7QUFBQSxJQUVBLFFBQVEsQ0FBQyxTQUFTLFdBQVc7QUFBQSxFQUMvQjtBQUFBLEVBQ0EsT0FBTztBQUFBLElBQ0wsZUFBZTtBQUFBLE1BQ2IsUUFBUTtBQUFBLFFBQ04sYUFBYSxJQUFJO0FBQ2YsY0FBSSxDQUFDLEdBQUcsU0FBUyxjQUFjLEVBQUc7QUFDbEMsY0FBSSxHQUFHLFNBQVMsV0FBVyxFQUFHLFFBQU87QUFDckMsY0FBSSxHQUFHLFNBQVMsT0FBTyxLQUFLLEdBQUcsU0FBUyxjQUFjLEVBQUcsUUFBTztBQUNoRSxjQUFJLEdBQUcsU0FBUyxVQUFVLEVBQUcsUUFBTztBQUNwQyxjQUFJLEdBQUcsU0FBUyxZQUFZLEtBQUssR0FBRyxTQUFTLHNCQUFzQixFQUFHLFFBQU87QUFDN0UsY0FBSSxHQUFHLFNBQVMsV0FBVyxFQUFHLFFBQU87QUFDckMsY0FBSSxHQUFHLFNBQVMsY0FBYyxFQUFHLFFBQU87QUFDeEMsY0FBSSxHQUFHLFNBQVMsZUFBZSxFQUFHLFFBQU87QUFDekMsY0FBSSxHQUFHLFNBQVMsV0FBVyxFQUFHLFFBQU87QUFDckMsY0FBSSxHQUFHLFNBQVMsY0FBYyxFQUFHLFFBQU87QUFFeEMsY0FBSSwwQkFBMEIsS0FBSyxFQUFFLEVBQUcsUUFBTztBQUMvQyxjQUFJLDhCQUE4QixLQUFLLEVBQUUsRUFBRyxRQUFPO0FBQ25ELGNBQUksOEJBQThCLEtBQUssRUFBRSxFQUFHLFFBQU87QUFBQSxRQUNyRDtBQUFBLE1BQ0Y7QUFBQSxJQUNGO0FBQUEsSUFDQSx1QkFBdUI7QUFBQSxFQUN6QjtBQUNGLEVBQUU7IiwKICAibmFtZXMiOiBbXQp9Cg==
