import type { Element, ElementContent, Root, RootContent } from "hast";
import {
  forwardRef,
  useId,
  useMemo,
  type ComponentPropsWithoutRef,
  type CSSProperties,
} from "react";
import ReactMarkdown, { defaultUrlTransform, type Components, type ExtraProps, type Options } from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "../../utils/cn";
import { Checkbox } from "../Checkbox/Checkbox";
import { CodeBlock, CodeInline, type CodeBlockProps } from "../Code/CodeBlock";
import { proseClassName } from "../Editor/prose";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../Table/Table";

type PluggableList = NonNullable<Options["remarkPlugins"]>;

export interface MarkdownProps extends Omit<ComponentPropsWithoutRef<"div">, "children" | "content"> {
  /** The Markdown source. */
  children?: string | null;
  /** Alternative to `children`. */
  content?: string | null;
  /** Override how elements render (react-markdown `components`), merged over preUI's. */
  components?: Components;
  /** Extra remark plugins, appended after `remark-gfm`. */
  remarkPlugins?: PluggableList;
  /** Extra rehype plugins. */
  rehypePlugins?: PluggableList;
  /** Options for `remark-rehype` (e.g. `footnoteLabel`, `footnoteBackLabel`). */
  remarkRehypeOptions?: Options["remarkRehypeOptions"];
  /** Renders fenced code with the syntax-highlighted `CodeBlock`. `false` → a plain styled `<pre>`. Default `true`. */
  highlight?: boolean;
  /** Props for every `CodeBlock` (e.g. `showLineNumbers`, `copyable`, `wrap`, `copyLabel`). */
  codeBlockProps?: Omit<Partial<CodeBlockProps>, "code" | "language">;
  /**
   * `target` of external links (`http(s)://…`, `//…`). Default `"_blank"`; `null` opens them in the same tab.
   * External links always get `rel="noopener noreferrer"`.
   */
  linkTarget?: string | null;
  /** `false` renders external links as plain text (internal, relative and `#` links stay). Default `true`. */
  allowExternalLinks?: boolean;
  /** Ignore raw HTML in the Markdown completely. Default `true` (safe: no HTML is ever rendered). */
  skipHtml?: boolean;
  /** Rewrites/sanitises URLs (`href`, `src`). Default: react-markdown's `defaultUrlTransform` (blocks `javascript:` etc.). */
  urlTransform?: Options["urlTransform"];
}

/** `https://…`, `http://…`, `mailto:…` or protocol-relative `//…`. */
const EXTERNAL_LINK = /^(?:[a-z][a-z\d+.-]*:|\/\/)/i;
const isExternal = (href: string | undefined) => !!href && EXTERNAL_LINK.test(href) && !/^mailto:|^tel:/i.test(href);

/** Plain text of a hast node (code blocks). */
function textOf(node: Element | Root | RootContent | ElementContent): string {
  if (node.type === "text") return node.value;
  if ("children" in node) return (node.children as (RootContent | ElementContent)[]).map(textOf).join("");
  return "";
}

/** `language-lua` → `lua`; no language → `text`. */
function languageOf(node: Element | undefined): string {
  const className: unknown = node?.properties?.className;
  const classes = Array.isArray(className) ? className.map(String) : String(className ?? "").split(" ");
  const match = classes.map((value: string) => /^language-(.+)$/.exec(value)?.[1]).find(Boolean);
  return match ?? "text";
}

type Align = "left" | "center" | "right" | undefined;

/** GFM alignment arrives as `style.textAlign` (react-markdown default) or `align`; mapped to classes. */
function alignOf(style: CSSProperties | undefined, align: string | undefined): Align {
  const value = (style?.textAlign ?? align) as string | undefined;
  return value === "left" || value === "center" || value === "right" ? value : undefined;
}

const alignClassName = { left: "text-left", center: "text-center", right: "text-right" } as const;

