import { forwardRef, type HTMLAttributes, type ReactNode } from "react";
import { useIcon } from "../../icons";
import { cn } from "../../utils/cn";
import { Alert, AlertDescription, AlertTitle, type AlertVariant } from "../Alert/Alert";
import { Badge, type BadgeVariant } from "../Badge/Badge";
import { Button, type ButtonVariant } from "../Button/Button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "../Card/Card";
import { Checkbox } from "../Checkbox/Checkbox";
import { Field, FieldDescription, FieldLabel } from "../Field/Field";
import { Input } from "../Input/Input";
import { Progress } from "../Progress/Progress";
import { Slider } from "../Slider/Slider";
import { Switch } from "../Switch/Switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../Table/Table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../Tabs/Tabs";

/** Texts of the built-in sample content. English defaults; nested objects are replaced as a whole. */
export interface ThemeEditorPreviewLabels {
  groups: {
    buttons: string;
    form: string;
    card: string;
    feedback: string;
    table: string;
  };
  buttons: Record<ButtonVariant, string>;
  loading: string;
  field: { label: string; placeholder: string; description: string };
  checkbox: string;
  switchOn: string;
  switchOff: string;
  slider: string;
  progress: string;
  card: {
    title: string;
    description: string;
    badge: string;
    value: string;
    valueHint: string;
    tabs: { label: string; content: string }[];
  };
  badges: Record<BadgeVariant, string>;
  alerts: {
    variant: Exclude<AlertVariant, "default">;
    title: string;
    description: string;
  }[];
  table: {
    columns: [string, string, string, string];
    rows: {
      id: string;
      item: string;
      status: string;
      tone: BadgeVariant;
      amount: string;
    }[];
  };
}

export const defaultThemeEditorPreviewLabels: ThemeEditorPreviewLabels = {
  groups: {
    buttons: "Buttons",
    form: "Form",
    card: "Card",
    feedback: "Badges & alerts",
    table: "Table",
  },
  buttons: {
    default: "Default",
    solid: "Solid",
    secondary: "Secondary",
    outline: "Outline",
    ghost: "Ghost",
    positive: "Positive",
    destructive: "Destructive",
    link: "Link",
  },
  loading: "Loading",
  field: {
    label: "Company name",
    placeholder: "Acme Inc.",
    description: "Visible to everyone.",
  },
  checkbox: "Invoice by email",
  switchOn: "Autopilot",
  switchOff: "Off",
  slider: "Load",
  progress: "Progress",
  card: {
    title: "Warehouse North",
    description: "Stock value and occupancy",
    badge: "92% full",
    value: "$48,200",
    valueHint: "Stock value",
    tabs: [
      { label: "Incoming", content: "12 deliveries today." },
      { label: "Outgoing", content: "8 orders shipped." },
      { label: "Inventory", content: "Next count on the 30th." },
    ],
  },
  badges: {
    default: "Default",
    secondary: "Secondary",
    outline: "Outline",
    positive: "Positive",
    warning: "Warning",
    info: "Info",
    destructive: "Destructive",
  },
  alerts: [
    {
      variant: "positive",
      title: "Delivery arrived",
      description: "240 units booked in.",
    },
    {
      variant: "warning",
      title: "Almost full",
      description: "92% of the capacity in use.",
    },
    {
      variant: "info",
      title: "Maintenance on Sunday",
      description: "Paused from 2 to 4 am.",
    },
    {
      variant: "destructive",
      title: "Payment failed",
      description: "The card was declined.",
    },
  ],
  table: {
    columns: ["Order", "Item", "Status", "Amount"],
    rows: [
      {
        id: "#1042",
        item: "Steel beams",
        status: "Delivered",
        tone: "positive",
        amount: "$1,200",
      },
      {
        id: "#1043",
        item: "M8 screws",
        status: "On the way",
        tone: "info",
        amount: "$340",
      },
      {
        id: "#1044",
        item: "Timber",
        status: "Blocked",
        tone: "warning",
        amount: "$2,150",
      },
    ],
  },
};

const buttonVariants: ButtonVariant[] = [
  "default",
  "solid",
  "secondary",
  "outline",
  "ghost",
  "positive",
  "destructive",
  "link",
];
const badgeVariants: BadgeVariant[] = ["default", "secondary", "outline", "positive", "warning", "info", "destructive"];
const alertIcons = {
  positive: "success",
  warning: "warning",
  info: "info",
  destructive: "error",
} as const;

export interface ThemeEditorPreviewProps extends HTMLAttributes<HTMLDivElement> {
  labels?: Partial<ThemeEditorPreviewLabels>;
}

/**
 * Sample content for `ThemeEditor layout="split"`: the most token-heavy components (buttons, form controls, card,
 * tabs, badges, alerts, table). Nothing opens a popup, so everything stays inside the scoped preview. The layout
 * wraps by its own width (no viewport breakpoints), so it fits any preview pane.
 */
