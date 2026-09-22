# Befehle & Abläufe

Alle Befehle im Ordner `G:\custom-ui-libraries\preUI-0.0.1` ausführen, sofern nicht anders angegeben.

---

## Tägliche Entwicklung

| Befehl              | Was passiert                                                    |
| ------------------- | --------------------------------------------------------------- |
| `npm install`       | Abhängigkeiten installieren (nach dem Klonen / nach `git pull`) |
| `npm run dev`       | Build im Watch-Modus: baut bei jeder Änderung in `src/` neu     |
| `npm run build`     | Einmaliger Build nach `dist/`                                   |
| `npm test`          | Alle Tests einmal ausführen                                     |
| `npm run test:watch`| Tests im Watch-Modus                                            |
| `npm run typecheck` | TypeScript-Fehler prüfen, ohne zu bauen                         |

---

## Neue Komponente anlegen

Die verbindlichen Regeln (API-Stil, Tokens, Zustände, Motion, Tests) stehen in **[COMPONENT_GUIDE.md](COMPONENT_GUIDE.md)**.
Base-UI-Doku liegt lokal unter `node_modules/@base-ui/react/docs/react/components/<name>.md`.

1. Ordner `src/components/<Name>/` anlegen mit `<Name>.tsx`, `<Name>.test.tsx`, `index.ts`
   (Vorlage: `src/components/Button/` oder `src/components/Popover/`)
2. In `src/index.ts` ergänzen: `export * from "./components/<Name>";`
3. Braucht die Komponente ein **internes Icon**:
   - Namen zu `IconName` in `src/icons/types.ts` hinzufügen
   - Default-SVG in `src/icons/defaults.tsx` und Mapping in `src/icons/adapters/lucide.tsx` ergänzen
   - In der Komponente: `const Icon = useIcon("<name>");`
4. Braucht sie **neue Farben/Tokens**: in `src/tailwind/preset.ts` ergänzen (Variable in `baseTokens`,
   Farbe in `theme.extend.colors.pui`).
   Neue Radius-/Schatten-/Schriftgrößen-Namen auch in `src/utils/cn.ts` (tailwind-merge) eintragen.
5. Demo anlegen: `preUI-playground/src/demos/<Name>Demo.tsx` mit `export function <Name>Demo()` –
   erscheint automatisch im Playground.
6. `npm run typecheck && npm test && npm run build`
7. Komponente in der README-Tabelle ergänzen.

**Komponente mit Fremd-Library** (wie Chart, Calendar, DataTable): nicht in `src/index.ts` exportieren, sondern
- eigenen Einstiegspunkt in `tsdown.config.ts` (`entry`) und in `package.json` (`exports`) anlegen,
- die Library als optionale Peer-Dependency eintragen (`peerDependencies` + `peerDependenciesMeta`) und als devDependency installieren,
- im Playground installieren und in `vite.config.ts` unter `resolve.dedupe` eintragen.

---

## Library im Playground testen

Playground liegt unter `G:custom-ui-librariespreUI-playground`.

- Jede Datei `src/demos/*Demo.tsx` erscheint automatisch (Seitenleiste + Abschnitt).
- Oben rechts: Icons (eingebaut / lucide) umschalten. Eigene Themes: Seite „Theme“ (`?page=theme`).
- Direktlink auf eine Komponente: `http://localhost:5173/#select`
- Fokus-Modus (nur eine Demo): `http://localhost:5173/?demo=select`
- `Toaster` und `TooltipProvider` sind in `src/App.tsx` bereits eingebunden.
- Charts animieren beim Laden; in Headless-Screenshots bleiben sie deshalb leer (kein `requestAnimationFrame`) – im Browser normal.

### Arbeiten mit beiden

Zwei Terminals:

```bash
# Terminal 1 – Library
cd G:custom-ui-librariespreUI-0.0.1
npm run dev

# Terminal 2 – Playground
cd G:custom-ui-librariespreUI-playground
npm run dev
```

