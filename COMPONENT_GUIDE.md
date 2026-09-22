# Komponenten-Leitfaden

Verbindliche Regeln für jede preUI-Komponente. Grundlage: **Base UI** (`@base-ui/react`) für Verhalten und
Barrierefreiheit, **Tailwind v3** mit dem preUI-Preset für das Aussehen, Werte aus dem Design-Handoff
(`design_handoff_nui/`).

- Base-UI-Doku liegt lokal: `node_modules/@base-ui/react/docs/react/components/<name>.md`
  (Anatomy, Data-Attribute, Props). Die Tailwind-Beispiele dort sind **v4** → nach v3 übersetzen.
- Design-Werte: `design_handoff_nui/README.md`, `design_handoff_nui/design/tokens/components.css`,
  `design_handoff_nui/design/COMPONENTS.md`. **Nur das Aussehen übernehmen**, nicht die vereinfachten
  Prototyp-APIs und nicht die `.lsb-*`-Klassen.

---

## Dateien

```
src/components/<Name>/
  <Name>.tsx        Komponente(n)
  <Name>.test.tsx   Tests
  index.ts          export { … } from "./<Name>"; export type { … } from "./<Name>";
```

Ordnername in PascalCase wie der exportierte Hauptname (`AlertDialog`, `DropdownMenu`, `InputOTP`, `NumberField`).
Nicht-Base-UI-Komponenten (Card, Table, Badge …) sind einfache, gestylte HTML-Elemente mit `forwardRef` + `cn()`.

**Geteilte Dateien nicht ändern:** `src/index.ts`, `src/icons/*`, `src/tailwind/preset.ts`, `src/utils/cn.ts`,
`package.json`, `tsdown.config.ts`, `vitest.*`. Fehlt dort etwas (Icon, Token), im Abschlussbericht melden.

## Benennung: wie shadcn/ui