export const ThemeEditorPreview = /* @__PURE__ */ forwardRef<HTMLDivElement, ThemeEditorPreviewProps>(
  function ThemeEditorPreview({ labels: labelsProp, className, ...props }, ref) {
    const labels = { ...defaultThemeEditorPreviewLabels, ...labelsProp };
    const Success = useIcon(alertIcons.positive);
    const Warning = useIcon(alertIcons.warning);
    const Info = useIcon(alertIcons.info);
    const Error = useIcon(alertIcons.destructive);
    const icons = {
      positive: Success,
      warning: Warning,
      info: Info,
      destructive: Error,
    };

    return (
      <div ref={ref} data-slot="theme-editor-sample" className={cn("flex flex-col gap-6", className)} {...props}>
        <Group label={labels.groups.buttons}>
          <div className="flex flex-wrap items-center gap-2">
            {buttonVariants.map((variant) => (
              <Button key={variant} variant={variant}>
                {labels.buttons[variant]}
              </Button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant="solid">
              {labels.buttons.solid}
            </Button>
            <Button size="lg" variant="outline">
              {labels.buttons.outline}
            </Button>
            <Button loading variant="secondary">
              {labels.loading}
            </Button>
            <Button disabled>{labels.buttons.default}</Button>
          </div>
        </Group>

        <div className="flex flex-wrap gap-6">
          <Group label={labels.groups.form} className="min-w-0 flex-1 basis-72">
            <Field>
              <FieldLabel>{labels.field.label}</FieldLabel>
              <Input placeholder={labels.field.placeholder} />
              <FieldDescription>{labels.field.description}</FieldDescription>
            </Field>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
              <label className="flex items-center gap-2">
                <Checkbox defaultChecked />
                {labels.checkbox}
              </label>
              <label className="flex items-center gap-2">
                <Switch defaultChecked />
                {labels.switchOn}
              </label>
              <label className="flex items-center gap-2">
                <Switch />
                {labels.switchOff}
              </label>
            </div>
            <Slider defaultValue={64} thumbLabels={[labels.slider]} />
            <Progress value={72} aria-label={labels.progress} />
          </Group>

          <Group label={labels.groups.card} className="min-w-0 flex-1 basis-72">
            <Card>
              <CardHeader>
                <CardTitle>{labels.card.title}</CardTitle>
                <CardDescription>{labels.card.description}</CardDescription>
                <CardAction>
                  <Badge variant="warning">{labels.card.badge}</Badge>
                </CardAction>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <div>
                  <p className="text-2xl font-semibold tabular-nums">{labels.card.value}</p>
                  <p className="text-xs text-pui-muted-foreground">{labels.card.valueHint}</p>
                </div>
                {labels.card.tabs.length > 0 && (
                  <Tabs defaultValue={0}>
                    <TabsList>
                      {labels.card.tabs.map((tab, index) => (
                        <TabsTrigger key={index} value={index}>
                          {tab.label}
                        </TabsTrigger>
                      ))}
                    </TabsList>
                    {labels.card.tabs.map((tab, index) => (
                      <TabsContent key={index} value={index} className="text-pui-muted-foreground">
                        {tab.content}
                      </TabsContent>
                    ))}
                  </Tabs>
                )}
              </CardContent>
            </Card>
          </Group>
        </div>

        <Group label={labels.groups.feedback}>
          <div className="flex flex-wrap items-center gap-2">
            {badgeVariants.map((variant) => (
              <Badge key={variant} variant={variant}>
                {labels.badges[variant]}
              </Badge>
            ))}
          </div>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(14rem,1fr))] gap-3">
            {labels.alerts.map((alert) => {
              const Icon = icons[alert.variant];
              return (
                <Alert key={alert.variant + alert.title} variant={alert.variant}>
                  <Icon aria-hidden="true" />
                  <AlertTitle>{alert.title}</AlertTitle>
                  <AlertDescription>{alert.description}</AlertDescription>
                </Alert>
              );
            })}
          </div>
        </Group>

        <Group label={labels.groups.table}>
          <Table>
            <TableHeader>
              <TableRow>
                {labels.table.columns.map((column, index) => (
                  <TableHead key={index} className={index === 3 ? "text-right" : undefined}>
                    {column}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {labels.table.rows.map((row, index) => (
                <TableRow key={row.id} data-state={index === 1 ? "selected" : undefined}>
                  <TableCell className="font-mono text-xs">{row.id}</TableCell>
                  <TableCell>{row.item}</TableCell>
                  <TableCell>
                    <Badge variant={row.tone}>{row.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{row.amount}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Group>
      </div>
    );
  },
);

function Group({ label, className, children }: { label: string; className?: string; children: ReactNode }) {
  return (
    <section className={cn("flex flex-col gap-3", className)}>
      <p className="text-pui-eyebrow font-semibold uppercase text-pui-muted-foreground">{label}</p>
      {children}
    </section>
  );
}
