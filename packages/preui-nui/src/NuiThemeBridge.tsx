import {
  applyTokens,
  resolveThemeConfig,
  THEME_CONFIG_VERSION,
  useTheme,
  type ThemeConfig,
  type TokenOverrides,
} from "@pre_scripts/preui";
import { useCallback, useEffect, useRef } from "react";
import { useNuiEvent } from "./hooks";
import { fetchNui } from "./nui";

/**
 * The theme message (protocol version 1) — the same object as preUI's `ThemeConfig`, so a value saved by
 * `<ThemeEditor>` goes straight into `GlobalState.theme`. Lua sends it as
 * `SendNUIMessage({ action = "setTheme", data = payload })` and returns it from the `getTheme` NUI callback. It is the
 * **complete** theme state:
 * - `palette` / `tokens` left out → the runtime overrides are removed (back to the defaults / `data-theme`)
 * - `scheme` / `theme` left out → the current value stays (`theme: ""` or `null` removes the theme; Lua tables
 *   can't hold `nil`, so send `""` from Lua)
 */
export type NuiThemePayload = ThemeConfig;

export const NUI_THEME_PROTOCOL_VERSION = THEME_CONFIG_VERSION;

/** Turns a payload's `palette` + `tokens` into one `applyTokens` input (preUI's `resolveThemeConfig`). */
export function resolveThemeTokens(payload: Pick<NuiThemePayload, "palette" | "tokens">): TokenOverrides {
  return resolveThemeConfig(payload);
}

export interface NuiThemeBridgeProps {
  /** Message action carrying a `NuiThemePayload`. @default "setTheme" */
  action?: string;
  /** NUI callback asked for the current theme on mount; `false` to skip. @default "getTheme" */
  getThemeEvent?: string | false;
  /** Returned by the `getTheme` request in a browser (see `fetchNui`), to develop without the game. */
  mock?: NuiThemePayload;
  /** `<style>` id for the token overrides (see `applyTokens`). @default "preui-runtime-tokens" */
  tokensId?: string;
  /** Called after every applied payload. */
  onThemeChange?: (payload: NuiThemePayload) => void;
}

/**
 * Connects a NUI page to a server-wide theme: listens for `setTheme` messages, asks the `getTheme` callback once on
 * mount, applies token overrides (`applyTokens`, `palette` via `deriveTokens`) and sets scheme and theme on the
 * surrounding `ThemeProvider`. Renders nothing.
 *
 * Use it inside `<ThemeProvider storage={false}>`: the server is the source of truth, so the per-resource
 * localStorage stays out of it.
 */
export function NuiThemeBridge({
  action = "setTheme",
  getThemeEvent = "getTheme",
  mock,
  tokensId,
  onThemeChange,
}: NuiThemeBridgeProps) {
  const { setScheme, setTheme } = useTheme();
  const removeTokens = useRef<(() => void) | null>(null);
  const onChangeRef = useRef(onThemeChange);
  onChangeRef.current = onThemeChange;
  const mockRef = useRef(mock);
  mockRef.current = mock;

  const apply = useCallback(
    (payload: NuiThemePayload | null | undefined) => {
      if (!payload || typeof payload !== "object") return;
      if (payload.v !== undefined && payload.v > NUI_THEME_PROTOCOL_VERSION) {
        console.warn(`[preUI] NuiThemeBridge: theme protocol v${payload.v} is newer than v1; applying known fields.`);
      }
      if (payload.palette || payload.tokens) {
        removeTokens.current = applyTokens(resolveThemeTokens(payload), { id: tokensId });
      } else {
        removeTokens.current?.();
        removeTokens.current = null;
      }
      if (payload.scheme) setScheme(payload.scheme);
      if (payload.theme !== undefined) setTheme(payload.theme || null);
      onChangeRef.current?.(payload);
    },
    [setScheme, setTheme, tokensId],
  );

  useNuiEvent<NuiThemePayload>(action, apply);

  useEffect(() => {
    if (getThemeEvent === false) return;
    let active = true;
    fetchNui<NuiThemePayload | null>(getThemeEvent, undefined, mockRef.current)
      .then((payload) => {
        if (active) apply(payload);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [getThemeEvent, apply]);

  useEffect(
    () => () => {
      removeTokens.current?.();
      removeTokens.current = null;
    },
    [],
  );

  return null;
}