function withoutTextAlign(style: CSSProperties | undefined): CSSProperties | undefined {
  if (!style || !("textAlign" in style)) return style;
  const { textAlign: _textAlign, ...rest } = style;
  return Object.keys(rest).length ? rest : undefined;
}

/**
 * Markdown-specific rules on top of the shared prose typography. Selectors are one level more specific
 * than `proseClassName`'s, so they win regardless of the order Tailwind emits them in.
 */
const markdownClassName = [
  // Syntax-highlighted code blocks bring their own frame: undo the prose `pre` panel for their inner <pre>.
  "[&_[data-slot=code-block]_pre]:rounded-none [&_[data-slot=code-block]_pre]:border-0 [&_[data-slot=code-block]_pre]:bg-transparent",
  "[&_[data-slot=code-block]_pre]:px-0 [&_[data-slot=code-block]_pre]:py-3",
  // CodeBlock scrolls in its own ScrollArea: its <pre> must not become a native scroll container (prose default).
  "[&_[data-slot=code-block]_pre]:overflow-visible",
  "[&_[data-slot=code-block][data-wrap]_code]:!whitespace-pre-wrap",
  // Plain <pre> (highlight={false}): no ligatures, like CodeBlock.
  "[&_pre]:[font-variant-ligatures:none]",
  // GFM task items: no bullet, the checkbox sits in the marker column (works in mixed lists too).
  "[&_li.task-list-item]:relative [&_li.task-list-item]:list-none",
  // Strikethrough
  "[&_del]:text-pui-muted-foreground [&_del]:decoration-pui-muted-foreground",
  // Footnotes (remark-gfm): small reference numbers, a quiet section at the end.
  "[&_sup]:text-[0.7em] [&_sup]:leading-none [&_sup>a]:no-underline [&_sup>a]:px-px",
  "[&_section[data-footnotes]]:mt-6 [&_section[data-footnotes]]:border-t [&_section[data-footnotes]]:border-pui-border [&_section[data-footnotes]]:pt-3",
  "[&_section[data-footnotes]]:text-xs [&_section[data-footnotes]]:text-pui-muted-foreground",
  "[&_section[data-footnotes]_ol]:pl-4 [&_section[data-footnotes]_a[data-footnote-backref]]:no-underline",
].join(" ");

/** `useId` output made safe for ids that end up in `href="#…"`. */
const idPrefix = (id: string) => `md${id.replace(/[^a-zA-Z0-9_-]/g, "")}-`;

/**
 * Renders Markdown (CommonMark + GitHub Flavored Markdown) with preUI typography: `CodeBlock` for fenced
 * code, `CodeInline`, preUI `Table`s, read-only `Checkbox`es for task lists. Safe by default: raw HTML is
 * skipped and URLs are sanitised.
 */
