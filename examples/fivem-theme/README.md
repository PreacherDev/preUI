# preui_theme — example resource

One theme for the whole server, edited in game and applied live to every NUI that uses preUI.

```
fxmanifest.lua   resource manifest (ui_page web/dist/index.html)
server.lua       GlobalState.theme, saved in KVP; only players with the ACE `preui.theme` may change it
bridge.lua       the client part every UI resource includes: answers getTheme, forwards changes as setTheme
client.lua       /themeeditor command, close + saveTheme callbacks of the editor
web/             Vite + React + preUI: the in-game window around preUI's <ThemeEditor> (+ NuiThemeBridge)
```

## Setup

```bash
cd web
npm install
npm run build        # → web/dist, loaded by the resource
npm run dev          # browser development with mock data (no game needed)
```

`server.cfg`:

```cfg
ensure preui_theme
add_ace group.admin preui.theme allow
```

In game: `/themeeditor` opens the editor, "Für alle speichern" updates `GlobalState.theme`, every client and every
resource with the bridge switches immediately. `/resettheme` (console or admin) goes back to the preUI defaults.

## Using the theme in your own resources

1. `fxmanifest.lua` of your resource:

   ```lua
   dependency 'preui_theme'
   client_script '@preui_theme/bridge.lua'
   ```

2. Your NUI (`@pre_scripts/preui` + `@pre_scripts/preui-nui`):

   ```tsx
   <ThemeProvider storage={false}>
     <NuiThemeBridge />
     <App />
   </ThemeProvider>
   ```

That's all — the bridge asks for the current theme on start and follows every change. The message format is documented
in [`packages/preui-nui/README.md`](../../packages/preui-nui/README.md#theme-message-protocol-v1).

## Tested

The built page runs in Chromium 103.0.5058 (the FiveM NUI engine) without console errors: runtime tokens per scheme,
scheme switch and `setTheme` messages. The in-game flow itself (state bags, ACE, KVP) needs a running server.