Änderungen an der Library erscheinen dann direkt im Browser (http://localhost:5173).

### Checkliste im Browser

- Alle Komponenten sichtbar und farbig? (sonst: `content`-Pfad in `tailwind.config.js`)
- Schrift ist Inter? (sonst: `@pre_scripts/preui/fonts.css` in `src/main.tsx` importiert?)
- Hover nur Farbwechsel, Fokus-Ring per Tab-Taste sichtbar
- Popups öffnen mit Fade + Zoom, schließen per Escape und Klick daneben
- Theme-Umschalter ändert Flächen und Akzent
- Icons-Umschalter tauscht Chevrons, Häkchen, Spinner

### Einmalig einrichten (bereits erledigt)

Nur nötig, falls der Playground neu aufgesetzt wird. Im Playground-Ordner:

```bash
npm install ../preUI-0.0.1 lucide-react @fontsource-variable/inter @fontsource/jetbrains-mono
npm install recharts react-is react-day-picker embla-carousel-react cmdk react-resizable-panels react-hook-form @tanstack/react-table @tanstack/table-core
npm install shiki @codemirror/state @codemirror/view @codemirror/language @codemirror/commands @codemirror/language-data @codemirror/search @codemirror/autocomplete @lezer/highlight react-markdown remark-gfm @tiptap/core @tiptap/react @tiptap/pm @tiptap/starter-kit @tiptap/markdown @tiptap/extensions
npm install -D tailwindcss@^3 postcss autoprefixer
npx tailwindcss init -p
```

`tailwind.config.js`:

```js
import preui from "@pre_scripts/preui/tailwind";

export default {
  presets: [preui],
  content: [
    "./index.html",
    "./src/**/*.{ts,tsx}",
    "./node_modules/@pre_scripts/preui/dist/**/*.{js,cjs}",
  ],
};
```

`src/index.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  body {
    @apply bg-pui-backdrop font-sans text-sm text-pui-foreground antialiased;
  }
}
```

`src/main.tsx`: `import '@pre_scripts/preui/fonts.css'` vor `./index.css`.

`vite.config.ts`:

```ts
export default defineConfig({
  plugins: [react()],
  // eine Instanz je Library, sonst brechen React-Contexts (react-hook-form, recharts …)
  resolve: { dedupe: ["react", "react-dom", "recharts", "react-day-picker", "embla-carousel-react", "cmdk", "react-resizable-panels", "react-hook-form", "@tanstack/react-table", "@codemirror/state", "@codemirror/view", "@codemirror/language", "@lezer/highlight", "@lezer/common", "@lezer/lr", "@tiptap/core", "@tiptap/pm", "@tiptap/react", "react-markdown", "shiki"] },
  server: { fs: { allow: [".."] } },          // Schriftdateien aus ../preUI-0.0.1 im Dev-Modus erlauben
});
```

---

## Theming / Design-Tokens

| Was | Wie |
|---|---|
| Tokens als eigene Datei (wie shadcn) | Im Nutzer-Projekt: `npx preui init` → `src/preui.css`, dazu `createPreuiPreset({ injectTokens: false })` |
| Neues Token einführen | In `src/tailwind/preset.ts` in `baseTokens` (ggf. Theme-Overrides) + Tailwind-Key in `theme.extend`; neue Klassennamen in `src/utils/cn.ts` (tailwind-merge) eintragen |
| Tokens ausprobieren | Playground `?page=theme` (Theme-Builder, CSS kopieren/herunterladen) |
| `tokens.css` | wird bei `npm run build` aus dem Preset erzeugt (`scripts/generate-tokens.mjs`) |

Regeln für Komponenten (Token-Klassen statt fester Werte, `data-slot` an jedem Teil): siehe COMPONENT_GUIDE.md.

---

## Git

```bash
git status                     # was hat sich geändert?
git add .
git commit -m "feat: add Input component"
git push
```

Commit-Präfixe (Konvention):
- `feat:` neue Funktion / Komponente
- `fix:` Bugfix
- `docs:` nur Doku
- `chore:` Tooling, Abhängigkeiten, Config
- `refactor:` Umbau ohne Verhaltensänderung

---

## Auf npm veröffentlichen

### Einmalig

1. Account auf https://www.npmjs.com anlegen, **2FA aktivieren**
2. `npm login`
3. Prüfen: `npm whoami`

### Vor jeder Veröffentlichung

```bash
git status                 # alles committet?
npm pack --dry-run         # nur dist/, package.json, readme.md, LICENSE?
npx publint                # Package-Struktur prüfen
```

Optional: das echte Paket im Playground testen

```bash
npm pack                                            # erzeugt pre_scripts-preui-<version>.tgz
cd ../preUI-playground
npm install ../preUI-0.0.1/pre_scripts-preui-<version>.tgz
# testen, danach wieder auf den lokalen Ordner umstellen:
npm install ../preUI-0.0.1
```

Die `.tgz`-Datei danach löschen (nicht committen).

### Veröffentlichen

```bash
npm version patch          # oder minor / major – siehe unten
git push --follow-tags
npm publish
```

`npm publish` führt vorher automatisch Typecheck, Tests und Build aus (`prepublishOnly`). Schlägt einer fehl, wird nichts veröffentlicht.

### Welche Version?

| Befehl              | Beispiel        | Wann                                           |
| ------------------- | --------------- | ---------------------------------------------- |
| `npm version patch` | 0.1.0 → 0.1.1   | Bugfix, nichts ändert sich für Nutzer          |
| `npm version minor` | 0.1.0 → 0.2.0   | Neue Komponente / neue Props                   |
| `npm version major` | 0.9.0 → 1.0.0   | Breaking Change (Props entfernt/umbenannt, …)  |

Solange die Version mit `0.` beginnt, gilt die API als instabil – Breaking Changes sind dann auch per `minor` üblich.

### Wichtig

- Eine Versionsnummer kann **nie wieder** verwendet werden.
- `npm unpublish` geht nur innerhalb von 72 Stunden.
- Fehlerhafte Version lieber markieren: `npm deprecate @pre_scripts/preui@0.1.1 "Bitte 0.1.2 verwenden"`

---

## Wartung

```bash
npm outdated               # welche Abhängigkeiten sind veraltet?
npm update                 # innerhalb der erlaubten Versionsbereiche aktualisieren
npm audit                  # Sicherheitsprobleme anzeigen
```

### Offener Punkt: tsdown & TypeScript 7

Aktuell: tsdown 0.21 + TypeScript 6, weil tsdown ≥ 0.23 **Node ≥ 22.18** braucht.
Nach einem Node-Update:

```bash
node -v                                   # muss ≥ 22.18 sein
npm i -D tsdown@latest typescript@latest
npm run typecheck && npm test && npm run build
```

---

## Wenn etwas kaputt ist

| Problem                                   | Lösung                                                        |
| ----------------------------------------- | ------------------------------------------------------------- |
| Vitest: „Invalid Chai property: toHaveClass“ | Ordner mit kleinem Laufwerk (`g:…`) geöffnet → zwei Vitest-Instanzen. Terminal/VS Code mit `G:…` öffnen bzw. `cd G:/…` |
| Komische Build-/Typfehler                 | `dist/` und `node_modules/` löschen, `npm install`, neu bauen |
| Playground zeigt Komponente ohne Styling  | `content`-Pfad zu `node_modules/@pre_scripts/preui/dist` in `tailwind.config` prüfen |
| CodeMirror: „tags is not iterable“ / Editor ohne Farben | `@lezer/common` fehlt in `resolve.dedupe` (zweite Kopie) |
| „Invalid hook call“ im Playground         | `resolve.dedupe: ["react", "react-dom"]` in `vite.config.ts`  |
| Schrift fehlt im Playground (Dev)         | „outside of Vite serving allow list“ → `server.fs.allow: [".."]` in `vite.config.ts` |
| Dev-Server: „Port already in use“         | Alter Vite-Prozess läuft noch → Terminal schließen bzw. Prozess beenden |
| Playground zeigt alte Version             | Läuft `npm run dev` in der Library? Sonst `npm run build`     |
| Änderung am Preset (Farben, Scrollbars …) fehlt | Tailwind liest `tailwind.config` nur beim Start: Dev-Server des Playgrounds neu starten |
| `npm publish` → 403                       | Nicht eingeloggt (`npm login`) oder Version existiert schon   |
| 403 „Package name too similar“            | Name zu nah an bestehendem Package → Scoped Name nutzen (`@pre_scripts/…`, die npm-Org) |
| Scoped Package wird privat/abgelehnt      | `publishConfig.access: "public"` in `package.json` (ist gesetzt) oder `npm publish --access=public` |
