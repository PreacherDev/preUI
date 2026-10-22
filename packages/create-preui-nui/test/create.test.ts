// @vitest-environment node
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
// @ts-ignore -- plain .mjs without type declarations
import { parseArgs, resolveBlocks, validateName } from "../bin/create.mjs";

const BIN = fileURLToPath(new URL("../bin/create.mjs", import.meta.url));

let cwd: string;
beforeEach(() => {
  cwd = mkdtempSync(join(tmpdir(), "create-preui-nui-"));
});
afterEach(() => {
  rmSync(cwd, { recursive: true, force: true });
});

function run(args: string[], input = "") {
  return spawnSync(process.execPath, [BIN, ...args], { cwd, input, encoding: "utf8" });
}
const read = (...parts: string[]) => readFileSync(join(cwd, ...parts), "utf8");

describe("create-preui-nui", () => {
  it("scaffolds a resource with the name replaced everywhere", () => {
    const result = run(["my-shop"]);
    expect(result.status, result.stderr).toBe(0);

    for (const file of [
      "fxmanifest.lua",
      "client.lua",
      "README.md",
      ".gitignore",
      "web/package.json",
      "web/vite.config.ts",
      "web/tailwind.config.js",
      "web/postcss.config.js",
      "web/tsconfig.json",
      "web/index.html",
      "web/src/main.tsx",
      "web/src/App.tsx",
      "web/src/index.css",
    ]) {
      expect(existsSync(join(cwd, "my-shop", file)), file).toBe(true);
    }
    expect(existsSync(join(cwd, "my-shop", "_gitignore"))).toBe(false);
    expect(existsSync(join(cwd, "my-shop", "README.de.md"))).toBe(false);
    expect(existsSync(join(cwd, "my-shop", "README.en.md"))).toBe(false);

    const manifest = read("my-shop", "fxmanifest.lua");
    expect(manifest).toContain("name 'my-shop'");
    expect(manifest).toContain("ui_page 'web/dist/index.html'");
    expect(manifest).toContain("dependency 'preui_theme'");
    expect(manifest).toContain("client_script '@preui_theme/bridge.lua'");
    expect(read("my-shop", "client.lua")).toContain("RegisterCommand('my-shop'");
    expect(JSON.parse(read("my-shop", "web", "package.json")).name).toBe("my-shop-web");
    expect(read("my-shop", ".gitignore")).toContain("web/dist/");

    // No placeholder or marker left anywhere
    for (const file of ["fxmanifest.lua", "client.lua", "README.md", "web/index.html", "web/src/App.tsx"]) {
      const text = read("my-shop", file);
      expect(text, file).not.toMatch(/__NAME__|__T_[A-Z0-9_]+__|@preui-(no-)?theme:/);
    }

    const app = read("my-shop", "web", "src", "App.tsx");
    expect(app).toContain("<NuiThemeBridge");
    expect(app).toContain("storage={false}");
    expect(app).toContain('fetchNui<ShopData>("getData", undefined, mockData)');
    expect(app).toContain('label="Schließen"'); // German by default
    expect(read("my-shop", "README.md")).toContain("## Stolperfallen in FiveM");
    expect(result.stdout).toContain("ensure my-shop");
    expect(result.stdout).toContain("/my-shop");
  });

  it("--no-theme removes the bridge include and NuiThemeBridge", () => {
    const result = run(["plain", "--no-theme"]);
    expect(result.status, result.stderr).toBe(0);
    const manifest = read("plain", "fxmanifest.lua");
    expect(manifest).not.toContain("preui_theme");
    expect(manifest).toContain("client_script 'client.lua'");
    const app = read("plain", "web", "src", "App.tsx");
    expect(app).not.toContain("NuiThemeBridge");
    expect(app).toContain("useNuiVisibility");
    expect(read("plain", "README.md")).not.toContain("preui_theme");
    expect(result.stdout).not.toContain("preui_theme");
  });

  it("--exact pins the @pre_scripts packages; prebuild checks the installed versions", () => {
    const result = run(["pinned", "--exact"]);
    expect(result.status, result.stderr).toBe(0);
    const pkg = JSON.parse(read("pinned", "web", "package.json")) as {
      scripts: Record<string, string>;
      dependencies: Record<string, string>;
    };
    expect(pkg.dependencies["@pre_scripts/preui"]).toMatch(/^\d+\.\d+\.\d+$/);
    expect(pkg.dependencies["@pre_scripts/preui-nui"]).toMatch(/^\d+\.\d+\.\d+$/);
    expect(pkg.dependencies.react).toMatch(/^\^/); // only the @pre_scripts packages
    expect(pkg.scripts.prebuild).toBe("preui check-version");
  });

  it("--lang en writes English texts and README", () => {
    const result = run(["shop_en", "--", "--lang", "en"]);
    expect(result.status, result.stderr).toBe(0);
    const app = read("shop_en", "web", "src", "App.tsx");
    expect(app).toContain('label="Close"');
    expect(app).not.toContain("Schließen");
    expect(read("shop_en", "README.md")).toContain("## Things to know in FiveM");
    expect(read("shop_en", "web", "index.html")).toContain('<html lang="en"');
    expect(result.stdout).toContain("Next steps");
  });

  it("--pre-lib writes a resource wired to pre_lib", () => {
    const result = run(["pre_demo", "--pre-lib", "--exact"]);
    expect(result.status, result.stderr).toBe(0);

    const root = join(cwd, "pre_demo");
    for (const file of [
      "fxmanifest.lua",
      "config.lua",
      "client/main.lua",
      "locales/en.lua",
      "locales/de.lua",
      "locales/fr.lua",
      "README.md",
      "DEVELOPMENT.md",
      "CHANGELOG.md",
      ".gitignore",
      ".gitattributes",
      ".luarc.json",
      "web/package.json",
      "web/vite.config.ts",
      "web/src/App.tsx",
      "web/src/main.tsx",
      "web/src/index.css",
      "web/src/dev-texts.json",
    ]) {
      expect(existsSync(join(root, file)), file).toBe(true);
    }
    for (const file of ["client.lua", "_gitignore", "_gitattributes", "_luarc.json", "README.en.md"]) {
      expect(existsSync(join(root, file)), file).toBe(false);
    }

    const manifest = read("pre_demo", "fxmanifest.lua");
    expect(manifest).toContain("name('pre_demo')");
    expect(manifest).toContain("version('1.0.0-beta.1')");
    expect(manifest).toContain("dependency('pre_lib')");
    expect(manifest).toContain("pre_lib_min_version('1.5.0')");
    expect(manifest).toContain("'@pre_lib/init.lua'");
    expect(manifest).toContain("'@pre_lib/nui_bridge.lua'");
    expect(manifest).toContain("'client/main.lua'");
    expect(manifest).toContain("'locales/*.lua'");
    expect(manifest).not.toContain("preui_theme");

    // web/dist ships with the resource, release output never does
    const gitignore = read("pre_demo", ".gitignore");
    expect(gitignore).not.toMatch(/^web\/dist\/?$/m);
    expect(gitignore).toMatch(/^release\/$/m);

    const pkg = JSON.parse(read("pre_demo", "web", "package.json")) as {
      version: string;
      scripts: Record<string, string>;
      dependencies: Record<string, string>;
    };
    const exportTexts = "node ../../pre_lib/tools/export-ui-texts.mjs ../locales/en.lua src/dev-texts.json";
    expect(pkg.version).toBe("1.0.0-beta.1");
    expect(pkg.scripts.dev).toBe(`${exportTexts} && vite`);
    expect(pkg.scripts.prebuild).toBe(`preui check-version && ${exportTexts}`);
    expect(pkg.dependencies["@pre_scripts/preui"]).toMatch(/^\d+\.\d+\.\d+$/);

    expect(read("pre_demo", "web", "vite.config.ts")).toContain('thirdPartyLicenses({ copyTo: "../THIRD_PARTY_LICENSES.txt" })');

    const app = read("pre_demo", "web", "src", "App.tsx");
    for (const part of ["<NuiTextsProvider fallback={devTexts}", "<NuiThemeBridge", "useNuiMoney({ locale })", '<NuiToastRelay readyEvent="preLibNotifyReady" action="preLibNotify" />', "colorScheme={false}"]) {
      expect(app).toContain(part);
    }
    expect(read("pre_demo", "web", "src", "index.css")).toContain("--pui-ring-width: 0px !important");

    const readme = read("pre_demo", "README.md");
    const sections = [...readme.matchAll(/^## (.+)$/gm)].map((match) => match[1]);
    expect(sections).toEqual(["Requirements", "Installation", "Configuration", "Commands", "Updating", "Licenses"]);
    expect(readme).toContain("pre_lib 1.5.0 or newer");
    expect(readme).not.toMatch(/npm|web\/src/);
    expect(read("pre_demo", "DEVELOPMENT.md")).toContain("npm run build");

    for (const file of ["fxmanifest.lua", "config.lua", "client/main.lua", "README.md", "DEVELOPMENT.md", "web/src/App.tsx", "web/index.html"]) {
      expect(read("pre_demo", file), file).not.toMatch(/__NAME__|__T_[A-Z0-9_]+__|@preui-(no-)?theme:/);
    }
    expect(read("pre_demo", "web", "index.html")).toContain('<html lang="en"');
    expect(result.stdout).toContain("ensure pre_lib");
  });

  it("--pre-lib: code and comments are ASCII only, and import.meta.env has its types", () => {
    const result = run(["pre_demo", "--pre-lib"]);
    expect(result.status, result.stderr).toBe(0);
    expect(read("pre_demo", "web", "src", "vite-env.d.ts")).toContain('/// <reference types="vite/client" />');
    // The pre_ scripts allow only ASCII in code; texts live in locales/ (de / fr need their letters).
    for (const path of ["web/vite.config.ts", "web/tailwind.config.js", "web/src/index.css", "web/src/main.tsx", "web/src/App.tsx", "client/main.lua", "fxmanifest.lua", "config.lua"]) {
      const text = read("pre_demo", ...path.split("/"));
      expect([...text].filter((char) => char.charCodeAt(0) > 127), path).toEqual([]);
    }
  });

  it("--pre-lib refuses --no-theme", () => {
    const result = run(["pre_demo", "--pre-lib", "--no-theme"]);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("--pre-lib and --no-theme");
    expect(existsSync(join(cwd, "pre_demo"))).toBe(false);
  });

  it("asks for the name when none is given", () => {
    const result = run([], "asked-name\n");
    expect(result.status, result.stderr).toBe(0);
    expect(existsSync(join(cwd, "asked-name", "fxmanifest.lua"))).toBe(true);
  });

  it("uses the default name when the answer is empty", () => {
    const result = run([], "\n");
    expect(result.status, result.stderr).toBe(0);
    expect(existsSync(join(cwd, "my-nui", "fxmanifest.lua"))).toBe(true);
  });

  it("refuses a non-empty folder unless --force", () => {
    mkdirSync(join(cwd, "taken"));
    writeFileSync(join(cwd, "taken", "keep.txt"), "mine");

    const refused = run(["taken"]);
    expect(refused.status).toBe(1);
    expect(refused.stderr).toContain("not empty");
    expect(existsSync(join(cwd, "taken", "fxmanifest.lua"))).toBe(false);

    const forced = run(["taken", "--force"]);
    expect(forced.status, forced.stderr).toBe(0);
    expect(existsSync(join(cwd, "taken", "fxmanifest.lua"))).toBe(true);
    expect(read("taken", "keep.txt")).toBe("mine");
  });

  it("accepts an existing empty folder", () => {
    mkdirSync(join(cwd, "empty"));
    expect(run(["empty"]).status).toBe(0);
  });

  it.each(["My-Shop", "shop ui", "-shop", "_shop", "shop.ui", "shöp", "a/b"])("rejects the invalid name %j", (name) => {
    const result = run([name]);
    expect(result.status).toBe(1);
    expect(existsSync(join(cwd, name))).toBe(false);
  });

  it("rejects unknown options and languages", () => {
    expect(run(["shop", "--lang", "fr"]).stderr).toContain("--lang must be one of");
    expect(run(["shop", "--wat"]).stderr).toContain('Unknown option "--wat"');
    expect(existsSync(join(cwd, "shop"))).toBe(false);
  });
});

describe("template versions", () => {
  // The starter must not fall behind: a new resource starts on the current preUI / preui-nui minor. Below 1.0 the
  // caret keeps it on that minor (^0.6.2 = 0.6.x from 0.6.2), so patches still arrive.
  const version = (path: string) =>
    (JSON.parse(readFileSync(fileURLToPath(new URL(path, import.meta.url)), "utf8")) as { version: string }).version;
  const template = JSON.parse(readFileSync(fileURLToPath(new URL("../template/web/package.json", import.meta.url)), "utf8")) as {
    dependencies: Record<string, string>;
  };

  // ^0.9.0 covers 0.9.x: the range must be on the current minor and not ahead of the current version, so a patch
  // release of preUI needs no new starter, but a new minor does.
  const covers = (range: string, current: string) => {
    const [want, have] = [range.replace(/^\^/, ""), current].map((value) => value.split(".").map(Number));
    return range.startsWith("^") && want[0] === have[0] && want[1] === have[1] && want[2] <= have[2];
  };

  it("depends on the current @pre_scripts/preui and @pre_scripts/preui-nui (same minor)", () => {
    for (const [name, path] of [
      ["@pre_scripts/preui", "../../../package.json"],
      ["@pre_scripts/preui-nui", "../../preui-nui/package.json"],
    ] as const) {
      expect({ name, ok: covers(template.dependencies[name], version(path)) }).toEqual({ name, ok: true });
    }
  });
});

describe("--pre-lib template texts", () => {
  const file = (path: string) => readFileSync(fileURLToPath(new URL(`../template-pre-lib/${path}`, import.meta.url)), "utf8");

  /** Flat keys of a locale file (`return { ui = { title = '...' } }` → `ui.title`); enough for these files. */
  function localeKeys(source: string) {
    const keys: string[] = [];
    const path: string[] = [];
    for (const line of source.split("\n")) {
      const open = line.match(/^\s*(\w+)\s*=\s*\{\s*$/);
      const value = line.match(/^\s*(\w+)\s*=\s*['"]/);
      if (open) path.push(open[1]);
      else if (value) keys.push([...path, value[1]].join("."));
      else if (/^\s*\},?\s*$/.test(line)) path.pop();
    }
    return keys.sort();
  }

  const en = localeKeys(file("locales/en.lua"));

  it("de and fr have the same keys as en", () => {
    expect(en.length).toBeGreaterThan(0);
    expect(localeKeys(file("locales/de.lua"))).toEqual(en);
    expect(localeKeys(file("locales/fr.lua"))).toEqual(en);
  });

  it("dev-texts.json is the export of en.lua", () => {
    expect(Object.keys(JSON.parse(file("web/src/dev-texts.json"))).sort()).toEqual(en);
  });

  it("every text App.tsx and client/main.lua use exists", () => {
    const app = file("web/src/App.tsx");
    for (const [, key] of app.matchAll(/\bt\("([\w.]+)"/g)) expect(en, key).toContain(key);
    for (const [, key] of app.matchAll(/\bt\.plural\("([\w.]+)"/g)) expect(en, key).toContain(`${key}_other`);
    const lua = file("client/main.lua");
    for (const [, key] of lua.matchAll(/'((?:items|notify|ui)\.[\w.]+)'/g)) expect(en, key).toContain(key);
  });
});

describe("helpers", () => {
  it("validateName", () => {
    expect(validateName("my-shop")).toBeUndefined();
    expect(validateName("shop_2")).toBeUndefined();
    expect(validateName("9lives")).toBeUndefined();
    expect(validateName("")).toBeTruthy();
    expect(validateName("Shop")).toBeTruthy();
    expect(validateName("a".repeat(65))).toBeTruthy();
  });

  it("parseArgs", () => {
    expect(parseArgs(["x", "--", "--no-theme", "--lang=en", "--force", "--exact"])).toEqual({
      name: "x",
      lang: "en",
      theme: false,
      preLib: false,
      exact: true,
      force: true,
      help: false,
    });
    expect(() => parseArgs(["a", "b"])).toThrow("Unexpected argument");
  });

  it("resolveBlocks", () => {
    const text = ["a", "// @preui-theme:start", "theme", "// @preui-theme:end", "<!-- @preui-no-theme:start -->", "plain", "<!-- @preui-no-theme:end -->", "b"].join("\n");
    expect(resolveBlocks(text, { theme: true })).toBe("a\ntheme\nb");
    expect(resolveBlocks(text, { theme: false })).toBe("a\nplain\nb");
  });
});
