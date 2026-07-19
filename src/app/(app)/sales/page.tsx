"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, Pencil, ShoppingCart, TrendingUp, DollarSign, BarChart3, ArrowRight } from "lucide-react";
import Link from "next/link";
import { useAppStore } from "@/components/store-provider";
import { currency, dateFormat, percent } from "@/lib/format";
import { saleProfitAndMargin, productStock } from "@/lib/calculations";
import { Sale } from "@/lib/types";
import { toast } from "sonner";

type FormData = Omit<Sale, "id" | "createdAt">;

export default function SalesPage() {
  const { data, loaded, addSale, updateSale, deleteSale } = useAppStore();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>({
    date: new Date().toISOString().split("T")[0],
    productId: "",
    quantity: 1,
    unitSalePrice: 0,
    unitCostPrice: 0,
  });

  if (!loaded) return null;

  const { products, sales, stockMovements } = data;

  const salesWithProduct = sales.map((s) => {
    const product = products.find((p) => p.id === s.productId);
    return { sale: s, product };
  }).filter((x) => x.product);

  const totalRevenue = salesWithProduct.reduce((s, { sale, product }) => {
    if (!product) return s;
    return s + saleProfitAndMargin(sale, product).revenue;
  }, 0);

  const totalProfit = salesWithProduct.reduce((s, { sale, product }) => {
    if (!product) return s;
    return s + saleProfitAndMargin(sale, product).profit;
  }, 0);

  const totalItems = sales.reduce((s, sale) => s + sale.quantity, 0);
  const avgMargin = totalRevenue > 0 ? totalProfit / totalRevenue : 0;

  function openNew() {
    const product = products[0];
    setEditingId(null);
    setForm({ date: new Date().toISOString().split("T")[0], productId: product?.id || "", quantity: 1, unitSalePrice: product?.salePrice ?? 0, unitCostPrice: product?.costPrice ?? 0 });
    setDialogOpen(true);
  }

  function openEdit(sale: Sale) {
    const product = products.find((item) => item.id === sale.productId);
    setEditingId(sale.id);
    setForm({ date: sale.date, productId: sale.productId, quantity: sale.quantity, unitSalePrice: sale.unitSalePrice ?? product?.salePrice ?? 0, unitCostPrice: sale.unitCostPrice ?? product?.costPrice ?? 0 });
    setDialogOpen(true);
  }

  function handleSave() {
    if (!form.productId || !form.quantity) return;
    const product = products.find((item) => item.id === form.productId);
    const previous = editingId ? sales.find((sale) => sale.id === editingId) : undefined;
    const available = product ? productStock(product, sales, stockMovements) + (previous?.productId === product.id ? previous.quantity : 0) : 0;
    if (!product || form.quantity > available) {
      toast.error("Quantidade maior que o estoque disponível.");
      return;
    }
    if (editingId) {
      updateSale(editingId, form);
      toast.success("Venda atualizada. Estoque, cards e gráficos foram recalculados.");
    } else {
      addSale(form);
      toast.success("Venda registrada e indicadores atualizados.");
    }
    setDialogOpen(false);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Vendas</h2>
          <p className="text-muted-foreground">Registre vendas e acompanhe receita e lucro</p>
        </div>
        <Button onClick={openNew} className="min-h-11 w-full gap-2 sm:w-auto" disabled={products.length === 0}>
          <Plus className="h-4 w-4" />Nova Venda
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-border/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="h-4 w-4 text-orbi-cyan" />
              <p className="text-sm text-muted-foreground">Receita Total</p>
            </div>
            <p className="text-2xl font-bold">{currency(totalRevenue)}</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-4 w-4 text-orbi-emerald" />
              <p className="text-sm text-muted-foreground">Lucro Total</p>
            </div>
            <p className="text-2xl font-bold text-orbi-emerald">{currency(totalProfit)}</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-1">
              <ShoppingCart className="h-4 w-4 text-orbi-blue" />
              <p className="text-sm text-muted-foreground">Itens Vendidos</p>
            </div>
            <p className="text-2xl font-bold">{totalItems}</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-1">
              <BarChart3 className="h-4 w-4 text-orbi-amber" />
              <p className="text-sm text-muted-foreground">Margem Média</p>
            </div>
            <p className="text-2xl font-bold">{percent(avgMargin, 1)}</p>
          </CardContent>
        </Card>
      </div>

      {products.length === 0 ? (
        <Card className="border-border/50">
          <CardContent className="py-12 flex flex-col items-center text-center">
            <div className="rounded-full bg-muted p-6 mb-4">
              <ShoppingCart className="h-10 w-10 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Sem produtos cadastrados</h3>
            <p className="text-sm text-muted-foreground mb-4">Cadastre produtos primeiro para poder registrar vendas.</p>
            <Link href="/products">
              <Button className="gap-2">
                Ir para Produtos <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-border/50">
          <CardContent className="p-0">
            {sales.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="rounded-full bg-muted p-6 mb-4">
                  <ShoppingCart className="h-10 w-10 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Nenhuma venda registrada</h3>
                <Button onClick={openNew} className="mt-4 gap-2"><Plus className="h-4 w-4" />Registrar venda</Button>
              </div>
            ) : (
              <>
              <div className="grid gap-3 p-3 md:hidden">
                {salesWithProduct.map(({ sale, product }) => {
                  if (!product) return null;
                  const { revenue, profit, margin } = saleProfitAndMargin(sale, product);
                  return <article key={sale.id} className="rounded-xl border border-border/60 p-4">
                    <div className="flex items-start justify-between gap-3"><div className="min-w-0"><h3 className="truncate font-semibold">{product.name}</h3><p className="text-xs text-muted-foreground">{dateFormat(sale.date)} · {sale.quantity} un.</p></div><div className="flex"><Button variant="ghost" size="icon" className="h-11 w-11" aria-label={`Editar venda de ${product.name}`} onClick={() => openEdit(sale)}><Pencil className="h-4 w-4" /></Button><Button variant="ghost" size="icon" className="h-11 w-11" aria-label={`Excluir venda de ${product.name}`} onClick={() => deleteSale(sale.id)}><Trash2 className="h-4 w-4 text-orbi-rose" /></Button></div></div>
                    <div className="mt-3 grid grid-cols-3 gap-2"><SaleMetric label="Receita" value={currency(revenue)} /><SaleMetric label="Lucro" value={currency(profit)} positive /><SaleMetric label="Margem" value={percent(margin, 0)} /></div>
                  </article>;
                })}
              </div>
              <div className="hidden overflow-x-auto md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Produto</TableHead>
                      <TableHead className="text-center">Qtde</TableHead>
                      <TableHead className="text-right">Custo Unit.</TableHead>
                      <TableHead className="text-right">Preço Venda</TableHead>
                      <TableHead className="text-right">Custo Total</TableHead>
                      <TableHead className="text-right">Lucro</TableHead>
                      <TableHead className="text-center">Margem</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {salesWithProduct.map(({ sale, product }) => {
                      if (!product) return null;
                      const { profit, margin, cost } = saleProfitAndMargin(sale, product);
                      return (
                        <TableRow key={sale.id}>
                          <TableCell className="whitespace-nowrap">{dateFormat(sale.date)}</TableCell>
                          <TableCell className="font-medium">{product.name}</TableCell>
                          <TableCell className="text-center">{sale.quantity}</TableCell>
                          <TableCell className="text-right">{currency(sale.unitCostPrice ?? product.costPrice)}</TableCell>
                          <TableCell className="text-right">{currency(sale.unitSalePrice ?? product.salePrice)}</TableCell>
                          <TableCell className="text-right">{currency(cost)}</TableCell>
                          <TableCell className="text-right text-orbi-emerald">{currency(profit)}</TableCell>
                          <TableCell className="text-center">{percent(margin, 0)}</TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="icon" onClick={() => openEdit(sale)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => deleteSale(sale.id)}>
                              <Trash2 className="h-4 w-4 text-orbi-rose" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar venda" : "Nova Venda"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Data</Label>
              <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Produto</Label>
              <Select value={form.productId || ""} onValueChange={(v: string | null) => {
                const product = products.find((item) => item.id === v);
                setForm({ ...form, productId: v ?? "", unitSalePrice: product?.salePrice ?? 0, unitCostPrice: product?.costPrice ?? 0 });
              }}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {products.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name} — {currency(p.salePrice)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Quantidade</Label>
              <Input type="number" min="1" value={form.quantity || ""} onChange={(e) => setForm({ ...form, quantity: parseInt(e.target.value) || 0 })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Custo unitário</Label>
                <Input type="number" min="0" step="0.01" value={form.unitCostPrice ?? ""} onChange={(e) => setForm({ ...form, unitCostPrice: Number(e.target.value) || 0 })} />
              </div>
              <div className="space-y-2">
                <Label>Preço da venda</Label>
                <Input type="number" min="0" step="0.01" value={form.unitSalePrice ?? ""} onChange={(e) => setForm({ ...form, unitSalePrice: Number(e.target.value) || 0 })} />
              </div>
            </div>
            {form.productId && (() => {
              const p = products.find((x) => x.id === form.productId);
              if (!p) return null;
              const salePrice = form.unitSalePrice ?? p.salePrice;
              const costPrice = form.unitCostPrice ?? p.costPrice;
              const profit = (salePrice - costPrice) * (form.quantity || 0);
              return (
                <div className="rounded-lg bg-muted p-3 space-y-1">
                  <p className="text-sm text-muted-foreground">Prévia da venda:</p>
                  <p className="text-sm">Receita: <span className="font-medium">{currency(salePrice * (form.quantity || 0))}</span></p>
                  <p className="text-sm">Lucro: <span className="font-medium text-orbi-emerald">{currency(profit)}</span></p>
                </div>
              );
            })()}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave}>{editingId ? "Salvar alterações" : "Registrar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SaleMetric({ label, value, positive = false }: { label: string; value: string; positive?: boolean }) {
  return <div className="rounded-lg bg-muted/60 p-2.5"><p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p><p className={`mt-0.5 truncate text-sm font-semibold ${positive ? "text-orbi-emerald" : ""}`}>{value}</p></div>;
}
