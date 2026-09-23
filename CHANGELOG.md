# Changelog

All notable changes to `@pre_scripts/preui`. Below 1.0 a minor version (0.4 → 0.5) may contain breaking or visible
changes; a patch version never does. The NUI helpers have their own section at the end.

## 0.5.0 — unreleased

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
- **Game UI components**: `ProgressCircle`, `KeybindHint` + `KeybindHintBar`, `HudContainer` (nine anchors + offset,
  changeable at runtime).
- Types `PreuiTokens`, `PreuiTokenName`, `PreuiScheme` are now also exported from the main entry.
- `/tailwind` also exports `deriveTokens`, the contrast helpers, `runtimeTokenSelectors` and `toHslChannels`.

### Changed

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

### 0.1.0 — unreleased

- `fetchNui`, `useNuiEvent`, `useNuiVisibility` (Escape closes only after popups inside the page, via preUI's
  `isOverlayOpen` — a shown tooltip no longer swallows it; `toggleKeys` for browser development), `isEnvBrowser`, `getResourceName`, `debugData`, `useNuiLocale`
  (server language via a `getLocale` callback / `setLocale` messages), `normalizeLocale`.
- `<NuiThemeBridge />` and theme message protocol v1 (`setTheme` / `getTheme`, `palette` via `deriveTokens`).
- Example resource `examples/fivem-theme` (fxmanifest, Lua, Vite project with an in-game theme editor).

## @pre_scripts/create-preui-nui

### 0.1.0 — unreleased

- `npm create @pre_scripts/preui-nui@latest <name> -- [--lang de|en] [--no-theme] [--force]`: scaffolds a FiveM NUI
  resource (fxmanifest, client.lua, Vite + React + preUI for Chromium 103, theme bridge, browser mocks).
