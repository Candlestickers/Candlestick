import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "Editor": path.resolve(__dirname, "src/Editor"),
      "resources": path.resolve(__dirname, "src/resources"),
      "files": path.resolve(__dirname, "src/files")
    },
  },
  server: {
    port: 3000,
    open: true,
  },
  build: {
    outDir: "build",
  },
});