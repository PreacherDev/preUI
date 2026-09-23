import type { ThemedToken } from "shiki/core";
import {
  forwardRef,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentPropsWithoutRef,
  type CSSProperties,
  type ReactNode,
} from "react";
import { Button } from "../Button/Button";
import { useIcon } from "../../icons";
import { cn } from "../../utils/cn";
import { ScrollArea } from "../ScrollArea/ScrollArea";
import { highlightCode, highlightCodeSync } from "./shiki";
import { syntaxColor } from "./syntax-theme";

/* ------------------------------------------------------------------------------------------------
 * CodeBlock
 * ----------------------------------------------------------------------------------------------*/

export interface CodeBlockProps extends Omit<ComponentPropsWithoutRef<"div">, "children" | "onCopy"> {
  /** The source code to display. */
  code: string;
  /** Any Shiki language id or alias (`tsx`, `ts`, `bash`, `sh`, `lua`, `json` …). Unknown ids render as plain text. */
  language?: string;
  /** Shows a header row with the file name, the language and the copy button. */
  filename?: ReactNode;
  /** Shows line numbers in a left column. */
  showLineNumbers?: boolean;
  /** 1-based line numbers to tint. */
  highlightLines?: number[];
  /** Wraps long lines instead of scrolling horizontally. */
  wrap?: boolean;
  /** Shows a copy button. Default `true`. */
  copyable?: boolean;
  /** Accessible label of the copy button. */
  copyLabel?: string;
  /** Label announced (and used as button label) after copying. */
  copiedLabel?: string;
  /** Called after the code was copied to the clipboard. */
  onCopy?: (code: string) => void;
}

type TokenLine = Pick<ThemedToken, "content" | "color" | "fontStyle">[];

/** Splits code into single-token lines — the plain fallback, rendered with the same metrics as the highlighted version. */
function plainLines(code: string): TokenLine[] {
  return code.split("\n").map((line) => (line ? [{ content: line }] : []));
}

function tokenStyle(token: TokenLine[number]): CSSProperties | undefined {
  const style: CSSProperties = {};
  if (token.color) style.color = token.color;
  const flags = token.fontStyle ?? 0;
  if (flags > 0) {
    if (flags & 1) style.fontStyle = "italic";
    if (flags & 2) style.fontWeight = 600;
    const decorations = [flags & 4 ? "underline" : "", flags & 8 ? "line-through" : ""].filter(Boolean);
    if (decorations.length) style.textDecoration = decorations.join(" ");
  }
  return token.color || flags > 0 ? style : undefined;
}

/** Line numbers via CSS counters: not selectable and never part of copied text. */
const lineNumberClassName = cn(
  "before:mr-4 before:w-[calc(var(--pui-code-digits)*1ch)] before:shrink-0 before:select-none before:text-right",
  "before:text-pui-muted-foreground/60 before:[counter-increment:line] before:content-[counter(line)]",
  "data-[highlighted]:before:text-pui-foreground/70",
);

/** Keeps the highlighted tokens for the current `code` + `language`; falls back to plain lines while loading. */
function useHighlightedLines(code: string, language: string) {
  const syncTokens = useMemo(() => highlightCodeSync(code, language), [code, language]);
  const [asyncResult, setAsyncResult] = useState<{ code: string; language: string; lines: TokenLine[] } | null>(null);

  useEffect(() => {
    if (syncTokens) return;
    let cancelled = false;
    highlightCode(code, language).then(
      (lines) => {
        if (!cancelled) setAsyncResult({ code, language, lines });
      },
      () => {
        // Highlighting is progressive enhancement: on failure the plain code stays visible.
      },
    );
    return () => {
      cancelled = true;
    };
  }, [code, language, syncTokens]);

  if (syncTokens) return { lines: syncTokens as TokenLine[], highlighted: true };
  if (asyncResult && asyncResult.code === code && asyncResult.language === language) {
    return { lines: asyncResult.lines, highlighted: true };
  }
  return { lines: plainLines(code), highlighted: false };
}

interface CopyButtonProps {
  code: string;
  copyLabel: string;
  copiedLabel: string;
  onCopy?: (code: string) => void;
  className?: string;
}

function CopyButton({ code, copyLabel, copiedLabel, onCopy, className }: CopyButtonProps) {
  const CopyIcon = useIcon("copy");
  const CheckIcon = useIcon("check");
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      return;
    }
    setCopied(true);
    onCopy?.(code);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 1500);
  };

  const Icon = copied ? CheckIcon : CopyIcon;
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      aria-label={copied ? copiedLabel : copyLabel}
      data-slot="code-block-copy"
      data-copied={copied || undefined}
      onClick={copy}
      className={cn("size-7 [&_svg]:size-3.5 data-[copied]:text-pui-positive", className)}
    >
      <Icon aria-hidden="true" />
      <span className="sr-only" aria-live="polite">
        {copied ? copiedLabel : ""}
      </span>
    </Button>
  );
}

