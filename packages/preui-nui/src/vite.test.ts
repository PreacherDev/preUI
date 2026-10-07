// @vitest-environment node
import { mkdirSync, readdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { licenseFileName, packageRootOf, renderThirdPartyLicenses, thirdPartyLicenses } from "./vite";

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
  it("licenseFileName flattens the scope", () => {
    expect(licenseFileName("@base-ui/react")).toBe("base-ui-react-LICENSE.txt");
    expect(licenseFileName("react")).toBe("react-LICENSE.txt");
  });

  it("dir keeps a LICENSES folder: one file per package, THIRD_PARTY.md, stale files removed, manual ones kept", () => {
    const root = new URL("../../../node_modules/", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
    const dir = `${root}.cache/preui-licenses-test/LICENSES`;
    mkdirSync(dir, { recursive: true });
    for (const file of readdirSync(dir)) unlinkSync(`${dir}/${file}`);
    writeFileSync(`${dir}/old-package-LICENSE.txt`, "stale");
    writeFileSync(`${dir}/flags-LICENSE.manual.txt`, "by hand");

    const plugin = thirdPartyLicenses({ fileName: false, dir: "LICENSES" });
    plugin.configResolved({ root: `${root}.cache/preui-licenses-test` });
    const emitted: unknown[] = [];
    plugin.generateBundle.call(
      { emitFile: (file) => (emitted.push(file), "id") },
      {},
      { "index.js": { type: "chunk", moduleIds: [`${root}react/index.js`, `${root}@floating-ui/utils/dist/floating-ui.utils.mjs`] } },
    );
    expect(emitted).toHaveLength(0); // fileName: false
    const files = readdirSync(dir).sort();
    expect(files).toEqual(["THIRD_PARTY.md", "flags-LICENSE.manual.txt", "floating-ui-utils-LICENSE.txt", "react-LICENSE.txt"]);
    expect(readFileSync(`${dir}/react-LICENSE.txt`, "utf8")).toContain("MIT License");
    const overview = readFileSync(`${dir}/THIRD_PARTY.md`, "utf8");
    expect(overview).toMatch(/^\| @floating-ui\/utils \| \S+ \| MIT \| \[floating-ui-utils-LICENSE\.txt\]\(floating-ui-utils-LICENSE\.txt\) \|$/m);
    expect(overview.indexOf("@floating-ui/utils")).toBeLessThan(overview.indexOf("| react |"));
  });
});
