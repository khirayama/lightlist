import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "VITE_");
  return {
    define: {
      __LIGHTLIST_FIREBASE_CONFIG__: JSON.stringify({
        apiKey: env.VITE_FIREBASE_API_KEY ?? "",
        authDomain: env.VITE_FIREBASE_AUTH_DOMAIN ?? "",
        projectId: env.VITE_FIREBASE_PROJECT_ID ?? "",
        storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET ?? "",
        messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? "",
        appId: env.VITE_FIREBASE_APP_ID ?? "",
      }),
    },
    publicDir: false,
    build: {
      lib: {
        entry: "src/firebase-messaging-sw.ts",
        formats: ["iife"],
        name: "LightlistMessagingWorker",
        fileName: () => "firebase-messaging-sw.js",
      },
      outDir: mode === "development" ? "public/notifications" : "dist/notifications",
      emptyOutDir: false,
    },
  };
});
