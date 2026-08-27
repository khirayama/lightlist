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
  root: resolve(import.meta.dirname, "html"),
  base: "/",
  appType: "mpa",
  plugins: [pagePathRedirect(), react()],
  publicDir: resolve(import.meta.dirname, "public"),
  resolve: {
    alias: {
      "/src": resolve(import.meta.dirname, "src"),
      "@": resolve(import.meta.dirname, "src"),
    },
  },
  envDir: import.meta.dirname,
  build: {
    outDir: resolve(import.meta.dirname, "dist"),
    emptyOutDir: true,
    chunkSizeWarningLimit: 550,
    rolldownOptions: {
      input: {
        index: resolve(import.meta.dirname, "html/index.html"),
        login: resolve(import.meta.dirname, "html/login/index.html"),
        app: resolve(import.meta.dirname, "html/app/index.html"),
        passwordReset: resolve(
          import.meta.dirname,
          "html/password_reset/index.html",
        ),
        sharecodes: resolve(import.meta.dirname, "html/sharecodes/index.html"),
        notFound: resolve(import.meta.dirname, "html/404.html"),
        serverError: resolve(import.meta.dirname, "html/500.html"),
      },
      output: {
        codeSplitting: {
          groups: [
            {
              name: "firebase-analytics",
              test: /node_modules\/(?:firebase\/analytics|@firebase\/analytics)/,
            },
            {
              name: "firebase-auth",
              test: /node_modules\/(?:firebase\/auth|@firebase\/auth)/,
            },
            {
              name: "firebase-appcheck",
              test: /node_modules\/(?:firebase\/app-check|@firebase\/app-check)/,
            },
            {
              name: "firebase-firestore",
              test: /node_modules\/(?:firebase|@firebase)\//,
            },
            { name: "date-fns", test: /node_modules\/date-fns\// },
            {
              name: "i18n",
              test: /node_modules\/(?:i18next|react-i18next)/,
            },
            {
              name: "app-ui",
              test: /node_modules\/(?:@dnd-kit|@radix-ui|cmdk|react-day-picker)\//,
            },
            {
              name: "react-vendor",
              test: /node_modules\/(?:react|react-dom|scheduler)\//,
            },
          ],
        },
      },
    },
  },
});
