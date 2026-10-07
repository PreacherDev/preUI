#!/usr/bin/env node
// preUI CLI — `npx preui init [file]` writes all design tokens into your project (like shadcn's globals.css);
// `npx preui check-version` stops a build when the installed @pre_scripts packages don't match package.json.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";

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
  npx preui init [file]       Write the design tokens to [file] (default: src/preui.css)
  npx preui check-version     Exit with an error when an installed @pre_scripts/* package doesn't match the version
                              in package.json (exact pins must be equal, ^ / ~ ranges satisfied) — use it as
                              "prebuild": "preui check-version"

Options:
  --force                     Overwrite an existing file
  --scheme dark|light|both    Colour scheme(s) to write (default: both)
                                both   dark on :root + light under [data-scheme="light"] (for <ThemeProvider>)
                                dark   only the dark tokens on :root
                                light  only the light tokens on :root
  --no-color-scheme           Leave out \`color-scheme\` (FiveM NUI: keeps the transparent iframe transparent)
`);
}

/** `1.2.3` → [1, 2, 3]; null for anything else. */
function parseVersion(text) {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(String(text).trim());
  return match ? match.slice(1).map(Number) : null;
}

/** Exact pins, `^` and `~` ranges (enough for the @pre_scripts packages); `null` = can't tell. */
function satisfies(installed, spec) {
  const have = parseVersion(installed);
  const range = String(spec).trim();
  const operator = range[0] === "^" || range[0] === "~" ? range[0] : "";
  const want = parseVersion(operator ? range.slice(1) : range);
  if (!have || !want) return null;
  const cmp = have[0] - want[0] || have[1] - want[1] || have[2] - want[2];
  if (!operator) return cmp === 0;
  if (cmp < 0) return false;
  if (operator === "~") return have[0] === want[0] && have[1] === want[1];
  // ^: below 1.0 the minor is the breaking part (^0.7.1 = 0.7.x), from 1.0 the major.
  return want[0] === 0 ? have[0] === 0 && have[1] === want[1] : have[0] === want[0];
}

function checkVersion() {
  const cwd = process.cwd();
  let pkg;
  try {
    pkg = JSON.parse(readFileSync(join(cwd, "package.json"), "utf8"));
  } catch {
    console.error("✖ No package.json in " + cwd);
    process.exit(1);
  }
  const wanted = { ...pkg.dependencies, ...pkg.devDependencies };
  const names = Object.keys(wanted).filter((name) => name.startsWith("@pre_scripts/"));
  if (names.length === 0) {
    console.log("No @pre_scripts packages in package.json — nothing to check.");
    return;
  }
  let failed = false;
  for (const name of names) {
    const spec = wanted[name];
    let installed;
    try {
      installed = JSON.parse(readFileSync(join(cwd, "node_modules", ...name.split("/"), "package.json"), "utf8")).version;
    } catch {
      console.error(`✖ ${name}: not installed (package.json wants ${spec}) — run npm install`);
      failed = true;
      continue;
    }
    const ok = satisfies(installed, spec);
    if (ok === false) {
      console.error(`✖ ${name}: installed ${installed}, package.json wants ${spec} — run npm install`);
      failed = true;
    } else {
      console.log(`✔ ${name} ${installed}${ok === null ? ` (range "${spec}" not checked)` : ""}`);
    }
  }
  if (failed) process.exit(1);
}

if (command === "check-version") {
  checkVersion();
  process.exit(0);
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
