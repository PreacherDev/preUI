// @vitest-environment node
import { describe, expect, it } from "vitest";
import { packageRootOf, renderThirdPartyLicenses, thirdPartyLicenses } from "./vite";

describe("thirdPartyLicenses", () => {
  it("finds the package root of a module id", () => {
    expect(packageRootOf("/app/node_modules/react/cjs/react.production.js")).toBe("/app/node_modules/react");
    expect(packageRootOf(String.raw`C:\app\node_modules\@base-ui\react\menu\MenuRoot.mjs`)).toBe(
      "C:/app/node_modules/@base-ui/react",
    );
    expect(packageRootOf("\0/app/node_modules/a/node_modules/b/index.js?commonjs-es-import")).toBe("/app/node_modules/a/node_modules/b");
    expect(packageRootOf("/app/src/main.tsx")).toBeNull();
    expect(packageRootOf("/app/node_modules/react")).toBeNull();
  });

  it("renders a sorted file with name, version, license and text", () => {
    const text = renderThirdPartyLicenses([
      { name: "zeta", version: "1.0.0", license: "MIT", text: "MIT License\nCopyright Z" },
      { name: "@scope/alpha", version: "2.0.0", license: "Apache-2.0", text: "" },
    ]);
    expect(text.indexOf("@scope/alpha@2.0.0 — Apache-2.0")).toBeLessThan(text.indexOf("zeta@1.0.0 — MIT"));
    expect(text).toContain("Copyright Z");
    expect(text).toContain("(no license file in the package; license: Apache-2.0)");
  });

  it("emits the file for the packages of the bundled modules (this repo's own node_modules)", () => {
    const root = new URL("../../../node_modules/", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
    const emitted: { fileName: string; source: string }[] = [];
    const plugin = thirdPartyLicenses({ exclude: ["clsx"] });
    plugin.generateBundle.call(
      { emitFile: (file) => (emitted.push(file), "id") },
      {},
      {
        "index.js": {
          type: "chunk",
          moduleIds: [
            `${root}react/index.js`,
            `${root}react/cjs/react.production.js`,
            `${root}class-variance-authority/dist/index.mjs`,
            `${root}clsx/dist/clsx.mjs`,
            "/app/src/main.tsx",
          ],
        },
        "index.css": { type: "asset" },
      },
    );
    expect(emitted).toHaveLength(1);
    expect(emitted[0].fileName).toBe("THIRD_PARTY_LICENSES.txt");
    const source = emitted[0].source;
    expect(source).toMatch(/^class-variance-authority@\S+ — Apache-2.0$/m);
    expect(source).toMatch(/^react@\S+ — MIT$/m);
    expect(source).toContain("Copyright (c) Meta Platforms");
    expect(source).not.toContain("clsx@");
    expect(source.match(/^react@/gm)).toHaveLength(1);
  });
});
