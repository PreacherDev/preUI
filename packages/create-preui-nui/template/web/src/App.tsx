import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemTitle,
  KeybindHint,
  KeybindHintBar,
  ScrollArea,
  Spinner,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  ThemeProvider,
} from "@pre_scripts/preui";
import {
  // @preui-theme:start
  NuiThemeBridge,
  // @preui-theme:end
  fetchNui,
  isEnvBrowser,
  useNuiVisibility,
} from "@pre_scripts/preui-nui";
import { useEffect, useState } from "react";

interface ShopItem {
  id: number;
  label: string;
  price: number;
  stock: number;
}

/** What the `getData` NUI callback in client.lua returns. */
interface ShopData {
  player: string;
  cash: number;
  items: ShopItem[];
}

/** Returned by fetchNui in a normal browser (npm run dev), where there is no Lua. */
const mockData: ShopData = {
  player: "__T_MOCK_PLAYER__",
  cash: 2500,
  items: [
    { id: 1, label: "__T_ITEM_1__", price: 5, stock: 42 },
    { id: 2, label: "__T_ITEM_2__", price: 12, stock: 8 },
    { id: 3, label: "__T_ITEM_3__", price: 150, stock: 0 },
    { id: 4, label: "__T_ITEM_4__", price: 400, stock: 3 },
  ],
};

const money = new Intl.NumberFormat("__T_LOCALE__", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

export function App() {
  // Follows SendNUIMessage({ action = 'setVisible' }); Escape / close() hide it and call the `close` callback.
  const { visible, setVisible, close } = useNuiVisibility();

  return (
    // storage={false}: every NUI resource has its own localStorage; the scheme comes from the code (or the server).
    <ThemeProvider storage={false} colorScheme={false}>
      {/* @preui-theme:start */}
      {/* Server-wide theme from preui_theme (client_script '@preui_theme/bridge.lua' in fxmanifest.lua). */}
      <NuiThemeBridge mock={{ v: 1, scheme: "dark" }} />
      {/* @preui-theme:end */}
      {visible && <ShopWindow onClose={close} />}
      {!visible && isEnvBrowser() && (
        <div className="fixed bottom-6 left-6">
          <Button variant="outline" onClick={() => setVisible(true)}>
            __T_OPEN_DEV__
          </Button>
        </div>
      )}
    </ThemeProvider>
  );
}

function ShopWindow({ onClose }: { onClose: () => void }) {
  const [data, setData] = useState<ShopData | null>(null);
  const [selected, setSelected] = useState<ShopItem | null>(null);

  // Load fresh data every time the window opens.
  useEffect(() => {
    let active = true;
    fetchNui<ShopData>("getData", undefined, mockData)
      .then((result) => active && setData(result))
      .catch(() => active && setData({ player: "", cash: 0, items: [] }));
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="fixed inset-0 flex items-center justify-center p-6">
      <Card className="flex max-h-full w-full max-w-xl flex-col overflow-hidden rounded-pui-window bg-pui-shell shadow-pui-window">
        <CardHeader>
          <CardTitle>__T_TITLE__</CardTitle>
          <CardDescription>__T_DESCRIPTION__</CardDescription>
        </CardHeader>
        <CardContent className="flex min-h-0 flex-col">
          <Tabs defaultValue="items" className="flex min-h-0 flex-col">
            <TabsList>
              <TabsTrigger value="items">__T_TAB_ITEMS__</TabsTrigger>
              <TabsTrigger value="info">__T_TAB_INFO__</TabsTrigger>
            </TabsList>
            <TabsContent value="items" className="min-h-0 pt-4">
              {data === null ? (
                <div className="flex items-center gap-2 py-8 text-sm text-pui-muted-foreground">
                  <Spinner /> __T_LOADING__
                </div>
              ) : (
                <ScrollArea className="max-h-80">
                  <ItemGroup className="gap-2">
                    {data.items.map((item) => (
                      <Item key={item.id} variant={selected?.id === item.id ? "muted" : "outline"} size="sm">
                        <ItemContent>
                          <ItemTitle>{item.label}</ItemTitle>
                          <ItemDescription>{money.format(item.price)}</ItemDescription>
                        </ItemContent>
                        <ItemActions>
                          {item.stock > 0 ? (
                            <Badge variant="secondary">
                              __T_STOCK__ {item.stock}
                            </Badge>
                          ) : (
                            <Badge variant="destructive">__T_SOLD_OUT__</Badge>
                          )}
                          <Button size="sm" disabled={item.stock === 0} onClick={() => setSelected(item)}>
                            __T_SELECT__
                          </Button>
                        </ItemActions>
                      </Item>
                    ))}
                  </ItemGroup>
                </ScrollArea>
              )}
            </TabsContent>
            <TabsContent value="info" className="flex flex-col gap-3 pt-4 text-sm text-pui-muted-foreground">
              <p>__T_INFO_TEXT_1__</p>
              <p>__T_INFO_TEXT_2__</p>
              {data && (
                <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-pui-foreground">
                  <dt className="text-pui-muted-foreground">__T_PLAYER__</dt>
                  <dd>{data.player}</dd>
                  <dt className="text-pui-muted-foreground">__T_CASH__</dt>
                  <dd>{money.format(data.cash)}</dd>
                </dl>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
        <CardFooter className="justify-between gap-4 border-t border-pui-border pt-4">
          <KeybindHintBar>
            <KeybindHint keys="Esc" label="__T_CLOSE__" />
          </KeybindHintBar>
          <div className="flex items-center gap-3">
            <span className="text-sm text-pui-muted-foreground">
              {selected ? `__T_SELECTED__: ${selected.label}` : "__T_NOTHING_SELECTED__"}
            </span>
            <Button variant="ghost" onClick={onClose}>
              __T_CLOSE__
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