- Komponenten- und Part-Namen **exakt wie bei shadcn/ui** (https://ui.shadcn.com/docs/components):
  `DropdownMenu`, `DropdownMenuTrigger`, `DropdownMenuContent`, `TabsTrigger`, `TabsContent`, `AccordionContent`,
  `HoverCard`, `InputOTP`, `Sheet`, `SelectLabel` … Varianten-/Größennamen ebenfalls wie shadcn, wo es sie gibt;
  zusätzliche Handoff-Varianten (`solid`, `positive`, `warning`, `info` …) dürfen ergänzt werden.
- Style-Helfer heißen wie bei shadcn (`buttonVariants`, `badgeVariants`, `navigationMenuTriggerStyle` …).
- Wo shadcn Radix' `asChild` nutzt, nutzen wir Base UIs `render`-Prop (`<DialogTrigger render={<Button />}>`).
- Hat shadcn kein Gegenstück (NumberField, Meter, Toolbar, CheckboxGroup, Autocomplete …), bleibt der Base-UI-Name.
- **Keine Aliase** – pro Teil genau ein exportierter Name.

## Einstiegspunkte mit Fremd-Libraries

Komponenten mit schweren Abhängigkeiten liegen ebenfalls in `src/components/<Name>/`, werden aber **nur über
ihren eigenen Einstiegspunkt** exportiert und **nie** aus `src/index.ts` (sonst müsste jeder Nutzer die Library
installieren). Die Libraries sind optionale Peer-Dependencies und bereits installiert.

| Einstiegspunkt | Ordner | Library (installierte Version) |
|---|---|---|
| `@pre_scripts/preui/chart` | `Chart` | recharts 3 |
| `@pre_scripts/preui/calendar` | `Calendar` (inkl. `DatePicker`) | react-day-picker **10** |
| `@pre_scripts/preui/carousel` | `Carousel` | embla-carousel-react 8 |
| `@pre_scripts/preui/command` | `Command` | cmdk 1 |
| `@pre_scripts/preui/resizable` | `Resizable` | react-resizable-panels **4** |
| `@pre_scripts/preui/form` | `HookForm` (exportiert shadcns `Form`, `FormField` …) | react-hook-form 7 |
| `@pre_scripts/preui/data-table` | `DataTable` | @tanstack/react-table **9** |
| `@pre_scripts/preui/code` | `Code` (`CodeBlock`, `CodeEditor`) | shiki 4, CodeMirror 6 |
| `@pre_scripts/preui/markdown` | `Markdown` | react-markdown 10 + remark-gfm |
| `@pre_scripts/preui/editor` | `Editor` (`RichTextEditor`, `MarkdownEditor`) | Tiptap 3 + @tiptap/markdown |

Diese Komponenten dürfen Hauptkomponenten per relativem Import nutzen (`../Button/Button`). **Nicht blind
shadcn-Code kopieren:** react-day-picker 10, TanStack Table 9 und react-resizable-panels 4 haben neue APIs –
maßgeblich sind die Typen/Doku in `node_modules/<paket>/`.

## Tokens statt fester Werte (Theming wie shadcn)

Nutzer übernehmen das Design über CSS-Variablen (`npx preui init` → eigene `preui.css`). Deshalb dürfen
Komponenten keine Design-Werte fest verdrahten, die es als Token gibt:

| Statt | Token-Klasse |
|---|---|
| `h-8` / `h-9` / `h-10` (Controls), `size-8/9/10` (Icon-Buttons) | `h-pui-control-sm` / `h-pui-control` / `h-pui-control-lg`, `size-pui-control…` |
| Tönung `/15`, `/25`, `/30` | `/tint`, `/tint-hover`, `/tint-border` (z. B. `bg-pui-primary/tint hover:bg-pui-primary/tint-hover border-pui-primary/tint-border`) |
| `duration-150` / `duration-200` / `duration-500` | `duration-pui-fast` / `duration-pui-base` / `duration-pui-slow` |
| `ease-out` | `ease-pui` |
| `ring-1` (Fokusring) | `ring-pui` |
| `ring-offset-1` (Ring-Abstand bei gefüllten Controls) | `ring-offset-pui` |
| Overlay `bg-pui-background/70` | `bg-pui-background/scrim` |
| Schatten | `shadow-pui-window` / `shadow-pui-floating` / `shadow-pui-tooltip` (sind jetzt Variablen) |
| Syntaxfarben | `var(--pui-syntax-<rolle>)` (im Preset definiert, pro Theme überschreibbar) |

Andere Opazitäten (z. B. `/40`, `/50`, `/70` für Hover-Flächen oder Overlays) und Abstände bleiben
Tailwind-Werte. Radien kommen weiterhin aus `rounded-pui…`, Farben aus `pui-…`.

## data-slot an jedem Teil

Wie shadcn v4: Jedes gerenderte Element eines Teils trägt `data-slot` in kebab-case —
Hauptteil = Komponentenname (`data-slot="button"`, `"dialog"`), Teile = `<komponente>-<teil>`
(`"dialog-content"`, `"dropdown-menu-item"`, `"select-trigger"`). Komponenten mit Varianten setzen
zusätzlich `data-variant` und `data-size`. So können Nutzer global per CSS überschreiben:
`[data-slot="button"][data-variant="default"] { … }`. Bestehende `data-slot`-Werte nicht umbenennen.

## API-Stil

Flache, benannte Exporte im shadcn-Stil, Präfix = Komponentenname. Ein Export pro Base-UI-Part, den
Nutzer brauchen; Root direkt durchreichen:

```tsx
import { Popover as BasePopover } from "@base-ui/react/popover";
import { forwardRef, type ComponentPropsWithoutRef, type ComponentRef } from "react";
import { mergeClassName } from "../../utils/cn";

export const Popover = BasePopover.Root;
export const PopoverTrigger = BasePopover.Trigger;
export const PopoverClose = BasePopover.Close;

export interface PopoverContentProps extends ComponentPropsWithoutRef<typeof BasePopover.Popup> {
  side?: BasePopover.Positioner.Props["side"];
  align?: BasePopover.Positioner.Props["align"];
  sideOffset?: BasePopover.Positioner.Props["sideOffset"];
}

/** Portal + Positioner + Popup in one, styled as a floating surface. */
export const PopoverContent = forwardRef<ComponentRef<typeof BasePopover.Popup>, PopoverContentProps>(
  function PopoverContent({ className, side = "bottom", align = "center", sideOffset = 6, ...props }, ref) {
    return (
      <BasePopover.Portal>
        <BasePopover.Positioner side={side} align={align} sideOffset={sideOffset} className="z-50 outline-none">
          <BasePopover.Popup
            ref={ref}
            className={mergeClassName(
              [
                "w-72 rounded-pui-md border border-pui-border bg-pui-popover p-4 text-sm text-pui-popover-foreground shadow-pui-floating outline-none",
                "origin-[var(--transform-origin)] transition-[opacity,transform] duration-200 ease-out",
                "data-[starting-style]:scale-95 data-[starting-style]:opacity-0 data-[ending-style]:scale-95 data-[ending-style]:opacity-0",
              ],
              className,
            )}
            {...props}
          />
        </BasePopover.Positioner>
      </BasePopover.Portal>
    );
  },
);
```

Regeln:
- **Immer `forwardRef`** (React 18 wird unterstützt). Typen über `ComponentRef<typeof X>` und
  `ComponentPropsWithoutRef<typeof X>` bzw. `BaseX.Part.Props`.
- **Klassen immer über `mergeClassName(base, className)`**: Base UI erlaubt `className` als Funktion des
  Zustands, das muss erhalten bleiben. Für einfache Nicht-Base-UI-Elemente reicht `cn()`.
- Varianten mit `cva` (siehe `src/components/Button/Button.tsx` als Referenz).
- Popups (Popover, Menu, Select, Tooltip …): `…Content` bündelt Portal + Positioner + Popup und reicht
  `side`/`align`/`sideOffset` durch. Die Einzelteile bei Bedarf zusätzlich exportieren.
- Keine hartcodierten sichtbaren Texte. Barrierefreiheits-Labels (z. B. Schließen-Button) als Prop mit
  englischem Default: `closeLabel = "Close"`.
- Kein `"use client"` in Dateien (setzt der Build), keine Default-Exports.

## Icons

**Nie `lucide-react` direkt importieren.** Interne Icons über `useIcon`:

```tsx
import { useIcon } from "../../icons";
const ChevronDown = useIcon("chevronDown");
<ChevronDown className="size-4" aria-hidden="true" />
```

Verfügbar: `spinner check close chevronDown chevronUp chevronLeft chevronRight chevronsUpDown chevronsLeft chevronsRight minus plus
search more lock info success error warning calendar panelLeft arrowUp arrowDown arrowUpDown gripVertical copy bold italic underline strikethrough code codeBlock heading1 heading2 heading3 list listOrdered quote link undo redo eye`. Größen laut Handoff: 12 (`size-3`, Badge), 14 (`size-3.5`),
16 (`size-4`, Standard), 18, 24.

## Tokens (Tailwind-Klassen aus dem Preset)

Nur diese Farben verwenden, **nie** Hex-Werte oder Tailwind-Standardfarben (`slate-…`, `blue-…`):

| Zweck | Klassen |
|---|---|
| Flächen | `bg-pui-shell` (Dialog), `bg-pui-background` (Felder, Inhalt), `bg-pui-card` (Panels), `bg-pui-popover` (Menüs, Toasts), `bg-pui-tooltip` |
| Text | `text-pui-foreground`, `text-pui-muted-foreground` (sekundär, Icons in Ruhe) |
| Interaktion | `pui-primary`, `pui-secondary`, `pui-accent` (Hover-Fläche), `pui-muted` (Tracks), `pui-rail-active` |
| Linien | `border-pui-border` (jede Trennlinie/Panelkante), `border-pui-input` (Feldrahmen), `ring-pui-ring` |
| Semantik | `pui-positive`, `pui-negative`, `pui-destructive`, `pui-warning`, `pui-info` (+ `-foreground`) |

**Tönung statt Füllung:** Akzentflächen `bg-pui-primary/15`, Hover `/25`, Rahmen `border-pui-primary/30`.
Deckend (`bg-pui-primary`) nur für die eine bestätigende Aktion bzw. „an"-Zustände (Checkbox, Switch).

| | |
|---|---|
| Radius | `rounded-pui-window` 12px · `rounded-pui` 8px (Panels, Dialoge, Tabellen, Toasts) · `rounded-pui-md` 6px (Buttons, Inputs, Menüs, Tooltips) · `rounded-pui-sm` 4px (Menüeinträge, Checkbox) · `rounded-full` (Progress, Pills) |
| Schatten | nur schwebende Ebenen: `shadow-pui-window` (Dialog), `shadow-pui-floating` (Menü, Popover, Toast), `shadow-pui-tooltip`. Panels **ohne** Schatten |
| Höhen | Controls `h-8` sm · `h-9` default · `h-10` lg |
| Schrift | Fließtext `text-sm`; Hinweise `text-xs`; Dialogtitel `text-base font-semibold`; Eyebrow `text-pui-eyebrow font-semibold uppercase text-pui-muted-foreground`; Bezeichner `font-mono` |
| Abstände | 0,25rem-Raster (Tailwind-Standard). Nicht auf 4/8 runden, Handoff-Werte exakt übernehmen |

## Zustände

| Zustand | Umsetzung |
|---|---|
| Hover | **nur Farbe**: `hover:bg-pui-accent`, Tönung 15 → 25 %, Sekundärtext → `text-pui-foreground`. Kein Anheben, Skalieren, Schatten, Unterstreichen |
| Fokus | Buttons/Schalter: `focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-pui-ring`. Felder: Rahmen wechselt `focus-visible:border-pui-ring` (bzw. `focus-within:` / `data-[focused]:`), kein Ring, kein Glow |
| Disabled | `data-[disabled]:pointer-events-none data-[disabled]:opacity-50` (Base UI setzt `data-disabled`; bei nativen Elementen zusätzlich `disabled:`) |
| Ungültig | `data-[invalid]:border-pui-negative` |
| Hervorgehoben (Menü, Option) | `data-[highlighted]:bg-pui-accent data-[highlighted]:text-pui-accent-foreground` |

Base UI setzt State-Attribute (`data-open`, `data-checked`, `data-pressed`, `data-selected`, `data-highlighted`,
`data-orientation`, `data-side` …) – welche genau, steht je Komponente in der Doku. In Tailwind v3 immer als
`data-[checked]:…` schreiben (nicht die v4-Kurzform `data-checked:`).

## Motion

- Farbe: `transition-colors duration-150 ease-out` (`ease-out` = `cubic-bezier(0,0,0.2,1)` wie im Handoff).
- Ebenen (Dialog, Popover, Menü, Toast): 200 ms, fade + zoom-95 über
  `data-[starting-style]:…` / `data-[ending-style]:…` und `origin-[var(--transform-origin)]` bei Popups.
- Progress: `duration-500`. Keine Federn, kein Bounce, keine Dauerbewegung (Ausnahme: indeterminate Progress,
  `motion-safe:` + statischer Fallback bei `prefers-reduced-motion`). Kein `backdrop-blur`.

## Referenzwerte je Muster (aus dem Handoff)

- **Floating-Fläche** (Menü, Select-Liste, Popover): `rounded-pui-md border border-pui-border bg-pui-popover text-pui-popover-foreground shadow-pui-floating p-1`, Menü `min-w-48`.
- **Menüeintrag**: `flex items-center gap-2.5 rounded-pui-sm p-2 text-sm outline-none` + highlighted. Select-Option `py-1.5 pl-2 pr-8` (Platz fürs Häkchen). Menü-Label: Eyebrow, `px-2 py-1.5`. Separator `-mx-1 my-1 h-px bg-pui-border`.
- **Feld** (Input, Select-Trigger, Combobox): `h-9 w-full rounded-pui-md border border-pui-input bg-pui-background px-3 text-sm text-pui-foreground placeholder:text-pui-muted-foreground transition-colors duration-150 ease-out focus-visible:border-pui-ring outline-none`.
- **Label**: `text-xs font-medium text-pui-muted-foreground`; Feld-Stack `flex flex-col gap-1.5`; Hinweis `text-xs text-pui-muted-foreground`; Fehler `text-xs text-pui-negative`.
- **Checkbox**: `size-4 rounded-pui-sm border border-pui-input`, checked `bg-pui-primary border-pui-primary`, Häkchen `size-3.5 text-pui-primary-foreground`.
- **Switch**: `h-5 w-9 rounded-full bg-pui-input`, checked `bg-pui-primary`; Thumb `size-4 rounded-full bg-pui-foreground shadow-[0_2px_4px_rgb(0_0_0/0.4)]`, checked `translate-x-4`.
- **Dialog**: Overlay `fixed inset-0 z-50 bg-pui-background/70`; Popup `fixed left-1/2 top-1/2 z-50 grid w-full max-w-lg max-h-[85vh] -translate-x-1/2 -translate-y-1/2 gap-4 overflow-y-auto rounded-pui border border-pui-border bg-pui-shell p-5 shadow-pui-window`; Titel `text-base font-semibold`; Beschreibung `text-sm text-pui-muted-foreground`; Footer `flex justify-end gap-2 pt-1`; Schließen-X `absolute right-4 top-4 text-pui-muted-foreground hover:text-pui-foreground`.
- **Tooltip**: `max-w-64 rounded-pui-md bg-pui-tooltip px-2.5 py-1.5 text-xs font-medium leading-snug text-pui-tooltip-foreground shadow-pui-tooltip`.
- **Toast**: unten rechts, `w-80`, `flex items-start gap-2.5 rounded-pui border border-pui-border bg-pui-popover px-3.5 py-3 text-sm shadow-pui-floating`, Einblendung fade + 8px slide-up in 200 ms; Icon `success`/`text-pui-positive`, `error`/`text-pui-negative`.
- **Tabs**: Liste `flex items-center gap-1 border-b border-pui-border`; Tab `-mb-px border-b-2 border-transparent px-3 pb-2.5 pt-1 text-sm font-medium text-pui-muted-foreground hover:text-pui-foreground`, aktiv `border-pui-foreground text-pui-foreground`.
- **ToggleGroup** (Segment): Gruppe `inline-flex items-center gap-0.5 rounded-pui-md border border-pui-border bg-pui-background p-0.5`; Toggle `h-6 rounded-pui-sm px-2.5 text-xs font-medium text-pui-muted-foreground hover:text-pui-foreground`, gedrückt `bg-pui-accent text-pui-foreground`.
- **Progress**: `h-1 w-full overflow-hidden rounded-full bg-pui-muted`, Balken `bg-pui-primary transition-all duration-500 ease-out`.
- **ScrollArea**: 10px-Spur, Thumb nur bei Hover sichtbar (`bg-pui-muted-foreground/35`, Hover `/60`), nichts verschiebt sich.
- **Separator**: `shrink-0 bg-pui-border`, `h-px w-full` bzw. `h-full w-px`.

Wo das Handoff nichts sagt (z. B. Slider, Accordion, Avatar), aus diesen Mustern ableiten: gleiche Flächen,
Rahmen, Radien, Höhen, Hover- und Fokusregeln.

## Browser-Support (Chromium 103, FiveM/CEF) und SSR

- Kein CSS, das Chromium 103 nicht kann, ohne Fallback: `:has()` nur zusammen mit `useHasFallback`
  (`src/utils/use-has-fallback.ts`, Klassen-Zwilling `data-[has-…]:…`) oder besser per Daten-Attribut aus React;
  kein `svh`/`dvh` (→ `var(--pui-viewport-height,100vh)`), keine Container Queries, kein `color-mix()`, kein
  unpräfixiertes `mask-image` ohne `-webkit-mask-image`, keine Einzel-Properties `translate`/`scale`/`rotate`.
- Keine JS-APIs jenseits Chromium 103 (`toSorted`, `Object.groupBy`, `Promise.withResolvers` …).
- SSR: während des Renderns nie `window`, `document`, `matchMedia` oder Cookies lesen (Media Queries über
  `useMediaQuery` aus `src/utils/use-media-query.ts`), kein `Math.random()`/`Date.now()` im Render, Zahlen/Daten nur
  mit explizitem Locale formatieren (Default `"en-US"`, als `locale`-Prop überschreibbar).

## Tests

`src/components/<Name>/<Name>.test.tsx` mit Vitest + Testing Library (+ `@testing-library/user-event`).
Mindestens: rendert mit richtiger Rolle/Struktur, Kerninteraktion (öffnen, auswählen, umschalten),
`className` wird gemergt (inkl. Funktionsform bei einem Part), disabled-Zustand wo sinnvoll.
Popups funktionieren in jsdom ohne Polyfills (Dialog, Popover, Select, Tooltip getestet).

```bash
npx vitest run src/components/<Name>     # nur die eigenen Tests
npx tsc --noEmit                         # Typen (Fehler anderer, parallel entstehender Ordner ignorieren)
```

## Playground-Demo

Pro Komponente eine Datei `G:\custom-ui-libraries\preUI-playground\src\demos\<Name>Demo.tsx` mit
`export function <Name>Demo()`, Imports aus `'@pre_scripts/preui'`. Zeigt Varianten und Zustände mit
realistischem Inhalt (Deutsch, du-Form, keine Emoji).
