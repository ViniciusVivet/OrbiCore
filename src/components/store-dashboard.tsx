"use client";

import { useState } from "react";
import {
  closestCenter,
  DndContext,
  DragEndEvent,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  rectSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ArrowDown, ArrowUp, Boxes, Eye, EyeOff, GripVertical, PackageSearch, Settings2, WalletCards } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useAppStore } from "@/components/store-provider";
import { DashboardWidgetKey } from "@/lib/types";
import { productNeedsRestock, productStock, saleProfitAndMargin } from "@/lib/calculations";
import { currency, dateFormat } from "@/lib/format";

const WIDGETS: { key: DashboardWidgetKey; label: string; description: string }[] = [
  { key: "inventory-summary", label: "Resumo do estoque", description: "Valor, itens e alertas de reposição" },
  { key: "stock-levels", label: "Estoque por produto", description: "Comparação visual dos saldos" },
  { key: "sales-summary", label: "Resumo de vendas", description: "Receita, lucro e itens vendidos" },
  { key: "sales-by-product", label: "Vendas por produto", description: "Produtos com maior faturamento" },
  { key: "recent-movements", label: "Movimentações recentes", description: "Entradas, baixas e ajustes" },
];

const DEFAULT_WIDGETS = WIDGETS.map((widget) => widget.key);
const chartColors = { cyan: "oklch(0.75 0.15 195)", emerald: "oklch(0.7 0.17 155)", muted: "oklch(0.28 0.01 260)", text: "oklch(0.65 0.01 260)", bg: "oklch(0.18 0.005 260)", border: "oklch(0.28 0.01 260)" };

export function StoreDashboard() {
  const { data, updateProfile } = useAppStore();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<DashboardWidgetKey[]>(data.profile.dashboardWidgets ?? DEFAULT_WIDGETS);
  const [orderMessage, setOrderMessage] = useState("");
  const enabled = data.profile.dashboardWidgets ?? DEFAULT_WIDGETS;
  const orderedWidgets = [
    ...draft.flatMap((key) => {
      const widget = WIDGETS.find((item) => item.key === key);
      return widget ? [widget] : [];
    }),
    ...WIDGETS.filter((widget) => !draft.includes(widget.key)),
  ];
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  if (!data.profile.enabledModules.some((module) => module === "products" || module === "sales")) return null;

  function toggle(key: DashboardWidgetKey) {
    const active = draft.includes(key);
    setDraft(active ? draft.filter((item) => item !== key) : [...draft, key]);
    setOrderMessage(active ? "Bloco ocultado. A ordem dos demais foi atualizada." : "Bloco adicionado ao final da lista.");
  }

  function move(key: DashboardWidgetKey, direction: -1 | 1) {
    const index = draft.indexOf(key);
    const nextIndex = index + direction;
    if (index < 0 || nextIndex < 0 || nextIndex >= draft.length) return;
    setDraft(arrayMove(draft, index, nextIndex));
    setOrderMessage(`Bloco movido para a posição ${nextIndex + 1} de ${draft.length}.`);
  }

  function openSettings() {
    setDraft([...enabled]);
    setOrderMessage("");
    setOpen(true);
  }

  function save() {
    updateProfile({ dashboardWidgets: draft });
    setOpen(false);
  }

  function reorder(items: DashboardWidgetKey[], event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return items;
    const oldIndex = items.indexOf(active.id as DashboardWidgetKey);
    const newIndex = items.indexOf(over.id as DashboardWidgetKey);
    if (oldIndex < 0 || newIndex < 0) return items;
    return arrayMove(items, oldIndex, newIndex);
  }

  function handleDashboardDragEnd(event: DragEndEvent) {
    const next = reorder(enabled, event);
    if (next !== enabled) updateProfile({ dashboardWidgets: next });
  }

  return (
    <section className="space-y-4" data-tour="store-dashboard">
      <div className="flex items-center justify-between gap-3">
        <div><h3 className="text-lg font-semibold">Operação da loja</h3><p className="text-sm text-muted-foreground">Seu estoque e suas vendas, do seu jeito.</p></div>
        <Button variant="outline" className="min-h-11 shrink-0 gap-2" onClick={openSettings} data-tour="dashboard-customize"><Settings2 className="h-4 w-4" /><span className="hidden sm:inline">Personalizar</span></Button>
      </div>

      {enabled.length === 0 ? (
        <Card className="border-dashed"><CardContent className="flex flex-col items-center py-8 text-center"><EyeOff className="mb-3 h-8 w-8 text-muted-foreground" /><p className="font-medium">Nenhum bloco selecionado</p><Button variant="link" onClick={openSettings}>Escolher o que mostrar</Button></CardContent></Card>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDashboardDragEnd}>
          <SortableContext items={enabled} strategy={rectSortingStrategy}>
            <div className="grid gap-4 lg:grid-cols-2">
              {enabled.map((key) => <SortableWidget key={key} widgetKey={key} />)}
            </div>
          </SortableContext>
        </DndContext>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Personalizar dashboard</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Escolha os blocos e defina a ordem. A configuração fica salva para sua conta.</p>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(event) => {
            const next = reorder(draft, event);
            if (next !== draft) {
              const newIndex = next.indexOf(event.active.id as DashboardWidgetKey);
              setOrderMessage(`Bloco arrastado para a posição ${newIndex + 1} de ${next.length}.`);
              setDraft(next);
            }
          }}>
            <SortableContext items={draft} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
            {orderedWidgets.map((widget) => {
              const active = draft.includes(widget.key);
              const index = draft.indexOf(widget.key);
              return <SortableSettingsRow key={widget.key} id={widget.key} disabled={!active} className={`flex items-center gap-2 rounded-xl border p-3 ${active ? "border-primary/30 bg-primary/5" : "border-border/50 opacity-70"}`}>
                <button className="min-w-0 flex-1 text-left" onClick={() => toggle(widget.key)}><p className="flex items-center gap-2 text-sm font-medium">{widget.label}{active && <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">{index + 1}º</span>}</p><p className="truncate text-xs text-muted-foreground">{widget.description}</p></button>
                {active && <div className="flex gap-1"><Button variant="ghost" size="icon-sm" aria-label="Mover para cima" disabled={index === 0} onClick={() => move(widget.key, -1)}><ArrowUp className="h-4 w-4" /></Button><Button variant="ghost" size="icon-sm" aria-label="Mover para baixo" disabled={index === draft.length - 1} onClick={() => move(widget.key, 1)}><ArrowDown className="h-4 w-4" /></Button></div>}
                <Button variant="ghost" size="icon-sm" aria-label={active ? "Ocultar bloco" : "Mostrar bloco"} onClick={() => toggle(widget.key)}>{active ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}</Button>
              </SortableSettingsRow>;
            })}
            </div>
            </SortableContext>
          </DndContext>
          <div aria-live="polite" className={`min-h-10 rounded-lg border px-3 py-2 text-sm transition-colors ${orderMessage ? "border-primary/30 bg-primary/5 text-foreground" : "border-transparent text-muted-foreground"}`}>
            {orderMessage || "Arraste pela alça ou use as setas. A numeração mostra a ordem final."}
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button><Button onClick={save}>Salvar organização</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}

function SortableWidget({ widgetKey }: { widgetKey: DashboardWidgetKey }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: widgetKey });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`relative min-w-0 ${isDragging ? "z-30 scale-[1.02] opacity-90 shadow-2xl" : ""}`}
    >
      <button
        type="button"
        className="absolute right-11 top-4 z-20 flex size-10 touch-none items-center justify-center rounded-lg border border-border bg-background/95 text-muted-foreground shadow-sm transition-colors hover:border-primary/40 hover:text-foreground active:cursor-grabbing sm:size-9"
        aria-label="Arrastar para reorganizar este bloco"
        title="Arraste para mudar a posição"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-5 w-5" />
      </button>
      <StoreWidget widgetKey={widgetKey} />
    </div>
  );
}

