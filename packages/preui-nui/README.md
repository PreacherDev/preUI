# @pre_scripts/preui-nui

FiveM NUI helpers for [preUI](../../readme.md): talking to Lua, developing in a normal browser, and one live theme
for every resource on the server. Kept out of the core package so preUI stays lean outside of FiveM.

```bash
npm install @pre_scripts/preui @pre_scripts/preui-nui
```

No dependencies besides `react` and `@pre_scripts/preui` (peer dependencies). Compiled for Chromium 103 (FiveM NUI).

## API

| Export | Purpose |
|---|---|
| `fetchNui<T>(event, data?, mock?)` | `POST https://<resource>/<event>` with `data` as JSON (resource name from `GetParentResourceName()`), resolves with the callback's result. In a browser nothing is sent and `mock` is returned. |
| `useNuiEvent<T>(action, handler)` | Calls `handler(data)` for every `window` message `{ action, data }` with that action (`SendNUIMessage` in Lua). |
| `useNuiVisibility({ closeOnEscape, initialVisible, action, closeEvent, toggleKeys })` | `{ visible, setVisible, close }`: follows `setVisible` messages (`data: boolean`); Escape (or `close()`) hides the UI and calls `fetchNui("close")` so Lua can release the focus. An Escape inside an open Select / Dialog / menu closes only that popup. `toggleKeys` (e.g. `["F1"]`) show and hide the page in a browser during development and are ignored in the game. |
| `isEnvBrowser()` | `true` outside FiveM (browser, Vite dev server, tests, server rendering). |
| `getResourceName()` | `GetParentResourceName()`, or `"nui-frame-app"` in a browser. |
| `debugData([{ action, data }], delay?)` | Sends mock messages in a browser (no-op in game), one every `delay` ms (default 1000). |
| `<NuiThemeBridge />` | Applies the server theme: listens for `setTheme`, asks `getTheme` once on mount, sets tokens / scheme / theme. |
| `resolveThemeTokens(payload)` | Turns a payload's `palette` + `tokens` into one `applyTokens` input. |
| `useNuiLocale({ event, action, fallback, mock })` | `{ locale, language, ready }` — the server language from the `getLocale` NUI callback, updated by `setLocale` messages. Use it for preUI's `locale` props and to pick your texts / `labels`. |
| `normalizeLocale(value)` | `"de_DE"` → `"de-DE"`; `null` for anything that isn't a locale. |

```tsx
// main.tsx
import { ThemeProvider } from "@pre_scripts/preui";
import { NuiThemeBridge, debugData, fetchNui, useNuiEvent, useNuiVisibility } from "@pre_scripts/preui-nui";

debugData([{ action: "setVisible", data: true }]); // browser only: open the UI right away

function App() {
  const { visible } = useNuiVisibility({ toggleKeys: ["F1"] }); // F1 reopens in the browser only
  const [cars, setCars] = useState<Car[]>([]);
  useNuiEvent<Car[]>("setCars", setCars);
  const buy = (id: number) => fetchNui("buyCar", { id }, { ok: true });

  return (
    // storage={false}: the server is the source of truth, not this resource's own localStorage
    // colorScheme={false}: keeps the NUI iframe transparent (see "Things to know")
    <ThemeProvider storage={false} colorScheme={false}>
      <NuiThemeBridge mock={{ scheme: "dark" }} />
      {visible && <Shop cars={cars} onBuy={buy} />}
    </ThemeProvider>
  );
}
```

`NuiThemeBridge` must sit inside a `ThemeProvider` (it uses `useTheme`). Props: `action` (default `"setTheme"`),
`getThemeEvent` (default `"getTheme"`, `false` to skip), `mock` (what `getTheme` returns in a browser), `tokensId`
(`<style>` id, see `applyTokens`) and `onThemeChange(payload)`. Its token overrides are removed on unmount.

## Theme message (protocol v1)

The same object travels in both directions: Lua pushes it with `SendNUIMessage` and returns it from the `getTheme`
NUI callback. Other core libraries can implement it the same way.

