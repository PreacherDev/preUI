import "@fontsource-variable/inter";
import "@fontsource/jetbrains-mono";
import { debugData } from "@pre_scripts/preui-nui";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import "./index.css";

// In a normal browser (npm run dev) there is no game: open the editor right away.
debugData([{ action: "setVisible", data: true }], 300);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
