import {
  Alert,
  AlertDescription,
  AlertTitle,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  ColorPicker,
  ContrastBadge,
  Input,
  KeybindHint,
  KeybindHintBar,
  Progress,
  Slider,
  SliderLabel,
  SliderValue,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  ToggleGroup,
  ToggleGroupItem,
  applyTokens,
  checkTokenContrast,
  deriveTokens,
  hslToHex,
  useTheme,
  type DeriveTokensBase,
  type SchemePreference,
} from "@pre_scripts/preui";
import { fetchNui, resolveThemeTokens, type NuiThemePayload } from "@pre_scripts/preui-nui";
import { lightTokens, tokens } from "@pre_scripts/preui/tailwind";
import { useEffect, useMemo, useState } from "react";

type Scheme = "dark" | "light";

/** A default token ("217 91% 60%") as hex, for the colour pickers. */
function defaultHex(scheme: Scheme, key: keyof DeriveTokensBase) {
  const value = (scheme === "dark" ? tokens : lightTokens)[`--pui-${key}`];
  const [h, s, l] = value.replace(/%/g, "").split(" ").map(Number);
  return hslToHex({ h, s, l });
}

const colorFields: { key: keyof DeriveTokensBase; label: string }[] = [
  { key: "primary", label: "Akzent" },
  { key: "background", label: "Hintergrund" },
  { key: "positive", label: "Positiv" },
  { key: "destructive", label: "Destruktiv" },
  { key: "warning", label: "Warnung" },
];

/** Readable names for the pairs of checkTokenContrast (key: "fg|bg"). */
const pairLabels: Record<string, string> = {
  "--pui-foreground|--pui-background": "Text",
  "--pui-muted-foreground|--pui-background": "Sekundärtext",
  "--pui-muted-foreground|--pui-card": "Sekundärtext auf Karte",
  "--pui-muted-foreground|--pui-muted": "Sekundärtext auf Fläche",
  "--pui-primary-foreground|--pui-primary": "Text auf Akzent",
  "--pui-primary|--pui-background": "Akzent als Text",
  "--pui-positive|--pui-background": "Positiv als Text",
  "--pui-warning|--pui-background": "Warnung als Text",
  "--pui-negative|--pui-background": "Negativ als Text",
  "--pui-info|--pui-background": "Info als Text",
};
const pairKey = (result: { fg: string; bg: string }) => `${result.fg}|${result.bg}`;

interface ThemeEditorProps {
  initial: NuiThemePayload;
  onClose: () => void;
}

