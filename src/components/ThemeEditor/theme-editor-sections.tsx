// The ThemeEditor's newer sections: Style (radius, transparency, accent, borders, shadows, font), Import, all colour
// tokens (advanced) and the "save as preset" form. Kept apart from ThemeEditor.tsx so that file stays readable.
import { useEffect, useId, useMemo, useState } from "react";
import { useIcon } from "../../icons";
import { loadThemeFont } from "../../theming/theme-fonts";
import type { ThemeConfig, ThemePreset } from "../../theming/theme-config";
import { getTokenKind } from "../../theming/token-css";
import { lightTokens, tokens, type PreuiScheme, type PreuiTokenName } from "../../tailwind/tokens";
import { cn } from "../../utils/cn";
import { Button } from "../Button/Button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../Collapsible/Collapsible";
import { ColorPicker } from "../ColorPicker/ColorPicker";
import { Input } from "../Input/Input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../Select/Select";
import { Slider, SliderLabel, SliderValue } from "../Slider/Slider";
import { Textarea } from "../Textarea/Textarea";
import type { SchemePreference } from "../Theme/theme-script";
import type { ThemeEditorFont, ThemeEditorLabels } from "./ThemeEditor";
import {
  getSharedToken,
  getStyleToken,
  parseRem,
  parseThemeImport,
  setSharedToken,
  styleDefault,
  toHex,
  type StyleTokenKey,
} from "./theme-editor-config";

const eyebrow = "text-pui-eyebrow font-semibold uppercase text-pui-muted-foreground";
const DEFAULT_FONT = "__preui-default-font__";

type Update = (recipe: (current: ThemeConfig) => ThemeConfig) => void;