function SortableSettingsRow({
  id,
  disabled,
  className,
  children,
}: {
  id: DashboardWidgetKey;
  disabled: boolean;
  className: string;
  children: React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id, disabled });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`${className} ${isDragging ? "z-30 scale-[1.01] bg-background shadow-xl" : ""}`}
    >
      <button
        type="button"
        className={`flex size-10 shrink-0 touch-none items-center justify-center rounded-lg text-muted-foreground active:cursor-grabbing ${disabled ? "cursor-default" : "cursor-grab hover:bg-muted hover:text-foreground"}`}
        aria-label={disabled ? "Ative o bloco para poder reorganizar" : "Arrastar para reorganizar"}
        disabled={disabled}
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-5 w-5" />
      </button>
      {children}
    </div>
  );
}

function StoreWidget({ widgetKey }: { widgetKey: DashboardWidgetKey }) {
  const { data } = useAppStore();
  const { products, sales, stockMovements } = data;
  const salesWithProduct = sales.flatMap((sale) => {
    const product = products.find((item) => item.id === sale.productId);
    return product ? [{ sale, product, result: saleProfitAndMargin(sale, product) }] : [];
  });
  const totalRevenue = salesWithProduct.reduce((total, item) => total + item.result.revenue, 0);
  const totalProfit = salesWithProduct.reduce((total, item) => total + item.result.profit, 0);
  const totalItems = sales.reduce((total, sale) => total + sale.quantity, 0);
  const stockData = products.map((product) => ({ name: product.name, estoque: productStock(product, sales, stockMovements), minimo: product.minStock })).sort((a, b) => b.estoque - a.estoque).slice(0, 10);
  const salesByProduct = Object.values(salesWithProduct.reduce<Record<string, { name: string; receita: number }>>((groups, item) => {
    groups[item.product.id] ??= { name: item.product.name, receita: 0 };
    groups[item.product.id].receita += item.result.revenue;
    return groups;
  }, {})).sort((a, b) => b.receita - a.receita).slice(0, 8);

  if (widgetKey === "inventory-summary") {
    const inventoryValue = products.reduce((total, product) => total + Math.max(0, productStock(product, sales, stockMovements)) * product.costPrice, 0);
    const alerts = products.filter((product) => productNeedsRestock(product, sales, stockMovements)).length;
    return <WidgetCard title="Resumo do estoque" icon={<Boxes className="h-4 w-4 text-orbi-cyan" />}><div className="grid grid-cols-3 gap-2"><Metric label="Produtos" value={String(products.length)} /><Metric label="Valor" value={currency(inventoryValue)} /><Metric label="Para repor" value={String(alerts)} alert={alerts > 0} /></div></WidgetCard>;
  }
  if (widgetKey === "sales-summary") return <WidgetCard title="Resumo de vendas" icon={<WalletCards className="h-4 w-4 text-orbi-emerald" />}><div className="grid grid-cols-3 gap-2"><Metric label="Receita" value={currency(totalRevenue)} /><Metric label="Lucro" value={currency(totalProfit)} /><Metric label="Itens" value={String(totalItems)} /></div></WidgetCard>;
  if (widgetKey === "stock-levels") return <ChartCard title="Estoque por produto" description="Saldo atual e estoque mínimo" data={stockData} dataKey="estoque" secondaryKey="minimo" />;
  if (widgetKey === "sales-by-product") return <ChartCard title="Vendas por produto" description="Faturamento acumulado" data={salesByProduct} dataKey="receita" currencyAxis />;

  const recent = [...stockMovements].reverse().slice(0, 6);
  return <WidgetCard title="Movimentações recentes" icon={<PackageSearch className="h-4 w-4 text-orbi-blue" />}>{recent.length === 0 ? <p className="py-5 text-center text-sm text-muted-foreground">As entradas e baixas aparecerão aqui.</p> : <div className="space-y-2">{recent.map((movement) => { const product = products.find((item) => item.id === movement.productId); const positive = movement.type === "Entrada" || (movement.type === "Ajuste" && movement.quantity > 0); return <div key={movement.id} className="flex items-center justify-between gap-3 rounded-lg bg-muted/50 p-2.5"><div className="min-w-0"><p className="truncate text-sm font-medium">{product?.name ?? "Produto removido"}</p><p className="text-xs text-muted-foreground">{dateFormat(movement.date)} · {movement.type}</p></div><Badge className={positive ? "bg-orbi-emerald/20 text-orbi-emerald" : "bg-orbi-rose/20 text-orbi-rose"}>{positive ? "+" : "−"}{Math.abs(movement.quantity)}</Badge></div>; })}</div>}</WidgetCard>;
}

