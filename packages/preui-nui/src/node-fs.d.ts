// The few `node:fs` functions the Vite plugin (vite.ts) uses — so the package needs no @types/node, which would
// also change browser types such as the return value of setTimeout.
declare module "node:fs" {
  export function existsSync(path: string): boolean;
  export function readFileSync(path: string, encoding: "utf8"): string;
  export function readdirSync(path: string): string[];
}
