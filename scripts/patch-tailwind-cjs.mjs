// Makes the CommonJS build of the Tailwind preset usable as `presets: [require("@pre_scripts/preui/tailwind")]`
// (run after tsdown).
//
// tsdown emits a regular CJS module (`exports.default = preset`, `exports.createPreuiPreset = …`), so a plain
// `require()` returns the module object, which is not a preset. Tailwind v3 calls presets that are functions
// (`preset instanceof Function ? preset() : preset`), so `module.exports` becomes a function that returns the
// default preset, with every named export (and `default`) attached as a property:
//
//   presets: [require("@pre_scripts/preui/tailwind")]                        // works (called by Tailwind)
//   const { createPreuiPreset, tokens } = require("@pre_scripts/preui/tailwind") // works
//   require("@pre_scripts/preui/tailwind").default                            // the preset object
//
// `__esModule` stays set, so bundlers / jiti keep mapping `import preui from …` to `default`.
import { readFileSync, writeFileSync } from "node:fs";

const file = new URL("../dist/tailwind.cjs", import.meta.url);
const marker = "/* preui:callable-preset */";
const source = readFileSync(file, "utf8");

if (source.includes(marker)) {
  console.log("dist/tailwind.cjs already patched");
} else {
  const shim = `${marker}
(() => {
\tconst named = module.exports;
\tconst preset = function preuiPreset(options) {
\t\treturn named.createPreuiPreset(options);
\t};
\tfor (const key of Object.getOwnPropertyNames(named)) {
\t\tif (key === "__esModule") continue;
\t\tObject.defineProperty(preset, key, Object.getOwnPropertyDescriptor(named, key));
\t}
\tObject.defineProperty(preset, "__esModule", { value: true });
\tmodule.exports = preset;
})();
`;
  const mapComment = source.lastIndexOf("//# sourceMappingURL=");
  const patched =
    mapComment === -1 ? `${source}\n${shim}` : `${source.slice(0, mapComment)}${shim}\n${source.slice(mapComment)}`;
  writeFileSync(file, patched);
  console.log("dist/tailwind.cjs patched (callable preset)");
}
