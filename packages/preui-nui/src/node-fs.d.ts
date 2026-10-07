// The few `node:fs` / `node:path` functions the Vite plugin (vite.ts) uses — so the package needs no @types/node, which would
// also change browser types such as the return value of setTimeout.
declare module "node:fs" {
  export function existsSync(path: string): boolean;
  export function readFileSync(path: string, encoding: "utf8"): string;
  export function readdirSync(path: string): string[];
  export function writeFileSync(path: string, data: string): void;
  export function mkdirSync(path: string, options: { recursive: true }): void;
  export function unlinkSync(path: string): void;
}

declare module "node:path" {
  export function resolve(...paths: string[]): string;
}
