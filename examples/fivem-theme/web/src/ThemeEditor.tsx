import {
  Badge,
  Button,
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  KeybindHint,
  KeybindHintBar,
  Progress,
  ThemeEditor as PreuiThemeEditor,
  defaultThemePresets,
  useTheme,
  type ThemeConfig,
  type ThemeEditorProps,
} from "@pre_scripts/preui";
import { fetchNui } from "@pre_scripts/preui-nui";

/** German texts of the editor (the component ships English defaults). */
const labels: ThemeEditorProps["labels"] = {
  status: "Lesbarkeit",
  statusScheme: (scheme, summary) => `${scheme}: ${summary}`,
  allReadable: "alles lesbar",
  problems: (count) => (count === 1 ? "1 Problem" : `${count} Probleme`),
  presets: "Vorlagen",
  presetReadable: "In beiden Schemata lesbar",
  presetProblems: (count) => `${count} Kontrastprobleme`,
  scheme: "Standard-Schema",
  schemes: { dark: "Dunkel", light: "Hell", system: "System" },
  colors: "Farben",
  fields: {
    primary: "Akzent",
    background: "Hintergrund",
    foreground: "Text",
    positive: "Positiv",
    negative: "Negativ",
    destructive: "Destruktiv",
    warning: "Warnung",
    info: "Info",
  },
  changed: "geändert",
  inherited: "Standard",
  resetField: (field) => `${field} zurücksetzen`,
  contrast: (scheme) => `Kontrast (${scheme})`,
  pairs: {
    "foreground/background": "Text",
    "card-foreground/card": "Text auf Karte",
    "popover-foreground/popover": "Text in Menüs",
    "tooltip-foreground/tooltip": "Tooltip",
    "primary-foreground/primary": "Text auf Akzent",
    "secondary-foreground/secondary": "Text auf Sekundär",
    "accent-foreground/accent": "Text auf Hover-Fläche",
    "muted-foreground/background": "Sekundärtext",
    "muted-foreground/card": "Sekundärtext auf Karte",
    "muted-foreground/muted": "Sekundärtext auf Fläche",
    "positive-foreground/positive": "Text auf Positiv",
    "negative-foreground/negative": "Text auf Negativ",
    "destructive-foreground/destructive": "Text auf Destruktiv",
    "warning-foreground/warning": "Text auf Warnung",
    "info-foreground/info": "Text auf Info",
    "primary/background": "Akzent als Text",
    "positive/background": "Positiv als Text",
    "negative/background": "Negativ als Text",
    "warning/background": "Warnung als Text",
    "info/background": "Info als Text",
  },
  shared: "Form & Schrift",
  radius: "Eckenradius",
  radiusValue: (value) => `${value} rem`,
  font: "Schrift",
  fontDefault: "Standard (Inter)",
  fontCustom: "Eigene",
  preview: "Vorschau",
  reset: "Alles zurücksetzen",
  save: "Für alle speichern",
  contrastBadge: {
    levels: { AAA: "AAA", AA: "AA", "AA-large": "AA groß", fail: "zu schwach" },
    description: (ratio, level) => `Kontrast ${ratio} zu 1, ${level}`,
  },
  colorPicker: {
    area: "Sättigung und Helligkeit",
    hue: "Farbton",
    alpha: "Deckkraft",
    input: "Hex",
    eyeDropper: "Farbe vom Bildschirm",
    swatches: "Vorlagen",
  },
};

/** The built-in presets with German names. A server could send its own list instead. */
const presetNames: Record<string, [string, string]> = {
  default: ["preUI", "Das Standard-Blau"],
  emerald: ["Smaragd", "Grüner Akzent"],
  police: ["Polizei", "Blau auf Marine"],
  crimson: ["Karmin", "Roter Akzent"],
  amber: ["Bernstein", "Warmes Gelb"],
  violet: ["Violett", "Lila Akzent"],
  mono: ["Mono", "Nur Grautöne"],
};
const presets = defaultThemePresets.map((preset) => ({
  ...preset,
  label: presetNames[preset.id]?.[0] ?? preset.label,
  description: presetNames[preset.id]?.[1] ?? preset.description,
}));

const fonts = [
  { label: "Inter", value: '"Inter Variable", Inter, system-ui, sans-serif' },
  { label: "System", value: 'system-ui, "Segoe UI", Roboto, sans-serif' },
  { label: "JetBrains Mono", value: '"JetBrains Mono", ui-monospace, monospace' },
];

interface InGameThemeEditorProps {
  /** The theme the server currently has (GlobalState.theme) — the editor starts from it. */
  initial: ThemeConfig;
  onClose: () => void;
}

/**
 * The in-game window around preUI's `<ThemeEditor>`: the same component a website uses, here wired to the
 * `saveTheme` NUI callback (→ server → GlobalState.theme → every client's NuiThemeBridge).
 */
export function ThemeEditor({ initial, onClose }: InGameThemeEditorProps) {
  const { resolvedScheme } = useTheme();

  async function save(config: ThemeConfig) {
    // The saved value is already the bridge's message format (protocol v1): no conversion.
    await fetchNui("saveTheme", config, { ok: true });
    onClose();
  }

  return (
    <div className="fixed inset-0 flex items-center justify-end p-6">
      <Card className="flex max-h-full w-full max-w-[30rem] flex-col overflow-hidden rounded-pui-window bg-pui-shell shadow-pui-window">
        <CardHeader className="shrink-0">
          <CardTitle>Server-Theme</CardTitle>
          <CardDescription>Änderungen gelten nach dem Speichern für alle Spieler und alle Scripts.</CardDescription>
        </CardHeader>
        <PreuiThemeEditor
          variant="inline"
          className="min-h-0 flex-1 px-6 pb-5"
          defaultValue={initial}
          defaultEditingScheme={resolvedScheme}
          onSave={save}
          presets={presets}
          fonts={fonts}
          labels={labels}
          locale="de-DE"
          actionsSlot={
            <KeybindHintBar>
              <KeybindHint keys="Esc" label="Schließen" />
            </KeybindHintBar>
          }
          previewSlot={
            <>
              <div className="flex flex-wrap gap-2">
                <Button size="sm">Kaufen</Button>
                <Button size="sm" variant="solid">
                  Bestätigen
                </Button>
                <Button size="sm" variant="ghost">
                  Abbrechen
                </Button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <Badge>Neu</Badge>
                <Badge variant="positive">Aktiv</Badge>
                <Badge variant="warning">Knapp</Badge>
                <Badge variant="destructive">Gesperrt</Badge>
              </div>
              <Input placeholder="Kennzeichen" aria-label="Kennzeichen" />
              <Progress value={64} aria-label="Tank" />
            </>
          }
        />
      </Card>
    </div>
  );
}
