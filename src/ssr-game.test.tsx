// SSR + hydration for the components added in 0.5 (game UI, layout, theming). Each one must render on the server
// without window / document / matchMedia and hydrate without a mismatch — e.g. in TanStack Start or Next.js.
import { describe, expect, it } from "vitest";
import {
  BentoCard,
  BentoCardContent,
  BentoCardTitle,
  BentoGrid,
  ContrastBadge,
  HudContainer,
  HudSpeedometer,
  HudStatus,
  HudStatusGroup,
  Kanban,
  KanbanCard,
  KanbanColumn,
  KanbanColumnContent,
  KanbanColumnHeader,
  KanbanColumnTitle,
  KeybindHint,
  KeybindHintBar,
  KeybindInput,
  ListMenu,
  ListMenuContent,
  ListMenuItem,
  ProgressCircle,
  RadialMenu,
  SkillCheck,
  ThemeProvider,
  Toaster,
  useWindowToggle,
} from ".";
import { renderToStringAndHydrate } from "./test-utils/ssr";

function Window() {
  const { open } = useWindowToggle({ defaultOpen: true, openKeys: ["F1"] });
  return open ? <p>Window open</p> : <KeybindHint keys="F1" label="Open" />;
}

function GameScreen() {
  return (
    <ThemeProvider storage={false} colorScheme={false} tokens={{ dark: { primary: "#f97316" }, shared: { radius: "4px" } }}>
      <Window />
      <BentoGrid columns={3}>
        <BentoCard colSpan={2}>
          <BentoCardContent>
            <BentoCardTitle>Garage</BentoCardTitle>
          </BentoCardContent>
        </BentoCard>
      </BentoGrid>
      <Kanban onCardMove={() => {}}>
        <KanbanColumn id="todo" label="Todo">
          <KanbanColumnHeader>
            <KanbanColumnTitle>Todo</KanbanColumnTitle>
          </KanbanColumnHeader>
          <KanbanColumnContent empty="Empty">
            <KanbanCard id="a">Order A</KanbanCard>
          </KanbanColumnContent>
        </KanbanColumn>
      </Kanban>
      <ListMenu keyboardTarget="window">
        <ListMenuContent aria-label="Garage">
          <ListMenuItem value="sultan">Karin Sultan</ListMenuItem>
          <ListMenuItem value="vigero" disabled>
            Declasse Vigero
          </ListMenuItem>
        </ListMenuContent>
      </ListMenu>
      <RadialMenu items={[{ id: "a", label: "Vehicle" }, { id: "b", label: "Person" }]} centerLabel="Interact" />
      <SkillCheck difficulty="easy" active={false} />
      <HudContainer anchor="bottom-left" offset={16}>
        <HudStatusGroup aria-label="Status">
          <HudStatus value={72} label="Health" criticalBelow={20} />
          <HudStatus value={40} label="Hunger" variant="bar" warnBelow={50} />
        </HudStatusGroup>
      </HudContainer>
      <HudSpeedometer speed={87} gear={3} fuel={60} ticks={10} redlineFrom={200} />
      <ProgressCircle value={35} showValue aria-label="Repair" />
      <KeybindHintBar>
        <KeybindHint keys="E" label="Interact" />
      </KeybindHintBar>
      <KeybindInput aria-label="Open menu" defaultValue={{ key: "f", code: "KeyF", shift: true }} />
      <ContrastBadge foreground="#ffffff" background="#000000" />
      <Toaster position="top-center" />
    </ThemeProvider>
  );
}

describe("SSR + hydration (0.5 components)", () => {
  it("renders the game UI and layout components on the server and hydrates without a mismatch", async () => {
    const result = await renderToStringAndHydrate(<GameScreen />);
    expect(result.errors).toEqual([]);
    for (const slot of [
      "bento-grid",
      "kanban",
      "kanban-card",
      "radial-menu",
      "skill-check",
      "hud-status",
      "progress-circle",
      "keybind-hint",
      "keybind-input",
      "contrast-badge",
    ]) {
      expect(result.html).toContain(`data-slot="${slot}"`);
    }
    expect(result.html).toContain("Window open");
    expect(result.html).toContain("Karin Sultan");
    // Runtime tokens are applied on the client only (a <style> in <head>), never during the server render.
    expect(result.html).not.toContain("preui-runtime-tokens");
    expect(document.getElementById("preui-runtime-tokens")?.textContent).toContain("--pui-radius: 4px;");
    result.unmount();
  });
});
