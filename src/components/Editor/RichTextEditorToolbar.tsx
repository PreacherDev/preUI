import type { Editor } from "@tiptap/core";
import { useEditorState } from "@tiptap/react";
import { Fragment, useEffect, useRef, useState, type FormEvent, type ReactElement } from "react";
import { useIcon } from "../../icons";
import type { IconName } from "../../icons";
import { cn } from "../../utils/cn";
import { Button } from "../Button/Button";
import { Input } from "../Input/Input";
import { Popover, PopoverContent, PopoverTrigger } from "../Popover/Popover";
import { Toggle } from "../Toggle/Toggle";
import { Toolbar, ToolbarButton, ToolbarGroup, ToolbarSeparator } from "../Toolbar/Toolbar";
import { Tooltip, TooltipContent, TooltipTrigger } from "../Tooltip/Tooltip";

/** One button of the rich-text toolbar. */
export type RichTextEditorToolbarItem =
  | "undo"
  | "redo"
  | "heading1"
  | "heading2"
  | "heading3"
  | "bold"
  | "italic"
  | "strike"
  | "code"
  | "bulletList"
  | "orderedList"
  | "blockquote"
  | "codeBlock"
  | "horizontalRule"
  | "link";

/** Visible and accessible texts of the editor. English defaults, override any subset via `labels`. */
export interface RichTextEditorLabels {
  toolbar: string;
  undo: string;
  redo: string;
  heading1: string;
  heading2: string;
  heading3: string;
  bold: string;
  italic: string;
  strike: string;
  code: string;
  bulletList: string;
  orderedList: string;
  blockquote: string;
  codeBlock: string;
  horizontalRule: string;
  link: string;
  /** Label of the URL field in the link popover. */
  linkUrl: string;
  linkPlaceholder: string;
  linkApply: string;
  linkRemove: string;
  /** Accessible label of the character counter, e.g. "Characters". */
  characterCount: string;
}

export const defaultRichTextEditorLabels: RichTextEditorLabels = {
  toolbar: "Formatting",
  undo: "Undo",
  redo: "Redo",
  heading1: "Heading 1",
  heading2: "Heading 2",
  heading3: "Heading 3",
  bold: "Bold",
  italic: "Italic",
  strike: "Strikethrough",
  code: "Inline code",
  bulletList: "Bulleted list",
  orderedList: "Numbered list",
  blockquote: "Quote",
  codeBlock: "Code block",
  horizontalRule: "Divider",
  link: "Link",
  linkUrl: "URL",
  linkPlaceholder: "https://example.com",
  linkApply: "Apply",
  linkRemove: "Remove",
  characterCount: "Characters",
};

/** Toolbar buttons in display order; a separator is drawn between non-empty groups. */
export const richTextEditorToolbarGroups: RichTextEditorToolbarItem[][] = [
  ["undo", "redo"],
  ["heading1", "heading2", "heading3"],
  ["bold", "italic", "strike", "code"],
  ["bulletList", "orderedList", "blockquote", "codeBlock", "horizontalRule"],
  ["link"],
];

export const defaultRichTextEditorToolbar: RichTextEditorToolbarItem[] = richTextEditorToolbarGroups.flat();

interface ItemSpec {
  icon: IconName;
  /** Shortcut hint, `Mod` = Ctrl / Cmd. */
  shortcut?: string;
  /** Toggle (pressed state) or plain action button. */
  toggle: boolean;
  isActive?: (editor: Editor) => boolean;
  can: (editor: Editor) => boolean;
  run: (editor: Editor) => void;
}

const chain = (editor: Editor) => editor.chain().focus();

