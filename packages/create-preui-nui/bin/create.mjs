#!/usr/bin/env node
// create-preui-nui: scaffolds a FiveM NUI resource (Lua + Vite/React web UI) that uses preUI.
// Zero dependencies: only node: built-ins, Node >= 18.
//
//   npm create @pre_scripts/preui-nui@latest my-shop
//   npm create @pre_scripts/preui-nui@latest my-shop -- --no-theme --lang en

import { existsSync, mkdirSync, readdirSync, readFileSync, realpathSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, join, relative, resolve, sep } from "node:path";
import { createInterface } from "node:readline";
import { fileURLToPath } from "node:url";

const TEMPLATE_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "template");
const DEFAULT_NAME = "my-nui";
const LANGS = ["de", "en"];
/** FiveM resource names: lowercase letters, digits, `_` and `-`; starting with a letter or digit. */
const NAME_PATTERN = /^[a-z0-9][a-z0-9_-]*$/;

/** Files npm would drop or rename when publishing the starter; stored with a `_` prefix in template/. */
const RENAMES = { _gitignore: ".gitignore" };
/** Only these files get placeholders replaced and blocks resolved (everything else is copied as is). */
const TEXT_EXTENSIONS = new Set([".lua", ".md", ".json", ".ts", ".tsx", ".js", ".css", ".html", ""]);

/** Texts that differ per language, used as `__T_<KEY>__` in the template. */
const TEXTS = {
  de: {
    HTML_LANG: "de",
    TITLE: "Laden",
    DESCRIPTION: "Dein erstes preUI-Fenster. Die Daten kommen aus dem Lua-Callback getData.",
    TAB_ITEMS: "Artikel",
    TAB_INFO: "Info",
    STOCK: "Lager",
    SOLD_OUT: "Ausverkauft",
    SELECT: "Auswählen",
    SELECTED: "Ausgewählt",
    NOTHING_SELECTED: "Nichts ausgewählt",
    LOADING: "Lade Daten …",
    CASH: "Bargeld",
    PLAYER: "Spieler",
    INFO_TEXT_1: "Dieses Fenster ist das Grundgerüst deiner Resource. Passe web/src/App.tsx an und baue mit npm run build.",
    INFO_TEXT_2: "Lua schickt Nachrichten mit SendNUIMessage, die UI ruft Lua mit fetchNui auf (RegisterNUICallback in client.lua).",
    CLOSE: "Schließen",
    OPEN_DEV: "UI öffnen (nur im Browser)",
    ITEM_1: "Wasserflasche",
    ITEM_2: "Sandwich",
    ITEM_3: "Verbandskasten",
    ITEM_4: "Reparaturset",
    LOCALE: "de-DE",
    MOCK_PLAYER: "Browser-Test",
    RESOURCE_DESCRIPTION: "NUI mit preUI",
  },
  en: {
    HTML_LANG: "en",
    TITLE: "Shop",
    DESCRIPTION: "Your first preUI window. The data comes from the Lua callback getData.",
    TAB_ITEMS: "Items",
    TAB_INFO: "Info",
    STOCK: "Stock",
    SOLD_OUT: "Sold out",
    SELECT: "Select",
    SELECTED: "Selected",
    NOTHING_SELECTED: "Nothing selected",
    LOADING: "Loading data …",
    CASH: "Cash",
    PLAYER: "Player",
    INFO_TEXT_1: "This window is the skeleton of your resource. Edit web/src/App.tsx and build with npm run build.",
    INFO_TEXT_2: "Lua sends messages with SendNUIMessage, the UI calls Lua with fetchNui (RegisterNUICallback in client.lua).",
    CLOSE: "Close",
    OPEN_DEV: "Open UI (browser only)",
    ITEM_1: "Water bottle",
    ITEM_2: "Sandwich",
    ITEM_3: "First aid kit",
    ITEM_4: "Repair kit",
    LOCALE: "en-US",
    MOCK_PLAYER: "Browser test",
    RESOURCE_DESCRIPTION: "NUI built with preUI",
  },
};

