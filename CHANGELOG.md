# Changelog

All notable changes to `@pre_scripts/preui`. Below 1.0 a minor version (0.4 → 0.5) may contain breaking or visible
changes; a patch version never does. The NUI helpers have their own section at the end.

## 0.10.0 — 2026-10-08

### Removed

- **Game components:** `HudStatus`, `HudStatusGroup`, `HudSpeedometer`, `HudContainer` (with `hudAnchors`,
  `getHudPositionStyle`, `useHudStatus`, `getHudStatusLevel`), `RadialMenu` (`defaultRadialMenuLabels`),
  `SkillCheck` (`useSkillCheck`, `useSkillCheckGame`, `getSkillCheckProgress`, `skillCheckDifficulties`,
  `resolveSkillCheckDifficulty`, `defaultSkillCheckLabels`) and `ListMenu` (all `ListMenu*` parts, `useListMenu`,
  `listMenuItemVariants`, `listMenuItemIconVariants`). They are to be rebuilt where they are needed.
- `isOverlayOpen` no longer checks for a RadialMenu submenu.

### Stays

- `KeybindHint`, `KeybindHintBar`, `KeybindInput`, `ProgressCircle`, `BentoGrid`, `Kanban`.
- `useListNavigation` (same API, now in `src/utils`): keyboard lists with your own markup; `Item` shows
  `data-highlighted`.
- The ThemeEditor's game sample uses `ProgressCircle`, `Progress` and `Item` rows instead of HUD rings and the list
  menu.

## 0.9.1 — 2026-10-07

- **ThemeEditor**: while panels are see-through, the split preview shows a backdrop of flat shapes in the theme
  colours — on a plain dark pane the panel opacity was invisible. Accent strength goes up to 300 %.
- **ThemeEditor fonts**: without `fonts` the editor offers the two fonts preUI ships, Inter (the default) and
  JetBrains Mono (`defaultThemeEditorFonts`); `fonts={[]}` hides the section. Before, the section only showed with
  `fonts`.
- The Glass preset is plain transparency, no blur: `backdrop-filter` flickers permanently in FiveM's CEF 103. A test
  (`src/nui-safety.test.ts`) keeps it out of every component.
- `package.json`: bin path without `./` (npm corrected it on publish).

## 0.9.0 — 2026-10-07

### ThemeEditor

- **Style section** with sliders for corner radius, **panel opacity** (see-through panels, e.g. over the game),
  **accent strength**, **borders** and **shadows**. Each is one new shared token (below), each resets on its own.
- **Presets are the whole look:** a preset sets every style value (radius, opacity, accent, borders, shadows — the
  default where it sets none), so picking "preUI" also resets the radius. The other shared tokens you set (a font)
  stay. New preset **Glass** (see-through panels). Police, Amber and Mono now have their own radius.
- **Undo / redo** (buttons and Ctrl+Z / Ctrl+Y / Ctrl+Shift+Z; a slider or colour drag is one step),
  **"Unsaved changes"** and **"Discard changes"** (back to `savedValue`, or what the editor opened with, then the
  last `onSave`).
- **Fix** next to a field with a contrast problem: nudges its lightness until all its pairs are readable.
- **From dark** in the Light tab: takes the accent and status colours of the dark scheme and makes them readable on
  light.
- **Import** (`importable`, `onImport`): paste a theme as JSON; size, shape and version are checked, unknown tokens
  and invalid colours are left out and listed; applied as one undoable change.
- **Save as preset** (`onSavePreset`): the current theme with a name, for you to store and pass back in `presets`.
- **All colours** (collapsed): every colour token of the edited scheme, each with a colour picker and reset.
- **Game sample** in the split preview (switch "Interface" / "Game"): HUD rings and bars, progress, a list menu, a
  notification, key hints. `ThemeEditorPreview` takes `sample="game"`; texts in `labels.sample.game`.
