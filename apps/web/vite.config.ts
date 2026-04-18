import { resolve } from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  root: resolve(__dirname, "html"),
  base: "/",
  appType: "mpa",
  plugins: [react()],
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
          if (id.includes("node_modules/firebase/")) {
            return "firebase";
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
