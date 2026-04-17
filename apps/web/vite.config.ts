import { resolve } from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const trailingSlashRoutes = new Set([
  "/login",
  "/app",
  "/password_reset",
  "/sharecodes",
]);

const cleanUrlRedirectPlugin = () => ({
  name: "clean-url-redirect",
  configureServer(server) {
    server.middlewares.use((req, res, next) => {
      const originalUrl = req.url;
      if (!originalUrl) {
        next();
        return;
      }

      const url = new URL(originalUrl, "http://localhost");
      if (trailingSlashRoutes.has(url.pathname)) {
        res.statusCode = 302;
        res.setHeader("Location", `${url.pathname}/${url.search}`);
        res.end();
        return;
      }

      next();
    });
  },
  configurePreviewServer(server) {
    server.middlewares.use((req, res, next) => {
      const originalUrl = req.url;
      if (!originalUrl) {
        next();
        return;
      }

      const url = new URL(originalUrl, "http://localhost");
      if (trailingSlashRoutes.has(url.pathname)) {
        res.statusCode = 302;
        res.setHeader("Location", `${url.pathname}/${url.search}`);
        res.end();
        return;
      }

      next();
    });
  },
});

export default defineConfig({
  root: resolve(__dirname, "html"),
  plugins: [react(), cleanUrlRedirectPlugin()],
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
    },
  },
});