- **`sections`** shows only the parts you list (`"presets" | "scheme" | "colors" | "contrast" | "style" | "font" |
  "advanced" | "import" | "export"`).
- **Fonts with files:** `fonts={[{ label, value, src: "fonts/x.woff2", weight? }]}` — no import in code; the file is
  loaded when the font is picked and stored in the theme's new `fonts.sans`, so every UI that receives the theme
  loads it too.
- The section "Shape & font" is split into "Style" and "Font" (`labels.shared` is now the font heading). New labels
  for all of the above (English defaults).

### Theme

- `ThemeConfig.fonts` (optional, protocol still v1): `{ sans?, mono? }` with `{ family, src, weight?, style? }`.
  `loadThemeFonts(config)` / `loadThemeFont(font)` load them with the FontFace API (Chromium 103 included).
- New shared tokens, all `1` by default (no visible change): `--pui-surface-opacity` (multiplied into the page,
  window, card and popover colours), `--pui-tint-scale` (into every tint), `--pui-border-opacity` (into the border
  colour), `--pui-shadow-scale` (into the shadow alphas).

### Components

- **Badge**: `icon`, and `reveal="hover"` — only the icon shows, the text slides open after `revealDelay` (500 ms)
  while the badge or, with `revealGroup`, its `group` parent is hovered or focused; closes at once. Measured width
  (also after the fonts load), Chromium 103 safe.
- **Table / DataTable** `reserveTrack` (`"horizontal" | "vertical" | "both" | boolean`): room for a scrollbar
  instead of letting it float over the last row / column. **ScrollArea** `reserveTrack` takes the same values.
- **Toaster** `actions={false}` hides the action buttons (overlays nothing can be clicked on).
- **KeybindHintBar** `variant="panel"`: looks like a HUD panel (window surface and shadow, theme radius).
- **Separator** (vertical) stretches to the height of a flex row whose height comes from its content (it was 0 px).
- `npx preui check-version`: stops a build when an installed `@pre_scripts/*` package doesn't match `package.json`
  (exact pins equal, `^` / `~` satisfied) — `"prebuild": "preui check-version"`.

## 0.8.0 — 2026-10-07

### Visible changes

- **Violet is the default accent.** `--pui-primary` and `--pui-ring` are the former "Violet" preset: dark
  `255 92% 76%` (`#a78bfa`), light `263 70% 50%` (`#6d28d9`). Everything else stays — surfaces, status colours, the
  text on primary (contrast ≥ 4.5:1 in both schemes, tested). Buttons, links, focus rings, selected items, charts
  (`--pui-chart-primary`) and every `bg-pui-primary/tint` follow.
- **Presets:** `default` ("preUI") is now violet; the old blue is the new `blue` preset (`#4b8df7` / `#2463eb`, exactly
  the former defaults); the `violet` preset is gone (it is the default now). Saved themes are copies, not preset
  references, so nothing saved changes.

To keep the blue look: pick the "Blue" preset, or set `primary` / `ring` in your tokens
(`tokens={{ dark: { primary: "#4b8df7", ring: "#4b8df7" }, light: { primary: "#2463eb", ring: "#2463eb" } }}`).
A `preui.css` written earlier by `npx preui init` is yours and keeps its colours.

## 0.7.1 — 2026-10-01

