import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, process.cwd(), "");
  
  const apiBaseUrl = env.VITE_API_BASE_URL || "http://localhost:8000";
  const wsBaseUrl = env.VITE_WS_BASE_URL || 
                    apiBaseUrl.replace(/^http/, "ws") || 
                    "ws://localhost:8000";

  return {
    server: {
      host: "::",
      port: 8080,
      fs: {
        allow: ["./client", "./shared"],
        deny: [".env", ".env.*", "*.{crt,pem}", "**/.git/**"],
      },
      // Proxy API requests to external backend (FastAPI)
      // Configure VITE_API_BASE_URL in .env file to point to your backend
      proxy: {
        "/api": {
          target: apiBaseUrl,
          changeOrigin: true,
          rewrite: (path) => path, // Keep /api prefix
        },
        "/ws": {
          target: wsBaseUrl,
          ws: true,
          changeOrigin: true,
          rewrite: (path) => path, // Keep /ws prefix
        },
      },
    },
    build: {
      outDir: "dist/spa",
    },
    plugins: [react()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./client"),
        "@shared": path.resolve(__dirname, "./shared"),
      },
    },
  };
});
