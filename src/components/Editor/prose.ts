/**
 * Typography for rendered rich text (headings, lists, quotes, code, links …), written as Tailwind
 * arbitrary variants so it only needs the preUI preset (no typography plugin).
 *
 * Put it on the element that directly contains the block elements — the editor's content element or
 * a Markdown renderer's wrapper — to get identical typography in both places. It sets no padding.
 */
export const proseClassName = [
  // Base text
  "text-sm leading-relaxed text-pui-foreground break-words",
  "selection:bg-pui-primary/25",

  // Vertical rhythm: space between top-level blocks, more above headings, less below them.
  "[&>*+*]:mt-3",
  "[&>*+:is(h1,h2,h3,h4,h5,h6)]:mt-5",
  "[&_:is(h1,h2,h3,h4,h5,h6)+*]:mt-2",

  // Headings
  "[&_:is(h1,h2,h3,h4,h5,h6)]:font-semibold [&_:is(h1,h2,h3,h4,h5,h6)]:leading-tight [&_:is(h1,h2,h3,h4,h5,h6)]:text-pui-foreground",
  "[&_h1]:text-xl [&_h2]:text-lg [&_h3]:text-base [&_:is(h4,h5,h6)]:text-sm",

  // Inline marks
  "[&_strong]:font-semibold",
  "[&_a]:cursor-pointer [&_a]:text-pui-primary [&_a]:underline [&_a]:decoration-pui-primary/40 [&_a]:underline-offset-[3px]",
  "[&_a]:transition-colors [&_a]:duration-pui-fast [&_a]:ease-pui [&_a:hover]:text-pui-primary/80",

  // Lists (markers in the muted foreground)
  "[&_ul]:list-disc [&_ol]:list-decimal [&_:is(ul,ol)]:pl-5",
  "[&_:is(ul,ol)_ul]:list-[circle]",
  "[&_li]:pl-0.5 [&_li+li]:mt-1 [&_li>*+*]:mt-1",
  "marker:text-pui-muted-foreground",

  // Blockquote
  "[&_blockquote]:border-l-2 [&_blockquote]:border-pui-border [&_blockquote]:pl-3 [&_blockquote]:text-pui-muted-foreground",
  "[&_blockquote>*+*]:mt-2",

  // Inline code
  "[&_:not(pre)>code]:rounded-pui-sm [&_:not(pre)>code]:bg-pui-muted [&_:not(pre)>code]:px-1 [&_:not(pre)>code]:py-0.5",
  "[&_:not(pre)>code]:font-mono [&_:not(pre)>code]:text-[0.85em]",

  // Code blocks (scroll horizontally instead of wrapping)
  "[&_pre]:overflow-x-auto [&_pre]:rounded-pui [&_pre]:border [&_pre]:border-pui-border [&_pre]:bg-pui-card [&_pre]:p-3",
  "[&_pre]:font-mono [&_pre]:text-[13px] [&_pre]:leading-relaxed [&_pre]:!whitespace-pre [&_pre]:[tab-size:2]",
  "[&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_pre_code]:text-[length:inherit] [&_pre_code]:!whitespace-pre",

  // Horizontal rule
  "[&_hr]:my-4 [&_hr]:border-0 [&_hr]:border-t [&_hr]:border-pui-border",
].join(" ");
