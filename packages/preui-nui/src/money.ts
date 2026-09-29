import { useCallback, useEffect, useRef, useState } from "react";
import { useNuiEvent } from "./hooks";
import { fetchNui } from "./nui";

/** The server's currency settings, e.g. `{ format: "${amount}", decimals: 0 }` (pre_lib `Config.Currency`). */
export interface MoneyFormat {
  /** Template with `{amount}`, e.g. `"${amount}"`, `"{amount} €"`. @default "{amount}" */
  format?: string;
  /** Fraction digits. @default 0 */
  decimals?: number;
}

export interface FormatMoneyOptions extends MoneyFormat {
  /** Grouping and decimal separators (`Intl.NumberFormat`). @default "en-US" */
  locale?: string;
}

/**
 * `1234.5` → `"$1,235"` with `{ format: "${amount}" }`: the number in the locale's style, put into the template. A
 * negative amount gets the sign in front of the template (`-$500`, not `$-500`).
 */
export function formatMoney(amount: number, { format = "{amount}", decimals = 0, locale = "en-US" }: FormatMoneyOptions = {}): string {
  const digits = Math.min(Math.max(Math.trunc(decimals) || 0, 0), 20);
  let number: string;
  try {
    number = new Intl.NumberFormat(locale, { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(Math.abs(amount));
  } catch {
    number = Math.abs(amount).toFixed(digits);
  }
  const text = format.includes("{amount}") ? format.split("{amount}").join(number) : `${format}${number}`;
  // Only a sign when the rounded value isn't zero (no "-$0").
  return amount < 0 && Number(Math.abs(amount).toFixed(digits)) !== 0 ? `-${text}` : text;
}

function toMoneyFormat(value: unknown): MoneyFormat | null {
  if (!value || typeof value !== "object") return null;
  const { format, decimals } = value as Record<string, unknown>;
  const next: MoneyFormat = {};
  if (typeof format === "string") next.format = format;
  if (typeof decimals === "number" && Number.isFinite(decimals)) next.decimals = decimals;
  return next.format !== undefined || next.decimals !== undefined ? next : null;
}

export interface UseNuiMoneyOptions {
  /** NUI callback asked once on mount; it returns `{ format, decimals }`. `false`: only `fallback`. @default "getCurrency" */
  event?: string | false;
  /** Message action that changes the format at runtime (`data`: `{ format, decimals }`). @default "setCurrency" */
  action?: string;
  /** Used until Lua answers, in a browser, and for fields Lua doesn't send. @default { format: "${amount}", decimals: 0 } */
  fallback?: MoneyFormat;
  /** Returned by the `getCurrency` request in a browser (see `fetchNui`). Defaults to `fallback`. */
  mock?: MoneyFormat;
  /** Separators — e.g. `useNuiLocale().locale`. @default "en-US" */
  locale?: string;
}

export interface NuiMoney {
  /** Formats an amount locally with the server's template — no NUI round trip per amount. */
  format: (amount: number) => string;
  /** The format in use (fallback merged with the server's). */
  currency: Required<MoneyFormat>;
  /** `false` until Lua answered (or the request failed). */
  ready: boolean;
}

const defaultMoneyFormat: Required<MoneyFormat> = { format: "${amount}", decimals: 0 };

/**
 * The server's currency format for a NUI page: asked once, then every amount (cart totals, prices) is formatted in
 * the UI.
 *
 * ```tsx
 * const { locale } = useNuiLocale();
 * const money = useNuiMoney({ locale });
 * <span>{money.format(total)}</span>
 * ```
 *
 * Lua (client): `RegisterNUICallback('getCurrency', function(_, cb) cb({ format = '${amount}', decimals = 0 }) end)`.
 */
export function useNuiMoney({
  event = "getCurrency",
  action = "setCurrency",
  fallback,
  mock,
  locale = "en-US",
}: UseNuiMoneyOptions = {}): NuiMoney {
  const base = { ...defaultMoneyFormat, ...fallback };
  const [server, setServer] = useState<MoneyFormat>({});
  const [ready, setReady] = useState(event === false);
  const mockRef = useRef(mock ?? fallback);
  mockRef.current = mock ?? fallback;

  useNuiEvent<unknown>(action, (data) => {
    const next = toMoneyFormat(data);
    if (next) setServer(next);
  });

  useEffect(() => {
    if (event === false) return;
    let active = true;
    fetchNui<unknown>(event, undefined, mockRef.current)
      .then((value) => {
        const next = toMoneyFormat(value);
        if (active && next) setServer(next);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setReady(true);
      });
    return () => {
      active = false;
    };
  }, [event]);

  const currency: Required<MoneyFormat> = {
    format: server.format ?? base.format,
    decimals: server.decimals ?? base.decimals,
  };
  const format = useCallback(
    (amount: number) => formatMoney(amount, { ...currency, locale }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [currency.format, currency.decimals, locale],
  );
  return { format, currency, ready };
}