const HELP = `Usage: npm create @pre_scripts/preui-nui@latest [name] -- [options]

Scaffolds a FiveM NUI resource (fxmanifest, client.lua, Vite + React + preUI web UI).

  name            resource name: lowercase letters, digits, _ and - (asked when missing)

Options (after "--" when started through npm create):
  --lang de|en    language of the texts and the README (default: de)
  --no-theme      without the preui_theme bridge (server-wide theme)
  --force         write into a non-empty folder (existing files are overwritten)
  -h, --help      show this help
`;

/** Parses argv; returns { name, lang, theme, force, help } or throws an Error with a user-facing message. */
export function parseArgs(argv) {
  // Note: through `npm create`, options only arrive after `--`; without it npm consumes them itself.
  const options = { name: undefined, lang: "de", theme: true, force: false, help: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--") continue;
    if (arg === "-h" || arg === "--help") options.help = true;
    else if (arg === "--no-theme") options.theme = false;
    else if (arg === "--theme") options.theme = true;
    else if (arg === "--force" || arg === "-f") options.force = true;
    else if (arg === "--lang" || arg.startsWith("--lang=")) {
      const value = arg === "--lang" ? argv[++i] : arg.slice("--lang=".length);
      if (!LANGS.includes(value)) throw new Error(`--lang must be one of ${LANGS.join(", ")} (got "${value ?? ""}")`);
      options.lang = value;
    } else if (arg.startsWith("-")) throw new Error(`Unknown option "${arg}". Run with --help for the usage.`);
    else if (options.name === undefined) options.name = arg;
    else throw new Error(`Unexpected argument "${arg}" (the name is already "${options.name}").`);
  }
  return options;
}

/** `undefined` when valid, else the reason. */
export function validateName(name) {
  if (!name) return "The resource name must not be empty.";
  if (!NAME_PATTERN.test(name)) {
    return `"${name}" is not a valid FiveM resource name: use lowercase letters, digits, _ and - (starting with a letter or digit).`;
  }
  if (name.length > 64) return "The resource name is too long (max. 64 characters).";
  return undefined;
}

function ask(question, fallback) {
  return new Promise((resolvePromise) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    let answered = false;
    rl.question(`${question} (${fallback}) `, (answer) => {
      answered = true;
      rl.close();
      resolvePromise(answer.trim() || fallback);
    });
    // stdin closed without an answer (non-interactive): use the default
    rl.on("close", () => {
      if (!answered) {
        process.stdout.write("\n");
        resolvePromise(fallback);
      }
    });
  });
}

/**
 * Resolves the `@preui-theme` / `@preui-no-theme` blocks. A block runs from a line containing `@preui-theme:start`
 * to a line containing `@preui-theme:end` (any comment syntax); marker lines are always removed, the content is kept
 * only when the block matches the chosen option.
 */
export function resolveBlocks(text, { theme }) {
  const lines = text.split(/\r?\n/);
  const out = [];
  let skip = false;
  for (const line of lines) {
    const marker = line.match(/@preui-(no-theme|theme):(start|end)/);
    if (marker) {
      const [, kind, edge] = marker;
      if (edge === "start") skip = kind === "theme" ? !theme : theme;
      else skip = false;
      continue;
    }
    if (!skip) out.push(line);
  }
  return out.join("\n");
}

function render(text, { name, lang, theme }) {
  const texts = TEXTS[lang];
  return resolveBlocks(text, { theme })
    .replace(/__NAME__/g, name)
    .replace(/__T_([A-Z0-9_]+)__/g, (match, key) => (key in texts ? texts[key] : match));
}

function listFiles(dir) {
  const result = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) result.push(...listFiles(full));
    else result.push(full);
  }
  return result;
}

