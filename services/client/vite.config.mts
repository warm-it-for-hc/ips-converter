import path from "path";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd());

  const convert_url = env.VITE_CONVERT_URL;
  const signal_url = env.VITE_SIGNAL_URL;

  return {
    server: {
      host: true,
      port: 5173,
      watch: {
        usePolling: true,
      },
      proxy: {
        "/api/v1/convert": {
          target: convert_url,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/v1\/convert/, ""),
        },
        "/api/v1/signal": {
          target: signal_url,
          changeOrigin: true,
          ws: true,
          rewrite: (path) => path.replace(/^\/api\/v1\/signal/, ""),
        },
      },
    },
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: "autoUpdate",
        manifest: {
          name: "International Patient Summary",
          short_name: "IPS",
          start_url: "/",
          display: "standalone",
          theme_color: "#ffffff",
          background_color: "#ffffff",
          icons: [
            {
              src: "/icon-192.png",
              sizes: "192x192",
              type: "image/png",
            },
            {
              src: "/icon-512.png",
              sizes: "512x512",
              type: "image/png",
            },
          ],
          share_target: {
            action: "/upload",
            method: "POST",
            enctype: "multipart/form-data",
            params: {
              files: [
                {
                  name: "file",
                  accept: ["application/json"],
                },
              ],
            },
          },
        },
      }),
    ],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});
