# @pre_scripts/create-preui-nui

Scaffolds a ready FiveM NUI resource with [preUI](../../readme.md): Lua (`fxmanifest.lua`, `client.lua`) plus a
Vite + React + Tailwind CSS v3 web UI built for Chromium 103, the engine inside FiveM.

```bash
npm create @pre_scripts/preui-nui@latest my-shop
```

`npm create @pre_scripts/preui-nui` runs this package (`@pre_scripts/create-preui-nui`). Without a name it asks for
one (default `my-nui`).

## Options

Pass options after `--`. Without it npm keeps them for itself: `--no-theme` is silently swallowed (you get the theme
bridge anyway) and `--lang en` can make npm abort.

```bash
npm create @pre_scripts/preui-nui@latest my-shop -- --lang en --no-theme
```

| Option | Meaning |
|---|---|
| `<name>` | Resource name and folder: lowercase letters, digits, `_` and `-`, starting with a letter or digit. |
| `--lang de\|en` | Language of the UI texts, the demo data and the resource's README. Default `de` (du-form). |
| `--no-theme` | Leave out the server-wide theme: no `dependency 'preui_theme'` / `@preui_theme/bridge.lua` in the manifest, no `<NuiThemeBridge />`. |
| `--force` | Write into a non-empty folder (files with the same name are overwritten). |
| `--help` | Usage. |

Without `--force` the starter refuses to write into an existing, non-empty folder.

## What you get

```
my-shop/
  fxmanifest.lua     cerulean, lua54, ui_page 'web/dist/index.html' (+ preui_theme bridge unless --no-theme)
  client.lua         /my-shop toggles the UI (SetNuiFocus + setVisible), NUI callbacks close and getData
  README.md          structure, dev workflow, deploy, FiveM pitfalls
  .gitignore         node_modules and web/dist (build before deploying)
  web/
    package.json     react 19, @pre_scripts/preui, @pre_scripts/preui-nui, vite, tailwindcss 3
    vite.config.ts   target chrome103, base "./", dedupe react
    tailwind.config.js, postcss.config.js, tsconfig.json, index.html
    src/main.tsx     fonts + debugData mock (the UI opens in a normal browser)
    src/App.tsx      ThemeProvider storage={false}, NuiThemeBridge, useNuiVisibility, a window with Card, Tabs,
                     Item list, Badge, Button, KeybindHint; data from fetchNui('getData', undefined, mock)
```

Then:

```bash
cd my-shop/web
npm install
npm run dev        # develop in the browser with mock data
npm run build      # → web/dist, which FiveM loads
```

`server.cfg`: `ensure preui_theme` (unless `--no-theme`) and `ensure my-shop`; in game `/my-shop` opens the UI.

`preui_theme` is the example resource in the preUI repository ([`examples/fivem-theme`](../../examples/fivem-theme)),
or any core resource implementing the theme protocol v1 of [`@pre_scripts/preui-nui`](../preui-nui/README.md).

## Development

No dependencies: `bin/create.mjs` uses only Node built-ins (Node ≥ 18) and copies `template/`. In the template,
`__NAME__` is replaced with the resource name, `__T_<KEY>__` with a text of the chosen language (table in
`bin/create.mjs`), lines between `@preui-theme:start` / `@preui-theme:end` markers are dropped with `--no-theme`,
`README.<lang>.md` becomes `README.md` and `_gitignore` becomes `.gitignore` (npm would drop a `.gitignore`).

```bash
# from the repository root
npx vitest run packages/create-preui-nui
node packages/create-preui-nui/bin/create.mjs my-test --lang en   # try it locally
```
