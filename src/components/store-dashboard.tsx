"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Boxes, PackageSearch, WalletCards } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAppStore } from "@/components/store-provider";
import { DashboardWidgetKey } from "@/lib/types";
import { productNeedsRestock, productStock, saleProfitAndMargin } from "@/lib/calculations";
import { currency, dateFormat } from "@/lib/format";
import { DashboardBlock } from "@/components/dashboard-layout";

const chartColors = { cyan: "oklch(0.75 0.15 195)", emerald: "oklch(0.7 0.17 155)", muted: "oklch(0.28 0.01 260)", text: "oklch(0.65 0.01 260)", bg: "oklch(0.18 0.005 260)", border: "oklch(0.28 0.01 260)" };

export function StoreDashboard() {
  const { data } = useAppStore();

  if (!data.profile.enabledModules.some((module) => module === "products" || module === "sales")) return null;

  return (
    <div className="contents" data-tour="store-dashboard">
      {(["inventory-summary", "sales-summary", "stock-levels", "sales-by-product", "recent-movements"] as DashboardWidgetKey[]).map((key) => (
        <DashboardBlock key={key} id={key}>
          <StoreWidget widgetKey={key} />
        </DashboardBlock>
      ))}
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
