#!/usr/bin/env node
// preUI CLI — `npx preui init [file]` writes all design tokens into your project (like shadcn's globals.css).
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";

const [command, ...rest] = process.argv.slice(2);
const flags = new Set(rest.filter((arg) => arg.startsWith("--")));
const [target = "src/preui.css"] = rest.filter((arg) => !arg.startsWith("--"));

function help() {
  console.log(`preUI

Usage:
  npx preui init [file]    Write the design tokens to [file] (default: src/preui.css)

Options:
  --force        Overwrite an existing file
`);
}

if (command !== "init") {
  help();
  process.exit(command ? 1 : 0);
}

const file = resolve(process.cwd(), target);
if (existsSync(file) && !flags.has("--force")) {
  console.error(`✖ ${relative(process.cwd(), file)} exists — use --force to overwrite.`);
  process.exit(1);
}

const { tokensToCss } = await import("../dist/tailwind.js");
const css = tokensToCss({ header: true });

mkdirSync(dirname(file), { recursive: true });
writeFileSync(file, css);

const rel = relative(process.cwd(), file).replaceAll("\\", "/");
console.log(`✔ Wrote ${rel}

Next steps:
  1. Import it once, before Tailwind's layers or in your entry:   import "./${rel.replace(/^src\//, "")}";
  2. Stop the preset from injecting its own defaults (tailwind.config.js):

       const { createPreuiPreset } = require("@pre_scripts/preui/tailwind");
       module.exports = { presets: [createPreuiPreset({ injectTokens: false })], … };

  3. Change any value in ${rel} — every preUI component follows.
`);
