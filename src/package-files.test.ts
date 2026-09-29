// @vitest-environment node
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// npm only packs a LICENSE that lies in the package's own folder — the sub-packages need their own copy, or tools
// (and license checks in FiveM resources) warn that the package has none.
const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");

describe("package files", () => {
  it.each(["preui-nui", "create-preui-nui"])("packages/%s ships the same MIT LICENSE as preUI", (name) => {
    expect(read(`../packages/${name}/LICENSE`)).toBe(read("../LICENSE"));
    const pkg = JSON.parse(read(`../packages/${name}/package.json`)) as { license: string };
    expect(pkg.license).toBe("MIT");
  });
});
