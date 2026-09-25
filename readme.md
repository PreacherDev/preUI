<p align="center">
  <img src="https://raw.githubusercontent.com/PreacherDev/preUI/main/assets/logo.png" width="96" height="96" alt="">
</p>

# preUI

React components built on **[Base UI](https://base-ui.com)** (behavior & accessibility) and **Tailwind CSS v3** (styling).
A dense interface design — dark by default, with a matching light scheme: tinted accents, hairline borders, tabular
numbers. Works with any icon library.

## Installation

```bash
npm install @pre_scripts/preui
```

Requires `react >= 18` and `tailwindcss ^3.4` in your project. Base UI is installed automatically.

preUI stays on **Tailwind CSS v3** on purpose: v4 targets Chrome 111+ and its generated CSS relies on `color-mix()` and
`oklch()` colours, which Chromium 103 — the browser inside FiveM's NUI — doesn't support, so a v4 build would break in game.

Add the preset and the package's build output to your `tailwind.config.js`:

```js
const { createPreuiPreset } = require("@pre_scripts/preui/tailwind");

module.exports = {
  presets: [createPreuiPreset()],
  content: [
    "./src/**/*.{js,ts,jsx,tsx}",
    "./node_modules/@pre_scripts/preui/dist/**/*.{js,cjs}", // so Tailwind generates preUI's classes
  ],
};
```

ESM config (`tailwind.config.mjs` / `.ts`) works too: `import { createPreuiPreset } from "@pre_scripts/preui/tailwind"`
(the default export is the preset with tokens injected). In CommonJS the shorthand `presets: [require("@pre_scripts/preui/tailwind")]`
works as well — the CJS module is a callable preset that Tailwind invokes.

The `/tailwind` entry also exports `tokens` (dark defaults), `lightTokens` (light defaults, same keys), `schemes`
(`{ dark, light }`), `schemeTokens(scheme)`, `sharedTokenNames`, `schemeSelectors`, `tokensToCss()` and `tokensHeader`
(used by `npx preui init`), plus the build-time helpers of [Runtime theming](#runtime-theming): `deriveTokens`,
`getContrast`, `getContrastLevel`, `checkTokenContrast`, `contrastPairs`, `runtimeTokenSelectors` and `toHslChannels`.

The preset sets the dark tokens on `:root` and the light ones under `[data-scheme="light"]` (see
[Theming: scheme & themes](#theming-scheme--themes)), enables tabular figures and makes `font-sans` / `font-mono` use
the preUI fonts.
Give your page the base surface, e.g. `<body class="bg-pui-background text-pui-foreground font-sans text-sm">`.

## Fonts

preUI uses **Inter** (UI) and **JetBrains Mono** (identifiers). Nothing is loaded automatically, so you stay in control:

```bash
npm install @fontsource-variable/inter @fontsource/jetbrains-mono
```

```ts
import "@pre_scripts/preui/fonts.css"; // once, e.g. in main.tsx
```

The fonts are bundled by your build, no request to Google Fonts (works offline, e.g. in game UIs).
Without them, the system UI font is used. To use other fonts, override the variables:

```css
:root {
  --pui-font-sans: "Geist", system-ui, sans-serif;
  --pui-font-mono: "Geist Mono", ui-monospace, monospace;
}
```

## Components

Names and parts follow [shadcn/ui](https://ui.shadcn.com/docs/components) — if you know shadcn, you know preUI.

| Group | Components (`@pre_scripts/preui`) |
|---|---|
| Actions | Button, ButtonGroup, Toggle, ToggleGroup, Toolbar |
| Forms | Checkbox, CheckboxGroup, ColorPicker, Field, Form, Input, InputGroup, InputOTP, Label, NumberField, RadioGroup, Slider, Switch, Textarea |
| Selection | Autocomplete, Combobox, Select |
| Menus & navigation | Breadcrumb, ContextMenu, DropdownMenu, Menubar, NavigationMenu, Pagination, Sidebar, Tabs |
| Overlays | AlertDialog, Dialog, Drawer, HoverCard, Popover, Sheet, Toast (`Toaster` + `toast()`), Tooltip |
| Display & layout | Accordion, Alert, AspectRatio, Avatar, Badge, BentoGrid, Card, Collapsible, ContrastBadge, Empty, Item, Kanban, Kbd, ListMenu, ThemeEditor, Meter, Progress, ScrollArea, Separator, Skeleton, Spinner, Table |
| Game UI | HudContainer, HudStatus, HudStatusGroup, HudSpeedometer, KeybindHint, KeybindHintBar, KeybindInput, ProgressCircle, RadialMenu, SkillCheck (see [Game UI](#game-ui)) |

Components that build on another library have their own entry point, so you only install what you use:

| Import from | Components | Install |
|---|---|---|
| `@pre_scripts/preui/chart` | ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent, ChartStyle, `useChart` | `recharts` `react-is` |
| `@pre_scripts/preui/calendar` | Calendar, CalendarDayButton, DatePicker, DateRangePicker | `react-day-picker` |
| `@pre_scripts/preui/carousel` | Carousel, CarouselContent, CarouselItem, CarouselPrevious, CarouselNext, `useCarousel` | `embla-carousel-react` |
| `@pre_scripts/preui/command` | Command, CommandDialog, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem, CommandSeparator, CommandShortcut | `cmdk` |
| `@pre_scripts/preui/resizable` | ResizablePanelGroup, ResizablePanel, ResizableHandle | `react-resizable-panels` |
| `@pre_scripts/preui/form` | Form, FormField, FormItem, FormLabel, FormControl, FormDescription, FormMessage, `useFormField` | `react-hook-form` |
| `@pre_scripts/preui/data-table` | DataTable, DataTableColumnHeader, DataTablePagination, DataTableToolbar, DataTableViewOptions, `createSelectColumn`, `createDataTableColumnHelper`, `dataTableFeatures`, re-exported `createColumnHelper` / `flexRender` | `@tanstack/react-table` `@tanstack/table-core` |
| `@pre_scripts/preui/code` | CodeBlock (syntax highlighting, copy, line numbers), CodeInline, CodeEditor, `syntaxColor`, `syntaxPalette` | `shiki`, `@codemirror/*` (state, view, language, commands, language-data, search, autocomplete), `@lezer/highlight` |
| `@pre_scripts/preui/markdown` | Markdown (GFM tables, task lists, highlighted code) | `react-markdown` `remark-gfm` + the `/code` packages |
| `@pre_scripts/preui/editor` | RichTextEditor (WYSIWYG, stores Markdown), MarkdownEditor (write/preview), `proseClassName`, default labels / toolbar lists (`defaultRichTextEditorLabels`, `defaultRichTextEditorToolbar`, `richTextEditorToolbarGroups`, `defaultMarkdownEditorLabels`, `markdownEditorToolbarGroups`, `MARKDOWN_EDITOR_COMPACT_WIDTH`) | `@tiptap/core` `@tiptap/react` `@tiptap/pm` `@tiptap/starter-kit` `@tiptap/markdown` `@tiptap/extensions` + the `/markdown` packages |

The main package also exports a Base UI `Form` (native form with server-side errors); the `/form` entry is shadcn's react-hook-form `Form`.

Besides the components, the main package exports:

| Export | Purpose |
|---|---|
| `buttonVariants`, `badgeVariants`, `alertVariants`, `avatarVariants`, `buttonGroupVariants`, `toggleVariants`, `toggleGroupVariants`, `toolbarVariants`, `inputVariants`, `inputGroupAddonVariants`, `inputGroupButtonVariants`, `numberFieldVariants`, `itemVariants`, `itemMediaVariants`, `emptyMediaVariants`, `progressIndicatorVariants`, `meterIndicatorVariants`, `navigationMenuTriggerStyle`, `sidebarMenuButtonVariants`, `progressCircleIndicatorVariants`, `keybindHintBarVariants`, `keybindHintVariants`, `hudStatusGroupVariants`, `listMenuItemVariants`, `listMenuItemIconVariants`, `sidebarMenuBadgeVariants` | Style helpers (cva), e.g. to style a plain `<a>` like a button |
| `cn`, `mergeClassName` | Class merging (tailwind-merge); `mergeClassName` also accepts Base UI's function-form `className` |
| `IconProvider`, `useIcon`, `defaultIcons` | Icon slots (see [Icons](#icons)) |
| `ThemeProvider`, `useTheme`, `ThemeScript`, `getThemeScript`, `ThemeToggle`, `ThemeSelect` | Light/dark scheme + your named themes (see [Theming: scheme & themes](#theming-scheme--themes)); types `ThemeStorage`, `ThemeStorageValue` |
| `applyTokens`, `clearTokens`, `deriveTokens`, `getContrast`, `getContrastLevel`, `checkTokenContrast`, `contrastPairs`, `runtimeTokenSelectors`, `toHslChannels`, `ContrastBadge` | Runtime theming: set tokens live, derive palettes, check contrast (see [Runtime theming](#runtime-theming)); types `TokenInput`, `TokenOverrides`, `DeriveTokensBase`, `TokenContrastResult`, `ContrastLevel`, `PreuiTokens`, `PreuiTokenName` |
| `hudAnchors`, `getHudPositionStyle`, `getHudStatusLevel`, `useHudStatus`, `useSkillCheck`, `useSkillCheckGame`, `getSkillCheckProgress`, `skillCheckDifficulties`, `resolveSkillCheckDifficulty`, `formatKeybind`, `keybindFromEvent`, `matchesKeybind`, default labels (`defaultRadialMenuLabels`, `defaultSkillCheckLabels`, `defaultKeybindInputLabels`, `defaultContrastBadgeLabels`) | Game UI and badge helpers (see [Game UI](#game-ui)) |
| `moveKanbanItem`, `defaultKanbanLabels` | Kanban state helper and screen-reader texts (see [Kanban](#kanban)) |
| `useListNavigation`, `useListMenu` | Keyboard-driven lists (see [ListMenu & useListNavigation](#listmenu--uselistnavigation)) |
| `useWindowToggle`, `useEscapeKey`, `isOverlayOpen` | Close windows with Escape, reopen with keys (see [Windows](#windows-escape-and-toggle-keys)) |
| `DialogPopup`, `AlertDialogPopup`, `SheetPopup`, `DrawerPopup` (+ the existing `…Portal` / `…Overlay`) | Build your own overlay surface, e.g. inside a frame (see [Overlays](#overlays-dialog-alertdialog-sheet-drawer-commanddialog)) |
| `Toaster`, `toast` | Toasts (Sonner-style API) |
| `useSidebar`, `getSidebarStateFromCookie`, `SIDEBAR_COOKIE_NAME`, `SIDEBAR_COOKIE_MAX_AGE`, `SIDEBAR_KEYBOARD_SHORTCUT`, `SIDEBAR_WIDTH`, `SIDEBAR_WIDTH_ICON`, `SIDEBAR_WIDTH_MOBILE` | Sidebar state and constants (see [Server rendering](#server-rendering-ssr)) |
| `useAutocompleteFilter`, `useComboboxFilter` | Base UI's filter hooks for custom item filtering |
| `useColorPicker`, `parseColor`, `normalizeHex`, `rgbToHex`, `hexToHsv`, `hsvToHex`, `hexToHsl`, `hslToHex`, `hsvToHsl`, `hslToHsv` | ColorPicker state for own parts, and pure colour helpers (see [ColorPicker](#colorpicker)) |

Every part accepts `className` (merged with the defaults, later classes win). Where shadcn uses Radix' `asChild`,
preUI uses Base UI's `render` prop:

```tsx
import {
  Button, Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter, DialogClose,
} from "@pre_scripts/preui";

<Dialog>
  <DialogTrigger render={<Button />}>Buy warehouse</DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Buy warehouse</DialogTitle>
      <DialogDescription>Upkeep is charged every interval.</DialogDescription>
    </DialogHeader>
    <DialogFooter>
      <DialogClose render={<Button variant="ghost" />}>Cancel</DialogClose>
      <Button variant="solid">Buy for $85,000</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

Mount these once at the root:

```tsx
import { Toaster, TooltipProvider, toast } from "@pre_scripts/preui";

<TooltipProvider>
  <App />
  <Toaster />
</TooltipProvider>

// anywhere — Sonner-style API:
toast.success("Order placed");
toast.error("Not enough money", { description: "You are missing $1,200." });
toast.promise(save(), { loading: "Saving…", success: "Saved", error: "Failed" });
```

`<Toaster position="top-center" />` places the stack at `"top-left" | "top-center" | "top-right" | "bottom-left" |
"bottom-center" | "bottom-right"` (default `"bottom-right"`, type `ToasterPosition`). The prop can change at runtime
(e.g. a HUD setting); at the top the newest toast is on top and toasts slide in downwards. The viewport carries
`data-position`.

### Button

| Prop | Type | Default |
|---|---|---|
| `variant` | `"default" \| "solid" \| "secondary" \| "outline" \| "ghost" \| "positive" \| "destructive" \| "link"` | `"default"` |
| `size` | `"default" \| "sm" \| "lg" \| "icon" \| "icon-sm" \| "icon-lg"` | `"default"` |
| `loading` | `boolean` | `false` |
| `leftIcon` / `rightIcon` | `ReactNode` | |
| `fullWidth` | `boolean` | `false` |

`default` is a tinted accent button, the regular call to action. `solid` is reserved for the one confirming action in a dialog.
For links, style an `<a>` with `buttonVariants()`:

```tsx
<a href="/docs" className={buttonVariants({ variant: "ghost" })}>Docs</a>
```

### ColorPicker

Drawn entirely in the DOM (no `<input type="color">`, see [FiveM: no native popups](#fivem-no-native-popups)).
Value is a hex string (`#rrggbb`, with `alpha` `#rrggbbaa`), controlled or uncontrolled:

```tsx
import { ColorPicker, ColorPickerArea, ColorPickerHue, ColorPickerInput, ColorPickerSwatches } from "@pre_scripts/preui";

// All-in-one: swatch trigger + popover with area, hue, hex field (+ swatches / alpha when given)
<ColorPicker value={color} onValueChange={setColor} swatches={["#ef4444", "#3b82f6"]} />
<ColorPicker alpha defaultValue="#22d3eecc" onValueCommit={save} />

// Own composition (popover: ColorPickerTrigger + ColorPickerContent; or `inline`)
<ColorPicker inline value={color} onValueChange={setColor}>
  <ColorPickerArea />
  <ColorPickerHue />
  <ColorPickerInput />
  <ColorPickerSwatches swatches={[{ value: "#b91c1c", label: "Racing red" }]} />
</ColorPicker>
```

Parts: `ColorPickerTrigger`, `ColorPickerContent` (a `PopoverContent`), `ColorPickerArea` (saturation × brightness,
`role="slider"`, arrows ±1, Shift ±10, Home/End, PageUp/PageDown), `ColorPickerHue`, `ColorPickerAlpha`,
`ColorPickerInput` (validated, applies on Enter/blur), `ColorPickerSwatches` / `ColorPickerSwatch`,
`ColorPickerEyeDropper` (only rendered where the browser has `window.EyeDropper`, Chromium 95+; whether FiveM's CEF exposes it is untested). `onValueChange` fires
while dragging, `onValueCommit` at the end of a drag, per key press, on Enter/blur and on swatch clicks; both also
receive the exact HSV state. The hue stays put when the colour becomes grey or black. Accessible names are English by
default — pass `labels={{ area: "…", hue: "…", … }}` and `getAreaValueText` for other languages. `useColorPicker()`
gives own parts (e.g. HSL fields) access to the state.

### DatePicker in a Field

`DatePicker` and `DateRangePicker` (`@pre_scripts/preui/calendar`) work inside `Field` like `Input` or `Select`: the
`FieldLabel` labels the trigger (clicking it opens the calendar; the accessible name is label + current value),
`FieldDescription` / `FieldError` describe it, and `<Field disabled>` / `<Field invalid>` disable it or mark it invalid
(`aria-invalid`, `data-invalid`, negative border). Outside a Field, pass `invalid` directly.

```tsx
<Field invalid={!date}>
  <FieldLabel>Due date</FieldLabel>
  <DatePicker value={date ?? null} onValueChange={setDate} placeholder="Pick a date" />
  <FieldError match>Pick a due date.</FieldError>
</Field>
<DatePicker invalid aria-label="Cut-off date" />
```

A Field's `invalid` prop does not fill Base UI's validity state, so render the error with `match` (or conditionally).
Field `validate` / `validationMode` do not run for the pickers; validate the value yourself.

### DataTable: opening rows

`onRowActivate(row, event)` makes body rows activatable, e.g. to open a detail sheet: a click or Enter / Space on a
focused row calls it. Activatable rows are focusable (`tabIndex=0`), show a pointer cursor and carry `data-activatable`.
Clicks on interactive elements inside a row (buttons, links, inputs, checkboxes, menus, anything with
`data-row-activation="ignore"`) and in columns with `meta: { rowActivation: false }` don't activate it; the selection
checkbox column already has that set. `onRowClick(row, event)` is the mouse-only variant with no tab stop.
`getRowProps(row)` adds classes, `data-*` / `aria-*` attributes or handlers per row; its `onClick` / `onKeyDown` run
first and can stop the activation with `event.preventDefault()`.

```tsx
<DataTable
  columns={columns}
  data={people}
  onRowActivate={(row) => openPerson(row.original.id)}
  getRowProps={(row) => ({ className: row.original.wanted ? "text-pui-negative" : undefined })}
/>
```

### Sidebar badges

`SidebarMenuBadge` takes a `variant` named like `Badge`'s: `default` (primary), `secondary`, `positive`, `warning`,
`destructive`, `info`. They are solid fills, readable at counter size, e.g.
`<SidebarMenuBadge variant="destructive">3</SidebarMenuBadge>` for urgent items. For counts inside tabs, put a `Badge`
in the `TabsTrigger`.

### Code, Markdown & rich text

```tsx
import { CodeBlock, CodeEditor } from "@pre_scripts/preui/code";
import { Markdown } from "@pre_scripts/preui/markdown";
import { MarkdownEditor, RichTextEditor } from "@pre_scripts/preui/editor";

<CodeBlock language="lua" filename="server.lua" showLineNumbers code={source} />
<CodeEditor language="typescript" value={code} onValueChange={setCode} />
<Markdown>{"# Hello

- [x] GFM task lists"}</Markdown>
<RichTextEditor value={markdown} onValueChange={setMarkdown} />
<MarkdownEditor layout="split" value={markdown} onValueChange={setMarkdown} />
```

Syntax colours follow the theme tokens; override single roles with `--pui-syntax-keyword`, `--pui-syntax-string` … .
Markdown is rendered safely by default (raw HTML skipped, unsafe URLs stripped). The rich-text editor stores Markdown,
so formats Markdown doesn't have (underline, colours) are intentionally not offered.

### Overlays: Dialog, AlertDialog, Sheet, Drawer, CommandDialog

`DialogContent`, `AlertDialogContent`, `SheetContent`, `DrawerContent` and `CommandDialog` bundle portal, scrim and
popup. They share these props:

| Prop | Default | |
|---|---|---|
| `container` | `document.body` | Element (or ref) the overlay is portalled into. |
| `contained` | `true` when `container` is set | Positions scrim and popup inside the container (`absolute`) instead of the viewport (`fixed`). Heights become relative to the container. Set `false` to only change the portal target. |
| `overlay` | `true` | `false` renders no scrim. The dialog stays modal. |
| `overlayClassName` | – | Merged into the scrim, e.g. `overlayClassName="bg-pui-scrim/40"` for a lighter in-game scrim. |
| `initialFocus` / `finalFocus` | Base UI defaults | Passed to Base UI. |

**Focus never scrolls the page.** When a modal opens, preUI focuses the same element Base UI would — the first
tabbable element, the popup itself on touch, the Drawer panel, or your `initialFocus` — with `preventScroll`, so opening
a dialog inside an iframe or NUI page never scrolls the embedding page or the dialog's ancestors. `initialFocus={false}`
leaves focus where it is.

To build a surface yourself, use the parts: `DialogPortal`, `DialogOverlay`, `DialogPopup` (the same exists as
`AlertDialog…`, `Sheet…` and `Drawer…`, where `SheetPopup` takes `side`).

```tsx
<Dialog>
  <DialogPortal container={frameRef}>
    <DialogOverlay className="bg-pui-scrim/30" />
    <DialogPopup className="max-w-sm">…</DialogPopup>
  </DialogPortal>
</Dialog>
```

`PopoverContent`, `TooltipContent`, `HoverCardContent`, `SelectContent`, `ComboboxContent`, `AutocompleteContent`,
`DropdownMenuContent`, `ContextMenuContent` and `NavigationMenuViewport` accept `container` as well. It only changes the
portal target; they stay anchored to their trigger.

#### Overlays inside a frame (FiveM tablets, phones)

Pass the device screen as `container`. The sheet then docks to the frame's edge, dialogs centre in it, and the scrim
covers only the frame. The container needs `relative`, and `overflow-hidden` so slide-in animations and rounded corners
are clipped:

```tsx
const screenRef = useRef<HTMLDivElement>(null);

<div ref={screenRef} className="relative h-[800px] w-[1400px] overflow-hidden rounded-[1.25rem]">
  …tablet UI…
</div>

<Sheet open={open} onOpenChange={setOpen}>
  <SheetContent container={screenRef} side="right" className="w-[460px] sm:max-w-none">…</SheetContent>
</Sheet>

<CommandDialog container={screenRef} open={paletteOpen} onOpenChange={setPaletteOpen}>…</CommandDialog>
```

The dialog is still modal: the rest of the page can't be clicked while it is open (Base UI's transparent full-screen
click blocker), and a click outside the frame closes it. To keep the page around the frame usable, pass `modal={false}`
or `modal="trap-focus"` to the root (`Dialog`, `Sheet` …). `sm:max-w-sm` on side sheets follows the viewport, not the
container (Chromium 103 has no container queries) — set the width via `className` inside a frame.

### Windows: Escape and toggle keys

Game windows (a NUI page, a tablet, a garage menu) close on Escape and open again with a key. `useWindowToggle` does
both and leaves Escape to whatever is open inside the window first: the first Escape closes an open Select, menu or
dialog, the next one closes the window. Toasts and tooltips never hold the window open.

```tsx
import { useWindowToggle } from "@pre_scripts/preui";

function Tablet() {
  const { open, close } = useWindowToggle({ defaultOpen: true, openKeys: ["F1"] });
  if (!open) return <KeybindHint keys="F1" label="Open" />;
  return <Window onClose={close}>…</Window>;
}
```

| Option | Default | |
|---|---|---|
| `defaultOpen` / `open` + `onOpenChange(open, { reason, event })` | `false` | Uncontrolled or controlled. `reason`: `"escape"`, `"key"` or `"imperative"`. |
| `closeOnEscape` | `true` | Escape closes the window, unless an overlay inside owns the key. |
| `toggleKeys` | — | Keys that open and close, e.g. `["F1"]`, `["i"]`, `["KeyI"]` or a `Keybind` (`{ key: "k", code: "KeyK", ctrl: true }`). |
| `openKeys` | — | Keys that only open the window. |
| `ignoreWhenOverlayOpen` | `true` | Leave Escape to open popups first. |
| `enabled` | `true` | Listen to the keyboard at all (`setOpen` / `close` / `toggle` always work). |

Returns `{ open, setOpen, close, toggle }`. Key repeats are ignored (holding Escape doesn't close the popup and then
the window). Letter keys don't fire while the player types into an input, and no key fires while a `KeybindInput` is
recording. Matched keys are `preventDefault`ed (F1 would open the browser's help).

The building blocks are exported too:

- `isOverlayOpen(root?)`: `true` while something owns Escape: an open Dialog, AlertDialog, Sheet, Drawer,
  Popover (DatePicker, ColorPicker), CommandDialog, DropdownMenu, ContextMenu, Menubar, Select, Combobox,
  Autocomplete or NavigationMenu popup, a Kanban drag, a recording `KeybindInput`, or a focused `RadialMenu` in a
  submenu. Never for toasts (which are `role="dialog"` too), tooltips or hover cards.
- `useEscapeKey(handler, { enabled, ignoreWhenOverlayOpen, capture })`: Escape anywhere on the page, except while
  an overlay owns it. With `capture: true` (default) it runs before popups react. With `capture: false` it runs after
  your own components and also skips an Escape one of them handled (`preventDefault()` / `stopPropagation()`). Use
  that when your window has inputs with their own Escape behaviour.

### ListMenu & useListNavigation

Keyboard-driven list panels for game menus: garage, shop, job menu, third-eye options. `ListMenu` tracks the
highlighted row and handles the keyboard, mouse, scrolling and ARIA; `useListNavigation` is the same logic as a
headless hook for your own markup.

```tsx
import {
  ListMenu, ListMenuHeader, ListMenuContent, ListMenuGroup, ListMenuLabel, ListMenuItem,
  ListMenuSeparator, ListMenuFooter, ScrollArea, KeybindHint, KeybindHintBar, useListMenu,
} from "@pre_scripts/preui";

function Position() {
  const { highlightedIndex, count } = useListMenu();
  return <span className="tabular-nums">{highlightedIndex + 1}/{count}</span>;
}

<ListMenu keyboardTarget="window" size="lg" onBack={back} onClose={close} className="w-96">
  <ListMenuHeader>Garage · Pillbox Hill</ListMenuHeader>
  <ScrollArea viewportClassName="max-h-96" reserveTrack={false}>
    <ListMenuContent aria-label="Vehicles">
      <ListMenuGroup>
        <ListMenuLabel>Parked</ListMenuLabel>
        <ListMenuItem value="sultan" icon={<CarIcon />} description="LS 42 KRN" suffix={<Badge>Parked</Badge>} submenu onSelect={openSultan}>
          Karin Sultan RS
        </ListMenuItem>
        <ListMenuItem value="vigero" icon={<CarIcon />} description="Impounded" disabled>
          Declasse Vigero
        </ListMenuItem>
      </ListMenuGroup>
      <ListMenuSeparator />
      <ListMenuItem value="close" onSelect={close}>Close</ListMenuItem>
    </ListMenuContent>
  </ScrollArea>
  <ListMenuFooter>
    <KeybindHintBar className="gap-x-3">
      <KeybindHint size="sm" keys={["↑", "↓"]} separator={null} label="Select" />
      <KeybindHint size="sm" keys="Enter" label="Open" />
      <KeybindHint size="sm" keys="Esc" label="Close" />
    </KeybindHintBar>
    <Position />
  </ListMenuFooter>
</ListMenu>
```

- **Keys:** ↑/↓ move (←/→ for `orientation="horizontal"`, all four arrows for `"grid"` with `columns`), Home/End,
  PageUp/PageDown, Enter/Space → the item's `onSelect` and the menu's `onSelect(value)`, Backspace (and ← in a vertical
  list) → `onBack`, Escape → `onClose`. Back/close keys are only handled when the callback is set; change them with
  `keys={{ select, back, close }}`.
- **NUI:** in FiveM the list usually has no DOM focus. `keyboardTarget="window"` listens on `window` while `enabled`
  (default `true`) and ignores keys typed into inputs. The default `"list"` needs focus on `ListMenuContent`
  (`autoFocus` helps).
- **Disabled items** are skipped by default. `skipDisabled={false}` keeps them reachable, so a "why not" description
  can be read, but they can't be selected.
- **Wrap:** `loop` (default `true`).
- **Mouse:** hovering highlights on pointer *move*, so a resting mouse doesn't fight the keyboard; a click selects.
- **Scrolling:** the highlighted row is scrolled into view (`block: "nearest"`) on keyboard moves and on mount, never on
  hover. Works inside `ScrollArea`. Turn it off with `scrollIntoView={false}`.
- **Typeahead:** typing jumps to items by their label (or `textValue`). On by default for `keyboardTarget="list"`, off
  for `"window"`, where letters are game keys.
- **State:** `highlightedValue` / `defaultHighlightedValue` / `onHighlightedValueChange(value, source)`;
  `useListMenu()` inside the menu gives `{ highlightedValue, highlightedIndex, count, highlight }`.
- **ARIA:** `role="menu"` + `menuitem` (or `role="listbox"` + `option`), `aria-activedescendant` (default) or roving
  tabindex (`focusMode="roving"`). Give `ListMenuContent` an `aria-label`.
- **Styling:** highlighted rows get `data-highlighted` (accent surface + primary bar on the left); disabled rows
  get `data-disabled`. `size="lg"` shows icons as tiles and suits two-line rows. `render` swaps the element of
  `ListMenuItem` / `ListMenuContent`.

**Headless:** `useListNavigation` does the same for any markup:

```tsx
const nav = useListNavigation({
  count: jobs.length,
  isDisabled: (i) => jobs[i].locked,
  onSelect: (i) => apply(jobs[i]),
  onClose: close,
  keyboardTarget: "window",
  typeahead: (i) => jobs[i].title,
});

<div {...nav.getListProps({ "aria-label": "Job center" })}>
  {jobs.map((job, i) => (
    <Item key={job.id} {...nav.getItemProps(i)}>{job.title}</Item>
  ))}
</div>
```

Options: `count`, `activeIndex` / `defaultActiveIndex` / `onActiveIndexChange(index, source)`, `isDisabled`,
`skipDisabled`, `loop`, `orientation`, `columns`, `pageSize`, `onSelect`, `onBack`, `onClose`, `keys`, `focusMode`,
`keyboardTarget`, `enabled`, `scrollIntoView`, `typeahead`, `role`, `id`. Returns `activeIndex`, `setActiveIndex`,
`getListProps(props?)`, `getItemProps(index, props?)`, `getItemId(index)` and `handleKey(event)`. Props you pass in
are merged; your handlers run first. `Item` shows the highlighted style through `data-highlighted`, so it works as
a row directly.

### BentoGrid

A bento layout: cards in different sizes on a grid — dashboards, tablet and phone home screens (MDT, banking, garage
apps in FiveM), feature overviews. Plain CSS grid, works in Chromium 103.

```tsx
import {
  BentoCard, BentoCardContent, BentoCardDescription, BentoCardIcon, BentoCardTitle, BentoCardVisual, BentoGrid,
} from "@pre_scripts/preui";

<BentoGrid columns={4} rowHeight="9.5rem">
  <BentoCard colSpan={2} rowSpan={2}>
    <BentoCardVisual>{/* chart, picture, live value … takes the free space */}</BentoCardVisual>
    <BentoCardContent>
      <BentoCardTitle>Fleeca Bank</BentoCardTitle>
      <BentoCardDescription>$48,200</BentoCardDescription>
    </BentoCardContent>
  </BentoCard>
  <BentoCard render={<a href="/garage" />}>          {/* a link or button card gets hover + focus styles */}
    <BentoCardContent>
      <BentoCardIcon><Car /></BentoCardIcon>
      <BentoCardTitle>Garage</BentoCardTitle>
      <BentoCardDescription>3 vehicles</BentoCardDescription>
    </BentoCardContent>
  </BentoCard>
</BentoGrid>
```

| `BentoGrid` prop | Type | Default |
|---|---|---|
| `columns` | `number` | `3` |
| `rowHeight` | `number` (px) `\| string` — one row; a `rowSpan={2}` card is two rows plus the gap | `"11rem"` |
| `responsive` | `boolean` — below `md` (768px) the cards stack in one column with auto height; `false` keeps the columns at every width (fixed-size game UIs) | `true` |

| `BentoCard` prop | Type | Default |
|---|---|---|
| `colSpan` / `rowSpan` | `number` | `1` |
| `render` | element to render instead of the `<div>` (`<a href="…" />`, `<button type="button" />`, `<section />`) | |
| `interactive` | `boolean` — hover and focus styles; on by default when `render` is set | |

Parts: `BentoCardVisual` (fills the space above the text, clipped), `BentoCardContent` (text block at the bottom),
`BentoCardIcon` (tinted icon tile — recolour with e.g. `className="bg-pui-warning/tint text-pui-warning"`),
`BentoCardTitle`, `BentoCardDescription`. The spans are CSS variables (`--bento-col-span`, `--bento-row-span`), the grid
sets `--bento-columns` and `--bento-row-height`; `gap-3` is the default gap (override with `className`).

### Kanban

A board of columns with cards you move with the pointer or the keyboard — orders in a business script, dispatch calls
in an MDT, a workshop queue, a task board. Drag & drop uses pointer events (not HTML5 drag & drop, which is unreliable
in FiveM's CEF): 4px threshold, a preview that follows the cursor, a line that shows the drop position, lists that
scroll near their edges. The board only reports moves — your state decides what is rendered:

```tsx
import {
  Badge, Kanban, KanbanCard, KanbanColumn, KanbanColumnContent, KanbanColumnHeader, KanbanColumnTitle, moveKanbanItem,
} from "@pre_scripts/preui";

const [board, setBoard] = useState<Record<string, Order[]>>({ new: […], progress: […], done: [] });

<Kanban onCardMove={(event) => setBoard((current) => moveKanbanItem(current, event))} className="h-[28rem]">
  {columns.map((column) => (
    <KanbanColumn key={column.id} id={column.id} label={column.title}>
      <KanbanColumnHeader>
        <KanbanColumnTitle>{column.title}</KanbanColumnTitle>
        <Badge variant="secondary">{board[column.id].length}</Badge>
      </KanbanColumnHeader>
      <KanbanColumnContent empty="Drop an order here">
        {board[column.id].map((order) => (
          <KanbanCard key={order.id} id={order.id}>{order.title}</KanbanCard>
        ))}
      </KanbanColumnContent>
    </KanbanColumn>
  ))}
</Kanban>
```

- `onCardMove({ cardId, from, to })` fires once per drop at a new position (not on Escape, not outside the columns,
  not when dropped where it was). `to.index` is the position **after** the card left its source column —
  `moveKanbanItem(board, event)` applies it to a `{ [columnId]: { id }[] }` state without mutating it. Without
  `onCardMove` the board is read-only.
- Keyboard: Space/Enter picks the focused card up, ↑/↓ move it inside the column, ←/→ to the neighbouring column,
  Space/Enter drops, Escape (or leaving the card) cancels. Moves are announced in a live region; texts are English by
  default — pass `labels={{ card, instructions, pickedUp, moving, dropped, cancelled }}`.
- `KanbanColumn`: `id` (reported in events), `label` (screen readers and announcements), `disabled` (no drops into it).
  18rem wide by default; the board scrolls horizontally, give it a height so the columns scroll vertically.
- `KanbanCard`: `id`, `disabled` (can't be moved); any content, clicks keep working (the click that ends a drag is
  swallowed). `KanbanColumnContent` takes `empty` for an empty column.
- State attributes for styling: `data-dragging` on the board and the moved card, `data-drop-target` on the column
  under the card, `data-disabled`; the preview is `[data-slot="kanban-drag-preview"]`.

### Game UI

Components for HUDs and inventories — built for FiveM, usable anywhere. Like the rest of preUI they avoid CSS that
Chromium 103 lacks.

#### ProgressCircle

Circular sibling of `Progress`: same `tone`s, `value` / `min` / `max`, `locale`, and `value={null}` for indeterminate
(a spinning arc; a static dimmed ring with `prefers-reduced-motion`).

```tsx
import { ProgressCircle, ProgressCircleValue } from "@pre_scripts/preui";

<ProgressCircle value={72} showValue aria-label="Stamina" />
<ProgressCircle value={88} tone="warning" size="lg" showValue locale="de-DE" aria-label="Storage" />
<ProgressCircle value={3} max={5} aria-label="Jobs done">
  <ProgressCircleValue>{(_, value) => `${value}/5`}</ProgressCircleValue>
</ProgressCircle>
<ProgressCircle value={null} size="sm" aria-label="Loading" />
```

| Prop | Type | Default |
|---|---|---|
| `tone` | `"primary" \| "positive" \| "warning" \| "negative" \| "muted"` | `"primary"` |
| `size` | `"sm"` (32px) `\| "default"` (48px) `\| "lg"` (64px) `\| number` (px) | `"default"` |
| `thickness` | `number` (px) | `3` / `4` / `5` (`4` for numeric sizes) |
| `showValue` | `boolean` — formatted value in the centre; `children` replace it | `false` |
| `trackClassName` / `indicatorClassName` | `string` | |

#### KeybindHint

Key prompts built on `Kbd`:

```tsx
import { KeybindHint, KeybindHintBar } from "@pre_scripts/preui";

<KeybindHint keys="E" label="Interact" />
<KeybindHint keys={["Shift", "F"]} label="Lock vehicle" />      // joined with "+"
<KeybindHint keys={["W", "A", "S", "D"]} separator={null} label="Move" />

<KeybindHintBar variant="surface" role="group" aria-label="Controls">
  <KeybindHint keys="E" label="Buy" />
  <KeybindHint keys="Esc" label="Close" />
</KeybindHintBar>
```

`KeybindHintBar` takes `orientation` (`"horizontal"` | `"vertical"`), `variant` (`"default"` plain | `"surface"`, a
card-coloured pill or panel) and `gap` (px). `KeybindHint` takes `keys` (`ReactNode | ReactNode[]`), `label`,
`separator` (default `"+"`) and `keyClassName`.

**Clickable hints and compact size.** Make a hint a button with `render`. It then gets padding, a hover background, a
focus ring and a tint while `aria-pressed` is true:

```tsx
<KeybindHint render={<button type="button" onClick={openGarage} />} keys="F1" label="Open garage" />
<KeybindHint render={<button type="button" aria-pressed={active} onClick={toggle} />} keys="Alt" label="Third eye" className="rounded-full" />
```

Clicks on the key caps reach the button (`Kbd` is `pointer-events-none`). Set `interactive` to force the button
styles on or off. `size="sm"` gives smaller key caps and `text-xs` for compact footers. `KeybindHintBar` also takes
`render` (e.g. `render={<footer />}`).

#### RadialMenu

Interaction wheel like the radial menus of FiveM servers: items sit in a ring of equal segments around a centre. The
pointer's angle from the centre picks the segment (also outside the ring), a click selects it or opens its submenu, and
the centre shows the highlighted label and goes back one level. Data-driven, because the layout depends on the item count.

```tsx
import { RadialMenu, type RadialMenuItem } from "@pre_scripts/preui";
import { Car, Cog, DoorOpen, Package, User } from "lucide-react";

const items: RadialMenuItem[] = [
  { id: "vehicle", label: "Vehicle", icon: <Car />, items: [
    { id: "doors", label: "Doors", icon: <DoorOpen /> },
    { id: "engine", label: "Engine", icon: <Cog /> },
    { id: "trunk", label: "Trunk", icon: <Package />, disabled: true },
  ] },
  { id: "person", label: "Person", icon: <User /> },
];

const [open, setOpen] = useState(false);
<RadialMenu
  items={items}
  open={open}
  onOpenChange={setOpen}
  onSelect={(item, path) => fetchNui("radial", { path })} // path = ["vehicle", "doors"]
  autoFocus
  centerLabel="Interact"
/>
```

- 2–10 items per level; up to 8 reads best. `size` is the diameter in px (default 320), `innerRadius` the centre's
  share of the radius (default 0.36).
- Keyboard: arrows move around the ring (wrapping, disabled items skipped), Home/End, Enter/Space select or open a
  submenu, Backspace/Escape go back, Escape on the root level closes.
- Closing (Escape on the root level, a click on the centre on the root level, or after a selection unless
  `keepOpenOnSelect`) calls `onOpenChange(false)`. Without `open` / `onOpenChange` the menu never closes itself.
- `pointerTracking="window"` (default) follows the pointer anywhere on the page, like FiveM wheels; use `"element"`
  when several menus share a page. Clicks only count on the menu itself.
- `labels={{ menu, back, close }}` (English defaults) for the accessible name and the centre texts.

**Your own look.** Everything below is optional; keyboard, pointer and screen reader behaviour stay the same.

```tsx
import { RadialMenu, type RadialMenuItem } from "@pre_scripts/preui";
import { IdCard, Receipt, Search, ShieldAlert, Siren } from "lucide-react";

const police: RadialMenuItem[] = [
  { id: "id", label: "Check ID", icon: <IdCard />, description: "Asks for the person's ID." },
  { id: "search", label: "Search", icon: <Search /> },
  { id: "arrest", label: "Arrest", icon: <ShieldAlert />, tone: "destructive", description: "Takes the person into custody." },
  { id: "fine", label: "Fine", icon: <Receipt /> },
];
const counts: Record<string, number> = { fine: 3 };

<RadialMenu
  items={police}
  size={260}
  innerRadius={0.46}
  gap={6}
  startAngle={180 / police.length} // a gap instead of a segment at the top
  classNames={{ segment: "fill-pui-background", center: "fill-pui-background" }}
  renderItem={(item, { highlighted }) => (
    <span className={highlighted ? "relative" : "relative text-pui-foreground"}>
      {item.icon}
      {counts[item.id] ? <span className="absolute -right-2 -top-2 rounded-full bg-pui-primary px-1 text-[10px] text-pui-primary-foreground">{counts[item.id]}</span> : null}
      <span className="sr-only">{item.label}</span>
    </span>
  )}
  renderCenter={({ highlighted }) =>
    highlighted ? <><b>{highlighted.label}</b><small>{highlighted.description}</small></> : <Siren />
  }
/>
```

- Per item: `description` (shown in the centre below the label while highlighted, and used as the item's accessible
  description), `className` (the item's content element) and `tone` — `"default"` / `"primary"` (primary tint),
  `"positive"`, `"warning"`, `"destructive"` — colours the highlighted segment and its text (sets `data-tone`).
- `renderItem(item, { highlighted, disabled, level, index, count, hasSubmenu })` replaces a segment's icon + label. The
  result is rendered inside the segment's `role="menuitem"` element, centred on the segment; keep a text (e.g. an
  `sr-only` label) in it when you render icons only, because the item's accessible name comes from its content.
- `renderCenter({ highlighted, level, path, action, centerActive })` replaces the centre content. `path` is the list of
  opened submenu items, `action` is `"back"` (submenu), `"close"` (closable root level) or `null`, `centerActive` is
  true while the pointer rests on the centre. The centre is decorative (`aria-hidden`).
- Geometry: `startAngle` (degrees clockwise from 12 o'clock for the first item, default `0`), `gap` (px between
  segments, default `4`, `0` = touching) and `outerPadding` (px between the ring and the box edge, default `1`, e.g.
  room for badges outside the ring). The pointer mapping follows all of them.
- `classNames={{ root, ring, segment, segmentHighlight, item, icon, label, center, centerContent, centerLabel,
  centerDescription }}` adds classes per part; they are merged with tailwind-merge, so conflicting classes replace the
  defaults (`label: "text-sm"` replaces `text-xs`). `segment` is the resting segment shape, `segmentHighlight` the
  overlay that fades in on highlight; the segment group has Tailwind's `group`, so `group-data-[highlighted]:` works.
- Styling hooks: `data-slot="radial-menu"` (with `data-level`), `radial-menu-segment` / `radial-menu-item` (with
  `data-highlighted`, `data-disabled`, `data-tone`), `radial-menu-segment-shape`, `radial-menu-segment-highlight`,
  `radial-menu-label`, `radial-menu-icon`, `radial-menu-center` (with `data-action="back|close"`, `data-active`),
  `radial-menu-center-content`, `radial-menu-center-label`, `radial-menu-center-description`.

#### SkillCheck

The "press the key at the right moment" minigame for lockpicking, repairs or fishing, like ox_lib's `skillCheck`. A
marker runs around a ring (or slides along a bar); the player presses the key (or clicks/taps the check) while it is
inside the highlighted zone.

```tsx
import { SkillCheck, useSkillCheck } from "@pre_scripts/preui";

function Lockpick() {
  const skillCheck = useSkillCheck();
  const pick = async () => {
    const ok = await skillCheck.start(["easy", "medium", "hard"], ["e"]);
    fetchNui("lockpick:result", { ok });
  };
  return (
    <>
      <Button onClick={pick}>Pick the lock</Button>
      {skillCheck.running && <SkillCheck {...skillCheck.props} />}
    </>
  );
}

// Declarative
<SkillCheck rounds={3} difficulty="medium" keys={["e"]} onComplete={(ok, { round }) => …} />

// Horizontal bar, own colours and centre content
<SkillCheck variant="bar" size={280} zoneTone="positive" indicatorTone="primary" />
<SkillCheck classNames={{ track: "stroke-pui-border" }} renderContent={({ key, round, rounds }) => …} />
```

- Difficulties `"easy"` (50° zone, ×1), `"medium"` (40°, ×1.5), `"hard"` (25°, ×1.75) — ox_lib's values — or
  `{ areaSize, speedMultiplier }`. One turn takes 2 s at ×1. `rounds` is an array of difficulties or a count.
- Fails on a configured key outside the zone and after `timeoutTurns` full turns (default 1) without a press; other
  keys, key repeats and Ctrl/Alt/Meta combinations are ignored. `randomKey` picks one of `keys` per round (ox_lib
  style). The zone is placed at random each round (`random` makes it predictable, e.g. in tests).
- `useSkillCheck().start()` resolves `false` on a miss, on `cancel()`, when `start()` is called again or when the
  component unmounts.
- Props: `active`, `runKey` (change it to restart), `variant` (`"ring"` | `"bar"`), `size` (ring: `"sm"` 96 /
  `"default"` 128 / `"lg"` 160 / px; bar: its length, 160 / 224 / 288 / px), `thickness` (ring stroke / bar height),
  `zoneTone` (`"primary"` | `"positive"` | `"warning"`), `indicatorTone` (`"foreground"` | `"primary"` | `"positive"` |
  `"warning"`), `showKey`, `formatKey`, `pointer` (default `true`), `labels`, `classNames` (per part: `root`, `svg`,
  `track`, `zone`, `indicator`, `content`, `hint`, `key`, `round`, `status`) and `renderContent({ state, round, rounds,
  key, progress })` to replace the centre content. `onRoundComplete({ round, success })`.
- The marker moves with `requestAnimationFrame` (SVG `transform` attribute: `rotate()` on the ring, `translate()` on the
  bar) and keeps moving with `prefers-reduced-motion`, because the movement is the game. The root carries
  `data-state="idle|running|success|failed"` and `data-variant`.

**Your own minigame.** `useSkillCheckGame(options)` runs the same game (rounds, difficulties, keys, random zones,
timeouts, `onComplete` / `onRoundComplete`) without any markup:

```tsx
const game = useSkillCheckGame({ rounds: ["easy", "medium", "hard"], keys: ["e"], onComplete: (ok) => … });
// game.state, game.round (1-based), game.rounds, game.zone { start, size } (degrees), game.angle, game.progress (0–1),
// game.key, game.flash, game.start(), game.cancel(), game.press() (click/tap) or game.press("e")
<Pin lift={game.progress} target={[game.zone.start / 360, (game.zone.start + game.zone.size) / 360]} />
```

It is idle until `start()` (or `active: true`); keys are read from `window` while running (`keyboard: false` turns
that off). By default it re-renders every frame; for heavy visuals pass `frameUpdates: false` and draw in
`onFrame(angle)` or read `getAngle()`.

#### KeybindInput

A "press a key" field for settings menus. It looks like `Input` and shows the binding as `Kbd` chips (Shift + F).

```tsx
import { KeybindInput, matchesKeybind, type Keybind } from "@pre_scripts/preui";

const [bind, setBind] = useState<Keybind | null>({ key: "f", code: "KeyF", shift: true });
<KeybindInput aria-label="Open menu" value={bind} onValueChange={setBind} />

// German key names
<KeybindInput formatKey={(key) => ({ " ": "Leertaste", Control: "Strg", Shift: "Umschalt" })[key]} />

window.addEventListener("keydown", (e) => { if (matchesKeybind(e, bind)) openMenu(); });
```

- Click, Enter or Space starts listening; the next key (with Ctrl/Alt/Shift/Meta) becomes the value. Escape, Tab,
  clicking again or blurring cancel. With `clearable` (default) Backspace/Delete clears and a clear button appears.
- Value: `{ key, code, ctrl?, alt?, shift?, meta? } | null`, controlled or uncontrolled. `disallowedKeys` (default
  `["Escape"]`), `allowModifiers`, `disabled`, `invalid`, `size`, `separator`, `labels`, `name` (hidden input with JSON).
- Helpers: `formatKeybind(value, { formatKey })` (display parts, layout-independent from `code`),
  `keybindFromEvent(event)`, `matchesKeybind(event, value)`.
- FiveM: game keybinds belong in Lua (`RegisterKeyMapping`, changeable in GTA's settings); this field is for hotkeys
  inside your UI or a preference your script maps.

#### HudStatus

Player stats for game HUDs (health, armour, hunger, thirst, stamina, stress, oxygen …) as a ring, bar or compact pill,
plus a speedometer. Thresholds switch the tone to `warning` / `negative` and set `data-level`.

```tsx
import { HudSpeedometer, HudStatus, HudStatusGroup } from "@pre_scripts/preui";
import { Fuel, Heart, Shield, Utensils } from "lucide-react";

// Hoist icons: the components are memoised and skip renders when their props don't change.
const heart = <Heart />;

<HudStatusGroup aria-label="Status" variant="surface">
  <HudStatus value={health} icon={heart} label="Health" tone="positive" criticalBelow={20} pulseWhenCritical />
  {armour > 0 && <HudStatus value={armour} icon={<Shield />} label="Armour" />}
  <HudStatus value={hunger} icon={<Utensils />} label="Hunger" tone="muted" warnBelow={25} criticalBelow={10} />
  <HudStatus value={stress} label="Stress" variant="pill" warnAbove={60} criticalAbove={85} />
  <HudStatus value={oxygen} label="Oxygen" size={72} thickness={7} renderValue={({ valueText }) => `${valueText} %`} />
</HudStatusGroup>

<HudSpeedometer speed={kmh} maxSpeed={260} ticks={14} redlineFrom={220} gear={gear} fuel={fuel} fuelIcon={<Fuel />} locale="de-DE" />
```

| `HudStatus` prop | Type | Default |
|---|---|---|
| `value` / `max` | `number` — clamped to `0 … max` | — / `100` |
| `label` | `string` — accessible name; visible with `showLabel` | required |
| `icon` | `ReactNode` | |
| `variant` | `"ring"` (ProgressCircle, icon inside) `\| "bar"` `\| "pill"` | `"ring"` |
| `tone` | `"primary" \| "positive" \| "warning" \| "negative" \| "muted"` — while no threshold is reached | `"primary"` |
| `warnBelow` / `criticalBelow` / `warnAbove` / `criticalAbove` | `number` | |
| `pulseWhenCritical` | `boolean` (`motion-safe:animate-pulse`) | `false` |
| `showValue` / `showLabel` | `boolean` | `true` for pills or with `renderValue` / `false` |
| `size` | `"sm" \| "default" \| "lg"`, or a number = ring diameter in px (bars/pills use `"default"`) | `"default"` |
| `thickness` | `number` — ring stroke width or bar height in px | per size |
| `renderValue` | `(state: { value, max, fraction, percent, level, tone, valueText }) => ReactNode` | |
| `classNames` | `Partial<Record<"root" \| "icon" \| "track" \| "indicator" \| "value" \| "label", string>>` | |
| `locale` / `format` | `Intl.LocalesArgument` / `Intl.NumberFormatOptions` | `"en-US"` / `{ maximumFractionDigits: 0 }` |

Rings are `role="progressbar"`, bars and pills `role="meter"`, all with `aria-valuenow/min/max` and `aria-valuetext`
(always the formatted value, also with `renderValue`). The root carries `data-variant`, `data-size` (`"custom"` for
px), `data-tone` and `data-level` (`"warning"` / `"critical"`). To hide a stat, don't render it or pass `hidden`.
`getHudStatusLevel(value, thresholds)` returns the level for your own logic. `HudStatusGroup` takes `orientation`,
`variant` (`"default"` | `"surface"`) and `gap`; give it an `aria-label`.

**Your own HUD visual.** `useHudStatus({ value, max, warnBelow, criticalBelow, warnAbove, criticalAbove, tone, locale,
format, label })` returns `{ value, max, fraction, percent, level, tone, valueText, meterProps }` — the same clamping
and threshold logic, with `meterProps` (`role="meter"`, `aria-label`, `aria-valuenow/min/max/text`) to spread on your
element:

```tsx
function SegmentBar({ value, label }: { value: number; label: string }) {
  const s = useHudStatus({ value, label, warnBelow: 25, criticalBelow: 10 });
  const filled = Math.ceil(s.percent / 10);
  return (
    <div {...s.meterProps} className="flex flex-col-reverse gap-0.5">
      {Array.from({ length: 10 }, (_, i) => (
        <span key={i} className={i < filled ? (s.tone === "negative" ? "bg-pui-negative" : "bg-pui-positive") : "bg-pui-muted"} />
      ))}
    </div>
  );
}
```

`HudSpeedometer` takes `speed`, `maxSpeed` (default `240`), `unit` (default `"km/h"`), `gear` / `gearLabel`, `fuel`
(0–100, with `fuelIcon`, `fuelLabel`, `fuelWarnBelow` = 25, `fuelCriticalBelow` = 10), `showArc`, `ticks` (flat tick
marks along the arc, both ends included), `redlineFrom` (tinted negative arc segment from that speed; the indicator
turns negative and the root gets `data-redline` once the speed reaches it), `tone`, `size`, `label`, `locale`,
`format`, `renderSpeed({ speed, maxSpeed, fraction, speedText, redline })` and `classNames` (per part: `root`, `dial`,
`arc`, `track`, `redline`, `indicator`, `tick`, `readout`, `speed`, `unit`, `gear`, `fuel`). Only the bar width and the
ring/arc `stroke-dashoffset` animate, so values from NUI messages can update many times per second.

#### HudContainer

Places HUD elements at one of nine anchors. Anchor and offset are plain props, so players can move a HUD at runtime.
It ignores the mouse by default, so it never blocks the game cursor.

```tsx
import { HudContainer, hudAnchors, type HudAnchor } from "@pre_scripts/preui";

<HudContainer anchor="bottom-right" offset={24}>…</HudContainer>
<HudContainer anchor="top" offset={{ x: 0, y: 16 }} transition>…</HudContainer>
<HudContainer anchor={settings.anchor} position="absolute" interactive>…</HudContainer>
```

| Prop | Type | Default |
|---|---|---|
| `anchor` | `"top-left" \| "top" \| "top-right" \| "left" \| "center" \| "right" \| "bottom-left" \| "bottom" \| "bottom-right"` (all in `hudAnchors`) | `"top-left"` |
| `offset` | `number \| { x, y }` — px inward from the anchor edges; shifts on centred axes | `0` |
| `position` | `"fixed" \| "absolute"` | `"fixed"` |
| `transition` | `boolean` — animates position changes (a switch between opposite edges jumps) | `false` |
| `interactive` | `boolean` — enables pointer events | `false` |

Positioning uses inline `left` / `right` / `top` / `bottom` and `transform` (not the individual `translate` property,
so it works in Chromium 103). `data-anchor` reflects the current anchor; `getHudPositionStyle(anchor, offset)` returns
the same styles for your own elements.

## Server rendering (SSR)

preUI renders on the server (Next.js, TanStack Start, Remix …) without hydration mismatches:

- Nothing reads `window`, `matchMedia` or cookies during render. The sidebar and the date range picker render their
  desktop / single-month variant on the server and switch right after hydration (the desktop sidebar is hidden below
  `md` by CSS, so phones never see it).
- Numbers and dates are formatted with `"en-US"` unless you pass a locale — never with the runtime locale, which
  differs between server and browser: `locale` on `Progress`, `Meter`, `Slider`, `NumberField` (e.g. `locale="de-DE"`),
  and a react-day-picker `locale` (or `formatDate`) on `DatePicker` / `DateRangePicker`.
- `ThemeProvider` renders the default scheme on the server and during hydration and applies the stored / system
  scheme right after; `ThemeScript` in `<head>` sets it before the first paint (see
  [No flash: ThemeScript](#no-flash-themescript)).
- `RichTextEditor` creates its Tiptap editor after mounting (`immediatelyRender={false}`, Tiptap's SSR setting);
  set `immediatelyRender` in client-only apps to have it in the first paint. The CodeMirror editors always mount
  in an effect.
- The sidebar persists its desktop state in the `sidebar_state` cookie. Read it on the server and pass it on, like
  shadcn/ui does:

```tsx
import { SidebarProvider, getSidebarStateFromCookie } from "@pre_scripts/preui";

// in a server loader / layout where the request is available
const defaultOpen = getSidebarStateFromCookie(request.headers.get("cookie")) ?? true;

<SidebarProvider defaultOpen={defaultOpen}>…</SidebarProvider>
```

## Browser support

Current Chrome / Edge, Firefox and Safari, and **Chromium 103+** — so preUI runs in CEF-based game UIs such as
**FiveM NUI**. The package itself is compiled for `chrome103` / `node18`, and components avoid CSS that Chromium 103
lacks, or ship a fallback:

| Feature (Chromium version) | How preUI handles it |
|---|---|
| `:has()` (105) | Kept for modern browsers; a tiny effect mirrors each rule as a `data-has-*` attribute where `:has()` is unsupported (Calendar, Card and Alert need no `:has()` at all) |
| `translate` property (104) | Slider thumb gets an equivalent `transform` via `@supports not (translate: 0)` |
| `mask-image` unprefixed (120) | ScrollArea edge fade also sets `-webkit-mask-image` |
| `svh` units (108) | Sidebar height uses `var(--pui-viewport-height, 100vh)`; the preset sets it to `100svh` where supported |
| `contain: inline-size` (105) | CodeEditor / MarkdownEditor preview fall back to `width: 0; min-width: 100%` |
| Firefox-only `scrollbar-width` / `scrollbar-color` | Limited to Firefox via `@supports`, Chromium keeps the `::-webkit-scrollbar` styling |

Purely cosmetic features degrade silently (e.g. `text-wrap: balance` on `ItemDescription`).

### FiveM / CEF (Chromium 103)

Build your NUI for the engine, so your bundler lowers syntax and CSS for it:

```ts
// vite.config.ts
export default defineConfig({
  build: { target: "chrome103" }, // also lowers the CSS (cssTarget defaults to target)
});
```

- Tested: the whole playground built with `build.target: "chrome103"` renders in Chromium 103.0.5058 without console
  errors and matches current Chrome (overlays, menus, selects, calendar, sidebar, editors).
- Dependencies are compatible: Base UI and Immer feature-detect newer APIs (`checkVisibility`, `Iterator.from`);
  Shiki's JavaScript regex engine detects the supported RegExp features (`target: "auto"`, falls back to ES2018 without
  the `v` flag).
- Your own CSS: avoid `:has()`, `svh`/`dvh`, container queries, `color-mix()`, CSS nesting (unless your build lowers
  it) and unprefixed `mask-image` — Chromium 103 ignores them.
- No `window.matchMedia`/`ResizeObserver` polyfills are needed; both exist in Chromium 103.

#### FiveM: NUI helpers and a server-wide theme

[`@pre_scripts/preui-nui`](./packages/preui-nui) is a small extra package with what every NUI page needs —
`fetchNui`, `useNuiEvent`, `useNuiVisibility`, `isEnvBrowser`, `debugData` (browser mocks) — and `<NuiThemeBridge />`,
which applies a server-wide theme (`GlobalState.theme`) live in every resource. Each NUI resource has its own origin
and therefore its own localStorage, so use `<ThemeProvider storage={false}>` there and let the server be the source of
truth. `useNuiLocale()` gets the server language from Lua (for `locale` props and your texts). A complete example
resource (fxmanifest, Lua, Vite project with an in-game theme editor) is in [`examples/fivem-theme`](./examples/fivem-theme).

#### FiveM: keep the page transparent (`colorScheme: false`)

FiveM shows every NUI page in an iframe of its root page. Chromium paints an **opaque** background behind an iframe
whose CSS `color-scheme` differs from its parent's — with preUI's default `color-scheme: dark` on `<html>` the whole
screen turns dark over the game. In NUI pages switch it off in both places:

```js
// tailwind.config.js
presets: [createPreuiPreset({ colorScheme: false })],
```

```tsx
<ThemeProvider storage={false} colorScheme={false}>…</ThemeProvider>
```

(`tokensToCss({ colorScheme: false })`, `npx preui init --no-color-scheme` and `getThemeScript({ colorScheme: false })`
do the same.) preUI's colours come from its tokens, so nothing changes visually; only native scrollbars and form
controls no longer follow the scheme — preUI draws its own anyway.

#### FiveM: start a new NUI resource

`npm create @pre_scripts/preui-nui@latest my-shop` scaffolds a ready resource: `fxmanifest.lua`, `client.lua`
(`/my-shop` toggles the UI, NUI callbacks `close` and `getData`) and a Vite + React + preUI web UI built for Chromium
103 (`base: "./"`, `target: "chrome103"`, `colorScheme: false`, `ThemeProvider storage={false}`, `useNuiVisibility`,
browser mocks via `debugData` / `fetchNui`). Options go after `--`: `--lang de|en` (texts and README, default `de`),
`--no-theme` (without the `preui_theme` bridge and `<NuiThemeBridge />`), `--force`. Then `cd my-shop/web && npm install`,
`npm run dev` for the browser, `npm run build` before deploying, and `ensure my-shop` in `server.cfg`. See
[`packages/create-preui-nui`](./packages/create-preui-nui).

#### FiveM: no native popups

CEF renders NUI off-screen and composites it over the game — browser-drawn popups are **not** transferred and simply
never appear in game: the `<input type="color">` picker, the `<select>` dropdown list, the `<input type="date|time|…">`
pickers, `<datalist>` suggestions and `alert()` / `confirm()` / `prompt()`. Use the DOM-rendered components instead:
`ColorPicker`, `Select` / `Combobox` / `Autocomplete`, `DatePicker` (`/calendar`), `AlertDialog`. (`title` tooltips
don't show either — use `Tooltip` for anything important.)

## Icons

preUI has no hard dependency on any icon library.

**1. Icons you pass in:** any React node works.

```tsx
import { Plus } from "lucide-react"; // or heroicons, phosphor, react-icons…
<Button leftIcon={<Plus />}>Add</Button>
```

**2. Icons preUI renders internally** (chevrons, check marks, close, spinner, toast icons): built-in SVGs are used by default.
Swap them with `IconProvider`:

```tsx
import { IconProvider } from "@pre_scripts/preui";
import { lucideIcons } from "@pre_scripts/preui/icons/lucide"; // requires lucide-react

<IconProvider icons={lucideIcons}>
  <App />
</IconProvider>
```

Or map any library yourself. Overrides can be partial:

```tsx
import { ArrowPathIcon, XMarkIcon } from "@heroicons/react/24/outline";

<IconProvider icons={{ spinner: ArrowPathIcon, close: XMarkIcon }}>
  <App />
</IconProvider>
```

Icon names: `spinner check close chevronDown chevronUp chevronLeft chevronRight chevronsUpDown chevronsLeft chevronsRight minus plus search more lock info success error warning calendar panelLeft arrowUp arrowDown arrowUpDown gripVertical copy bold italic underline strikethrough code codeBlock heading1 heading2 heading3 list listOrdered quote link undo redo eye sun moon monitor`.

## Theming

preUI is styled entirely through CSS variables ("design tokens"), like shadcn/ui's `globals.css`.

### Own the tokens (recommended)

```bash
npx preui init            # writes src/preui.css with every token, dark + light (use --force to overwrite)
npx preui init --scheme dark   # only one scheme (dark or light) on :root
```

```js
// tailwind.config.js — the tokens now come only from your file
const { createPreuiPreset } = require("@pre_scripts/preui/tailwind");

module.exports = {
  presets: [createPreuiPreset({ injectTokens: false })],
  content: ["./src/**/*.{ts,tsx}", "./node_modules/@pre_scripts/preui/dist/**/*.{js,cjs}"],
};
```

```ts
import "./preui.css"; // once, e.g. in main.tsx
```

Change any value in `preui.css` and every component follows. The same file is published as
`@pre_scripts/preui/tokens.css` if you prefer copying it by hand. Without `injectTokens: false` the preset
injects the defaults and your own `:root { … }` overrides still win.

### What the tokens cover

| Tokens | Examples |
|---|---|
| Colours (HSL channels) | `--pui-background`, `--pui-card`, `--pui-popover`, `--pui-primary`, `--pui-accent`, `--pui-border`, `--pui-input`, `--pui-ring`, `--pui-positive`, `--pui-negative`, `--pui-warning`, `--pui-info`, `--pui-scrim` (dialog backdrop), `--pui-thumb` (switch/slider thumb), chart colours |
| Tint strengths | `--pui-tint-rest` (0.15 dark / 0.1 light), `--pui-tint-hover` (0.25 / 0.16), `--pui-tint-border` (0.3) |
| Sizes | `--pui-control-h-sm` / `--pui-control-h` / `--pui-control-h-lg` (32/36/40px), `--pui-radius`, `--pui-ring-width`, `--pui-ring-offset` |
| Elevation | `--pui-shadow-window`, `--pui-shadow-floating`, `--pui-shadow-tooltip`, `--pui-shadow-thumb`, `--pui-overlay-opacity` (dialog backdrop) |
| Motion | `--pui-duration-fast` / `-base` / `-slow`, `--pui-ease` |
| Type | `--pui-font-sans`, `--pui-font-mono` |
| Syntax highlighting | `--pui-syntax-keyword`, `--pui-syntax-string`, `--pui-syntax-function` … |

Colours are channels (`217 91% 60%`), so opacity modifiers keep working (`bg-pui-primary/tint`, `bg-pui-card/50`).

### Theming: scheme & themes

Two independent axes on `<html>`:

| Attribute | Values | What it does |
|---|---|---|
| `data-scheme` | `"dark"` \| `"light"` | The colour scheme. preUI ships base values for **every** token in both schemes: dark on `:root` (the default, also without any attribute) and light under `[data-scheme="light"]`, each with `color-scheme`. Sizes, motion, radius and fonts are shared and only defined on `:root`. |
| `data-theme` | your theme name | A brand/style theme: overrides only what it changes and inherits the rest from the active scheme. |

```css
/* after the preUI tokens (preset or preui.css) */
[data-theme="brand"] {                         /* both schemes */
  --pui-primary: 262 83% 58%;
  --pui-ring: 262 83% 58%;
  --pui-radius: 0.75rem;
}
[data-theme="brand"][data-scheme="light"] {    /* optional light fine-tuning */
  --pui-primary: 262 70% 48%;
}
[data-theme="paper"] {                         /* light-only theme */
  color-scheme: light;
  --pui-background: 40 30% 98%;
  --pui-card: 40 30% 99%;
}
```

A light-only (or dark-only) theme is declared on the provider — `themes={{ paper: "light" }}` — so it sets
`data-scheme="light"` while `paper` is active (the light base tokens apply and the theme only adds its changes) and
locks the scheme toggle. Undeclared theme names count as supporting both schemes.

#### ThemeProvider

```tsx
import { ThemeProvider, ThemeToggle } from "@pre_scripts/preui";

<ThemeProvider defaultScheme="system" themes={{ brand: "both", paper: "light" }}>
  <App />
</ThemeProvider>
```

| Prop | Type | Default | |
|---|---|---|---|
| `defaultScheme` | `"light" \| "dark" \| "system"` | `"dark"` | used until the user picks a scheme |
| `defaultTheme` | `string` | none | used until the user picks a theme |
| `themes` | `Record<string, "light" \| "dark" \| "both">` | `{}` | your theme names and the schemes they support |
| `storageKey` | `string` | `"preui-theme"` | localStorage key (`{"scheme":…,"theme":…}`) |
| `enableSystem` | `boolean` | `true` | allow `"system"` (follows `prefers-color-scheme` live) |
| `disableTransitionOnChange` | `boolean` | `true` | switch colours at once instead of animating them |
| `forcedScheme` | `"light" \| "dark"` | | e.g. a page that must stay dark (the stored choice is kept) |
| `forcedTheme` | `string \| null` | | force a theme (`null` = none) |
| `onChange` | `({ scheme, resolvedScheme, theme }) => void` | | after a change (not initially) |
| `storage` | `ThemeStorage \| false` | localStorage | where the choice is kept (see [Own storage](#own-storage)) |
| `colorScheme` | `boolean` | `true` | write `style.colorScheme`; `false` in FiveM NUI (see [keep the page transparent](#fivem-keep-the-page-transparent-colorscheme-false)) |
| `tokens` | `{ shared?, dark?, light? }` | | runtime token overrides (see [Runtime theming](#runtime-theming)) |

It writes `data-scheme`, `data-theme` (removed when there is no theme) and `style.colorScheme` on `<html>`, persists the
choice (blocked storage falls back to memory), syncs across tabs and never reads `window` / `localStorage` /
`matchMedia` during render (SSR/hydration-safe).

```tsx
const { scheme, setScheme, resolvedScheme, theme, setTheme, themes, systemScheme, canToggleScheme } = useTheme();
```

`scheme` is the preference (`"system"` possible), `resolvedScheme` the applied `"light" | "dark"`, `systemScheme` the
OS scheme (`undefined` until known), `canToggleScheme` is `false` while the scheme is forced or a light-/dark-only theme
is active. `setTheme(null)` removes the theme.

#### Own storage

By default the choice is kept in localStorage (`storageKey`). Pass `storage` to keep it elsewhere — e.g. in FiveM,
where every NUI resource has its own localStorage and several scripts would otherwise drift apart:

```tsx
import { ThemeProvider, type ThemeStorage } from "@pre_scripts/preui";

// Created once (outside render or with useMemo) — a new object re-subscribes.
const serverStorage: ThemeStorage = {
  get: () => currentTheme,                          // { scheme?, theme? } | null, read after mounting
  set: (value) => sendToServer(value),              // { scheme, theme } when the user picks something
  subscribe: (callback) => onServerTheme(callback), // optional: push changes from outside, no re-mount
};

<ThemeProvider storage={serverStorage}>…</ThemeProvider>
<ThemeProvider storage={false}>…</ThemeProvider>     // React state only, nothing persisted
```

With `storage` set (object or `false`) the provider never touches localStorage. Updates from `subscribe` may contain only
some fields (`{ scheme: "light" }`), switch without animating (`disableTransitionOnChange`) and are not written back via
`set`. Pass the same `storage` (or just `false`) to `ThemeScript` / `getThemeScript`: the script then skips localStorage
and applies the defaults.

#### No flash: ThemeScript

The provider applies the stored choice after hydration; `ThemeScript` applies it **before the first paint**. Pass it the
same options as the provider (storage key, defaults, `themes`).

```tsx
// Next.js App Router — app/layout.tsx
import { ThemeProvider, ThemeScript } from "@pre_scripts/preui";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <ThemeScript defaultScheme="system" />
      </head>
      <body>
        <ThemeProvider defaultScheme="system">{children}</ThemeProvider>
      </body>
    </html>
  );
}
```

```tsx
// TanStack Start — src/routes/__root.tsx
function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
        <ThemeScript />
      </head>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
        <Scripts />
      </body>
    </html>
  );
}
```

For raw HTML (a Vite SPA's `index.html`, a FiveM NUI page) use the string helper once and paste the output into `<head>`
(or inject it with a small Vite plugin via `transformIndexHtml`):

```js
import { getThemeScript } from "@pre_scripts/preui";
console.log(`<script>${getThemeScript({ defaultScheme: "dark" })}</script>`);
```

The script is ES5, has no dependencies, survives blocked localStorage and escapes `<` in theme names. `suppressHydrationWarning`
on `<html>` is needed because the script changes its attributes before React hydrates. CSS stays purely attribute-driven:
there is no `@media (prefers-color-scheme)` in preUI — "system" is resolved by the provider/script, so the result is
predictable and identical on the server and in the browser.

#### ThemeToggle & ThemeSelect

```tsx
import { ThemeSelect, ThemeToggle } from "@pre_scripts/preui";

<ThemeToggle />                                     {/* icon button: light ↔ dark, label "Toggle color scheme" */}
<ThemeSelect themeLabels={{ brand: "Brand" }} />    {/* menu: Light / Dark / System (+ your themes) */}
<ThemeSelect labels={{ light: "Hell", dark: "Dunkel", system: "System", trigger: "Farbschema" }} />
```

Both use the `sun` / `moon` / `monitor` icon slots (swappable via `IconProvider`), accept all `Button` props, carry
`data-slot="theme-toggle"` / `"theme-select-trigger"` plus `data-scheme`, and are disabled (the scheme options of
`ThemeSelect`) while the scheme is locked. `ThemeSelect` shows the theme group only when the provider declares `themes`.

#### Charts and code

- Chart series colours per scheme: `theme: { dark: "…", light: "…" }` — `dark` (or `default`) is the base rule,
  `light` applies under `[data-scheme="light"]`, any other key under `[data-theme="<key>"]`. `default` is the fallback
  for a scheme without its own key. Grid, axis and tooltip colours follow the tokens automatically.
- `CodeBlock` / `CodeEditor` / `Markdown` colours are the `--pui-syntax-*` tokens; the light scheme ships its own
  readable syntax palette. Override single roles per scheme or theme like any token.

#### `npx preui init --scheme`

```bash
npx preui init                  # dark (:root, [data-scheme="dark"]) + light ([data-scheme="light"]) — for ThemeProvider
npx preui init --scheme dark    # only the dark tokens on :root (dark-only app, the previous behaviour)
npx preui init --scheme light   # only the light tokens on :root (light-only app)
```

The same choice exists for the preset (`createPreuiPreset({ scheme: "light" })`) and `tokensToCss({ scheme })`.
`@pre_scripts/preui/tokens.css` contains both blocks. Put your theme rules **after** the token blocks (same specificity,
the later rule wins).

The playground has a **theme builder** (`?page=theme`) with controls for every token, a base switch
(Dunkel / Hell / Beide — dark values, light values, or a theme for both schemes with light fine-tuning), a live preview
that follows the edited scheme and a copy/download button for the resulting CSS (global or as `[data-theme="…"]` blocks).
Its **Live-Editor** (`?page=editor`) shows the runtime API below: a few base colours per scheme, contrast badges and the
CSS export.

### ThemeEditor

One theme editor for websites and FiveM NUI. It edits a `ThemeConfig` (theme protocol v1): the exact object
`NuiThemeBridge` / `GlobalState.theme` use, so a saved value needs no conversion. The component never talks to a
server or storage. Wire `onChange` / `onSave` to `fetchNui`, `localStorage` or your API.

- **Presets** (`defaultThemePresets`, or your own `ThemePreset[]`; `presets={[]}` hides them), each marked when it
  passes the contrast check
- **Default scheme** (dark / light / system) and **base colours per scheme** (primary, background, text, positive,
  negative, destructive, warning, info), expanded with `deriveTokens`. Unset fields show the effective colour, changed
  fields are marked and can be reset one by one
- **Radius** and optional **font** (`fonts`)
- **Contrast, always visible**: a status for both schemes, the pair list of the scheme being edited, and a badge
  on every colour that takes part in a failing pair
- **Reset all**, **Save** (`onSave`, may return a promise), optional **export** of CSS overrides and JSON (`exportable`)
- **Large layout with preview** (`layout="split"`): the controls on the left, a big preview pane on the right with
  sample buttons, form controls, a card, badges, alerts and a table (`ThemeEditorPreview`), always in the edited colours
  of the scheme picked at its top. `previewSlot` replaces the sample with your own content. Below `lg` the two stack.
- **Live preview** (`preview`, default on): applies the edited theme to the whole page in its own `<style>` while
  mounted and removes it on unmount. It doesn't change `data-scheme`. The preview pane / `previewSlot` show the edited
  colours with or without it (scoped CSS variables).

All texts come from `labels` (English defaults), numbers use `locale`. SSR-safe and Chromium 103 / CEF-safe
(everything is drawn in the DOM).

Website (persistence by the page):

```tsx
import { ThemeEditor, ThemeProvider, resolveThemeConfig, type ThemeConfig } from "@pre_scripts/preui";

function ThemeSettings() {
  const [theme, setTheme] = useState<ThemeConfig>(() => JSON.parse(localStorage.getItem("theme") ?? "{}"));
  return (
    <ThemeEditor
      layout="split"
      className="h-[46rem]"
      value={theme}
      onChange={setTheme}
      onSave={(config) => localStorage.setItem("theme", JSON.stringify(config))}
      fonts={[{ label: "Inter", value: '"Inter Variable", system-ui, sans-serif' }, { label: "System", value: "system-ui, sans-serif" }]}
      exportable
    />
  );
}

// Apply a saved theme everywhere else:
<ThemeProvider defaultScheme={saved.scheme} tokens={resolveThemeConfig(saved)}>…</ThemeProvider>
```

FiveM NUI (server-wide theme, see `examples/fivem-theme`):

```tsx
import { ThemeEditor, ThemeProvider, type ThemeConfig } from "@pre_scripts/preui";
import { NuiThemeBridge, fetchNui } from "@pre_scripts/preui-nui";

export function App() {
  const [serverTheme, setServerTheme] = useState<ThemeConfig>({});
  return (
    <ThemeProvider storage={false} colorScheme={false}>
      <NuiThemeBridge onThemeChange={setServerTheme} />
      <ThemeEditor
        key={JSON.stringify(serverTheme)}
        variant="inline"
        layout="split"
        defaultValue={serverTheme}
        onSave={(config) => fetchNui("saveTheme", config)} // Lua: GlobalState.theme = config
        labels={{ save: "Für alle speichern", schemes: { dark: "Dunkel", light: "Hell" }, sample: { loading: "Lädt" } }}
        locale="de-DE"
      />
    </ThemeProvider>
  );
}
```

Helpers: `resolveThemeConfig(config)` (→ `applyTokens` / `tokensToCss({ tokens })` input),
`resolveThemeConfigTokens(config, scheme)`, `checkThemeConfigContrast(config, scheme)`, `defaultThemePresets`.

### Runtime theming

For theme editors and themes that arrive at runtime (a server, a settings page): set tokens live, derive a whole
palette from a few colours and check it for readable contrast.

#### applyTokens

```ts
import { applyTokens } from "@pre_scripts/preui";

const remove = applyTokens({
  shared: { radius: "0.75rem", "font-sans": '"Geist", sans-serif' }, // both schemes
  dark: { primary: "#f97316" },                                       // only while data-scheme="dark"
  light: { "--pui-primary": "hsl(25 95% 40%)" },                      // only while data-scheme="light"
});
remove(); // back to the scheme / theme values
```

- Colours may be hex (`#3b82f6`, `#38f`), `rgb()`, `hsl()` or HSL channels; they are stored as channels (`217 91% 60%`,
  rounded), so opacity classes like `bg-pui-primary/20` keep working. Other values (radius, fonts, durations) are used
  as given. Token names work with or without the `--pui-` prefix.
- Unknown tokens, invalid colours and values that could break out of the declaration (`;`, `{`, `}`, `<`) are dropped,
  with a `console.warn` in development builds.
- Writes **one** `<style id="preui-runtime-tokens">` into `<head>` (reused, only rewritten when the CSS changes — fast
  enough for a dragged slider) and never an inline style on `<html>`, so dark and light keep their own values.
- The blocks outrank the preset **and** `[data-theme]` rules, but only for the tokens they set; everything else still
  comes from the theme and scheme. The doubled `:root` does that independent of stylesheet order:

| Block | Selector (`runtimeTokenSelectors`) | Specificity |
|---|---|---|
| shared | `:root:root` | 0,2,0 |
| dark | `:root:root:not([data-scheme="light"]), :root:root [data-scheme="dark"]` | 0,3,0 |
| light | `:root:root[data-scheme="light"], :root:root [data-scheme="light"]` | 0,3,0 |

`options.id` keeps several independent override sets (e.g. an editor preview over the saved theme), `options.target`
writes into another document (an iframe). `clearTokens()` removes a set. In React, `<ThemeProvider tokens={…}>` does the
same and updates when the content changes. `tokensToCss({ tokens: { shared, dark, light } })` renders the identical CSS
as a string — for exporting a theme from an editor or shipping it at build time.

#### deriveTokens

A complete token set for one scheme from a few base colours — an editor needs ~8 controls instead of ~70 tokens:

```ts
import { applyTokens, deriveTokens } from "@pre_scripts/preui";

applyTokens({
  dark: deriveTokens({ primary: "#f97316", background: "#101418" }, "dark"),
  light: deriveTokens({ primary: "#c2410c" }, "light"),
});
```

| Base colour | Derives |
|---|---|
| `primary` (required) | `primary`, `ring` (charts and syntax keywords reference primary already) |
| `background` | every surface — shell, card, popover, muted, secondary, accent, rail, tooltip, border, input, chart grid — at its default lightness distance; hue and saturation follow the background |
| `foreground` | all text colours (derived from the background when omitted); `muted-foreground` keeps its default position and moves towards the foreground until it reaches 4.5:1 on background, card and muted |
| `positive`, `negative`, `destructive`, `warning`, `info` | that colour (charts follow positive / negative) |

Every `*-foreground` keeps its default when it reaches 4.5:1 on its surface, otherwise it becomes pure white or black
(whichever contrasts more — one of them always reaches ≥ 4.58:1). Colours you leave out, quality tiers and all
non-colour tokens keep the scheme's defaults; `deriveTokens({ primary: tokens["--pui-primary"] }, "dark")` returns exactly `tokens`.

#### Contrast

```ts
import { checkTokenContrast, getContrast } from "@pre_scripts/preui";

getContrast("#ffffff", "#000000");      // 21 (WCAG 2.x ratio, 1–21; hex, rgb(), hsl() or channels)
checkTokenContrast(deriveTokens(base, "dark"));
// [{ fg: "--pui-foreground", bg: "--pui-background", ratio: 15.01, level: "AAA" }, …]
```

Levels: `AAA` ≥ 7, `AA` ≥ 4.5, `AA-large` ≥ 3 (large or bold text only), else `fail`. `checkTokenContrast` checks a
fixed list (`contrastPairs`): text on its surface (foreground/background, card, popover, tooltip, primary, secondary,
accent, muted text on background/card/muted, each status colour's foreground) and the status colours as text on the
background (`text-pui-primary`, `-positive`, `-negative`, `-warning`, `-info` — the components mostly use them that
way). Missing tokens are skipped and `var(--pui-…)` references are followed. Nothing is blocked — show the result:

```tsx
import { ContrastBadge } from "@pre_scripts/preui";

<ContrastBadge foreground="#e5e7eb" background="#111827" />   {/* "15.26 AAA", green */}
<ContrastBadge ratio={result.ratio} locale="de-DE" />         {/* amber for AA large, red for fail */}
```

The defaults of both schemes pass every pair with at least AA.

### Targeting parts with CSS

Every rendered part carries `data-slot` (plus `data-variant` / `data-size` where applicable), like shadcn/ui v4:

```css
[data-slot="button"][data-variant="default"] { letter-spacing: 0.01em; }
[data-slot="dialog-content"] { max-width: 40rem; }
```

For one-off changes pass `className` — it is merged with the defaults and wins on conflicts.

### Utilities in your app

All tokens are available as Tailwind classes: surfaces (`bg-pui-shell`, `bg-pui-background`, `bg-pui-card`,
`bg-pui-popover`), text (`text-pui-foreground`, `text-pui-muted-foreground`), semantic colours, tints
(`bg-pui-primary/tint`, `hover:bg-pui-primary/tint-hover`), sizes (`h-pui-control`, `size-pui-control-sm`),
radii (`rounded-pui`, `rounded-pui-md`, `rounded-pui-sm`, `rounded-pui-window`), shadows (`shadow-pui-floating`),
motion (`duration-pui-fast`, `ease-pui`), `ring-pui` and the `text-pui-eyebrow` label size.

## Versioning

preUI follows [semver](https://semver.org) with the usual rule below 1.0: a **minor** bump (0.4 → 0.5) may contain
breaking or visible changes, a **patch** (0.5.0 → 0.5.1) never does. Every release is listed in
[CHANGELOG.md](./CHANGELOG.md).

## Development

```bash
npm run dev        # watch build
npm test           # run tests
npm run build      # build to dist/
npm publish        # runs typecheck, tests and build first
```

Rules for new components: [COMPONENT_GUIDE.md](./COMPONENT_GUIDE.md).
