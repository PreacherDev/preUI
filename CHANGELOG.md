# Changelog

All notable changes to `@pre_scripts/preui`. Below 1.0 a minor version (0.4 → 0.5) may contain breaking or visible
changes; a patch version never does. The NUI helpers have their own section at the end.

## 0.13.0 - 2026-10-12

### Updating from 0.12

- **RichTextEditor** shows two more buttons in the default toolbar (`image`, `table`). Pass your own `toolbar` list to
  keep the old one. Markdown with images and GFM tables now survives opening in the editor (before, both were dropped).
- **DataTableColumnHeader** in a reorderable table (`onRowMove`) cycles asc -> desc -> unsorted instead of asc <-> desc.
- **preui-nui `NuiToastRelay`**: a message's `position` now moves only that notification, not the whole stack. Update
  `@pre_scripts/preui-nui` to 0.7.0 together with preUI 0.13.0 (it needs `toast({ position })`).

### Added

- **`EditorWindow`** family for list-and-editor admin windows: `EditorList` (`EditorListHeader`, `EditorListTitle`,
  `EditorListAdd`, `EditorListContent`, `EditorListGroup` with headings, `EditorListItem` with summary, unsaved marker
  and muted state), `EditorDetail`, `EditorHeader` (title, unsaved badge, status / problem text in a fixed place,
  actions), `EditorUndoButton` / `EditorRedoButton` (tooltip with the step and shortcut), `EditorSaveButton`,
  `EditorDeleteButton`, `EditorDiscardButton`, `EditorCloseButton` (`hidden` keeps their space), `EditorContent`,
  `EditorSection`, `EditorTextField` and `EditorFieldCounter` (live length counter). Texts via `labels`.
