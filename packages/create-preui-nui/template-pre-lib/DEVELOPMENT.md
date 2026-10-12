# Development

Not shipped with the script.

## UI

```bash
cd web
npm install
npm run dev     # in the browser with mock data, F1 opens the window again after Escape
npm run build   # checks the preUI version, writes web/dist and THIRD_PARTY_LICENSES.txt
```

`npm run dev` and `npm run build` first export `locales/en.lua` to `web/src/dev-texts.json` with
`../../pre_lib/tools/export-ui-texts.mjs`, so pre_lib must sit next to this resource (same folder). In the game the
texts come from `locales/<language>.lua` through pre_lib (`getTexts`), the JSON is only the fallback for the browser.

`npm run build` writes the UI to `web/dist` and the licenses of everything the UI bundles to
`THIRD_PARTY_LICENSES.txt` next to `fxmanifest.lua` (a copy lands in `web/dist`). Commit both: FiveM loads
`web/dist`, the buyer gets no build step.

## How the UI is wired

- `fxmanifest.lua` loads `@pre_lib/init.lua` (version check, `PreLib`) and `@pre_lib/nui_bridge.lua`. The bridge
  answers the NUI callbacks `getTheme`, `getLocale`, `getTexts`, `getCurrency` and `preLibNotifyReady`.
- `web/src/App.tsx`: `NuiTextsProvider` (texts, `useNuiTexts`), `NuiThemeBridge` (theme), `useNuiMoney` (amounts in
  pre_lib's currency format), `NuiToastRelay` (pre_lib's notifications while this window has the focus).
- `client/main.lua`: opens the window, NUI callbacks `close`, `getData` and `buy` (demo data).

New texts go into `locales/en.lua` first, then `de.lua` and `fr.lua` with the same keys. Check them with
`pre_lib_check_locales __NAME__` in the server console.