export const Markdown = forwardRef<HTMLDivElement, MarkdownProps>(function Markdown(
  {
    children,
    content,
    components: componentsProp,
    remarkPlugins,
    rehypePlugins,
    remarkRehypeOptions,
    highlight = true,
    codeBlockProps,
    linkTarget = "_blank",
    allowExternalLinks = true,
    skipHtml = true,
    urlTransform = defaultUrlTransform,
    className,
    ...props
  },
  ref,
) {
  const source = children ?? content ?? "";
  const prefix = idPrefix(useId());

  const components = useMemo<Components>(() => {
    const base: Components = {
      pre({ node }) {
        const code = node?.children.find((child): child is Element => child.type === "element" && child.tagName === "code");
        const text = textOf(code ?? node!);
        const language = languageOf(code);
        if (!highlight) {
          return (
            <pre data-slot="markdown-pre" data-language={language}>
              <code>{text.endsWith("\n") ? text.slice(0, -1) : text}</code>
            </pre>
          );
        }
        const { wrap, ...rest } = codeBlockProps ?? {};
        return <CodeBlock code={text} language={language} wrap={wrap} data-wrap={wrap || undefined} {...rest} />;
      },
      // Block code never reaches this (the `pre` above renders it from the syntax tree).
      code({ node: _node, ...rest }) {
        return <CodeInline {...rest} />;
      },
      a({ node: _node, href, children: linkChildren, target, rel, ...rest }) {
        const external = isExternal(href);
        // Blocked (e.g. `javascript:` removed by urlTransform) or disallowed links render as plain text.
        if (!href || (external && !allowExternalLinks)) return <span data-slot="markdown-link">{linkChildren}</span>;
        return (
          <a
            data-slot="markdown-link"
            href={href}
            target={external ? (linkTarget ?? undefined) : target}
            rel={external ? "noopener noreferrer" : rel}
            {...rest}
          >
            {linkChildren}
          </a>
        );
      },
      img({ node: _node, className: imgClassName, alt, ...rest }) {
        return (
          <img
            data-slot="markdown-image"
            alt={alt ?? ""}
            loading="lazy"
            decoding="async"
            className={cn("inline-block h-auto max-w-full rounded-pui align-middle", imgClassName)}
            {...rest}
          />
        );
      },
      table({ node: _node, ref: _ref, ...rest }) {
        return <Table {...rest} />;
      },
      thead({ node: _node, ref: _ref, ...rest }) {
        return <TableHeader className="static" {...rest} />;
      },
      tbody({ node: _node, ref: _ref, ...rest }) {
        return <TableBody {...rest} />;
      },
      tr({ node: _node, ref: _ref, ...rest }) {
        return <TableRow {...rest} />;
      },
      th({ node: _node, ref: _ref, style, align, className: cellClassName, ...rest }) {
        const alignment = alignOf(style, align);
        return (
          <TableHead
            style={withoutTextAlign(style)}
            className={cn(alignment && alignClassName[alignment], cellClassName)}
            {...rest}
          />
        );
      },
      td({ node: _node, ref: _ref, style, align, className: cellClassName, ...rest }) {
        const alignment = alignOf(style, align);
        return (
          <TableCell
            style={withoutTextAlign(style)}
            className={cn(alignment && alignClassName[alignment], cellClassName)}
            {...rest}
          />
        );
      },
      input({ node: _node, type, checked, ...rest }: ComponentPropsWithoutRef<"input"> & ExtraProps) {
        if (type !== "checkbox") return <input type={type} checked={checked} {...rest} readOnly />;
        return (
          <Checkbox
            checked={!!checked}
            readOnly
            tabIndex={-1}
            className="absolute -left-5 top-[0.2rem] cursor-default"
          />
        );
      },
    };
    return { ...base, ...componentsProp };
  }, [componentsProp, highlight, codeBlockProps, linkTarget, allowExternalLinks]);

  const remark = useMemo(() => [remarkGfm, ...(remarkPlugins ?? [])], [remarkPlugins]);
  const rehypeOptions = useMemo(
    () => ({
      clobberPrefix: prefix,
      // Text presentation of the back arrow (some platforms draw a coloured emoji otherwise).
      footnoteBackContent: (_: number, rereference: number): ElementContent[] => [
        { type: "text", value: "↩︎" },
        ...(rereference > 1
          ? [{ type: "element", tagName: "sup", properties: {}, children: [{ type: "text", value: String(rereference) }] } as Element]
          : []),
      ],
      ...remarkRehypeOptions,
    }),
    [prefix, remarkRehypeOptions],
  );

  return (
    <div ref={ref} data-slot="markdown" className={cn(proseClassName, markdownClassName, className)} {...props}>
      <ReactMarkdown
        remarkPlugins={remark}
        rehypePlugins={rehypePlugins}
        remarkRehypeOptions={rehypeOptions}
        components={components}
        skipHtml={skipHtml}
        urlTransform={urlTransform}
      >
        {source}
      </ReactMarkdown>
    </div>
  );
});

export type { Components as MarkdownComponents } from "react-markdown";
