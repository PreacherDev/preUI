import { ThemeProvider } from "@pre_scripts/preui";
import { NuiThemeBridge, useNuiVisibility, type NuiThemePayload } from "@pre_scripts/preui-nui";
import { useState } from "react";
import { ThemeEditor } from "./ThemeEditor";

/** What `getTheme` returns in a browser (npm run dev), so the page works without the game. */
const browserMock: NuiThemePayload = {
  v: 1,
  scheme: "dark",
  palette: { dark: { primary: "#3b82f6" } },
};

export function App() {
  const { visible, close } = useNuiVisibility();
  // The theme the server currently has — the editor starts from it.
  const [serverTheme, setServerTheme] = useState<NuiThemePayload>({});

  return (
    // storage={false}: the server (GlobalState.theme) is the source of truth, not this resource's localStorage.
    // colorScheme={false}: no `color-scheme` on <html>, so the NUI iframe stays transparent over the game.
    <ThemeProvider storage={false} colorScheme={false}>
      <NuiThemeBridge mock={browserMock} onThemeChange={setServerTheme} />
      {visible && <ThemeEditor key={JSON.stringify(serverTheme)} initial={serverTheme} onClose={close} />}
    </ThemeProvider>
  );
}
