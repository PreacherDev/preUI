# preUI — notes for Claude

React component library (`@pre_scripts/preui`) on Base UI + Tailwind CSS **v3**, built for normal browsers and
**FiveM NUI (Chromium 103)**. Component rules live in [COMPONENT_GUIDE.md](COMPONENT_GUIDE.md) (German) — read it
before adding or changing a component. User-facing docs: [readme.md](readme.md), release notes: [CHANGELOG.md](CHANGELOG.md).

## Commands

```bash
npm test             # vitest (jsdom), whole repo incl. packages/preui-nui
npm run typecheck    # tsc --noEmit
npm run build        # tsdown → dist/, then patch-tailwind-cjs + tokens.css
npx vitest run src/components/<Name>   # one folder
```

If many tests suddenly fail with `Invalid Chai property: toHaveAttribute` (or similar jest-dom matchers), the shell
started vitest from `g:\…` (lower-case drive letter) and modules loaded twice — rerun from `G:\custom-ui-libraries\preUI`
(PowerShell) or rerun the same command; it is not a code problem.

## Layout

```
src/components/<Name>/     one folder per component (Name.tsx, Name.test.tsx, index.ts)
src/tailwind/tokens.ts     all token values (dark = tokens, light = lightTokens), sharedTokenNames, schemeSelectors
src/tailwind/preset.ts     Tailwind preset, tokensToCss, re-exports tokens + build-time theming helpers (/tailwind entry)
src/theming/               runtime theming: token-css (normalise + render overrides), apply-tokens (DOM),
                           derive (deriveTokens), contrast (getContrast, checkTokenContrast)
src/index.ts               main entry; heavy components only via their own entry (tsdown.config.ts)
packages/preui-nui/        separate package @pre_scripts/preui-nui (fetchNui, NUI hooks, NuiThemeBridge, useNuiLocale)
packages/create-preui-nui/ `npm create @pre_scripts/preui-nui` starter (bin/create.mjs + template/)
examples/fivem-theme/      example FiveM resource (Lua + Vite web) — not part of any package
```

## Rules that are easy to break

- **Chromium 103**: no `:has()` without the fallback hook, no container queries, `color-mix()`, `svh/dvh`, CSS nesting,
  individual `translate`/`scale`/`rotate`, unprefixed `mask-image`; no JS newer than Chrome 103 (`toSorted`,
  `Object.groupBy` …). No native popups (`<select>`, `<input type="color|date">`, `alert`) — they never render in CEF.
- **Tailwind stays v3** (v4 needs browser features Chromium 103 lacks). Write `data-[state]:` not v4 shorthands.
- **Tokens only**, never hex or Tailwind palette colours in components; every component must work in dark and light.
  New tokens go into both sets in `src/tailwind/tokens.ts` (a test checks equal keys).
- **Default colours must pass contrast**: `checkTokenContrast(tokens)` and `(lightTokens)` must stay ≥ 4.5:1 for every
  pair (tested in `src/theming/theming.test.ts`). `deriveTokens({ primary: <default primary> }, scheme)` must return the
  defaults exactly — recalibrate `derive.ts` when default tokens change.
- **Runtime overrides** use the `:root:root…` selectors in `runtimeTokenSelectors` (outrank `[data-theme][data-scheme]`);
  never set tokens as inline style on `<html>`.
- **SSR**: never read `window`/`document`/`localStorage`/`matchMedia` during render.
- **Tree-shaking**: module-level `forwardRef` / `memo` / `cva` / `createContext` calls need `= /* @__PURE__ */ …`, and no
  module-level side effects (`X.displayName = …`, top-level function calls). `src/tree-shaking.test.ts` enforces it —
  without it Rollup-based bundlers (Vite ≤ 7) pull in the whole library.
- **FiveM NUI transparency**: NUI pages must use `createPreuiPreset({ colorScheme: false })` and
  `<ThemeProvider colorScheme={false}>` (examples, starter template, docs). A `color-scheme` differing from the parent
  page makes Chromium paint the NUI iframe opaque — the whole screen goes dark.
- No hard-coded visible texts; English defaults as props (`labels`, `…Label`).
- No gradients on surfaces (the user prefers flat tiles). preUI has no inventory component on purpose — the server's
  ox_inventory (`C:\qbx_09\data\resources\ox_inventory`) is the inventory; `BentoGrid` covers tile layouts,
  `Kanban` boards with drag & drop (pointer events, never HTML5 DnD — unreliable in CEF).

## Checking in a real Chromium 103

The playground (`G:\custom-ui-libraries\preUI-playground`, not a git repo) links this folder. Build it for the engine
and drive it with Playwright + a Chromium 103 snapshot:

```bash
npx @puppeteer/browsers install chromium@1002410 --path "$TEMP/cr103"      # 103.0.5058
cd ../preUI-playground && npx vite build --target chrome103 --outDir "$TEMP/pg103"
npx vite preview --outDir "$TEMP/pg103" --port 5311
# playwright-core from the playground: chromium.launch({ executablePath: ".../chrome-win/chrome.exe" })
```

Pages: `/?demo=<name>` (one demo), `/?page=theme` (theme builder), `/?page=editor` (runtime theming live editor),
`/?page=showcases` (in-game scenes: each `src/showcases/<Name>Showcase.tsx` with `meta` runs as `?showcase=<id>` in a
transparent 1600×900 iframe over a game scene, like FiveM; `&scene=1` = full size with the scene). The iframe element
has `color-scheme: normal` — otherwise Chromium paints it opaque when the gallery page is dark.

**Automated:** `npm run test:chromium103` in `G:\custom-ui-libraries\preUI-playground` (or
`node e2e/chromium103.mjs [--only id,id] [--no-build] [--concurrency N]`; PowerShell's `npm` drops flags after `--`).
It caches Chromium 103.0.5058 in `%LOCALAPPDATA%\preui\chromium-103` and fails unless the UA says Chrome/103, builds
the playground with `vite build --target chrome103` against the current `preUI\dist` (run `npm run build` here first),
opens every `src/demos/*Demo.tsx` plus `?page=theme` / `?page=editor` in dark and light, and fails on console errors,
page errors, failed requests or empty demos. Report: `.chromium103/report/report.json` + `screens/*.png`. A build
error with `MISSING_EXPORT` means a demo imports something `src/index.ts` doesn't export. Intentional failing requests
go in `EXPECTED_FAILED_REQUESTS` in the script. Run it before releases and after CSS/JS changes that might use newer
browser features.

## When you change something

- Update [readme.md](readme.md), add a [CHANGELOG.md](CHANGELOG.md) entry, and update the docs site in
  `C:\Users\alexl\Desktop\preui-docs` (component pages, FiveM page).
- New component: playground demo in `preUI-playground/src/demos/<Name>Demo.tsx` (German texts, du-form).
- Versioning below 1.0: minor = may break / visibly change, patch = never.
- Commit or publish only when the user asks. The npm package ships source maps with `sourcesContent` on purpose
  (readable stack traces for users; they don't end up in users' bundles).
