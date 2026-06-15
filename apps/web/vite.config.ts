import { resolve } from "node:path";
import { defineConfig } from "vite";
import type { Plugin } from "vite";
import react from "@vitejs/plugin-react";

const pagePathRedirect = (): Plugin => ({
  name: "page-path-redirect",
  configureServer(server) {
    server.middlewares.use((req, res, next) => {
      const match = req.url?.match(
        /^\/(app|login|sharecodes|password_reset)(\?.*)?$/,
      );
      if (match) {
        res.statusCode = 301;
        res.setHeader("Location", `/${match[1]}/${match[2] ?? ""}`);
        res.end();
        return;
      }
      next();
    });
  },
});

export default defineConfig({
  root: resolve(__dirname, "html"),
  base: "/",
  appType: "mpa",
  plugins: [pagePathRedirect(), react()],
  publicDir: resolve(__dirname, "public"),
  resolve: {
    alias: {
      "/src": resolve(__dirname, "src"),
      "@": resolve(__dirname, "src"),
    },
  },
  envDir: __dirname,
  build: {
    outDir: resolve(__dirname, "dist"),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        index: resolve(__dirname, "html/index.html"),
        login: resolve(__dirname, "html/login/index.html"),
        app: resolve(__dirname, "html/app/index.html"),
        passwordReset: resolve(__dirname, "html/password_reset/index.html"),
        sharecodes: resolve(__dirname, "html/sharecodes/index.html"),
        notFound: resolve(__dirname, "html/404.html"),
        serverError: resolve(__dirname, "html/500.html"),
      },
      output: {
        manualChunks(id) {
          if (
            id.includes("node_modules/firebase/analytics") ||
            id.includes("node_modules/@firebase/analytics")
          ) {
            return "firebase-analytics";
          }
          if (
            id.includes("node_modules/firebase/") ||
            id.includes("node_modules/@firebase/")
          ) {
            return "firebase";
          }
          if (id.includes("node_modules/date-fns/")) {
            return "date-fns";
          }
          if (
            id.includes("node_modules/i18next") ||
            id.includes("node_modules/react-i18next")
          ) {
            return "i18n";
          }
          if (
            id.includes("node_modules/@dnd-kit/") ||
            id.includes("node_modules/@radix-ui/") ||
            id.includes("node_modules/cmdk/") ||
            id.includes("node_modules/react-day-picker/") ||
            id.includes("node_modules/vaul/")
          ) {
            return "app-ui";
          }
          if (
            id.includes("node_modules/react/") ||
            id.includes("node_modules/react-dom/") ||
            id.includes("node_modules/scheduler/")
          ) {
            return "react-vendor";
          }
        },
      },
    },
  },
});
