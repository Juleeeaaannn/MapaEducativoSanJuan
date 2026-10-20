import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import react from "@vitejs/plugin-react";

// El puerto del backend se puede ajustar con la variable de entorno BACKEND_PORT
// (útil si el 8000 está ocupado en el entorno actual).
const BACKEND_PORT = process.env.BACKEND_PORT || "8000";

export default defineConfig({
  plugins: [react(), vue()],
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      "/api": `http://127.0.0.1:${BACKEND_PORT}`,
    },
  },
  build: {
    outDir: "dist",
  },
});
