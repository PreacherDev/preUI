# __NAME__

FiveM-Resource mit einer NUI aus [preUI](https://www.npmjs.com/package/@pre_scripts/preui) (React + Tailwind CSS v3),
erstellt mit `npm create @pre_scripts/preui-nui`.

## Aufbau

```
fxmanifest.lua     Resource-Manifest (ui_page web/dist/index.html)
client.lua         /__NAME__ öffnet und schließt die UI, NUI-Callbacks close und getData
web/               Vite + React + preUI
  src/main.tsx     Einstieg: Schriften, CSS, Browser-Mock (debugData)
  src/App.tsx      das Fenster (ThemeProvider, useNuiVisibility, fetchNui)
  src/index.css    Tailwind-Layer, transparenter Hintergrund
  vite.config.ts   Build für Chromium 103, relative Pfade
  dist/            Build-Ausgabe, die FiveM lädt (nicht in git)
```

## Entwickeln

```bash
cd web
npm install
npm run dev
```

`npm run dev` öffnet die UI in deinem normalen Browser. Dort gibt es kein Spiel: `debugData` in `src/main.tsx` öffnet
das Fenster wie ein `SendNUIMessage`, und `fetchNui('getData', undefined, mockData)` liefert die Mock-Daten statt den
Lua-Callback aufzurufen. Nach Esc bringt dich ein Button unten links (nur im Browser) wieder zurück.

So redet die UI mit Lua:

| Richtung | Lua | UI |
|---|---|---|
| Lua → UI | `SendNUIMessage({ action = 'setVisible', data = true })` | `useNuiVisibility()` / `useNuiEvent('action', handler)` |
| UI → Lua | `RegisterNUICallback('getData', function(data, cb) cb(...) end)` | `fetchNui('getData', data, mock)` |

## Bauen und auf den Server bringen

```bash
cd web
npm run build      # → web/dist
```

Kopiere dann den ganzen Resource-Ordner (ohne `web/node_modules`) in den `resources`-Ordner deines Servers und trage
ihn in die `server.cfg` ein:

```cfg
# @preui-theme:start
ensure preui_theme
# @preui-theme:end
ensure __NAME__
```

Im Spiel öffnet `/__NAME__` das Fenster, Esc oder „Schließen“ schließen es und geben die Maus wieder frei.

`web/dist` steht in der `.gitignore`: Build-Ausgaben gehören nicht ins Repository, also vor jedem Deploy
`npm run build` ausführen. Deployst du direkt per `git pull` auf den Server, entferne die Zeile `web/dist/` aus der
`.gitignore` und committe den Build.

<!-- @preui-theme:start -->
## Server-Theme (preui_theme)

Die Resource übernimmt ein serverweites Theme live: `<NuiThemeBridge />` in `src/App.tsx` fragt beim Start nach
dem Theme (`getTheme`) und folgt jeder Änderung (`setTheme`). Die Lua-Seite kommt per Include aus der Resource
`preui_theme` (`client_script '@preui_theme/bridge.lua'` in `fxmanifest.lua`).

`preui_theme` ist die Beispiel-Resource aus dem preUI-Repository (`examples/fivem-theme`, mit In-Game-Editor
`/themeeditor`) – oder jede Core-Resource, die das Theme-Protokoll v1 von `@pre_scripts/preui-nui` umsetzt und eine
`bridge.lua` mit dem `getTheme`-Callback und dem `setTheme`-Weiterleiter anbietet. Heißt deine Resource anders, passe
`dependency` und `client_script` in `fxmanifest.lua` an.

Ohne Theme-Resource: `dependency 'preui_theme'` und die `client_script '@preui_theme/bridge.lua'`-Zeile aus
`fxmanifest.lua` löschen und `<NuiThemeBridge />` aus `src/App.tsx` entfernen (oder das Projekt mit `--no-theme`
neu erzeugen).
<!-- @preui-theme:end -->

## Stolperfallen in FiveM

- **Chromium 103**: Die NUI läuft in einem alten Chromium. Der Build zielt darauf (`target: "chrome103"`), aber
  vermeide in eigenem CSS `:has()`, Container Queries, `color-mix()`, `svh/dvh` und CSS-Nesting, und in JS neuere
  APIs wie `toSorted` oder `Object.groupBy`. Tailwind bleibt bei v3.
- **Keine nativen Popups**: `<select>`, `<input type="color|date">`, `alert()`/`confirm()` und `title`-Tooltips
  erscheinen im Spiel nie. Nimm preUIs `Select`, `ColorPicker`, `DatePicker`, `AlertDialog` und `Tooltip`.
- **Eigener localStorage pro Resource**: Jede NUI hat ihren eigenen Origin (`https://cfx-nui-__NAME__/`). Deshalb
  `ThemeProvider storage={false}`; was mehrere Resources teilen sollen, kommt vom Server.
- **Relative Pfade**: `base: "./"` in `vite.config.ts`, sonst findet FiveM die Assets nicht. Neue Dateiarten
  außerhalb von `web/dist/assets` müssen in `files { ... }` im `fxmanifest.lua` stehen.
- **Transparenter Hintergrund**: Die Seite liegt über dem Spiel; `html` und `body` bleiben transparent, nur das
  Fenster hat eine Fläche. Außerdem setzt preUI hier kein `color-scheme` (`createPreuiPreset({ colorScheme: false })`
  und `<ThemeProvider colorScheme={false}>`) – mit `color-scheme: dark` malt Chromium hinter einem iframe (so zeigt
  FiveM NUI-Seiten an) eine undurchsichtige dunkle Fläche über das Spiel.
- **Fokus**: `SetNuiFocus(true, true)` gibt der UI Maus und Tastatur. Jeder Weg zum Schließen muss den `close`-Callback
  treffen, sonst bleibt der Spieler hängen (`useNuiVisibility` macht das bei Esc und `close()`).