/**
 * Read-only, syntax-highlighted code (Shiki). Renders the plain code immediately and swaps in the
 * highlighted tokens once Shiki and the grammar are loaded — with identical metrics, so nothing shifts.
 */
export const CodeBlock = /* @__PURE__ */ forwardRef<HTMLDivElement, CodeBlockProps>(function CodeBlock(
  {
    code,
    language = "text",
    filename,
    showLineNumbers = false,
    highlightLines,
    wrap = false,
    copyable = true,
    copyLabel = "Copy code",
    copiedLabel = "Copied",
    onCopy,
    className,
    style,
    ...props
  },
  ref,
) {
  // A single trailing newline (template literals, files) would render as an empty last line.
  const source = code.endsWith("\n") ? code.slice(0, -1) : code;
  const { lines, highlighted } = useHighlightedLines(source, language);
  const highlightSet = useMemo(() => new Set(highlightLines ?? []), [highlightLines]);
  const digits = String(lines.length).length;
  const hasHeader = filename != null && filename !== false;

  const copyButton = copyable ? (
    <CopyButton
      code={source}
      copyLabel={copyLabel}
      copiedLabel={copiedLabel}
      onCopy={onCopy}
      className={
        hasHeader
          ? undefined
          : cn(
              "absolute right-2 top-2 border-pui-border bg-pui-background text-pui-muted-foreground",
              "opacity-0 group-hover/code:opacity-100 group-focus-within/code:opacity-100 focus-visible:opacity-100 data-[copied]:opacity-100",
            )
      }
    />
  ) : null;

  return (
    <div
      ref={ref}
      data-slot="code-block"
      data-language={language}
      data-state={highlighted ? "highlighted" : "plain"}
      className={cn(
        "group/code relative overflow-hidden rounded-pui border border-pui-border bg-pui-background text-pui-foreground",
        className,
      )}
      style={{ color: syntaxColor("foreground"), ...style }}
      {...props}
    >
      {hasHeader && (
        <div
          data-slot="code-block-header"
          className="flex h-10 items-center gap-3 border-b border-pui-border bg-pui-card pl-4 pr-1.5"
        >
          <span data-slot="code-block-filename" className="min-w-0 truncate font-mono text-xs text-pui-foreground">
            {filename}
          </span>
          <span
            data-slot="code-block-language"
            className="ml-auto shrink-0 text-pui-eyebrow font-semibold uppercase text-pui-muted-foreground"
          >
            {language}
          </span>
          {copyButton}
        </div>
      )}
      {/*
        Long lines scroll in a preUI ScrollArea. Its viewport becomes a Tab stop (with the focus ring) only while
        the code overflows, so keyboard users can scroll it. The thumb floats in the bottom padding (py-3) —
        nothing shifts when it appears.
      */}
      <ScrollArea orientation="horizontal" reserveTrack={false}>
        <pre data-slot="code-block-content" className="m-0 py-3 font-mono text-[13px] leading-relaxed [font-variant-ligatures:none]">
          <code
            className={cn(
              "block font-mono",
              wrap ? "w-full whitespace-pre-wrap break-words" : "w-max min-w-full whitespace-pre",
              showLineNumbers && "[counter-reset:line]",
            )}
            style={showLineNumbers ? ({ "--pui-code-digits": Math.max(2, digits) } as CSSProperties) : undefined}
          >
            {lines.map((line, index) => {
              const number = index + 1;
              const isHighlighted = highlightSet.has(number);
              return (
                <span
                  key={index}
                  data-slot="code-block-line"
                  data-line={number}
                  data-highlighted={isHighlighted || undefined}
                  className={cn(
                    "flex min-h-[1.625em] px-4",
                    showLineNumbers && lineNumberClassName,
                    isHighlighted && "bg-pui-primary/10 shadow-[inset_2px_0_0_hsl(var(--pui-primary))]",
                  )}
                >
                  <span className="min-w-0 flex-1">
                    {line.map((token, tokenIndex) => (
                      <span key={tokenIndex} style={tokenStyle(token)}>
                        {token.content}
                      </span>
                    ))}
                  </span>
                </span>
              );
            })}
          </code>
        </pre>
      </ScrollArea>
      {!hasHeader && copyButton}
    </div>
  );
});

/* ------------------------------------------------------------------------------------------------
 * CodeInline
 * ----------------------------------------------------------------------------------------------*/

export type CodeInlineProps = ComponentPropsWithoutRef<"code">;

/** Inline code inside running text. */
export const CodeInline = /* @__PURE__ */ forwardRef<HTMLElement, CodeInlineProps>(function CodeInline({ className, ...props }, ref) {
  return (
    <code
      ref={ref}
      data-slot="code-inline"
      className={cn(
        "rounded-pui-sm bg-pui-muted px-1 py-0.5 font-mono text-[0.85em] text-pui-foreground [overflow-wrap:anywhere]",
        className,
      )}
      {...props}
    />
  );
});
