# preUI

React components built on **[Base UI](https://base-ui.com)** (behavior & accessibility) and **Tailwind CSS v3** (styling).
A dense interface design — dark by default, with a matching light scheme: tinted accents, hairline borders, tabular
numbers. Works with any icon library.

## Installation

```bash
npm install @pre_scripts/preui
```

Requires `react >= 18` and `tailwindcss ^3.4` in your project. Base UI is installed automatically.

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
(used by `npx preui init`).

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
| Display & layout | Accordion, Alert, AspectRatio, Avatar, Badge, Card, Collapsible, Empty, Item, Kbd, Meter, Progress, ScrollArea, Separator, Skeleton, Spinner, Table |

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
| `buttonVariants`, `badgeVariants`, `alertVariants`, `avatarVariants`, `buttonGroupVariants`, `toggleVariants`, `toggleGroupVariants`, `toolbarVariants`, `inputVariants`, `inputGroupAddonVariants`, `inputGroupButtonVariants`, `numberFieldVariants`, `itemVariants`, `itemMediaVariants`, `emptyMediaVariants`, `progressIndicatorVariants`, `meterIndicatorVariants`, `navigationMenuTriggerStyle`, `sidebarMenuButtonVariants` | Style helpers (cva), e.g. to style a plain `<a>` like a button |
| `cn`, `mergeClassName` | Class merging (tailwind-merge); `mergeClassName` also accepts Base UI's function-form `className` |
| `IconProvider`, `useIcon`, `defaultIcons` | Icon slots (see [Icons](#icons)) |
| `ThemeProvider`, `useTheme`, `ThemeScript`, `getThemeScript`, `ThemeToggle`, `ThemeSelect` | Light/dark scheme + your named themes (see [Theming: scheme & themes](#theming-scheme--themes)) |
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
`ColorPickerEyeDropper` (only rendered where `window.EyeDropper` exists — not in Chromium 103). `onValueChange` fires
while dragging, `onValueCommit` at the end of a drag, per key press, on Enter/blur and on swatch clicks; both also
receive the exact HSV state. The hue stays put when the colour becomes grey or black. Accessible names are English by
default — pass `labels={{ area: "…", hue: "…", … }}` and `getAreaValueText` for other languages. `useColorPicker()`
gives own parts (e.g. HSL fields) access to the state.

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

It writes `data-scheme`, `data-theme` (removed when there is no theme) and `style.colorScheme` on `<html>`, persists the
choice (blocked storage falls back to memory), syncs across tabs and never reads `window` / `localStorage` /
`matchMedia` during render (SSR/hydration-safe).

```tsx
const { scheme, setScheme, resolvedScheme, theme, setTheme, themes, systemScheme, canToggleScheme } = useTheme();
```

`scheme` is the preference (`"system"` possible), `resolvedScheme` the applied `"light" | "dark"`, `systemScheme` the
OS scheme (`undefined` until known), `canToggleScheme` is `false` while the scheme is forced or a light-/dark-only theme
is active. `setTheme(null)` removes the theme.

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

## Development

```bash
npm run dev        # watch build
npm test           # run tests
npm run build      # build to dist/
npm publish        # runs typecheck, tests and build first
```

Rules for new components: [COMPONENT_GUIDE.md](./COMPONENT_GUIDE.md).
