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
    expect(parseArgs(["x", "--", "--no-theme", "--lang=en", "--force"])).toEqual({
      name: "x",
      lang: "en",
      theme: false,
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
