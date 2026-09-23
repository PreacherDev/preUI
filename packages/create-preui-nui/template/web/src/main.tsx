import "@fontsource-variable/inter";
import "@fontsource/jetbrains-mono";
import { debugData, isEnvBrowser } from "@pre_scripts/preui-nui";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import "./index.css";

// In a normal browser (npm run dev) there is no game: pretend Lua opened the UI. No-op inside FiveM.
debugData([{ action: "setVisible", data: true }], 300);
// The page is transparent (the game shows through); in the browser a flat grey stands in for the game.
if (isEnvBrowser()) document.body.style.background = "#5b6470";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
