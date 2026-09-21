import { render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Markdown } from ".";

const DOC = `# Lager

## Bestand

Ein **fetter** und _kursiver_ Satz mit ~~alt~~ und \`inline\`.

- Eins
  - Verschachtelt
- Zwei

1. Erstens
2. Zweitens

- [x] Erledigt
- [ ] Offen

| Artikel | Preis |
| :------ | ----: |
| Reifen  | $1.200 |

> Zitat

---

\`\`\`lua
local x = 1
\`\`\`

\`\`\`
plain
\`\`\`

[Extern](https://example.com) und [Intern](/lager) und https://auto.link
`;

describe("Markdown", () => {
  it("renders headings, paragraphs and lists with the shared prose typography", () => {
    const { container } = render(<Markdown className="extra">{DOC}</Markdown>);
    const root = container.querySelector('[data-slot="markdown"]')!;
    expect(root).toHaveClass("extra", "text-sm", "[&_h1]:text-xl");
    expect(screen.getByRole("heading", { level: 1, name: "Lager" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Bestand" })).toBeInTheDocument();
    expect(screen.getByText("fetter").tagName).toBe("STRONG");
    expect(screen.getByText("kursiver").tagName).toBe("EM");
    expect(screen.getByText("alt").tagName).toBe("DEL");
    expect(container.querySelector("ul ul li")).toHaveTextContent("Verschachtelt");
    expect(container.querySelector("ol")?.querySelectorAll("li")).toHaveLength(2);
    expect(container.querySelector("blockquote")).toHaveTextContent("Zitat");
    expect(container.querySelector("hr")).toBeInTheDocument();
  });

  it("accepts the source via `content`", () => {
    render(<Markdown content="**Hallo**" />);
    expect(screen.getByText("Hallo").tagName).toBe("STRONG");
  });

  it("renders GFM tables with preUI Table parts and alignment", () => {
    const { container } = render(<Markdown>{DOC}</Markdown>);
    expect(container.querySelector('[data-slot="table-container"]')).toBeInTheDocument();
    const table = screen.getByRole("table");
    const [artikel, preis] = within(table).getAllByRole("columnheader");
    expect(artikel).toHaveAttribute("data-slot", "table-head");
    expect(artikel).toHaveClass("text-left", "uppercase");
    expect(preis).toHaveClass("text-right");
    expect(preis.style.textAlign).toBe("");
    const cell = within(table).getByText("$1.200");
    expect(cell).toHaveAttribute("data-slot", "table-cell");
    expect(cell).toHaveClass("text-right");
  });

  it("renders task list items as read-only preUI checkboxes", () => {
    const { container } = render(<Markdown>{DOC}</Markdown>);
    const boxes = screen.getAllByRole("checkbox");
    expect(boxes).toHaveLength(2);
    expect(boxes[0]).toHaveAttribute("aria-checked", "true");
    expect(boxes[1]).toHaveAttribute("aria-checked", "false");
    expect(boxes[0]).toHaveAttribute("aria-readonly", "true");
    expect(container.querySelector("ul.contains-task-list")).toBeInTheDocument();
    expect(container.querySelector('input[type="checkbox"]:not([aria-hidden])')).toBeNull();
  });

  it("renders fenced code with CodeBlock (language from the fence, `text` without) and inline code with CodeInline", async () => {
    const { container } = render(<Markdown codeBlockProps={{ showLineNumbers: true }}>{DOC}</Markdown>);
    const blocks = container.querySelectorAll('[data-slot="code-block"]');
    expect(blocks).toHaveLength(2);
    expect(blocks[0]).toHaveAttribute("data-language", "lua");
    expect(blocks[0]).toHaveTextContent("local x = 1");
    // No trailing empty line from the fence.
    expect(blocks[0].querySelectorAll("[data-line]")).toHaveLength(1);
    expect(blocks[0].querySelector("[data-line]")!.className).toContain("before:content-[counter(line)]");
    expect(blocks[1]).toHaveAttribute("data-language", "text");
    await waitFor(() => expect(blocks[0]).toHaveAttribute("data-state", "highlighted"), { timeout: 10_000 });
    const inline = screen.getByText("inline");
    expect(inline).toHaveAttribute("data-slot", "code-inline");
  });

  it("renders plain pre blocks with highlight={false}", () => {
    const { container } = render(<Markdown highlight={false}>{"```lua\nlocal x = 1\n```"}</Markdown>);
    expect(container.querySelector('[data-slot="code-block"]')).toBeNull();
    const pre = container.querySelector("pre")!;
    expect(pre).toHaveAttribute("data-language", "lua");
    expect(pre.querySelector("code")).toHaveTextContent("local x = 1");
    expect(pre.querySelector('[data-slot="code-inline"]')).toBeNull();
  });

  it("opens external links safely and leaves internal links alone", () => {
    render(<Markdown>{DOC}</Markdown>);
    const external = screen.getByRole("link", { name: "Extern" });
    expect(external).toHaveAttribute("target", "_blank");
    expect(external).toHaveAttribute("rel", "noopener noreferrer");
    const internal = screen.getByRole("link", { name: "Intern" });
    expect(internal).not.toHaveAttribute("target");
    expect(internal).not.toHaveAttribute("rel");
    // GFM autolink literal
    expect(screen.getByRole("link", { name: "https://auto.link" })).toHaveAttribute("target", "_blank");
  });

  it("supports linkTarget={null} and allowExternalLinks={false}", () => {
    const { rerender } = render(<Markdown linkTarget={null}>{"[Extern](https://example.com)"}</Markdown>);
    const link = screen.getByRole("link", { name: "Extern" });
    expect(link).not.toHaveAttribute("target");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
    rerender(<Markdown allowExternalLinks={false}>{"[Extern](https://example.com) [Intern](#a)"}</Markdown>);
    expect(screen.queryByRole("link", { name: "Extern" })).toBeNull();
    expect(screen.getByText("Extern")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Intern" })).toBeInTheDocument();
  });

  it("skips raw HTML and sanitises javascript: URLs by default", () => {
    const { container } = render(
      <Markdown>{'Hallo <b>fett</b> <script>alert(1)</script>\n\n<div class="x">Block</div>\n\n[Klick](javascript:alert(1))'}</Markdown>,
    );
    expect(container.querySelector("b")).toBeNull();
    expect(container.querySelector("script")).toBeNull();
    expect(container.querySelector("div.x")).toBeNull();
    expect(container).not.toHaveTextContent("<b>");
    expect(screen.queryByRole("link", { name: "Klick" })).toBeNull();
    expect(screen.getByText("Klick").tagName).toBe("SPAN");
    expect(container.innerHTML).not.toContain("javascript:");
  });

  it("renders images responsive and styles footnotes", () => {
    const { container } = render(<Markdown>{"![Lagerhalle](/halle.png)\n\nText[^1]\n\n[^1]: Fußnote"}</Markdown>);
    const img = screen.getByRole("img", { name: "Lagerhalle" });
    expect(img).toHaveClass("max-w-full", "rounded-pui");
    const section = container.querySelector("section[data-footnotes]")!;
    expect(section).toHaveTextContent("Fußnote");
    // Ids are prefixed per instance, so several documents on one page don't clash.
    const ref = container.querySelector("a[data-footnote-ref]")!;
    expect(ref.getAttribute("href")).toMatch(/^#md.+-fn-1$/);
    expect(ref).not.toHaveAttribute("target");
  });

  it("lets `components` override the defaults and appends plugins", () => {
    render(
      <Markdown components={{ h1: ({ children }) => <h1 data-testid="custom">{children}</h1> }}>{"# Titel"}</Markdown>,
    );
    expect(screen.getByTestId("custom")).toHaveTextContent("Titel");
  });
});

describe("Markdown slots", () => {
  it("marks links, images and plain code blocks", () => {
    const { container } = render(
      <Markdown highlight={false}>{"[Link](/x) ![Bild](/bild.png)\n\n```\nplain\n```"}</Markdown>,
    );
    expect(container.querySelector('[data-slot="markdown"]')).toBeInTheDocument();
    expect(container.querySelector('a[data-slot="markdown-link"]')).toHaveAttribute("href", "/x");
    expect(container.querySelector('img[data-slot="markdown-image"]')).toBeInTheDocument();
    expect(container.querySelector('pre[data-slot="markdown-pre"]')).toHaveTextContent("plain");
  });
});
