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
}

export interface ThirdPartyPackage {
  name: string;
  version: string;
  license: string;
  /** LICENSE / LICENCE / COPYING file of the package, plus a NOTICE file when there is one (Apache-2.0). */
  text: string;
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
    const text = [read(LICENSE_FILE), read(NOTICE_FILE)].filter(Boolean).join("\n\n");
    return { name: pkg.name, version: pkg.version ?? "", license, text };
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
  const { fileName = "THIRD_PARTY_LICENSES.txt", header, exclude = [], dir } = options;
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
        if (item.type !== "chunk") continue;
        for (const id of item.moduleIds ?? Object.keys(item.modules ?? {})) {
          const root = packageRootOf(id);
          if (root) roots.add(root);
        }
      }
      const packages = new Map<string, ThirdPartyPackage>();
      for (const root of roots) {
        const pkg = readPackage(root);
        if (pkg && !exclude.includes(pkg.name) && !packages.has(pkg.name)) packages.set(pkg.name, pkg);
      }
      const list = [...packages.values()];
      if (fileName !== false) this.emitFile({ type: "asset", fileName, source: renderThirdPartyLicenses(list, header) });
      if (dir) writeLicensesDir(resolve(root, dir), list);
    },
  };
}
