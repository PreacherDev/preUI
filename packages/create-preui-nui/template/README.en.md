# __NAME__

FiveM resource with an NUI built on [preUI](https://www.npmjs.com/package/@pre_scripts/preui) (React + Tailwind CSS
v3), created with `npm create @pre_scripts/preui-nui`.

## Structure

```
fxmanifest.lua     resource manifest (ui_page web/dist/index.html)
client.lua         /__NAME__ opens and closes the UI, NUI callbacks close and getData
web/               Vite + React + preUI
  src/main.tsx     entry: fonts, CSS, browser mock (debugData)
  src/App.tsx      the window (ThemeProvider, useNuiVisibility, fetchNui)
  src/index.css    Tailwind layers, transparent background
  vite.config.ts   build for Chromium 103, relative paths
  dist/            build output that FiveM loads (not in git)
```

## Development

```bash
cd web
npm install
npm run dev
```

`npm run dev` opens the UI in your normal browser. There is no game there: `debugData` in `src/main.tsx` opens the
window like a `SendNUIMessage` would, and `fetchNui('getData', undefined, mockData)` returns the mock data instead of
calling the Lua callback. After Escape, a button in the bottom left corner (browser only) brings it back.

How the UI talks to Lua:

| Direction | Lua | UI |
|---|---|---|
| Lua → UI | `SendNUIMessage({ action = 'setVisible', data = true })` | `useNuiVisibility()` / `useNuiEvent('action', handler)` |
| UI → Lua | `RegisterNUICallback('getData', function(data, cb) cb(...) end)` | `fetchNui('getData', data, mock)` |

## Build and deploy

```bash
cd web
npm run build      # → web/dist
```

Then copy the whole resource folder (without `web/node_modules`) into your server's `resources` folder and add it to
`server.cfg`:

```cfg
# @preui-theme:start
ensure preui_theme
# @preui-theme:end
ensure __NAME__
```

In game `/__NAME__` opens the window; Escape or "Close" close it and give the mouse back to the game.

`web/dist` is in `.gitignore`: build output doesn't belong in the repository, so run `npm run build` before every
deploy. If you deploy straight from git (`git pull` on the server), remove the `web/dist/` line from `.gitignore` and
commit the build.

<!-- @preui-theme:start -->
## Server theme (preui_theme)

The resource follows a server-wide theme live: `<NuiThemeBridge />` in `src/App.tsx` asks for the theme on start
(`getTheme`) and follows every change (`setTheme`). The Lua side comes as an include from the `preui_theme` resource
(`client_script '@preui_theme/bridge.lua'` in `fxmanifest.lua`).

`preui_theme` is the example resource from the preUI repository (`examples/fivem-theme`, with the in-game editor
`/themeeditor`) — or any core resource that implements the theme protocol v1 of `@pre_scripts/preui-nui` and offers a
`bridge.lua` with the `getTheme` callback and the `setTheme` forwarder. If yours has a different name, change
`dependency` and `client_script` in `fxmanifest.lua`.

Without a theme resource: delete `dependency 'preui_theme'` and the `client_script '@preui_theme/bridge.lua'` line from
`fxmanifest.lua` and remove `<NuiThemeBridge />` from `src/App.tsx` (or scaffold again with `--no-theme`).
<!-- @preui-theme:end -->

## Things to know in FiveM

- **Chromium 103**: NUI runs in an old Chromium. The build targets it (`target: "chrome103"`), but in your own CSS
  avoid `:has()`, container queries, `color-mix()`, `svh/dvh` and CSS nesting, and in JS newer APIs such as
  `toSorted` or `Object.groupBy`. Tailwind stays on v3.
- **No native popups**: `<select>`, `<input type="color|date">`, `alert()`/`confirm()` and `title` tooltips never
  appear in game. Use preUI's `Select`, `ColorPicker`, `DatePicker`, `AlertDialog` and `Tooltip`.
- **Per-resource localStorage**: every NUI has its own origin (`https://cfx-nui-__NAME__/`). Hence
  `ThemeProvider storage={false}`; anything several resources share comes from the server.
- **Relative paths**: `base: "./"` in `vite.config.ts`, otherwise FiveM can't find the assets. Files outside
  `web/dist/assets` must be listed in `files { ... }` in `fxmanifest.lua`.
- **Transparent background**: the page sits on top of the game; `html` and `body` stay transparent, only the window
  has a surface. preUI also sets no `color-scheme` here (`createPreuiPreset({ colorScheme: false })` and
  `<ThemeProvider colorScheme={false}>`) — with `color-scheme: dark` Chromium paints an opaque dark canvas behind an
  iframe (which is how FiveM shows NUI pages), covering the game.
- **Focus**: `SetNuiFocus(true, true)` gives the UI mouse and keyboard. Every way of closing must reach the `close`
  callback, or the player gets stuck (`useNuiVisibility` does that on Escape and `close()`).