```lua
SendNUIMessage({
  action = 'setTheme',
  data = {
    v = 1,                     -- protocol version
    scheme = 'dark',           -- 'dark' | 'light' | 'system'
    theme = '',                -- data-theme name; '' removes it (Lua tables can't hold nil)
    palette = {                -- base colours per scheme, expanded with deriveTokens
      dark = { primary = '#f97316', background = '#101418' },
      light = { primary = '#c2410c' },
    },
    tokens = {                 -- explicit overrides (applyTokens format), win over palette
      shared = { radius = '0.75rem' },
      dark = { ['--pui-ring'] = '#ffffff' },
    },
  },
})
```

| Field | Type | Meaning |
|---|---|---|
| `v` | `1` | Protocol version. Newer versions log a warning; known fields still apply. |
| `scheme` | `"dark" \| "light" \| "system"` | Left out → the current scheme stays. |
| `theme` | `string \| null` | Named theme (`data-theme`). `""` or `null` removes it; left out → stays. |
| `palette` | `{ dark?, light? }` of `{ primary, background?, foreground?, positive?, negative?, destructive?, warning?, info? }` | Expanded per scheme with `deriveTokens`. |
| `tokens` | `{ shared?, dark?, light? }` | Token overrides; colours as hex / `rgb()` / `hsl()` / channels, names with or without `--pui-`. |

The message is the **complete** theme state (like `GlobalState.theme`): when neither `palette` nor `tokens` is
present, the runtime overrides are removed and the preUI defaults (or your `data-theme` rules) apply again. Every value
is validated in the browser — invalid colours and unsafe values are dropped — but only let trusted players change the
theme (ACE permission on the server).

### Lua side

The Lua counterpart lives in your core resource, not in preUI. Minimal version (see
[`examples/fivem-theme`](../../examples/fivem-theme) for a complete resource with an in-game editor):

```lua
-- server: one theme for everyone
GlobalState.theme = { v = 1, scheme = 'dark', theme = '' }

-- client, in every resource with a preUI NUI (e.g. client_script '@preui_theme/bridge.lua')
RegisterNUICallback('getTheme', function(_, cb) cb(GlobalState.theme or {}) end)
AddStateBagChangeHandler('theme', 'global', function(_, _, value)
  SendNUIMessage({ action = 'setTheme', data = value or {} })
end)
```

`SendNUIMessage` only reaches the NUI frame of the resource that calls it — that's why every resource needs the
client part (an `@resource/file.lua` include keeps it in one place).

## Things to know in FiveM

- **Keep the page transparent**: FiveM shows NUI pages in an iframe, and Chromium paints an opaque background behind
  an iframe whose `color-scheme` differs from its parent's. Use `createPreuiPreset({ colorScheme: false })` and
  `<ThemeProvider colorScheme={false}>`, otherwise preUI's `color-scheme: dark` darkens the whole screen.
- **Language**: `useNuiLocale()` + a `getLocale` callback in Lua
  (`RegisterNUICallback('getLocale', function(_, cb) cb(GetConvar('ox:locale', 'en')) end)`, included in the
  example's `bridge.lua`).
- Build for the engine: `build: { target: "chrome103" }` in `vite.config.ts`, `base: "./"` for relative asset paths.
- Each resource's NUI has its own origin (`https://cfx-nui-<resource>/`) and its own localStorage — that's why the
  theme comes from the server and the provider uses `storage={false}`.
- Until `getTheme` answers, the page shows the `ThemeProvider` defaults. Keep the UI hidden until `setVisible` (as
  `useNuiVisibility` does) and the first paint already has the server theme.
- `useNuiVisibility` closes on Escape only when no popup inside the page owns the key (preUI's `isOverlayOpen`): the
  first Escape closes an open Select, menu or dialog, the next one closes the UI. Toasts and tooltips don't count.
  For a window inside the page (not the whole page), use `useWindowToggle` from `@pre_scripts/preui`.
- Developing in a browser: `useNuiVisibility({ toggleKeys: ["F1"] })` reopens the page after Escape. In the game, Lua
  opens it (a keybind or command sending `setVisible`), so the keys are ignored there.
- No native popups in CEF: use preUI's `Select`, `DatePicker`, `ColorPicker`, `AlertDialog` instead of `<select>`,
  `<input type="date|color">` or `alert()`.

## Development

Built with tsdown; tests run from the repository root (`npm test` includes this package):

```bash
npm run build       # in packages/preui-nui
npm test            # in the repository root
```
