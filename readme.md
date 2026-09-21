# preUI

React components built on **[Base UI](https://base-ui.com)** (behavior & accessibility) and **Tailwind CSS v3** (styling).
A dark, dense interface design: tinted accents, hairline borders, tabular numbers. Works with any icon library.

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

ESM config (`tailwind.config.mjs` / `.ts`) works too: `import preui from "@pre_scripts/preui/tailwind"`.

The preset sets the theme tokens on `:root`, enables tabular figures and makes `font-sans` / `font-mono` use the preUI fonts.
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
| Forms | Checkbox, CheckboxGroup, Field, Form, Input, InputGroup, InputOTP, Label, NumberField, RadioGroup, Slider, Switch, Textarea |
| Selection | Autocomplete, Combobox, Select |
| Menus & navigation | Breadcrumb, ContextMenu, DropdownMenu, Menubar, NavigationMenu, Pagination, Sidebar, Tabs |
| Overlays | AlertDialog, Dialog, Drawer, HoverCard, Popover, Sheet, Toast (`Toaster` + `toast()`), Tooltip |
| Display & layout | Accordion, Alert, AspectRatio, Avatar, Badge, Card, Collapsible, Empty, Item, Kbd, Meter, Progress, ScrollArea, Separator, Skeleton, Spinner, Table |

Components that build on another library have their own entry point, so you only install what you use:

| Import from | Components | Install |
|---|---|---|
| `@pre_scripts/preui/chart` | ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent | `recharts` `react-is` |
| `@pre_scripts/preui/calendar` | Calendar, DatePicker, DateRangePicker | `react-day-picker` |
| `@pre_scripts/preui/carousel` | Carousel, CarouselContent, CarouselItem, CarouselPrevious, CarouselNext | `embla-carousel-react` |
| `@pre_scripts/preui/command` | Command, CommandDialog, CommandInput, CommandList, CommandItem … | `cmdk` |
| `@pre_scripts/preui/resizable` | ResizablePanelGroup, ResizablePanel, ResizableHandle | `react-resizable-panels` |
| `@pre_scripts/preui/form` | Form, FormField, FormItem, FormLabel, FormControl, FormDescription, FormMessage | `react-hook-form` |
| `@pre_scripts/preui/data-table` | DataTable, DataTableColumnHeader, DataTablePagination, DataTableViewOptions | `@tanstack/react-table` |
| `@pre_scripts/preui/code` | CodeBlock (syntax highlighting, copy, line numbers), CodeInline, CodeEditor | `shiki`, `@codemirror/*` (state, view, language, commands, language-data, search, autocomplete), `@lezer/highlight` |
| `@pre_scripts/preui/markdown` | Markdown (GFM tables, task lists, highlighted code) | `react-markdown` `remark-gfm` + the `/code` packages |
| `@pre_scripts/preui/editor` | RichTextEditor (WYSIWYG, stores Markdown), MarkdownEditor (write/preview) | `@tiptap/core` `@tiptap/react` `@tiptap/pm` `@tiptap/starter-kit` `@tiptap/markdown` `@tiptap/extensions` + the `/markdown` packages |

The main package also exports a Base UI `Form` (native form with server-side errors); the `/form` entry is shadcn's react-hook-form `Form`.

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

Icon names: `spinner check close chevronDown chevronUp chevronLeft chevronRight chevronsUpDown chevronsLeft chevronsRight minus plus search more lock info success error warning calendar panelLeft arrowUp arrowDown arrowUpDown gripVertical`.

## Theming

preUI is styled entirely through CSS variables ("design tokens"), like shadcn/ui's `globals.css`.

### Own the tokens (recommended)

```bash
npx preui init            # writes src/preui.css with every token (use --force to overwrite)
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
| Colours (HSL channels) | `--pui-background`, `--pui-card`, `--pui-popover`, `--pui-primary`, `--pui-accent`, `--pui-border`, `--pui-input`, `--pui-ring`, `--pui-positive`, `--pui-negative`, `--pui-warning`, `--pui-info`, chart colours |
| Tint strengths | `--pui-tint-rest` (0.15), `--pui-tint-hover` (0.25), `--pui-tint-border` (0.3) |
| Sizes | `--pui-control-h-sm` / `--pui-control-h` / `--pui-control-h-lg` (32/36/40px), `--pui-radius`, `--pui-ring-width`, `--pui-ring-offset` |
| Elevation | `--pui-shadow-window`, `--pui-shadow-floating`, `--pui-shadow-tooltip`, `--pui-overlay-opacity` (dialog backdrop) |
| Motion | `--pui-duration-fast` / `-base` / `-slow`, `--pui-ease` |
| Type | `--pui-font-sans`, `--pui-font-mono` |
| Syntax highlighting | `--pui-syntax-keyword`, `--pui-syntax-string`, `--pui-syntax-function` … |

Colours are channels (`217 91% 60%`), so opacity modifiers keep working (`bg-pui-primary/tint`, `bg-pui-card/50`).

### Your own themes

There are no built-in alternative themes — you create them with tokens. A theme is just a selector with overrides:

```css
[data-theme="brand"] {
  --pui-primary: 262 83% 58%;
  --pui-ring: 262 83% 58%;
  --pui-radius: 0.75rem;
}
```

The playground has a **theme builder** (`?page=theme`) with controls for every token, a live preview and a
copy/download button for the resulting `preui.css`.

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
