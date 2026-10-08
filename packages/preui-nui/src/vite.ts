// Vite plugin (build time, Node): writes the licenses of every npm package that ends up in the bundle next to it.
// Separate entry (`@pre_scripts/preui-nui/vite`) so none of this reaches the browser code.
import { existsSync, mkdirSync, readdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

export interface ThirdPartyLicensesOptions {
  /** Output file inside `outDir`; `false` writes none (e.g. with `dir`). @default "THIRD_PARTY_LICENSES.txt" */
  fileName?: string | false;
  /**
   * Also keep a licenses folder next to the project, relative to the Vite root (e.g. `"../LICENSES"` for a FiveM
   * resource whose UI is in `web/`): one `<scope>-<name>-LICENSE.txt` per package plus `THIRD_PARTY.md`. Files of
   * packages no longer bundled are removed; `*.manual.txt` and any other files are left alone.
   */
  dir?: string;
  /** First lines of the file, e.g. your resource name. */
  header?: string;
  /** Package names to leave out (e.g. your own workspace packages). */
  exclude?: string[];
  /**
   * Package names to list even when the plugin can't see them in the bundle (e.g. a font file copied by hand).
   * Fonts that a stylesheet references with `url()` are found by themselves.
   */
  include?: string[];
  /**
   * One block per license: the copyright lines of every package that uses it, then the license text once - instead
   * of the full text per package. Same legal content, a fraction of the length. @default true
   */
  group?: boolean;
  /**
   * Also write the file outside the build output, relative to the Vite root - e.g. `"../THIRD_PARTY_LICENSES.txt"`
   * for a FiveM resource whose UI is in `web/`, so the licenses sit next to `fxmanifest.lua`.
   */
  copyTo?: string;
}

export interface ThirdPartyPackage {
  name: string;
  version: string;
  license: string;
  /** LICENSE / LICENCE / COPYING file of the package, plus a NOTICE file when there is one (Apache-2.0). */
  text: string;
  /** The NOTICE file alone (Apache-2.0); kept per package when licenses are grouped. */
  notice?: string;
}

/** `@base-ui/react` → `base-ui-react-LICENSE.txt` */
export function licenseFileName(packageName: string): string {
  return `${packageName.replace(/^@/, "").replace(/\//g, "-")}-LICENSE.txt`;
}

/** The overview of a licenses folder: one table row per package, linking its license file. */
export function renderThirdPartyMarkdown(packages: ThirdPartyPackage[]): string {
  const rows = [...packages]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((pkg) => `| ${pkg.name} | ${pkg.version} | ${pkg.license} | [${licenseFileName(pkg.name)}](${licenseFileName(pkg.name)}) |`);
  return [
    "# Third-party software",
    "",
    "The bundled user interface contains the following packages. Their licenses are in this folder.",
    "This file is generated on every build (`thirdPartyLicenses()` from `@pre_scripts/preui-nui/vite`).",
    "",
    "| Package | Version | License | File |",
    "|---|---|---|---|",
    ...rows,
    "",
  ].join("\n");
}

function writeLicensesDir(dir: string, packages: ThirdPartyPackage[]) {
  mkdirSync(dir, { recursive: true });
  const keep = new Set(packages.map((pkg) => licenseFileName(pkg.name)));
  for (const file of readdirSync(dir)) {
    // Only files this plugin writes; manual licenses (`*-LICENSE.manual.txt`) and anything else stay.
    if (file.endsWith("-LICENSE.txt") && !keep.has(file)) unlinkSync(`${dir}/${file}`);
  }
  for (const pkg of packages) {
    const text = pkg.text || `(no license file in the package; license: ${pkg.license})`;
    writeFileSync(`${dir}/${licenseFileName(pkg.name)}`, `${text}\n`);
  }
  writeFileSync(`${dir}/THIRD_PARTY.md`, renderThirdPartyMarkdown(packages));
}

/** Minimal shapes of Rollup / Rolldown output (both bundlers Vite uses) — no dependency on their types. */
interface OutputChunk {
  type: "chunk";
  moduleIds?: readonly string[];
  modules?: Record<string, unknown>;
}
interface OutputAsset {
  type: "asset";
  /** Source files of an emitted asset, e.g. a font a stylesheet references with `url()` (Vite 6+ / Rollup 4.32+). */
  originalFileNames?: readonly string[];
  originalFileName?: string | null;
}
interface PluginContext {
  emitFile(file: { type: "asset"; fileName: string; source: string }): string;
}

const LICENSE_FILE = /^(licen[cs]e|copying)(\.(md|txt|markdown))?$/i;
const NOTICE_FILE = /^notice(\.(md|txt))?$/i;

/** `…/node_modules/@scope/name/dist/x.js` → `…/node_modules/@scope/name` (the innermost node_modules wins). */
export function packageRootOf(moduleId: string): string | null {
  const id = moduleId.replace(/^\0+/, "").split("?")[0].replace(/\\/g, "/");
  const marker = "/node_modules/";
  const at = id.lastIndexOf(marker);
  if (at < 0) return null;
  const rest = id.slice(at + marker.length).split("/");
  const segments = rest[0]?.startsWith("@") ? 2 : 1;
  if (rest.length <= segments) return null;
  return id.slice(0, at + marker.length) + rest.slice(0, segments).join("/");
}

function readPackage(root: string): ThirdPartyPackage | null {
  try {
    const pkg = JSON.parse(readFileSync(`${root}/package.json`, "utf8")) as {
      name?: string;
      version?: string;
      license?: unknown;
      licenses?: { type?: string }[];
    };
    if (!pkg.name) return null;
    const files = readdirSync(root);
    const read = (pattern: RegExp) => {
      const file = files.find((name) => pattern.test(name));
      return file && existsSync(`${root}/${file}`) ? readFileSync(`${root}/${file}`, "utf8").trim() : "";
    };
    const license =
      typeof pkg.license === "string"
        ? pkg.license
        : (pkg.licenses?.map((entry) => entry.type).filter(Boolean).join(" OR ") ?? "") || "UNKNOWN";
    const notice = read(NOTICE_FILE);
    const text = [read(LICENSE_FILE), notice].filter(Boolean).join("\n\n");
    return { name: pkg.name, version: pkg.version ?? "", license, text, ...(notice ? { notice } : {}) };
  } catch {
    return null;
  }
}

/** The text file for a list of packages (sorted by name). */
export function renderThirdPartyLicenses(packages: ThirdPartyPackage[], header?: string): string {
  const line = "-".repeat(80);
  const sorted = [...packages].sort((a, b) => a.name.localeCompare(b.name));
  const blocks = sorted.map((pkg) =>
    [line, `${pkg.name}@${pkg.version} — ${pkg.license}`, line, pkg.text || `(no license file in the package; license: ${pkg.license})`].join("\n"),
  );
  const intro =
    header ??
    "Third-party software bundled into this user interface, with its licenses.\nGenerated at build time from the modules in the bundle.";
  return `${intro}\n\n${blocks.join("\n\n")}\n`;
}

const COPYRIGHT_LINE = /^\s*(copyright\b|\(c\)|©)/i;

/** A license text split into its copyright lines and the rest (the part that is the same for every MIT package). */
function splitLicense(text: string): { copyright: string[]; body: string } {
  const copyright: string[] = [];
  const body: string[] = [];
  for (const line of text.split(/\r?\n/)) (COPYRIGHT_LINE.test(line) ? copyright : body).push(line.trim());
  return { copyright, body: body.join("\n").replace(/\n{3,}/g, "\n\n").trim() };
}

/**
 * The grouped file: one block per distinct license text, listing the packages and their copyright lines, then the
 * text once. Apache-2.0 NOTICE files stay with their package.
 */
export function renderGroupedLicenses(packages: ThirdPartyPackage[], header?: string): string {
  const line = "=".repeat(80);
  const groups = new Map<string, { license: string; body: string; members: { pkg: ThirdPartyPackage; copyright: string[] }[] }>();
  for (const pkg of [...packages].sort((a, b) => a.name.localeCompare(b.name))) {
    const licenseText = pkg.notice ? pkg.text.slice(0, pkg.text.lastIndexOf(pkg.notice)).trim() : pkg.text;
    const { copyright, body } = splitLicense(licenseText);
    const key = `${pkg.license}\n${body.replace(/\s+/g, " ")}`;
    const group = groups.get(key) ?? { license: pkg.license, body, members: [] };
    group.members.push({ pkg, copyright });
    groups.set(key, group);
  }
  const blocks = [...groups.values()]
    .sort((a, b) => b.members.length - a.members.length || a.license.localeCompare(b.license))
    .map((group) => {
      const members = group.members.flatMap(({ pkg, copyright }) => [
        `${pkg.name} ${pkg.version}`,
        ...copyright.map((entry) => `  ${entry}`),
        ...(pkg.notice ? ["  NOTICE:", ...pkg.notice.split(/\r?\n/).map((entry) => `  ${entry}`)] : []),
      ]);
      const text = group.body || `(no license file in the package; license: ${group.license})`;
      return [line, group.license, line, "", ...members, "", text].join("\n");
    });
  const intro =
    header ??
    "Third-party software in this user interface. Each block lists the packages under one license with their\ncopyright notices, followed by the license text.";
  return `${intro}\n\n${blocks.join("\n\n")}\n`;
}

/**
 * Writes `THIRD_PARTY_LICENSES.txt` into the build output: name, version, license and license text of every npm
 * package whose code is in the bundle (React, Base UI, preUI … — only what you actually import) and of fonts
 * imported via CSS (`@fontsource/*`, OFL). MIT / ISC / Apache-2.0 / OFL ask for exactly that when the code is passed
 * on — and a NUI's `web/dist` is passed to every player.
 *
 * ```ts
 * // web/vite.config.ts
 * import { thirdPartyLicenses } from "@pre_scripts/preui-nui/vite";
 * export default defineConfig({ plugins: [react(), thirdPartyLicenses()] });
 * ```
 */
export function thirdPartyLicenses(options: ThirdPartyLicensesOptions = {}) {
  const { fileName = "THIRD_PARTY_LICENSES.txt", header, exclude = [], include = [], group = true, copyTo, dir } = options;
  let root = ".";
  return {
    name: "preui-third-party-licenses",
    apply: "build" as const,
    configResolved(config: { root: string }) {
      root = config.root;
    },
    generateBundle(this: PluginContext, _options: unknown, bundle: Record<string, OutputChunk | OutputAsset>) {
      const roots = new Set<string>();
      for (const item of Object.values(bundle)) {
        // Assets: fonts and images a stylesheet pulls in with url(); their source path is relative to the root.
        const ids =
          item.type === "chunk"
            ? (item.moduleIds ?? Object.keys(item.modules ?? {}))
            : [...(item.originalFileNames ?? []), ...(item.originalFileName ? [item.originalFileName] : [])].map(
                (file) => (/^([A-Za-z]:)?[\\/]/.test(file) ? file : `${root}/${file}`),
              );
        for (const id of ids) {
          const packageRoot = packageRootOf(id);
          if (packageRoot) roots.add(packageRoot);
        }
      }
      for (const name of include) roots.add(resolve(root, "node_modules", name));
      const packages = new Map<string, ThirdPartyPackage>();
      for (const root of roots) {
        const pkg = readPackage(root);
        if (pkg && !exclude.includes(pkg.name) && !packages.has(pkg.name)) packages.set(pkg.name, pkg);
      }
      const list = [...packages.values()];
      const source = group ? renderGroupedLicenses(list, header) : renderThirdPartyLicenses(list, header);
      if (fileName !== false) this.emitFile({ type: "asset", fileName, source });
      if (copyTo) {
        const target = resolve(root, copyTo);
        mkdirSync(resolve(target, ".."), { recursive: true });
        writeFileSync(target, source);
      }
      if (dir) writeLicensesDir(resolve(root, dir), list);
    },
  };
}
