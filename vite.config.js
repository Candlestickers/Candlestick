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
    /* I think this is the same as the browserslist config; for reference it's here: 
    "browserslist": [
    ">0.2%",
    "not dead",
    "not ie <= 11",
    "not op_mini all"],*/
    target: [
      'chrome109',
      'ios15.6',
      'safari15.6',
      'edge149',
      'firefox121',
      'opera80'
    ]
  },
});