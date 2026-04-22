import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import os from "os";
import path from "path";

export default defineConfig({
  plugins: [react()],
  cacheDir: path.join(os.tmpdir(), "vite-team-scrum-board"),
  server: {
    port: 5173,
    proxy: {
      "/api": "http://localhost:4000",
      "/uploads": "http://localhost:4000",
    },
  },
});
