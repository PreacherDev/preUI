import { thirdPartyLicenses } from "@pre_scripts/preui-nui/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  // thirdPartyLicenses: writes dist/THIRD_PARTY_LICENSES.txt with the licenses of everything in the bundle
  // (React, Base UI, preUI, fonts …). MIT / Apache-2.0 / OFL ask for it, and web/dist goes to every player.
  plugins: [react(), thirdPartyLicenses()],
  // One React copy, also when preUI is linked locally (npm link / file:).
  resolve: { dedupe: ["react", "react-dom"] },
  // FiveM loads the page from the resource folder (ui_page 'web/dist/index.html'): relative asset paths.
  base: "./",
  build: {
    // FiveM NUI is Chromium 103: lower JS and CSS for it.
    target: "chrome103",
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      // Base UI (under preUI) creates some components with fastComponent() / fastComponentRef() without a
      // /* @__PURE__ */ mark. Vite 8 (Rolldown) then keeps unused menus, dialogs, popovers and tooltips in the
      // bundle (this starter: 122 → 108 kB gzip with this line). Vite 7 (Rollup) drops them anyway.
      treeshake: { manualPureFunctions: ["fastComponent", "fastComponentRef"] },
    },
  },
});
