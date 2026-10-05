import { resolve } from "node:path";
import { build } from "vite";

await build({
  configFile: resolve(import.meta.dirname, "../vite.messaging.config.ts"),
  mode: process.env.NODE_ENV === "development" ? "development" : "production",
});
