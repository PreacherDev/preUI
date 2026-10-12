import "@fontsource-variable/inter";
import "@fontsource/jetbrains-mono";
import { debugData, installAltGrFix, isEnvBrowser } from "@pre_scripts/preui-nui";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import "./index.css";

// npm run dev: there is no game, so pretend Lua opened the window. No-op inside FiveM. F1 opens it again after
// Escape (browser only, see useNuiVisibility in App.tsx).
debugData([{ action: "setVisible", data: true }], 300);

// FiveM's NUI drops AltGr characters like { } [ ] @ and the euro sign in text fields
installAltGrFix();

// The page is transparent in the game. In the browser a flat grey stands in for it.
if (isEnvBrowser()) document.body.style.background = "#5b6470";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