/** Writes the resource into `targetDir`; returns the list of written paths (relative, with `/`). */
export function scaffold(targetDir, { name, lang = "de", theme = true }) {
  const written = [];
  for (const source of listFiles(TEMPLATE_DIR)) {
    let rel = relative(TEMPLATE_DIR, source).split(sep).join("/");
    const file = basename(rel);

    // README.de.md / README.en.md → README.md in the chosen language
    const readme = file.match(/^README\.(\w+)\.md$/);
    if (readme) {
      if (readme[1] !== lang) continue;
      rel = rel.slice(0, -file.length) + "README.md";
    }
    if (RENAMES[file]) rel = rel.slice(0, -file.length) + RENAMES[file];

    const target = join(targetDir, ...rel.split("/"));
    mkdirSync(dirname(target), { recursive: true });
    const ext = file.includes(".") ? file.slice(file.lastIndexOf(".")) : "";
    if (TEXT_EXTENSIONS.has(ext)) writeFileSync(target, render(readFileSync(source, "utf8"), { name, lang, theme }));
    else writeFileSync(target, readFileSync(source));
    written.push(rel);
  }
  return written;
}

function isEmptyDir(dir) {
  return readdirSync(dir).filter((entry) => entry !== ".git").length === 0;
}

async function main() {
  let options;
  try {
    options = parseArgs(process.argv.slice(2));
  } catch (error) {
    console.error(`\n  ${error.message}\n`);
    process.exit(1);
  }
  if (options.help) {
    console.log(HELP);
    return;
  }

  const name = options.name ?? (await ask("Resource name:", DEFAULT_NAME));
  const problem = validateName(name);
  if (problem) {
    console.error(`\n  ${problem}\n`);
    process.exit(1);
  }

  const targetDir = resolve(process.cwd(), name);
  if (existsSync(targetDir)) {
    if (!statSync(targetDir).isDirectory()) {
      console.error(`\n  "${name}" exists and is not a folder.\n`);
      process.exit(1);
    }
    if (!isEmptyDir(targetDir) && !options.force) {
      console.error(`\n  The folder "${name}" is not empty. Choose another name or pass --force to write into it.\n`);
      process.exit(1);
    }
  }

  scaffold(targetDir, { name, lang: options.lang, theme: options.theme });

  const de = options.lang === "de";
  const lines = de
    ? [
        `FiveM-Resource "${name}" erstellt${options.theme ? " (mit preui_theme-Bridge)" : ""}.`,
        "",
        "Nächste Schritte:",
        `  cd ${name}/web`,
        "  npm install",
        "  npm run dev      # im Browser mit Mock-Daten entwickeln",
        "  npm run build    # web/dist bauen, das lädt FiveM",
        "",
        "Dann den Resource-Ordner auf den Server kopieren und in server.cfg:",
        ...(options.theme ? ["  ensure preui_theme   # vor deiner Resource, siehe README"] : []),
        `  ensure ${name}`,
        "",
        `Im Spiel öffnet /${name} das Fenster, Esc schließt es.`,
      ]
    : [
        `Created the FiveM resource "${name}"${options.theme ? " (with the preui_theme bridge)" : ""}.`,
        "",
        "Next steps:",
        `  cd ${name}/web`,
        "  npm install",
        "  npm run dev      # develop in the browser with mock data",
        "  npm run build    # build web/dist, which FiveM loads",
        "",
        "Then copy the resource folder to your server and add to server.cfg:",
        ...(options.theme ? ["  ensure preui_theme   # before your resource, see the README"] : []),
        `  ensure ${name}`,
        "",
        `In game /${name} opens the window, Esc closes it.`,
      ];
  console.log(`\n${lines.map((line) => (line ? `  ${line}` : "")).join("\n")}\n`);
}

// Run as a CLI, but not when imported (tests import scaffold / parseArgs). realpath: npm links bins as symlinks.
function samePath(a, b) {
  const norm = (path) => {
    let real = path;
    try {
      real = realpathSync(path);
    } catch {}
    return process.platform === "win32" ? real.toLowerCase() : real;
  };
  return norm(a) === norm(b);
}
if (process.argv[1] && samePath(resolve(process.argv[1]), fileURLToPath(import.meta.url))) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