const itemSpecs: Record<Exclude<RichTextEditorToolbarItem, "link">, ItemSpec> = {
  undo: {
    icon: "undo",
    shortcut: "Mod+Z",
    toggle: false,
    can: (e) => e.can().undo(),
    run: (e) => chain(e).undo().run(),
  },
  redo: {
    icon: "redo",
    shortcut: "Mod+Shift+Z",
    toggle: false,
    can: (e) => e.can().redo(),
    run: (e) => chain(e).redo().run(),
  },
  heading1: {
    icon: "heading1",
    shortcut: "Mod+Alt+1",
    toggle: true,
    isActive: (e) => e.isActive("heading", { level: 1 }),
    can: (e) => e.can().toggleHeading({ level: 1 }),
    run: (e) => chain(e).toggleHeading({ level: 1 }).run(),
  },
  heading2: {
    icon: "heading2",
    shortcut: "Mod+Alt+2",
    toggle: true,
    isActive: (e) => e.isActive("heading", { level: 2 }),
    can: (e) => e.can().toggleHeading({ level: 2 }),
    run: (e) => chain(e).toggleHeading({ level: 2 }).run(),
  },
  heading3: {
    icon: "heading3",
    shortcut: "Mod+Alt+3",
    toggle: true,
    isActive: (e) => e.isActive("heading", { level: 3 }),
    can: (e) => e.can().toggleHeading({ level: 3 }),
    run: (e) => chain(e).toggleHeading({ level: 3 }).run(),
  },
  bold: {
    icon: "bold",
    shortcut: "Mod+B",
    toggle: true,
    isActive: (e) => e.isActive("bold"),
    can: (e) => e.can().toggleBold(),
    run: (e) => chain(e).toggleBold().run(),
  },
  italic: {
    icon: "italic",
    shortcut: "Mod+I",
    toggle: true,
    isActive: (e) => e.isActive("italic"),
    can: (e) => e.can().toggleItalic(),
    run: (e) => chain(e).toggleItalic().run(),
  },
  strike: {
    icon: "strikethrough",
    shortcut: "Mod+Shift+S",
    toggle: true,
    isActive: (e) => e.isActive("strike"),
    can: (e) => e.can().toggleStrike(),
    run: (e) => chain(e).toggleStrike().run(),
  },
  code: {
    icon: "code",
    shortcut: "Mod+E",
    toggle: true,
    isActive: (e) => e.isActive("code"),
    can: (e) => e.can().toggleCode(),
    run: (e) => chain(e).toggleCode().run(),
  },
  bulletList: {
    icon: "list",
    shortcut: "Mod+Shift+8",
    toggle: true,
    isActive: (e) => e.isActive("bulletList"),
    can: (e) => e.can().toggleBulletList(),
    run: (e) => chain(e).toggleBulletList().run(),
  },
  orderedList: {
    icon: "listOrdered",
    shortcut: "Mod+Shift+7",
    toggle: true,
    isActive: (e) => e.isActive("orderedList"),
    can: (e) => e.can().toggleOrderedList(),
    run: (e) => chain(e).toggleOrderedList().run(),
  },
  blockquote: {
    icon: "quote",
    shortcut: "Mod+Shift+B",
    toggle: true,
    isActive: (e) => e.isActive("blockquote"),
    can: (e) => e.can().toggleBlockquote(),
    run: (e) => chain(e).toggleBlockquote().run(),
  },
  codeBlock: {
    icon: "codeBlock",
    shortcut: "Mod+Alt+C",
    toggle: true,
    isActive: (e) => e.isActive("codeBlock"),
    can: (e) => e.can().toggleCodeBlock(),
    run: (e) => chain(e).toggleCodeBlock().run(),
  },
  horizontalRule: {
    icon: "minus",
    toggle: false,
    can: (e) => e.can().setHorizontalRule(),
    run: (e) => chain(e).setHorizontalRule().run(),
  },
};

function isMacLike() {
  if (typeof navigator === "undefined") return false;
  return /Mac|iPhone|iPad|iPod/.test(navigator.platform || navigator.userAgent);
}

/** "Mod+Shift+Z" → "Ctrl+Shift+Z" or "⌘⇧Z". */
export function formatShortcut(shortcut: string, mac = isMacLike()): string {
  const keys = shortcut.split("+");
  if (!mac) return keys.map((key) => (key === "Mod" ? "Ctrl" : key)).join("+");
  const symbols: Record<string, string> = { Mod: "⌘", Shift: "⇧", Alt: "⌥", Ctrl: "⌃" };
  return keys.map((key) => symbols[key] ?? key).join("");
}

/** Adds a scheme to bare domains ("example.com" → "https://example.com"). */
export function normalizeLinkUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return "";
  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed) || trimmed.startsWith("/") || trimmed.startsWith("#")) return trimmed;
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return `mailto:${trimmed}`;
  return `https://${trimmed}`;
}

function ToolbarTooltip({ label, shortcut, children }: { label: string; shortcut?: string; children: ReactElement }) {
  return (
    <Tooltip>
      <TooltipTrigger render={children} />
      <TooltipContent>
        {label}
        {shortcut && <span className="ml-2 text-pui-tooltip-foreground/60">{formatShortcut(shortcut)}</span>}
      </TooltipContent>
    </Tooltip>
  );
}

export interface RichTextEditorToolbarProps {
  editor: Editor;
  items: RichTextEditorToolbarItem[];
  labels: RichTextEditorLabels;
  linkOpen: boolean;
  onLinkOpenChange: (open: boolean) => void;
  className?: string;
}

