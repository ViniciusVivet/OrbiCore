"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, ShoppingCart, TrendingUp, DollarSign, BarChart3 } from "lucide-react";
import { useAppStore } from "@/components/store-provider";
import { currency, dateFormat, percent } from "@/lib/format";
import { saleProfitAndMargin } from "@/lib/calculations";
import { Sale } from "@/lib/types";

type FormData = Omit<Sale, "id" | "createdAt">;

export default function SalesPage() {
  const { data, loaded, addSale, deleteSale } = useAppStore();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<FormData>({
    date: new Date().toISOString().split("T")[0],
    productId: "",
    quantity: 1,
  });

  if (!loaded) return null;

  const { products, sales } = data;

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
    setForm({ date: new Date().toISOString().split("T")[0], productId: products[0]?.id || "", quantity: 1 });
    setDialogOpen(true);
  }

  function handleSave() {
    if (!form.productId || !form.quantity) return;
    addSale(form);
    setDialogOpen(false);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Vendas</h2>
          <p className="text-muted-foreground">Registre vendas e acompanhe receita e lucro</p>
        </div>
        <Button onClick={openNew} className="gap-2" disabled={products.length === 0}>
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
              <p className="text-sm text-muted-foreground">Margem Media</p>
            </div>
            <p className="text-2xl font-bold">{percent(avgMargin, 1)}</p>
          </CardContent>
        </Card>
      </div>

      {products.length === 0 ? (
        <Card className="border-border/50">
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Cadastre produtos primeiro para registrar vendas.</p>
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
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Produto</TableHead>
                      <TableHead className="text-center">Qtde</TableHead>
                      <TableHead className="text-right">Custo Unit.</TableHead>
                      <TableHead className="text-right">Preco Venda</TableHead>
                      <TableHead className="text-right">Custo Total</TableHead>
                      <TableHead className="text-right">Lucro</TableHead>
                      <TableHead className="text-center">Margem</TableHead>
                      <TableHead className="text-right">Acoes</TableHead>
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
                          <TableCell className="text-right">{currency(product.costPrice)}</TableCell>
                          <TableCell className="text-right">{currency(product.salePrice)}</TableCell>
                          <TableCell className="text-right">{currency(cost)}</TableCell>
                          <TableCell className="text-right text-orbi-emerald">{currency(profit)}</TableCell>
                          <TableCell className="text-center">{percent(margin, 0)}</TableCell>
                          <TableCell className="text-right">
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
            )}
          </CardContent>
        </Card>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nova Venda</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Data</Label>
              <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Produto</Label>
              <Select value={form.productId || ""} onValueChange={(v: string | null) => setForm({ ...form, productId: v ?? "" })}>
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
            {form.productId && (() => {
              const p = products.find((x) => x.id === form.productId);
              if (!p) return null;
              const profit = (p.salePrice - p.costPrice) * (form.quantity || 0);
              return (
                <div className="rounded-lg bg-muted p-3 space-y-1">
                  <p className="text-sm text-muted-foreground">Previa da venda:</p>
                  <p className="text-sm">Receita: <span className="font-medium">{currency(p.salePrice * (form.quantity || 0))}</span></p>
                  <p className="text-sm">Lucro: <span className="font-medium text-orbi-emerald">{currency(profit)}</span></p>
                </div>
              );
            })()}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave}>Registrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
