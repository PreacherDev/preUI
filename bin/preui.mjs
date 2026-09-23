#!/usr/bin/env node
// preUI CLI — `npx preui init [file]` writes all design tokens into your project (like shadcn's globals.css).
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";

const [command, ...args] = process.argv.slice(2);

// `--scheme light` and `--scheme=light` both work.
let scheme = "both";
let colorScheme = true;
const rest = [];
for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  if (arg === "--no-color-scheme") colorScheme = false;
  else if (arg === "--scheme") scheme = args[++i] ?? "";
  else if (arg.startsWith("--scheme=")) scheme = arg.slice("--scheme=".length);
  else rest.push(arg);
}
const flags = new Set(rest.filter((arg) => arg.startsWith("--")));
const [target = "src/preui.css"] = rest.filter((arg) => !arg.startsWith("--"));

function help() {
  console.log(`preUI

Usage:
  npx preui init [file]    Write the design tokens to [file] (default: src/preui.css)

Options:
  --force                     Overwrite an existing file
  --scheme dark|light|both    Colour scheme(s) to write (default: both)
                                both   dark on :root + light under [data-scheme="light"] (for <ThemeProvider>)
                                dark   only the dark tokens on :root
                                light  only the light tokens on :root
  --no-color-scheme           Leave out \`color-scheme\` (FiveM NUI: keeps the transparent iframe transparent)
`);
}

if (command !== "init") {
  help();
  process.exit(command ? 1 : 0);
}

if (!["dark", "light", "both"].includes(scheme)) {
  console.error(`✖ Unknown --scheme "${scheme}" — use dark, light or both.`);
  process.exit(1);
}

const file = resolve(process.cwd(), target);
if (existsSync(file) && !flags.has("--force")) {
  console.error(`✖ ${relative(process.cwd(), file)} exists — use --force to overwrite.`);
  process.exit(1);
}

const { tokensToCss } = await import("../dist/tailwind.js");
const css = tokensToCss({ header: true, scheme, colorScheme });

mkdirSync(dirname(file), { recursive: true });
writeFileSync(file, css);

const rel = relative(process.cwd(), file).replaceAll("\\", "/");
const what = scheme === "both" ? "dark + light tokens" : `${scheme} tokens`;
console.log(`✔ Wrote ${rel} (${what})

Next steps:
  1. Import it once, before Tailwind's layers or in your entry:   import "./${rel.replace(/^src\//, "")}";
  2. Stop the preset from injecting its own defaults (tailwind.config.js):

       const { createPreuiPreset } = require("@pre_scripts/preui/tailwind");
       module.exports = { presets: [createPreuiPreset({ injectTokens: false })], … };

  3. Change any value in ${rel} — every preUI component follows.
`);
