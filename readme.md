# preUI

A small React component library built on **Tailwind CSS v3**. Works with any icon library.

## Installation

```bash
npm install preui
```

Requires `react >= 18` and `tailwindcss ^3.4` in your project.

Add the preset and the package's build output to your `tailwind.config.js`:

```js
module.exports = {
  presets: [require("preui/tailwind")],
  content: [
    "./src/**/*.{js,ts,jsx,tsx}",
    "./node_modules/preui/dist/**/*.{js,cjs}", // so Tailwind generates preUI's classes
  ],
};
```

ESM config (`tailwind.config.mjs` / `.ts`) works too: `import preui from "preui/tailwind"`.

## Button

```tsx
import { Button } from "preui";

<Button>Save</Button>
<Button variant="outline" size="sm">Cancel</Button>
<Button variant="destructive" loading>Deleting…</Button>
<Button className="rounded-full px-8">Custom</Button> {/* className wins over variant classes */}
```

| Prop        | Type                                                                | Default     |
| ----------- | ------------------------------------------------------------------- | ----------- |
| `variant`   | `"primary" \| "secondary" \| "outline" \| "ghost" \| "destructive"` | `"primary"` |
| `size`      | `"sm" \| "md" \| "lg" \| "icon"`                                    | `"md"`      |
| `loading`   | `boolean`                                                           | `false`     |
| `leftIcon`  | `ReactNode`                                                         |             |
| `rightIcon` | `ReactNode`                                                         |             |
| `fullWidth` | `boolean`                                                           | `false`     |

All native `<button>` props and `ref` are forwarded. `buttonVariants()` is exported to style links etc. like a button:

```tsx
<a href="/docs" className={buttonVariants({ variant: "ghost" })}>Docs</a>
```

## Icons

preUI has no hard dependency on any icon library.

**1. Icons you pass in:** any React node works.

```tsx
import { Plus } from "lucide-react"; // or heroicons, phosphor, react-icons…
<Button leftIcon={<Plus />}>Add</Button>
```

**2. Icons preUI renders internally** (spinner, check, close, chevron): built-in SVGs are used by default. Swap them with `IconProvider`:

```tsx
import { IconProvider } from "preui";
import { lucideIcons } from "preui/icons/lucide"; // requires lucide-react

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

## Theming

Colors are CSS variables holding HSL channels. Override them in your global CSS:

```css
:root {
  --pui-primary: 262 83% 58%;
  --pui-primary-hover: 263 70% 50%;
  --pui-radius: 9999px;
}
```

The dark palette applies under `.dark` or `[data-theme="dark"]`. All colors are also available as utilities in your app, e.g. `bg-pui-primary/20`, `text-pui-foreground`, `border-pui-border`.

## Development

```bash
npm run dev        # watch build
npm test           # run tests
npm run build      # build to dist/
npm publish        # runs typecheck, tests and build first
```
