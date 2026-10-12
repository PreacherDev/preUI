import {
  Badge,
  Button,
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemTitle,
  ScrollArea,
  Spinner,
  ThemeProvider,
  TooltipProvider,
  useIcon,
} from "@pre_scripts/preui";
import {
  NuiTextsProvider,
  NuiThemeBridge,
  NuiToastRelay,
  fetchNui,
  useNuiLocale,
  useNuiMoney,
  useNuiTexts,
  useNuiVisibility,
} from "@pre_scripts/preui-nui";
import { useEffect, useState } from "react";
import devTexts from "./dev-texts.json";

interface ShopItem {
  id: number;
  label: string;
  price: number;
  stock: number;
}

/** What the `getData` NUI callback in client/main.lua returns. */
interface ShopData {
  items: ShopItem[];
}

/** Returned by fetchNui in a normal browser (npm run dev), where there is no Lua. */
const mockData: ShopData = {
  items: [
    { id: 1, label: "Water bottle", price: 5, stock: 42 },
    { id: 2, label: "Sandwich", price: 12, stock: 1 },
    { id: 3, label: "First aid kit", price: 150, stock: 0 },
  ],
};

export function App() {
  // Language, texts, currency and theme come from pre_lib (client_script '@pre_lib/nui_bridge.lua')
  const { locale } = useNuiLocale();

  return (
    // Texts come from locales/*.lua through pre_lib, so servers can change them without building the UI.
    // dev-texts.json (exported from locales/en.lua) is the fallback for npm run dev.
    <NuiTextsProvider fallback={devTexts} locale={locale}>
      {/* storage={false}: the theme comes from pre_lib. colorScheme={false} keeps the NUI page transparent. */}
      <ThemeProvider storage={false} colorScheme={false}>
        <NuiThemeBridge mock={{ v: 1, scheme: "dark" }} />
        <TooltipProvider>
          <Shop />
        </TooltipProvider>
        {/* FiveM draws the focused window above pre_lib's own UI, so pre_lib hands its notifications to this page */}
        <NuiToastRelay readyEvent="preLibNotifyReady" action="preLibNotify" />
      </ThemeProvider>
    </NuiTextsProvider>
  );
}

function Shop() {
  // Follows SendNUIMessage({ action = 'setVisible' }); Escape and close() hide it and call the `close` callback
  const { visible, close } = useNuiVisibility({ toggleKeys: ["F1"] });
  if (!visible) return null;
  return <ShopWindow onClose={close} />;
}

function ShopWindow({ onClose }: { onClose: () => void }) {
  const t = useNuiTexts();
  const { locale } = useNuiLocale();
  const money = useNuiMoney({ locale });
  const CloseIcon = useIcon("close");
  const [data, setData] = useState<ShopData | null>(null);
  const [buying, setBuying] = useState<number | null>(null);

  // Fresh data every time the window opens
  useEffect(() => {
    let active = true;
    fetchNui<ShopData>("getData", undefined, mockData)
      .then((result) => active && setData(result))
      .catch(() => active && setData({ items: [] }));
    return () => {
      active = false;
    };
  }, []);

  async function buy(item: ShopItem) {
    setBuying(item.id);
    try {
      await fetchNui("buy", { id: item.id }, { ok: true });
    } finally {
      setBuying(null);
    }
  }

  return (
    <div className="fixed inset-0 flex items-start justify-center p-4 pt-24">
      <section className="flex h-96 w-full max-w-md flex-col overflow-hidden rounded-pui-window border border-pui-border bg-pui-shell text-pui-foreground shadow-pui-window">
        <header className="flex min-h-12 items-center justify-between gap-2 border-b border-pui-border px-4 py-2">
          <h1 className="text-base font-semibold">{t("ui.title")}</h1>
          <Button variant="ghost" size="icon-sm" aria-label={t("ui.close")} onClick={onClose}>
            <CloseIcon />
          </Button>
        </header>
        {data === null ? (
          <div className="flex flex-1 items-center justify-center gap-2 text-sm text-pui-muted-foreground">
            <Spinner /> {t("ui.loading")}
          </div>
        ) : data.items.length === 0 ? (
          <p className="flex flex-1 items-center justify-center p-4 text-sm text-pui-muted-foreground">{t("ui.empty")}</p>
        ) : (
          <ScrollArea className="min-h-0 flex-1">
            <ItemGroup className="gap-1 p-2">
              {data.items.map((item) => (
                <Item key={item.id} size="sm" className="px-2">
                  <ItemContent>
                    <ItemTitle>{item.label}</ItemTitle>
                    <ItemDescription className="tabular-nums">{money.format(item.price)}</ItemDescription>
                  </ItemContent>
                  <ItemActions>
                    {item.stock > 0 ? (
                      <Badge variant="secondary" className="tabular-nums">
                        {t.plural("ui.stock", item.stock)}
                      </Badge>
                    ) : (
                      <Badge variant="destructive">{t("ui.sold_out")}</Badge>
                    )}
                    <Button
                      size="sm"
                      disabled={item.stock === 0 || (buying !== null && buying !== item.id)}
                      loading={buying === item.id}
                      onClick={() => void buy(item)}
                    >
                      {t("ui.buy")}
                    </Button>
                  </ItemActions>
                </Item>
              ))}
            </ItemGroup>
          </ScrollArea>
        )}
      </section>
    </div>
  );
}
