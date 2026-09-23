import { useEffect, useRef, useState } from "react";
import { useNuiEvent } from "./hooks";
import { fetchNui } from "./nui";

export interface UseNuiLocaleOptions {
  /** NUI callback asked once on mount; it should return a locale string like `"de"` or `"de-DE"`. @default "getLocale" */
  event?: string | false;
  /** Message action that changes the locale at runtime (`data`: the locale string). @default "setLocale" */
  action?: string;
  /** Used until Lua answers, in a browser, and when Lua returns nothing usable. @default "en-US" */
  fallback?: string;
  /** Returned by the `getLocale` request in a browser (see `fetchNui`), e.g. `"de-DE"` to develop in German. */
  mock?: string;
}

export interface NuiLocale {
  /** BCP 47 tag, normalised (`"de"` → `"de"`, `"de_DE"` → `"de-DE"`) — pass it to `locale` props and `Intl`. */
  locale: string;
  /** The language part: `"de"`. */
  language: string;
  /** `false` until Lua answered (or the request failed) — keep the UI hidden until then to avoid a language flash. */
  ready: boolean;
}

/** `"de_DE"` / `"DE-de"` / `"de"` → a valid BCP 47 tag, or `null`. */
export function normalizeLocale(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const tag = input.trim().replace(/_/g, "-");
  if (!/^[a-z]{2,3}(-[a-z0-9]{2,8})*$/i.test(tag)) return null;
  try {
    return Intl.getCanonicalLocales(tag)[0] ?? null;
  } catch {
    return null;
  }
}

/**
 * The server's language for a NUI page: asks the `getLocale` NUI callback once and follows `setLocale` messages.
 * Use `locale` for preUI's `locale` props (numbers, dates) and to pick your own texts / preUI `labels`:
 *
 * ```tsx
 * const { locale, language } = useNuiLocale({ mock: "de-DE" });
 * const t = language === "de" ? de : en;
 * <Progress value={72} locale={locale} />
 * <Kanban labels={t.kanban} … />
 * ```
 *
 * Lua (client): `RegisterNUICallback('getLocale', function(_, cb) cb(GetConvar('ox:locale', 'en')) end)`.
 */
export function useNuiLocale({
  event = "getLocale",
  action = "setLocale",
  fallback = "en-US",
  mock,
}: UseNuiLocaleOptions = {}): NuiLocale {
  const fallbackTag = normalizeLocale(fallback) ?? "en-US";
  const [locale, setLocale] = useState(fallbackTag);
  const [ready, setReady] = useState(event === false);
  const mockRef = useRef(mock);
  mockRef.current = mock;

  useNuiEvent<string>(action, (data) => {
    const next = normalizeLocale(data);
    if (next) setLocale(next);
  });

  useEffect(() => {
    if (event === false) return;
    let active = true;
    fetchNui<unknown>(event, undefined, mockRef.current)
      .then((value) => {
        if (!active) return;
        const next = normalizeLocale(value);
        if (next) setLocale(next);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setReady(true);
      });
    return () => {
      active = false;
    };
  }, [event]);

  return { locale, language: locale.split("-")[0].toLowerCase(), ready };
}