- **CodeEditor / MarkdownEditor**: AltGr characters type again. Windows reports AltGr as Ctrl + Alt, so on German
  (and similar) keyboards `[`, `]` and `\` ran CodeMirror shortcuts instead (Ctrl+Alt+[ / ] fold all / unfold all,
  Ctrl+Alt+\ re-indent). AltGr input now always types; brackets still auto-close. All other preUI inputs were
  already fine (checked with every German special character in every playground field in Chromium 103).
- **Table** (also DataTable): the vertical scrollbar starts below the sticky header instead of running beside it.
  The header height is measured into `--pui-table-header-height` on the container (0 without a header); the
  horizontal scrollbar is unchanged.

## 0.7.0 — 2026-09-29

### Added

- **Badge** `surface="solid"`: an opaque badge for pictures, videos and the game world. The variant's tint is laid
  over `background` as a flat colour (Chromium 103 has no `color-mix()`); `secondary` and `outline` become plain
  `background`.
  Text contrast stays ≥ 4.5:1 on the default tokens (tested). `data-surface` on the element.

- The npm package now ships this `CHANGELOG.md` (`node_modules/@pre_scripts/preui/CHANGELOG.md`), so tools and AI
  assistants in your project can read what changed without the repo.

### Changed

- **TabsContent** (visible in some layouts): `flex-auto` instead of `flex-1`. It still fills a taller `Tabs`, but an
  explicit height like `h-96` on the panel now applies — `flex-1`'s zero basis ignored it. If you worked around that
  with `flex-none`, you can drop it.

## 0.6.2 — 2026-09-27

- **Toaster**: toasts close on their timeout again after a FiveM UI closes. Base UI pauses every toast timer while the
  window has no focus and resumes only on the next focus; NUI loses focus with `SetNuiFocus(false)` and doesn't get it
  back while playing, so a toast that was open stayed forever (also when the cursor was over it). New
  `pauseWhenUnfocused` — default `false` in FiveM NUI (detected by `GetParentResourceName`), `true` elsewhere (a toast
  shown while you are in another tab still waits for you). Nothing to change in your resources.
- `toast(…, { closeButton })`: show or hide the × on one toast, over the `Toaster`'s `closeButton`.

## 0.6.1 — 2026-09-25

- **Toaster** `closeButton` (default `true`): `<Toaster closeButton={false} />` hides the × button on every toast.
  Toasts still close on their timeout, by swipe, with an action or `toast.dismiss(id)`.

## 0.6.0 — 2026-09-25

### Added

- **ThemeEditor**: one theme editor for websites and FiveM NUI — presets (`defaultThemePresets`, all passing the
  contrast check in both schemes), default scheme, base colours per scheme, radius, font, contrast always visible for
  both schemes (status, pair list, inline badges), reset, save, CSS/JSON export, live preview. It edits a
  `ThemeConfig` (theme protocol v1), so FiveM saves it to `GlobalState.theme` without conversion.
  `layout="split"` makes it a large editor: controls on the left, a preview pane on the right with sample content
  (`ThemeEditorPreview`, texts in `labels.sample`) or your `previewSlot`, always in the edited colours.
- `ThemeConfig`, `ThemePreset`, `resolveThemeConfig`, `resolveThemePalette`, `resolveThemeConfigTokens`,
  `checkThemeConfigContrast` (also from `/tailwind`).

### Changed

- Palettes no longer need `primary`, only emit tokens that differ from the defaults, and no longer override
  `tokens.shared` (radius / fonts were silently replaced by the derived scheme block). With a `data-theme` active,
  tokens the palette doesn't change now keep coming from the theme.
- **HudSpeedometer** (visible): unit and gear share one row under the speed, and the fuel bar sits in the arc's
  opening, as wide as the opening — the gauge reads as one instrument.

## 0.5.1 — 2026-09-23

- **RadialMenu**: the centre text no longer runs past the centre circle. The centre content is the square inscribed
  in the circle and clips; the default label keeps one line when a description is shown, the description two lines
  (with "…"). Content from `renderCenter` is clipped to the same square — clamp your own texts (`line-clamp-*`).

## 0.5.0 — 2026-09-23

### Visible changes

- **Readable default colours.** Seven token pairs were below the WCAG AA contrast of 4.5:1 and are fixed:
  - Dark: `--pui-primary-foreground`, `--pui-positive-foreground` and `--pui-negative-foreground` are now dark
    text (`225 12% 9%`, like warning and info already were) — 5.00 / 7.80 / 5.05 instead of 3.46 / 2.22 / 3.44.
    Solid buttons, checked checkboxes, the selected calendar day and other filled primary surfaces now show dark text.
  - Light: `--pui-positive` `158 82% 30%` → `29%` (4.56) and `--pui-warning` `32 95% 40%` → `36%` (4.51), which fixes
    both the colour as text and the white text on it.

- **Readable text on tinted surfaces.** `text-pui-<status>` on `bg-pui-<status>/tint` (badges, alerts, tinted
  buttons) reached only 3.97–4.27:1 for some colours. Adjusted by 2–3 % lightness, now ≥ 4.5:1 everywhere (tested):
  dark `--pui-primary` / `--pui-ring` `60%` → `63%`, `--pui-negative` `62%` → `65%`; light `--pui-positive` `29%` →
  `26%`, `--pui-negative` `50%` → `47%`, `--pui-warning` `36%` → `33%`, `--pui-info` `36%` → `34%`.

  If you pinned the old look, set these tokens back in your own CSS.
- **Toaster** takes a `position` prop (`top-left` … `bottom-right`); the default `bottom-right` is unchanged.

### Fixed

- **Opening a modal no longer scrolls the page.** Base UI focused the first field with a plain `focus()`, which scrolled
  ancestors and the page around an iframe (NUI pages, embedded widgets). preUI now focuses the same target with
  `preventScroll`.
- **Tree-shaking.** Every module-level `forwardRef` / `memo` / `cva` / `createContext` call is now marked
  `/* @__PURE__ */`. Bundlers that don't analyse React calls (Rollup, i.e. Vite ≤ 7, webpack) used to keep the whole
  library: a `Button`-only import was 1.3 MB unminified, now 113 kB; the example FiveM editor went from 803 kB to
  462 kB of JS. A test (`src/tree-shaking.test.ts`) keeps it that way.

### Added

- **`colorScheme: false`** for `createPreuiPreset`, `tokensToCss`, `ThemeProvider`, `ThemeScript` / `getThemeScript`
  and `npx preui init --no-color-scheme`: no CSS `color-scheme` on `<html>`. Needed in **FiveM NUI**, where Chromium
  paints an opaque background behind an iframe whose color-scheme differs from its parent's — with the default
  `color-scheme: dark` the whole screen turned dark over the game.
- **RadialMenu**: interaction wheel with submenus, pointer angle selection, keyboard, `onSelect(item, path)`; own looks
  via `renderItem`, `renderCenter`, `classNames` per part, `startAngle` / `gap` / `outerPadding`, and per item
  `tone`, `description`, `className`.
- **SkillCheck** + `useSkillCheck()`: the timing minigame (ox_lib difficulties, rounds, promise API); ring or `bar`
  variant, `zoneTone` / `indicatorTone`, `classNames`, `renderContent`, and the headless `useSkillCheckGame()` for
  completely custom minigames.
- **KeybindInput**: "press a key" field with modifiers, plus `formatKeybind`, `keybindFromEvent`, `matchesKeybind`.
- **HudStatus**, **HudStatusGroup**, **HudSpeedometer**: player stats as ring / bar / pill with warning and critical
  thresholds (numeric sizes, `thickness`, `classNames`, `renderValue`, headless `useHudStatus()` for own visuals),
  and a speedometer with `ticks`, `redlineFrom`, `renderSpeed` and `classNames`.

- **Runtime theming**: `applyTokens({ shared, dark, light })` sets tokens live (hex, `rgb()`, `hsl()` or HSL
  channels; one reused `<style>`, per scheme, outranks `[data-theme]` rules), `clearTokens()`,
  `runtimeTokenSelectors`, `toHslChannels()`. `<ThemeProvider tokens={…}>` does the same declaratively.
  `tokensToCss({ tokens })` renders such overrides as CSS for export or build time.
- **`deriveTokens(base, scheme)`**: a complete token set from 1–8 base colours (primary, background, foreground,
  status colours); every `*-foreground` reaches at least 4.5:1. The default primary reproduces the default tokens exactly.
- **Contrast**: `getContrast(fg, bg)` (WCAG 2.x), `getContrastLevel(ratio)`, `checkTokenContrast(tokens)` with a
  fixed pair list (`contrastPairs`), and the `ContrastBadge` component.
- **Theme storage**: `<ThemeProvider storage={myStorage}>` (`ThemeStorage`: `get` / `set` / optional `subscribe`) or
  `storage={false}` (state only). Neither touches localStorage; `ThemeScript` / `getThemeScript` accept `storage` too.
- **BentoGrid**: `BentoGrid` + `BentoCard` (`colSpan` / `rowSpan`, link or button cards via `render`) with the parts
  `BentoCardVisual`, `BentoCardContent`, `BentoCardIcon`, `BentoCardTitle`, `BentoCardDescription`; stacks below `md`
  unless `responsive={false}`.
- **Kanban**: `Kanban`, `KanbanColumn`, `KanbanColumnHeader`, `KanbanColumnTitle`, `KanbanColumnContent`, `KanbanCard`
  — pointer and keyboard drag & drop between columns (works in CEF), drop line, auto-scroll, live announcements;
  `moveKanbanItem` applies a move to your state.
- **ListMenu** (`ListMenuHeader`, `ListMenuContent`, `ListMenuGroup`, `ListMenuLabel`, `ListMenuItem`,
  `ListMenuSeparator`, `ListMenuFooter`, `useListMenu`) and the headless **`useListNavigation`** hook for keyboard-driven
  game menus, with a window-keyboard mode for NUI. `Item` shows a `data-highlighted` state.
- **`useWindowToggle`, `useEscapeKey`, `isOverlayOpen`**: Escape closes a window only after the popups inside it;
  toggle and open keys (F1 …), key repeats and typing ignored.
- **Overlays in frames**: `container`, `contained`, `overlay` and `overlayClassName` on `DialogContent`,
  `AlertDialogContent`, `SheetContent`, `DrawerContent` and `CommandDialog`; `container` on Popover, Tooltip, HoverCard,
  Select, Combobox, Autocomplete, DropdownMenu, ContextMenu and NavigationMenu contents; new parts `DialogPopup`,
  `AlertDialogPopup`, `SheetPopup`, `DrawerPopup`.
- **KeybindHint**: `render` (clickable hints), `size="sm"`, `interactive`; `KeybindHintBar` takes `render`.
- **DatePicker / DateRangePicker** work as `Field` controls (label, description / error, `Field disabled` / `invalid`)
  and take an `invalid` prop. **DataTable**: `onRowActivate` (click + Enter / Space, focusable rows), `onRowClick`,
  `getRowProps`, `meta.rowActivation: false`; clicks on controls inside a row are ignored. **SidebarMenuBadge**:
  `variant` (`default | secondary | positive | warning | destructive | info`) and `sidebarMenuBadgeVariants`.
- **Game UI components**: `ProgressCircle`, `KeybindHint` + `KeybindHintBar`, `HudContainer` (nine anchors + offset,
  changeable at runtime).
- Types `PreuiTokens`, `PreuiTokenName`, `PreuiScheme` are now also exported from the main entry.
- `/tailwind` also exports `deriveTokens`, the contrast helpers, `runtimeTokenSelectors` and `toHslChannels`.

### Changed

- `@base-ui/react` is pinned to `~1.8.0` (patch updates only): the DatePicker's Field integration uses Base UI's
  `internals/` modules, which may change in a minor release.
- The token values moved from `src/tailwind/preset.ts` to `src/tailwind/tokens.ts` (still exported from `/tailwind`,
  no API change).
- Readme: runtime theming, own storage, game UI, versioning rule and why preUI stays on Tailwind v3 (Chromium 103).

## 0.4.1 — 2026-09-22

- ScrollArea: contains the scroll only on axes that overflow — a table that only scrolls sideways no longer swallows
  the mouse wheel of the page behind it.

## 0.4.0 — 2026-09-22

- ColorPicker drawn in the DOM (no native popup, works in FiveM/CEF): area, hue, optional alpha, hex input, swatches,
  eye dropper where supported; popover or inline. Colour helpers (`parseColor`, `hexToHsl` …) exported.
- TabsBar: the tab list scrolls horizontally instead of pushing the action out of the bar on narrow screens.
- Readme: no native browser popups in FiveM.

## 0.3.0 — 2026-09-22

- Light token set under `[data-scheme="light"]`; dark stays the default.
- `ThemeProvider`, `useTheme`, `ThemeScript` / `getThemeScript` (no flash on load), `ThemeToggle`, `ThemeSelect`;
  light- or dark-only themes lock the toggle.
- Themes override only what they change: `[data-theme="x"]` plus optional `[data-theme="x"][data-scheme="light"]`.
- Chart configs accept light/dark keys; new tokens `--pui-scrim`, `--pui-thumb`, `--pui-shadow-thumb`.
- `npx preui init --scheme dark|light|both`; `tokensToCss({ scheme })`.

## 0.2.0 — 2026-09-22

- SSR safety: media queries via `useSyncExternalStore`, deterministic skeleton width, `RichTextEditor`
  `immediatelyRender={false}` by default, `en-US` default locale for DatePicker, Progress, Meter, Slider, NumberField
  and chart tooltips.
- Chromium 103 (FiveM/CEF): no `:has()` dependency, `-webkit-mask-image`, `translate` fallback, build target
  `chrome103`.
- Tailwind preset: plain `require()` works again in CommonJS.
- ScrollArea: vertical areas no longer grow wider than their viewport.
- Progress indeterminate state, `aria-invalid` on Input/Textarea, accessibility fixes.

## 0.1.1 — 2026-09-21

- Calendar: always six weeks (`fixedWeeks` defaults to `true`), filler weeks stay empty, outside days never show the
  selection, range ends round at the month edge.

## 0.1.0 — 2026-09-21

- First release: all Base UI components plus the shadcn components Base UI lacks, subpath entries for heavy
  dependencies, design tokens (preset, `tokens.css`, `npx preui init`), `data-slot` on every part.

---

## @pre_scripts/preui-nui

### 0.4.0 — 2026-10-07

- `NuiToastRelay`: shows notifications Lua hands to this NUI (`readyEvent` called once, then `action` messages with
  `{ title?, description, type, duration, position }`); its own `Toaster`, close button and actions off by default.
- `installAltGrFix()`: types AltGr characters (`{ } [ ] \ @ € ~ |`) the NUI dropped; does nothing where the
  browser typed them itself, and leaves fields alone that handled the key (the CodeEditor).
- `thirdPartyLicenses({ dir })`: also keeps a licenses folder (e.g. `"../LICENSES"`): one `<scope>-<name>-LICENSE.txt`
  per package plus `THIRD_PARTY.md`; stale files removed, `*-LICENSE.manual.txt` kept. `fileName: false` skips the
  file in `dist`.
- `NuiThemeBridge` loads the theme's font files (`fonts`). Peer `@pre_scripts/preui >=0.9.0`.

### 0.3.1 — 2026-09-30

- `@pre_scripts/preui-nui/vite`: `thirdPartyLicenses()` Vite plugin writes `dist/THIRD_PARTY_LICENSES.txt` — name,
  version, license and license text of every npm package in the bundle (fonts included), as MIT / Apache-2.0 / OFL
  ask when the code is passed on. Vite 7 and 8.

### 0.3.0 — 2026-09-29

- Ships the MIT `LICENSE` in the package (it was missing, so license checks warned).
- `NuiTextsProvider` / `useNuiTexts()`: the server's texts from a `getTexts` callback (flat or nested Lua tables),
  live updates via `setTexts`, merged over a `fallback`. `t(key, values)` fills `{name}` placeholders, `t.plural(key,
  count)` picks `key_one` / `key_other` / … by `Intl.PluralRules` (optional `key_zero`). Also `createNuiTexts`,
  `flattenTexts`, `formatText`.
- `useNuiMoney()` / `formatMoney()`: the currency format asked once from a `getCurrency` callback (`{ format =
  '${amount}', decimals }`, live via `setCurrency`), then every amount is formatted in the UI.

### 0.2.0 — 2026-09-25

- `NuiThemePayload` is now `ThemeConfig` from `@pre_scripts/preui`; `resolveThemeTokens` uses `resolveThemeConfig`
  (palettes without `primary` work). Peer `@pre_scripts/preui >=0.6.0`.

### 0.1.0 — 2026-09-23

- `fetchNui`, `useNuiEvent`, `useNuiVisibility` (Escape closes only after popups inside the page, via preUI's
  `isOverlayOpen` — a shown tooltip no longer swallows it; `toggleKeys` for browser development), `isEnvBrowser`, `getResourceName`, `debugData`, `useNuiLocale`
  (server language via a `getLocale` callback / `setLocale` messages), `normalizeLocale`.
- `<NuiThemeBridge />` and theme message protocol v1 (`setTheme` / `getTheme`, `palette` via `deriveTokens`).
- Example resource `examples/fivem-theme` (fxmanifest, Lua, Vite project with an in-game theme editor).

## @pre_scripts/create-preui-nui

### 0.2.1 — 2026-10-08

- New resources depend on `@pre_scripts/preui` `^0.10.0`.

### 0.2.0 — 2026-10-07

- `--exact`: pins the `@pre_scripts` packages to exact versions.
- `"prebuild": "preui check-version"` in every new resource.
- The licenses also go to `LICENSES/` in the resource (`thirdPartyLicenses({ dir: "../LICENSES" })`).
- New resources depend on `@pre_scripts/preui` `^0.9.0` and `@pre_scripts/preui-nui` `^0.4.0`.

### 0.1.5 — 2026-10-07

- New resources depend on `@pre_scripts/preui` `^0.8.0`.

### 0.1.4 — 2026-10-01

- New resources depend on `@pre_scripts/preui` `^0.7.1`.

### 0.1.3 — 2026-09-30

- New resources write `web/dist/THIRD_PARTY_LICENSES.txt` on every build (`thirdPartyLicenses()` in
  `vite.config.ts`); they depend on `@pre_scripts/preui-nui` `^0.3.1`.

### 0.1.2 — 2026-09-29

- Ships the MIT `LICENSE` in the package (it was missing, so license checks warned).
- New resources depend on `@pre_scripts/preui` `^0.7.0` and `@pre_scripts/preui-nui` `^0.3.0`.
- `vite.config.ts` marks Base UI's `fastComponent` / `fastComponentRef` as pure
  (`treeshake.manualPureFunctions`): with Vite 8 (Rolldown) unused Dialog / Menu / Popover / PreviewCard / Tooltip
  code no longer ends up in the bundle (the starter's app: 122 → 108 kB gzip). Vite 7 (Rollup) already dropped it.

### 0.1.1 — 2026-09-27

- New resources depend on `@pre_scripts/preui` `^0.6.2` and `@pre_scripts/preui-nui` `^0.2.0` (were `^0.5.0` /
  `^0.1.0`). A test keeps the template on the current versions from now on.

### 0.1.0 — 2026-09-23

- `npm create @pre_scripts/preui-nui@latest <name> -- [--lang de|en] [--no-theme] [--force]`: scaffolds a FiveM NUI
  resource (fxmanifest, client.lua, Vite + React + preUI for Chromium 103, theme bridge, browser mocks).