- **`useDraftHistory(saved, options)`**: a draft with an unsaved check, labelled undo / redo steps (typing in one field
  is one step), entries via `key` (undo jumps back into the entry), app-driven steps (`record`, e.g. a server undo),
  `run` with a busy state and cooldown, `request` + `confirmProps` to confirm dropping unsaved changes, and Ctrl+Z /
  Ctrl+Y / Ctrl+Shift+Z outside text fields (FiveM's control characters too). Also exports `stableStringify`.
- **`ConfirmDialog`**: a ready-made yes/no question on top of `AlertDialog` (`destructive`, `onConfirm`, `onCancel`,
  `trigger`).
- **`SortableList`**, `SortableItem`, `SortableItemHandle` and `moveItem(list, from, to)`: a vertical list reordered
  with the pointer (other items slide live, a see-through copy follows, the scroll box scrolls at its edges) or the
  keyboard (Space / Enter lifts and drops, arrows / Home / End move, Escape cancels, every step announced via
  `labels`). Pointer events, no HTML5 drag and drop. The copy's opacity is `--pui-drag-preview-opacity` (0.6).
- **DataTable row reorder**: `onRowMove(from, to)` (indexes in `data`) adds a drag handle column (`createDragColumn`,
  `DataTableDragHandle`) with the same sliding and keyboard support; `rowMoveLabels` for all texts. Rows move within
  the current page; while the table is sorted or filtered the handles are disabled and say why. The header menu
  offers "Clear sort" (`clearSortLabel`).
- **`createSelectColumn({ scope: "filtered", max, isLocked })`**: the header selects every matching row across pages,
  up to `max` (other checkboxes turn disabled at the limit); `isLocked(row)` shows rows as checked and disabled
  ("already added") outside the selection.
- **`Combobox` / `Autocomplete` `virtualized`**: the list renders only the rows in view, so lists with thousands of
  items open instantly. Rows have a fixed `itemHeight` (default 32); grouped items get their label rows from the list
  (`renderGroupLabel`, `groupLabelHeight`); `overscan`. No extra dependency.
- **Table `reserveTrack="strip"`**: the horizontal scrollbar gets its own 10px strip below the rows (only while the
  table overflows sideways), so it never covers a row. New `viewportClassName`. `DataTable` accepts it too.
- **ThemeEditor**: saved presets can be renamed and deleted. Presets with `removable: true` (set by "Save as preset")
  get a menu on their tile; `onRenamePreset(preset, label)`, `onDeletePreset(preset)` (after a confirmation). Nothing
  moves. New labels.
- **Toast `position` per toast**: `toast("Saved", { position: "top-center" })` shows one toast at its own place. Each
  position gets its own stack on demand; timeout, `limit` (per stack), `pauseWhenUnfocused`, `closeButton` and
  `actions` apply there too. Toasts without `position` behave as before.
- **RichTextEditor images and tables**: inline and linked images, GFM tables with column alignment, Tab between cells
  (Tab in the last cell adds a row). Toolbar items `image` (URL and alt text) and `table` (insert, add / delete rows
  and columns). New icons `image` and `table`.

### Fixed

- **CodeEditor** shortcuts in FiveM NUI, which reports Ctrl+letter as a control character with `keyCode` 0: the key is
  repaired from the character (keyboard layout aware) or `event.code`. No effect in normal browsers.

### Changed

- Kanban uses the shared pointer-drag helpers (no visible change).

## 0.12.0 - 2026-10-11

### Updating from 0.11

- **Syntax highlighting is opt-in.** `CodeBlock` and `Markdown` render code plain until you register languages once:
  `registerShikiLanguages({ lua: () => import("shiki/langs/lua.mjs") })` (from `@pre_scripts/preui/code` or
  `/markdown`), or `registerShikiLanguages(bundledLanguagesInfo)` from `shiki/langs` for every language as before.
  Apps that never register a language no longer bundle any Shiki file; FiveM scripts can delete their `shiki-stub.js`
  alias.
- **`TabsList` `activateOnFocus` defaults to `false`.** Arrow keys move the focus, Enter / Space or a click activate.
  Pass `activateOnFocus` for the old behaviour; remove `activateOnFocus={false}` workarounds.

### Added

- **`TabsStack`**: wrap the `TabsContent`s in it to keep every panel mounted (state, scroll position and inputs
  survive a switch) and stacked in one grid cell. The area keeps the size of the largest panel, so switching tabs
  causes no layout shift; inactive panels are invisible and inert. Replaces hand-made "stacked panel" classes.
- **Entry `@pre_scripts/preui/theme-editor`** for `ThemeEditor` and `ThemeEditorPreview`, so a lazily loaded theme
  tool gets its own chunk. The main entry still exports it; switching the import path is a drop-in change.
- **`ThemeEditor` `samples`**: `samples={["web"]}` shows only the interface sample and hides the web/game switch.
  New type `ThemeEditorSample`, new label `otherPairs`.
- **`NumberField` `steppers={false}`** leaves out the -/+ buttons for dense tables and forms. The field then looks like
  a plain `Input` of the same size; keyboard, wheel and scrub stepping stay. The root gets `data-steppers="false"`.
- **`registerShikiLanguages`** (exported from `/code` and `/markdown`) with the types `ShikiLanguages`,
  `ShikiLanguageLoader`, `ShikiLanguageInfo`.
- `"./package.json"` in `exports`.

### Changed

- **ThemeEditor: no layout shift** while you drag a slider or edit a colour (e.g. accent strength above 100 %). The
  contrast details always show the same rows in a fixed order (the important pairs, plus an "Other pairs" group,
  collapsed, whose header counts its problems). Status badges keep a fixed width; the tab warning icon and the
  see-through hint always reserve their space.
- **TabsBar** scrolls the active tab into view when it changes (and on mount), inside the bar only. The bar's scroll
  viewport is no longer an extra Tab stop.
- **Shiki** and each registered grammar load lazily the first time a block in that language renders. A Markdown app
  without registered languages shrank from about 8.4 MB (246 files) to 445 KB (1 file) in a test build.

### Fixed

- **Slider:** the thumb at min or max is no longer cut by a parent with `overflow: hidden` (e.g. the ThemeEditor's
  style section in a ScrollArea). The control keeps half a thumb of room at each end, so the track is 8px shorter on
  each side.

## 0.11.0 — 2026-10-08

Fixes from a combination audit in Chromium 103: every component next to, inside and on top of the others, in dark and
light, with every preset and in a transparent FiveM-like page.

### Updating from 0.10

- **Sidebar** is a named Tailwind group now: change your own `group-data-[collapsible=icon]:…` (and `[side=…]`,
  `[variant=…]`, `[state=…]`) classes inside a sidebar to `group-data-[collapsible=icon]/sidebar:…`.
- **Separator:** your classes replace the orientation defaults. A vertical separator with a height of its own
  (`h-5`, or shadcn's `data-[orientation=vertical]:h-5`) is centred in its row; without one it stretches.
- **Colours:** some default status colours, the dark `muted` surface and the Blue, Emerald and Amber preset primaries
  changed slightly (see Changed). Themes with their own background derive a little differently. Re-run
  `checkTokenContrast` on your themes: it now also checks tinted text and may report pairs it ignored before.
- **KeybindHintBar** `variant="surface"` uses the theme radius; add `className="rounded-full"` for the old pill.

### Added

- `PortalContainerProvider`: the default portal container for every preUI popup below it (e.g. a scoped theme root),
  so Select, menus, Popover, Tooltip, HoverCard, DatePicker, dialogs and toasts opened there render inside it and keep
  its tokens. An explicit `container` prop still wins; popups inside popups follow their parent.
- `rounded-pui-xs` (preset): `rounded-pui-sm` capped at 4px, for boxes up to about 20px.
- `checkTokenContrast` checks every accent and status colour as text on its own tint (`text-pui-x` on
  `bg-pui-x/tint`: default buttons, badges, alert titles) over background, card, popover, shell and muted, and
  respects `--pui-tint-scale`. New exports `tintContrastColors`, `tintContrastSurfaces`, `worstTintContrast`; tinted
  results carry `surface` and `tint`. The ThemeEditor lists them ("Primary text on its tint" …); an accent strength
  above 100 % now shows as failing, because tinted text drops below 4.5:1.

### Changed

- **Popups stay opaque:** menus, selects, popovers, hover cards and toasts ignore `--pui-surface-opacity`; only panels
  (page, window, card) become see-through. Text underneath no longer reads through a menu.
- **Nested dialogs:** a Dialog or AlertDialog opened from a Dialog, AlertDialog, Sheet or Drawer dims its parent, so
  it no longer looks like part of it (one scrim, plus a fading dim layer on the parent).
- **Default colours** (tinted text now ≥ 4.5:1 everywhere): dark `--pui-negative` `3 92% 69%`, `--pui-muted`
  `225 10% 14%`; light `--pui-positive` `156 71% 26%`, `--pui-negative` `0 81% 42%`, `--pui-warning` `29 89% 32%`,
  `--pui-info` `203 85% 34%`. Presets: Blue `#529dff` / `#2456e0`, Emerald light `#047052`, Amber light `#9f4706`.
- **`deriveTokens`** follows the background's real colourfulness (chroma) instead of HSL saturation, and tints text
  at most 1.5× the default: a cream page no longer gives yellow surfaces and brown text, a navy page no longer blue
  text. With your own background, the status colours you leave out are moved in lightness until they stay readable on
  their tints.
- **`--pui-border-opacity`** fades only structural lines (`border-pui-border`). Outline Buttons and Badges use the
  field border (`border-pui-input`) and stay visible at 0.
- **Sidebar** is `group/sidebar`: plain `group-hover:` classes inside it (e.g. Badge `reveal`) no longer react to
  hovering anywhere in the sidebar. Collapsible and Accordion chevrons only react to their own trigger.
- **KeybindHintBar** `variant="surface"` uses `rounded-pui`, so it still looks right when it wraps onto two lines.
- **ProgressCircle** with `showValue` below 48px (`size="sm"`) shows the number without `%` so it fits the ring
  (`aria-valuetext` keeps the percent; `format` overrides).
- **Button** `loading` keeps the button's width: the spinner takes the left icon's place or sits over the label.

### Fixed

- **Checkbox and Kbd** keep small corners at any radius (a large `--pui-radius`, e.g. Amber and Glass, turned the
  checkbox into a radio-like circle).
- **Invalid fields show keyboard focus:** the negative border stays and a ring in the negative colour appears (Input,
  Textarea, InputOTP, Select, NumberField, InputGroup, Combobox, Autocomplete, DatePicker, KeybindInput).
- **ButtonGroup:** a focused Select, NumberField, InputGroup, Combobox, DatePicker or KeybindInput after a button
  outlines the whole group like inputs do; the left focus edge is no longer missing.
- **KeybindInput:** long bindings no longer squash the key caps or run under the clear button; they are clipped at the
  start, so the main key stays visible.
- **Sizes:** with `size="sm"` / `"lg"`, Select, Combobox, Autocomplete and NumberField use the same text size and
  padding as Input.
- **Field:** FieldItem aligns its checkbox or radio with the first line of a wrapping label; a Switch next to
  FieldContent is centred on the label's first line.
- **Button / Toggle:** a size class on an icon (`size-5`) is no longer overridden by the default 16px.
- **Button** `secondary` has a visible hover in light and dark.
- **Vertical Separator** stretches to its row's height (it was 0px tall in content-height flex rows); with its own
  height it is centred.
- **KeybindInput** follows a surrounding `<Field invalid>` like the other fields.
- **ThemeEditor:** no "Fix" button for a colour that a raw `tokens` entry overrides (fixing the palette colour could
  not change it).
- **Table / DataTable:** long unbreakable text wraps inside its cell instead of covering the next columns; the
  sticky header keeps its bottom line while scrolling; checkboxes and switches are centred in cells; tables keep the
  card text colour inside muted containers such as `AccordionContent`.
- **DataTable** can fill a fixed-height parent: `className="min-h-0 flex-1" containerClassName="min-h-0 flex-1"`
  scrolls the rows while toolbar and pagination stay visible.
- **Long words** (URLs, ids) wrap in Card (header actions stay in place), Item, Empty, Breadcrumb, KanbanCard and
  toasts instead of overflowing.
- **Alert:** descriptions in tinted alerts use foreground at 85 % (muted text fell below 4.5:1 on warning and info).
- **Badge** `surface="solid"` follows `--pui-tint-scale` like every other tint.
- **ThemeEditor:** popups inside `previewSlot` show the edited theme and scheme instead of the page's.

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

### 0.7.0 - 2026-10-12

- **`NuiDragArea`**: a surface without a look of its own behind your panels; dragging turns a game camera, the wheel
  zooms. Posts `{ yaw, pitch, zoom }` deltas to the `event` callback (default `"camera"`) at most once per frame.
- **Entry `@pre_scripts/preui-nui/loadscreen`**: `useLoadscreen()` (progress and phase of the game's loading),
  `getNuiHandover()` (data from `deferrals.handover`) and `debugLoadscreen()` (a simulated load in the browser).
- **`NuiToastRelay`**: a message's `position` applies to that notification only; the others keep theirs (before, it
  moved the whole stack). Needs `@pre_scripts/preui` 0.13.0 or newer (peer dependency).

### 0.6.0 - 2026-10-11

- **Money separators:** `MoneyFormat` has optional `thousands` and `decimal`. When set, `formatMoney` and
  `useNuiMoney` use them instead of Intl's separators for the locale (`""` turns grouping off). `useNuiMoney` reads
  both from `getCurrency` / `setCurrency` and `fallback`, so a Lua table like
  `{ format = '{amount} €', decimals = 2, thousands = ' ', decimal = ',' }` gives `1 234,50 €`, the same as
  server-side formatting. New type `ResolvedMoneyFormat` (used by `NuiMoney.currency`). Default unchanged.

### 0.5.0 - 2026-10-08

- `thirdPartyLicenses` groups the file by license: one block per license with every package's copyright lines, then
  the text once (`group: false` for the old full text per package). The file is much shorter, the legal content is
  the same.
- `copyTo`: also write the file outside the build output, e.g. `"../THIRD_PARTY_LICENSES.txt"` next to
  `fxmanifest.lua`. This replaces the `LICENSES/` folder (`dir` still works).
- Fonts a stylesheet references with `url()` are listed (they were missing). `include` lists packages the plugin can't
  see.

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

### 0.4.0 - 2026-10-12

- **`--pre-lib`**: a resource on pre_lib instead of the standalone one (theme, language, texts, currency and
  notifications from pre_lib, locales in en/de/fr, a buyer README, version `1.0.0-beta.1`).
- **`--exact`**: pins `@pre_scripts/preui` and `@pre_scripts/preui-nui` to exact versions.
- New resources depend on `@pre_scripts/preui` `^0.13.0` and `@pre_scripts/preui-nui` `^0.7.0`.

### 0.3.1 - 2026-10-11

- New resources depend on `@pre_scripts/preui` `^0.12.0` and `@pre_scripts/preui-nui` `^0.6.0`.

### 0.3.0 - 2026-10-08

- New resources get one grouped `THIRD_PARTY_LICENSES.txt` next to `fxmanifest.lua` instead of a `LICENSES/` folder,
  and depend on `@pre_scripts/preui-nui` `^0.5.0`.

### 0.2.2 — 2026-10-08

- New resources depend on `@pre_scripts/preui` `^0.11.0`.

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
