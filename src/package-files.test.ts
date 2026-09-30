/// <reference types="vite/client" />
// npm only packs a LICENSE that lies in the package's own folder — the sub-packages need their own copy, or tools
// (and license checks in FiveM resources) warn that the package has none.
import { describe, expect, it } from "vitest";

const files = import.meta.glob(["../LICENSE", "../packages/*/LICENSE", "../packages/*/package.json"], {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

describe("package files", () => {
  it.each(["preui-nui", "create-preui-nui"])("packages/%s ships the same MIT LICENSE as preUI", (name) => {
    expect(files["../LICENSE"]).toContain("MIT License");
    expect(files[`../packages/${name}/LICENSE`]).toBe(files["../LICENSE"]);
    const pkg = JSON.parse(files[`../packages/${name}/package.json`]) as { license: string };
    expect(pkg.license).toBe("MIT");
  });
});