/** The editor's formatting toolbar (internal; rendered by `RichTextEditor`). */
export function RichTextEditorToolbar({
  editor,
  items,
  labels,
  linkOpen,
  onLinkOpenChange,
  className,
}: RichTextEditorToolbarProps) {
  const state = useEditorState({
    editor,
    selector: ({ editor: e }) => {
      const result: Record<string, { active: boolean; can: boolean }> = {};
      for (const item of items) {
        if (item === "link") {
          result.link = { active: e.isActive("link"), can: e.isEditable };
          continue;
        }
        const spec = itemSpecs[item];
        result[item] = { active: spec.isActive?.(e) ?? false, can: e.isEditable && spec.can(e) };
      }
      return result;
    },
    equalityFn: (a, b) => {
      if (!b) return false;
      return Object.keys(a).every((key) => a[key]?.active === b[key]?.active && a[key]?.can === b[key]?.can);
    },
  });

  const groups = richTextEditorToolbarGroups
    .map((group) => group.filter((item) => items.includes(item)))
    .filter((group) => group.length > 0);

  return (
    <Toolbar aria-label={labels.toolbar} className={cn("flex-wrap gap-0.5", className)}>
      {groups.map((group, index) => (
        <Fragment key={group.join("-")}>
          {index > 0 && <ToolbarSeparator orientation="vertical" className="mx-1" />}
          <ToolbarGroup>
            {group.map((item) =>
              item === "link" ? (
                <LinkButton
                  key={item}
                  editor={editor}
                  labels={labels}
                  active={state.link?.active ?? false}
                  disabled={!(state.link?.can ?? false)}
                  open={linkOpen}
                  onOpenChange={onLinkOpenChange}
                />
              ) : (
                <ItemButton
                  key={item}
                  item={item}
                  editor={editor}
                  label={labels[item]}
                  active={state[item]?.active ?? false}
                  disabled={!(state[item]?.can ?? false)}
                />
              ),
            )}
          </ToolbarGroup>
        </Fragment>
      ))}
    </Toolbar>
  );
}

function ItemButton({
  item,
  editor,
  label,
  active,
  disabled,
}: {
  item: Exclude<RichTextEditorToolbarItem, "link">;
  editor: Editor;
  label: string;
  active: boolean;
  disabled: boolean;
}) {
  const spec = itemSpecs[item];
  const Icon = useIcon(spec.icon);
  const icon = <Icon aria-hidden="true" />;

  const button = spec.toggle ? (
    <ToolbarButton
      size="icon-sm"
      aria-label={label}
      data-item={item}
      disabled={disabled}
      render={<Toggle size="icon-sm" pressed={active} onPressedChange={() => spec.run(editor)} />}
    >
      {icon}
    </ToolbarButton>
  ) : (
    <ToolbarButton size="icon-sm" aria-label={label} data-item={item} disabled={disabled} onClick={() => spec.run(editor)}>
      {icon}
    </ToolbarButton>
  );

  return (
    <ToolbarTooltip label={label} shortcut={spec.shortcut}>
      {button}
    </ToolbarTooltip>
  );
}

function LinkButton({
  editor,
  labels,
  active,
  disabled,
  open,
  onOpenChange,
}: {
  editor: Editor;
  labels: RichTextEditorLabels;
  active: boolean;
  disabled: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const LinkIcon = useIcon("link");
  const [url, setUrl] = useState("");
  const [hadLink, setHadLink] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Prefill with the link under the cursor whenever the popover opens.
  useEffect(() => {
    if (!open) return;
    const href = (editor.getAttributes("link").href as string | undefined) ?? "";
    setUrl(href);
    setHadLink(editor.isActive("link"));
  }, [open, editor]);

  const close = () => {
    onOpenChange(false);
  };

  const apply = (event: FormEvent) => {
    event.preventDefault();
    const href = normalizeLinkUrl(url);
    if (!href) {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      close();
      return;
    }
    if (editor.state.selection.empty && !editor.isActive("link")) {
      // Nothing selected: insert the URL itself as linked text.
      editor
        .chain()
        .focus()
        .insertContent({ type: "text", text: url.trim(), marks: [{ type: "link", attrs: { href } }] })
        .run();
    } else {
      editor.chain().focus().extendMarkRange("link").setLink({ href }).run();
    }
    close();
  };

  const remove = () => {
    editor.chain().focus().extendMarkRange("link").unsetLink().run();
    close();
  };

  return (
    <Popover open={open} onOpenChange={(next) => onOpenChange(next)}>
      <ToolbarTooltip label={labels.link} shortcut="Mod+K">
        <PopoverTrigger
          render={
            <ToolbarButton
              size="icon-sm"
              aria-label={labels.link}
              data-item="link"
              aria-pressed={active}
              data-pressed={active ? "" : undefined}
              disabled={disabled}
            />
          }
        >
          <LinkIcon aria-hidden="true" />
        </PopoverTrigger>
      </ToolbarTooltip>
      <PopoverContent
        align="start"
        className="w-80 p-3"
        initialFocus={inputRef}
        finalFocus={false}
        aria-label={labels.link}
      >
        <form data-slot="rich-text-editor-link-form" onSubmit={apply} className="flex flex-col gap-2.5">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-pui-muted-foreground">{labels.linkUrl}</span>
            <Input
              ref={inputRef}
              size="sm"
              type="text"
              inputMode="url"
              autoComplete="off"
              spellCheck={false}
              value={url}
              placeholder={labels.linkPlaceholder}
              onChange={(event) => setUrl(event.target.value)}
            />
          </label>
          <div data-slot="rich-text-editor-link-actions" className="flex justify-end gap-2">
            {hadLink && (
              <Button type="button" variant="ghost" size="sm" onClick={remove}>
                {labels.linkRemove}
              </Button>
            )}
            <Button type="submit" size="sm" disabled={!url.trim() && !hadLink}>
              {labels.linkApply}
            </Button>
          </div>
        </form>
      </PopoverContent>
    </Popover>
  );
}