export function ThemeEditor({ initial, onClose }: ThemeEditorProps) {
  const { resolvedScheme } = useTheme();
  const [scheme, setScheme] = useState<SchemePreference>(initial.scheme ?? "dark");
  const [editing, setEditing] = useState<Scheme>(resolvedScheme);
  const [palette, setPalette] = useState<Record<Scheme, DeriveTokensBase>>({
    dark: { primary: defaultHex("dark", "primary"), ...initial.palette?.dark },
    light: { primary: defaultHex("light", "primary"), ...initial.palette?.light },
  });
  const [radius, setRadius] = useState(() => parseFloat(String(initial.tokens?.shared?.radius ?? "0.5")) || 0.5);
  const [saving, setSaving] = useState(false);

  const payload = useMemo<NuiThemePayload>(
    () => ({ v: 1, scheme, theme: "", palette, tokens: { shared: { radius: `${radius}rem` } } }),
    [scheme, palette, radius],
  );

  // Live preview while editing, in its own <style> (later in <head> than the bridge's, so it wins); removed on close.
  useEffect(() => applyTokens(resolveThemeTokens(payload), { id: "theme-editor-preview" }), [payload]);

  const contrast = useMemo(
    () => checkTokenContrast(deriveTokens(palette[editing], editing)).filter((result) => pairLabels[pairKey(result)]),
    [palette, editing],
  );
  const problems = contrast.filter((result) => result.ratio < 4.5).length;

  const setColor = (key: keyof DeriveTokensBase, value: string) =>
    setPalette((current) => ({ ...current, [editing]: { ...current[editing], [key]: value } }));

  async function save() {
    setSaving(true);
    await fetchNui("saveTheme", payload, { ok: true });
    setSaving(false);
    onClose();
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center p-6">
      <Card className="flex max-h-full w-full max-w-3xl flex-col overflow-hidden rounded-pui-window bg-pui-shell shadow-pui-window">
        <CardHeader>
          <CardTitle>Server-Theme</CardTitle>
          <CardDescription>Änderungen gelten nach dem Speichern für alle Spieler und alle Scripts.</CardDescription>
        </CardHeader>
        <CardContent className="grid min-h-0 gap-6 overflow-y-auto md:grid-cols-[1fr_16rem]">
          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-pui-muted-foreground">Standard-Schema</span>
              <ToggleGroup
                value={[scheme]}
                onValueChange={(value) => value[0] && setScheme(value[0] as SchemePreference)}
                aria-label="Standard-Schema"
              >
                <ToggleGroupItem value="dark">Dunkel</ToggleGroupItem>
                <ToggleGroupItem value="light">Hell</ToggleGroupItem>
                <ToggleGroupItem value="system">System</ToggleGroupItem>
              </ToggleGroup>
            </div>

            <Tabs value={editing} onValueChange={(value) => setEditing(value as Scheme)}>
              <TabsList>
                <TabsTrigger value="dark">Farben dunkel</TabsTrigger>
                <TabsTrigger value="light">Farben hell</TabsTrigger>
              </TabsList>
              {(["dark", "light"] as const).map((name) => (
                <TabsContent key={name} value={name} className="grid grid-cols-2 gap-3 pt-4">
                  {colorFields.map(({ key, label }) => (
                    <label key={key} className="flex items-center gap-2.5 text-sm">
                      <ColorPicker
                        value={palette[name][key] ?? defaultHex(name, key)}
                        onValueChange={(value) => setColor(key, value)}
                        labels={{ trigger: label }}
                      />
                      {label}
                    </label>
                  ))}
                </TabsContent>
              ))}
            </Tabs>

            <Slider value={radius} onValueChange={(value) => setRadius(value as number)} min={0} max={1} step={0.05}>
              <SliderLabel>Eckenradius</SliderLabel>
              <SliderValue />
            </Slider>

            <div className="flex flex-col gap-2">
              <span className="text-xs font-medium text-pui-muted-foreground">
                Lesbarkeit ({editing === "dark" ? "dunkel" : "hell"}) · {problems === 0 ? "alles lesbar" : `${problems} Probleme`}
              </span>
              <ul className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
                {contrast.map((result) => (
                  <li key={pairKey(result)} className="flex items-center justify-between gap-2">
                    <span className="truncate text-pui-muted-foreground">{pairLabels[pairKey(result)]}</span>
                    <ContrastBadge ratio={result.ratio} locale="de-DE" />
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="flex flex-col gap-3 rounded-pui border border-pui-border bg-pui-background p-4">
            <span className="text-pui-eyebrow font-semibold uppercase text-pui-muted-foreground">Vorschau</span>
            <div className="flex flex-wrap gap-2">
              <Button>Kaufen</Button>
              <Button variant="solid">Bestätigen</Button>
              <Button variant="ghost">Abbrechen</Button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <Badge>Neu</Badge>
              <Badge variant="positive">Aktiv</Badge>
              <Badge variant="warning">Knapp</Badge>
              <Badge variant="destructive">Gesperrt</Badge>
            </div>
            <Input placeholder="Kennzeichen" />
            <Progress value={64} aria-label="Tank" />
            <Alert variant="warning">
              <AlertTitle>Lager fast voll</AlertTitle>
              <AlertDescription>Noch 12 von 200 Plätzen frei.</AlertDescription>
            </Alert>
          </div>
        </CardContent>
        <CardFooter className="justify-between border-t border-pui-border pt-4">
          <KeybindHintBar>
            <KeybindHint keys="Esc" label="Schließen" />
          </KeybindHintBar>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose}>
              Verwerfen
            </Button>
            <Button variant="solid" loading={saving} onClick={save}>
              Für alle speichern
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
