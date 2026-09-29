import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useNuiEvent } from "./hooks";
import { fetchNui } from "./nui";

/** Texts as Lua sends them: flat (`{ ["shop.title"] = "…" }`) or nested tables (`{ shop = { title = "…" } }`). */
export type NuiTextsInput = { [key: string]: string | number | NuiTextsInput };

/** Values for `{name}` placeholders. */
export type NuiTextValues = Record<string, string | number>;

export interface NuiTexts {
  /** The text for `key` with `{name}` placeholders filled in; the key itself when no text exists. */
  (key: string, values?: NuiTextValues): string;
  /**
   * Picks `key_zero` (for 0, when present), `key_one`, `key_two`, `key_few`, `key_many` or `key_other` by the
   * locale's plural rules (`Intl.PluralRules`), then `key`. `{count}` is filled in with the formatted count.
   */
  plural: (key: string, count: number, values?: NuiTextValues) => string;
  /** Whether a text exists for `key` (server or fallback). */
  has: (key: string) => boolean;
  /** `false` until Lua answered (or the request failed) — keep the UI hidden until then to avoid a key flash. */
  ready: boolean;
  /** Locale used for plurals and `{count}`. */
  locale: string;
}

/** Nested tables → dot keys: `{ shop: { title: "x" } }` → `{ "shop.title": "x" }`. Numbers become strings. */
export function flattenTexts(input: unknown, prefix = "", out: Record<string, string> = {}): Record<string, string> {
  if (!input || typeof input !== "object" || Array.isArray(input)) return out;
  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === "string" || typeof value === "number") out[path] = String(value);
    else flattenTexts(value, path, out);
  }
  return out;
}

/** Fills `{name}` placeholders; unknown placeholders stay as they are. */
export function formatText(text: string, values?: NuiTextValues): string {
  if (!values) return text;
  return text.replace(/\{(\w+)\}/g, (match, name: string) =>
    Object.prototype.hasOwnProperty.call(values, name) ? String(values[name]) : match,
  );
}

/** A plain `t` for a text map (also usable outside React, e.g. in tests or notifications). */
export function createNuiTexts(
  texts: Record<string, string>,
  { locale = "en-US", ready = true }: { locale?: string; ready?: boolean } = {},
): NuiTexts {
  let rules: Intl.PluralRules;
  let numbers: Intl.NumberFormat;
  try {
    rules = new Intl.PluralRules(locale);
    numbers = new Intl.NumberFormat(locale);
  } catch {
    rules = new Intl.PluralRules("en-US");
    numbers = new Intl.NumberFormat("en-US");
  }
  const has = (key: string) => Object.prototype.hasOwnProperty.call(texts, key);
  const t = ((key: string, values?: NuiTextValues) => formatText(has(key) ? texts[key] : key, values)) as NuiTexts;
  t.plural = (key, count, values) => {
    const all = { count: numbers.format(count), ...values };
    const candidates = [count === 0 ? `${key}_zero` : null, `${key}_${rules.select(count)}`, `${key}_other`, key];
    const found = candidates.find((candidate): candidate is string => candidate !== null && has(candidate));
    return formatText(found ? texts[found] : key, all);
  };
  t.has = has;
  t.ready = ready;
  t.locale = locale;
  return t;
}

const NuiTextsContext = /* @__PURE__ */ createContext<NuiTexts | null>(null);

export interface NuiTextsProviderProps {
  /** NUI callback asked once on mount; it returns the texts (flat or nested). `false`: only `fallback`. @default "getTexts" */
  event?: string | false;
  /** Message action that replaces the texts at runtime (`data`: the texts). @default "setTexts" */
  action?: string;
  /** Texts used until Lua answers, in a browser, and for keys Lua doesn't send — e.g. an exported `dev-texts.json`. */
  fallback?: NuiTextsInput;
  /** Returned by the `getTexts` request in a browser (see `fetchNui`). Defaults to `fallback`. */
  mock?: NuiTextsInput;
  /** Locale for plurals and `{count}` — e.g. `useNuiLocale().locale`. @default "en-US" */
  locale?: string;
  children?: ReactNode;
}

/**
 * Loads the server's texts for a NUI page once and gives them to `useNuiTexts()`:
 *
 * ```tsx
 * <NuiTextsProvider fallback={devTexts} locale={locale}>
 *   <App />
 * </NuiTextsProvider>
 *
 * const t = useNuiTexts();
 * t("shop.not_enough", { amount: "$500" });
 * t.plural("ui.items", count); // ui.items_one / ui.items_other
 * ```
 *
 * Lua (client): `RegisterNUICallback('getTexts', function(_, cb) cb(texts) end)`; send `setTexts` to change them live.
 */
export function NuiTextsProvider({
  event = "getTexts",
  action = "setTexts",
  fallback,
  mock,
  locale = "en-US",
  children,
}: NuiTextsProviderProps) {
  const [server, setServer] = useState<Record<string, string>>({});
  const [ready, setReady] = useState(event === false);
  const mockRef = useRef(mock ?? fallback);
  mockRef.current = mock ?? fallback;

  useNuiEvent<NuiTextsInput>(action, (data) => setServer(flattenTexts(data)));

  useEffect(() => {
    if (event === false) return;
    let active = true;
    fetchNui<unknown>(event, undefined, mockRef.current)
      .then((value) => {
        if (active) setServer(flattenTexts(value));
      })
      .catch(() => {})
      .finally(() => {
        if (active) setReady(true);
      });
    return () => {
      active = false;
    };
  }, [event]);

  const fallbackTexts = useMemo(() => flattenTexts(fallback), [fallback]);
  const t = useMemo(
    () => createNuiTexts({ ...fallbackTexts, ...server }, { locale, ready }),
    [fallbackTexts, server, locale, ready],
  );
  return <NuiTextsContext.Provider value={t}>{children}</NuiTextsContext.Provider>;
}

/** The `t` of the nearest `NuiTextsProvider`. Without one, every key is returned as is (and plurals use `en-US`). */
export function useNuiTexts(): NuiTexts {
  const t = useContext(NuiTextsContext);
  return useMemo(() => t ?? createNuiTexts({}), [t]);
}