/** First family of a `font-family` value: `'"Rajdhani", sans-serif'` → `Rajdhani`. */
export function firstFontFamily(value: string): string {
  return (value.split(",")[0] ?? "").trim().replace(/^["']|["']$/g, "");
}

// ------------------------------------------------------------------------------------------------
// Style
// ------------------------------------------------------------------------------------------------

interface StyleSlider {
  key: StyleTokenKey;
  label: (labels: ThemeEditorLabels) => string;
  min: number;
  max: number;
  step: number;
  /** Slider number ↔ token value. */
  read: (value: string) => number | null;
  write: (value: number) => string;
  format: (value: number, labels: ThemeEditorLabels, number: Intl.NumberFormat) => string;
}

const percent: StyleSlider["format"] = (value, labels, number) => labels.percentValue(number.format(Math.round(value * 100)));
const numeric = (value: string) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};
const rounded = (value: number) => String(Math.round(value * 1000) / 1000);

const styleSliders: StyleSlider[] = [
  {
    key: "radius",
    label: (labels) => labels.radius,
    min: 0,
    max: 1.25,
    step: 0.025,
    read: parseRem,
    write: (value) => `${rounded(value)}rem`,
    format: (value, labels, number) => labels.radiusValue(number.format(value)),
  },
  { key: "surface-opacity", label: (labels) => labels.surfaceOpacity, min: 0.7, max: 1, step: 0.05, read: numeric, write: rounded, format: percent },
  { key: "tint-scale", label: (labels) => labels.tintScale, min: 0.5, max: 3, step: 0.1, read: numeric, write: rounded, format: percent },
  { key: "border-opacity", label: (labels) => labels.borderOpacity, min: 0, max: 1, step: 0.1, read: numeric, write: rounded, format: percent },
  { key: "shadow-scale", label: (labels) => labels.shadowScale, min: 0, max: 2, step: 0.1, read: numeric, write: rounded, format: percent },
];

export function StyleSection({
  config,
  labels,
  locale,
  update,
}: {
  config: ThemeConfig;
  labels: ThemeEditorLabels;
  locale: string;
  update: Update;
}) {
  const Undo = useIcon("undo");
  const number = useMemo(() => new Intl.NumberFormat(locale, { minimumFractionDigits: 0, maximumFractionDigits: 3 }), [locale]);
  const surfaceOpacity = Number(getStyleToken(config, "surface-opacity"));
  return (
    <section data-slot="theme-editor-style" className="flex flex-col gap-3">
      <span className={eyebrow}>{labels.style}</span>
      {styleSliders.map((slider) => {
        const raw = getSharedToken(config, slider.key);
        const value = slider.read(raw ?? styleDefault(slider.key)) ?? slider.read(styleDefault(slider.key)) ?? slider.min;
        const name = slider.label(labels);
        return (
          <div
            key={slider.key}
            data-slot="theme-editor-style-item"
            data-style={slider.key}
            data-changed={raw !== undefined ? "" : undefined}
            className="flex items-end gap-2"
          >
            <Slider
              value={Math.min(slider.max, Math.max(slider.min, value))}
              min={slider.min}
              max={slider.max}
              step={slider.step}
              locale={locale}
              onValueChange={(next) => update((current) => setSharedToken(current, slider.key, slider.write(next as number)))}
              className="flex-1"
            >
              <div className="flex items-center justify-between">
                <SliderLabel>{name}</SliderLabel>
                <SliderValue>{() => slider.format(value, labels, number)}</SliderValue>
              </div>
            </Slider>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={labels.resetField(name)}
              disabled={raw === undefined}
              onClick={() => update((current) => setSharedToken(current, slider.key, undefined))}
              className="shrink-0"
            >
              <Undo aria-hidden="true" />
            </Button>
          </div>
        );
      })}
      {surfaceOpacity < 1 && (
        <p data-slot="theme-editor-transparency-hint" className="text-xs text-pui-muted-foreground">
          {labels.transparencyHint}
        </p>
      )}
    </section>
  );
}

// ------------------------------------------------------------------------------------------------
// Font
// ------------------------------------------------------------------------------------------------

export function FontSection({
  config,
  fonts,
  labels,
  update,
}: {
  config: ThemeConfig;
  fonts: readonly ThemeEditorFont[];
  labels: ThemeEditorLabels;
  update: Update;
}) {
  const id = useId();
  const font = getSharedToken(config, "font-sans");
  const items = useMemo(() => {
    const list = [{ value: DEFAULT_FONT, label: labels.fontDefault }, ...fonts.map((item) => ({ value: item.value, label: item.label }))];
    if (font && !fonts.some((item) => item.value === font)) list.push({ value: font, label: labels.fontCustom });
    return list;
  }, [fonts, font, labels.fontDefault, labels.fontCustom]);

  // Fonts with files: load the chosen one (and show every option in its own face once loaded).
  useEffect(() => {
    if (config.fonts?.sans) void loadThemeFont(config.fonts.sans);
  }, [config.fonts?.sans]);

  const choose = (value: string | null) =>
    update((current) => {
      const picked = !value || value === DEFAULT_FONT ? undefined : fonts.find((item) => item.value === value);
      let next = setSharedToken(current, "font-sans", !value || value === DEFAULT_FONT ? undefined : value);
      const { sans: _old, ...otherFonts } = next.fonts ?? {};
      const sans = picked?.src
        ? { family: picked.family ?? firstFontFamily(picked.value), src: picked.src, ...(picked.weight && { weight: picked.weight }) }
        : undefined;
      const fontsField = sans ? { ...otherFonts, sans } : otherFonts;
      next = { ...next, fonts: Object.keys(fontsField).length > 0 ? fontsField : undefined };
      if (!next.fonts) delete next.fonts;
      return next;
    });

  return (
    <section data-slot="theme-editor-font" className="flex flex-col gap-1.5">
      <span id={`${id}-font`} className={eyebrow}>
        {labels.font}
      </span>
      <Select items={items} value={font ?? DEFAULT_FONT} onValueChange={(next) => choose(next as string | null)}>
        <SelectTrigger aria-labelledby={`${id}-font`}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {items.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              <FontOption item={item} fonts={fonts} />
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </section>
  );
}

/** One option, in its own face — fonts with files are loaded when the list renders. */
function FontOption({ item, fonts }: { item: { value: string; label: string }; fonts: readonly ThemeEditorFont[] }) {
  const source = fonts.find((font) => font.value === item.value);
  useEffect(() => {
    if (source?.src) void loadThemeFont({ family: source.family ?? firstFontFamily(source.value), src: source.src, weight: source.weight });
  }, [source]);
  return <span style={item.value === DEFAULT_FONT ? undefined : { fontFamily: item.value }}>{item.label}</span>;
}

// ------------------------------------------------------------------------------------------------
// Import
// ------------------------------------------------------------------------------------------------

export function ImportSection({
  fallbackScheme,
  labels,
  onApply,
}: {
  fallbackScheme: SchemePreference;
  labels: ThemeEditorLabels;
  onApply: (config: ThemeConfig, warnings: string[]) => void;
}) {
  const id = useId();
  const [text, setText] = useState("");
  const [message, setMessage] = useState<{ tone: "error" | "info"; text: string } | null>(null);
  const apply = () => {
    const result = parseThemeImport(text, fallbackScheme);
    if (!result.ok) {
      setMessage({ tone: "error", text: labels.importErrors[result.error] });
      return;
    }
    onApply(result.config, result.warnings);
    setMessage({
      tone: "info",
      text: result.warnings.length > 0 ? labels.importWarnings(result.warnings.length, result.warnings.join(", ")) : labels.importDone,
    });
    setText("");
  };
  return (
    <section data-slot="theme-editor-import" className="flex flex-col gap-2">
      <span id={`${id}-import`} className={eyebrow}>
        {labels.importTitle}
      </span>
      <Textarea
        value={text}
        onChange={(event) => {
          setText(event.target.value);
          setMessage(null);
        }}
        rows={4}
        placeholder={labels.importPlaceholder}
        aria-labelledby={`${id}-import`}
        spellCheck={false}
        data-slot="theme-editor-import-text"
        className="max-h-48 font-mono text-xs"
      />
      <div className="flex min-h-7 items-center gap-2">
        <Button variant="outline" size="sm" disabled={text.trim() === ""} onClick={apply} data-slot="theme-editor-import-apply">
          {labels.importApply}
        </Button>
        {message && (
          <span
            role={message.tone === "error" ? "alert" : "status"}
            data-slot="theme-editor-import-message"
            data-tone={message.tone}
            className={cn("min-w-0 text-xs", message.tone === "error" ? "text-pui-negative" : "text-pui-muted-foreground")}
          >
            {message.text}
          </span>
        )}
      </div>
    </section>
  );
}

// ------------------------------------------------------------------------------------------------
// All colour tokens (advanced)
// ------------------------------------------------------------------------------------------------

/** The scheme's colour tokens (channel values), short names: `["backdrop", "shell", "background", …]`. */
const colorTokenNames = (scheme: PreuiScheme) =>
  Object.keys(scheme === "light" ? lightTokens : tokens)
    .filter((name) => getTokenKind(name) === "channel")
    .map((name) => name.replace(/^--pui-/, ""));

export function AdvancedSection({
  config,
  scheme,
  effective,
  labels,
  update,
}: {
  config: ThemeConfig;
  scheme: PreuiScheme;
  effective: Record<PreuiTokenName, string>;
  labels: ThemeEditorLabels;
  update: Update;
}) {
  const Undo = useIcon("undo");
  const Chevron = useIcon("chevronDown");
  const names = useMemo(() => colorTokenNames(scheme), [scheme]);
  const set = (config.tokens?.[scheme] ?? {}) as Record<string, string | undefined>;
  const write = (name: string, value: string | undefined) =>
    update((current) => {
      const own = { ...(current.tokens?.[scheme] as Record<string, string> | undefined) };
      delete own[name];
      delete own[`--pui-${name}`];
      if (value !== undefined) own[name] = value;
      return { ...current, tokens: { ...current.tokens, [scheme]: own } };
    });
  return (
    <Collapsible data-slot="theme-editor-advanced" className="flex flex-col gap-2">
      <CollapsibleTrigger className="group flex items-center gap-1.5 self-start rounded-pui-sm text-left outline-none focus-visible:ring-pui focus-visible:ring-pui-ring">
        <span className={eyebrow}>
          {labels.advanced} · {labels.schemes[scheme]}
        </span>
        <Chevron className="size-3.5 text-pui-muted-foreground transition-transform duration-pui-fast ease-pui group-data-[panel-open]:rotate-180" aria-hidden="true" />
      </CollapsibleTrigger>
      <CollapsibleContent className="flex flex-col gap-2">
        <p className="text-xs text-pui-muted-foreground">{labels.advancedHint}</p>
        <ul className="flex flex-col gap-1">
          {names.map((name) => {
            const own = set[name] ?? set[`--pui-${name}`];
            const hex = toHex(own) ?? toHex(`hsl(${effective[`--pui-${name}` as PreuiTokenName]})`) ?? "#000000";
            return (
              <li
                key={name}
                data-slot="theme-editor-token"
                data-token={name}
                data-changed={own !== undefined ? "" : undefined}
                className="flex h-8 min-w-0 items-center gap-2.5"
              >
                <ColorPicker value={hex} onValueChange={(next) => write(name, next)} labels={{ trigger: name }} />
                <span className={cn("min-w-0 flex-1 truncate font-mono text-xs", own !== undefined ? "text-pui-foreground" : "text-pui-muted-foreground")}>
                  {name}
                </span>
                <span className="w-16 shrink-0 font-mono text-xs uppercase text-pui-muted-foreground">{hex}</span>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={labels.resetField(name)}
                  disabled={own === undefined}
                  onClick={() => write(name, undefined)}
                  className="shrink-0"
                >
                  <Undo aria-hidden="true" />
                </Button>
              </li>
            );
          })}
        </ul>
      </CollapsibleContent>
    </Collapsible>
  );
}

// ------------------------------------------------------------------------------------------------
// Save as preset
// ------------------------------------------------------------------------------------------------

export function SavePresetForm({
  config,
  labels,
  onSave,
}: {
  config: ThemeConfig;
  labels: ThemeEditorLabels;
  onSave: (preset: ThemePreset) => void;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const save = () => {
    const label = name.trim();
    if (!label) return;
    const slug = label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "preset";
    const { palette, tokens: ownTokens, fonts } = config;
    onSave({ id: `${slug}-${Date.now().toString(36)}`, label, config: { v: 1, palette, ...(ownTokens && { tokens: ownTokens }), ...(fonts && { fonts }) } });
    setName("");
    setOpen(false);
  };
  if (!open) {
    return (
      <Button variant="ghost" size="sm" className="self-start" onClick={() => setOpen(true)} data-slot="theme-editor-save-preset">
        {labels.savePreset}
      </Button>
    );
  }
  return (
    <form
      data-slot="theme-editor-save-preset-form"
      className="flex items-center gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        save();
      }}
    >
      <Input
        autoFocus
        value={name}
        onChange={(event) => setName(event.target.value)}
        placeholder={labels.presetName}
        aria-label={labels.presetName}
        maxLength={40}
        className="h-8 min-w-0 flex-1"
      />
      <Button type="submit" size="sm" variant="solid" disabled={name.trim() === ""}>
        {labels.savePresetConfirm}
      </Button>
      <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>
        {labels.cancel}
      </Button>
    </form>
  );
}
