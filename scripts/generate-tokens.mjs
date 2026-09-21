// Writes dist/tokens.css from the preset's token objects (run after tsdown).
import { writeFileSync } from "node:fs";

const { tokensToCss } = await import("../dist/tailwind.js");

writeFileSync(new URL("../dist/tokens.css", import.meta.url), tokensToCss({ header: true }));
console.log("dist/tokens.css written");