function WidgetCard({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) { return <Card className="border-border/50"><CardHeader className="flex flex-row items-center justify-between pb-3"><CardTitle className="text-base">{title}</CardTitle>{icon}</CardHeader><CardContent>{children}</CardContent></Card>; }
function Metric({ label, value, alert = false }: { label: string; value: string; alert?: boolean }) { return <div className="min-w-0 rounded-lg bg-muted/60 p-3"><p className="truncate text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p><p className={`mt-1 truncate text-base font-bold sm:text-lg ${alert ? "text-orbi-rose" : ""}`}>{value}</p></div>; }

function ChartCard({ title, description, data, dataKey, secondaryKey, currencyAxis = false }: { title: string; description: string; data: { name: string; [key: string]: string | number }[]; dataKey: string; secondaryKey?: string; currencyAxis?: boolean }) {
  return <Card className="border-border/50"><CardHeader><CardTitle className="text-base">{title}</CardTitle><CardDescription>{description}</CardDescription></CardHeader><CardContent>{data.length === 0 ? <p className="py-16 text-center text-sm text-muted-foreground">Sem dados ainda.</p> : <div className="h-[240px]"><ResponsiveContainer width="100%" height="100%"><BarChart data={data} margin={{ left: -18, right: 4 }}><CartesianGrid strokeDasharray="3 3" stroke={chartColors.muted} /><XAxis dataKey="name" stroke={chartColors.text} fontSize={10} interval={0} tickFormatter={(value: string) => value.length > 9 ? `${value.slice(0, 9)}…` : value} /><YAxis stroke={chartColors.text} fontSize={10} tickFormatter={(value: number) => currencyAxis ? `${Math.round(value / 1000)}k` : String(value)} /><Tooltip contentStyle={{ background: chartColors.bg, border: `1px solid ${chartColors.border}`, borderRadius: 8 }} formatter={(value) => [currencyAxis ? currency(Number(value)) : Number(value), ""]} /><Bar dataKey={dataKey} fill={chartColors.cyan} radius={[4, 4, 0, 0]} />{secondaryKey && <Bar dataKey={secondaryKey} fill={chartColors.emerald} radius={[4, 4, 0, 0]} />}</BarChart></ResponsiveContainer></div>}</CardContent></Card>;
}
