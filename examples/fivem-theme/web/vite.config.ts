import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  // One React copy, also when preUI is linked locally (npm link / file:).
  resolve: { dedupe: ["react", "react-dom"] },
  // FiveM loads the page from the resource folder (ui_page 'web/dist/index.html'): relative asset paths.
  base: "./",
  // FiveM NUI is Chromium 103: lower JS and CSS for it.
  build: { target: "chrome103", outDir: "dist", emptyOutDir: true },
});
