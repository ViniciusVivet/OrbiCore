"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Trash2, Package, AlertTriangle, ArrowDownToLine, History } from "lucide-react";
import { useAppStore } from "@/components/store-provider";
import { currency, percent } from "@/lib/format";
import { productStock, productNeedsRestock } from "@/lib/calculations";
import { Product, StockMovementType } from "@/lib/types";

type FormData = Omit<Product, "id" | "createdAt">;

const emptyForm: FormData = {
  name: "",
  category: "",
  supplier: "",
  initialQty: 0,
  entries: 0,
  minStock: 10,
  costPrice: 0,
  salePrice: 0,
};

export default function ProductsPage() {
  const { data, loaded, addProduct, updateProduct, deleteProduct, addStockMovement, deleteStockMovement } = useAppStore();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [movementOpen, setMovementOpen] = useState(false);
  const [movement, setMovement] = useState({
    productId: "", date: new Date().toISOString().split("T")[0],
    type: "Entrada" as StockMovementType, quantity: 1, unitCost: 0, note: "",
  });

  if (!loaded) return null;

  const { products, sales, stockMovements } = data;

  const totalValue = products.reduce((s, p) => s + productStock(p, sales, stockMovements) * p.costPrice, 0);
  const restockCount = products.filter((p) => productNeedsRestock(p, sales, stockMovements)).length;

  function openNew() {
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  }

  function openEdit(p: Product) {
    setEditingId(p.id);
    setForm({
      name: p.name, category: p.category, supplier: p.supplier,
      initialQty: p.initialQty, entries: p.entries, minStock: p.minStock,
      costPrice: p.costPrice, salePrice: p.salePrice,
    });
    setDialogOpen(true);
  }

  function handleSave() {
    if (!form.name) return;
    if (editingId) updateProduct(editingId, form);
    else addProduct(form);
    setDialogOpen(false);
  }

  function openMovement(productId = products[0]?.id ?? "") {
    setMovement({ productId, date: new Date().toISOString().split("T")[0], type: "Entrada", quantity: 1, unitCost: 0, note: "" });
    setMovementOpen(true);
  }

  function handleMovement() {
    if (!movement.productId || movement.quantity === 0) return;
    addStockMovement({ ...movement, quantity: Math.abs(movement.quantity) });
    setMovementOpen(false);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Produtos</h2>
          <p className="text-muted-foreground">Catálogo de produtos com custo, preço e margem</p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex">
          <Button variant="outline" onClick={() => openMovement()} className="min-h-11 gap-2" disabled={products.length === 0}>
            <ArrowDownToLine className="h-4 w-4" />Movimentar
          </Button>
          <Button onClick={openNew} className="min-h-11 gap-2"><Plus className="h-4 w-4" />Novo Produto</Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-border/50">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Produtos Cadastrados</p>
            <p className="text-2xl font-bold">{products.length}</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Valor em Estoque</p>
            <p className="text-2xl font-bold">{currency(totalValue)}</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              {restockCount > 0 && <AlertTriangle className="h-4 w-4 text-orbi-amber" />}
              <p className="text-sm text-muted-foreground">Alertas de Reposição</p>
            </div>
            <p className="text-2xl font-bold">{restockCount}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/50">
        <CardContent className="p-0">
          {products.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="rounded-full bg-muted p-6 mb-4">
                <Package className="h-10 w-10 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Nenhum produto cadastrado</h3>
              <p className="text-sm text-muted-foreground max-w-sm mb-4">Cadastre produtos para controlar estoque, vendas e margem.</p>
              <Button onClick={openNew} className="gap-2"><Plus className="h-4 w-4" />Cadastrar produto</Button>
            </div>
          ) : (
            <>
            <div className="grid gap-3 p-3 md:hidden">
              {products.map((p) => {
                const stock = productStock(p, sales, stockMovements);
                const needsRestock = productNeedsRestock(p, sales, stockMovements);
                const margin = p.salePrice > 0 ? (p.salePrice - p.costPrice) / p.salePrice : 0;
                return (
                  <article key={p.id} className="rounded-xl border border-border/60 bg-card p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="truncate font-semibold">{p.name}</h3>
                        <p className="truncate text-xs text-muted-foreground">{p.category || "Sem categoria"} · {p.supplier || "Sem fornecedor"}</p>
                      </div>
                      <Badge className={needsRestock ? "bg-orbi-rose/20 text-orbi-rose" : "bg-orbi-emerald/20 text-orbi-emerald"}>
                        {needsRestock ? "Repor" : "Em dia"}
                      </Badge>
                    </div>
                    <div className="mt-4 grid grid-cols-3 gap-2">
                      <MobileMetric label="Estoque" value={String(stock)} highlight={needsRestock} />
                      <MobileMetric label="Venda" value={currency(p.salePrice)} />
                      <MobileMetric label="Margem" value={percent(margin, 0)} />
                    </div>
                    <div className="mt-4 grid grid-cols-[1fr_auto_auto] gap-2 border-t border-border/50 pt-3">
                      <Button variant="outline" className="min-h-11 justify-start gap-2" onClick={() => openMovement(p.id)}>
                        <ArrowDownToLine className="h-4 w-4" />Movimentar
                      </Button>
                      <Button variant="ghost" size="icon" className="h-11 w-11" aria-label={`Editar ${p.name}`} onClick={() => openEdit(p)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" className="h-11 w-11" aria-label={`Excluir ${p.name}`} onClick={() => deleteProduct(p.id)}><Trash2 className="h-4 w-4 text-orbi-rose" /></Button>
                    </div>
                  </article>
                );
              })}
            </div>
            <div className="hidden overflow-x-auto md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produto</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Fornecedor</TableHead>
                    <TableHead className="text-center">Estoque</TableHead>
                    <TableHead className="text-center">Min.</TableHead>
                    <TableHead className="text-right">Custo</TableHead>
                    <TableHead className="text-right">Venda</TableHead>
                    <TableHead className="text-right">Lucro</TableHead>
                    <TableHead className="text-center">Margem</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map((p) => {
                    const stock = productStock(p, sales, stockMovements);
                    const needsRestock = productNeedsRestock(p, sales, stockMovements);
                    const profit = p.salePrice - p.costPrice;
                    const margin = p.salePrice > 0 ? profit / p.salePrice : 0;
                    return (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium">{p.name}</TableCell>
                        <TableCell>{p.category}</TableCell>
                        <TableCell>{p.supplier}</TableCell>
                        <TableCell className="text-center">{stock}</TableCell>
                        <TableCell className="text-center">{p.minStock}</TableCell>
                        <TableCell className="text-right">{currency(p.costPrice)}</TableCell>
                        <TableCell className="text-right">{currency(p.salePrice)}</TableCell>
                        <TableCell className="text-right">{currency(profit)}</TableCell>
                        <TableCell className="text-center">{percent(margin, 0)}</TableCell>
                        <TableCell className="text-center">
                          <Badge className={needsRestock ? "bg-orbi-rose/20 text-orbi-rose" : "bg-orbi-emerald/20 text-orbi-emerald"}>
                            {needsRestock ? "REPOR" : "OK"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" onClick={() => openEdit(p)}><Pencil className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="icon" onClick={() => deleteProduct(p.id)}><Trash2 className="h-4 w-4 text-orbi-rose" /></Button>
                          </div>
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar Produto" : "Novo Produto"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Produto</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nome do produto" />
              </div>
              <div className="space-y-2">
                <Label>Categoria</Label>
                <Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="Ex: Roupas" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Fornecedor</Label>
              <Input value={form.supplier} onChange={(e) => setForm({ ...form, supplier: e.target.value })} placeholder="Nome do fornecedor" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Qtd Inicial</Label>
                <Input type="number" value={form.initialQty || ""} onChange={(e) => setForm({ ...form, initialQty: parseInt(e.target.value) || 0 })} />
              </div>
              <div className="space-y-2">
                <Label>Estoque Min.</Label>
                <Input type="number" value={form.minStock || ""} onChange={(e) => setForm({ ...form, minStock: parseInt(e.target.value) || 0 })} />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Custo Unit. (R$)</Label>
                <Input type="number" step="0.01" value={form.costPrice || ""} onChange={(e) => setForm({ ...form, costPrice: parseFloat(e.target.value) || 0 })} />
              </div>
              <div className="space-y-2">
                <Label>Preço Venda (R$)</Label>
                <Input type="number" step="0.01" value={form.salePrice || ""} onChange={(e) => setForm({ ...form, salePrice: parseFloat(e.target.value) || 0 })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave}>{editingId ? "Salvar" : "Cadastrar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={movementOpen} onOpenChange={setMovementOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Movimentar estoque</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-2">
              <Label>Produto</Label>
              <Select value={movement.productId} onValueChange={(value) => setMovement({ ...movement, productId: value ?? "" })}>
                <SelectTrigger><SelectValue placeholder="Selecione o produto" /></SelectTrigger>
                <SelectContent>{products.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>Tipo</Label>
                <Select value={movement.type} onValueChange={(value) => setMovement({ ...movement, type: (value ?? "Entrada") as StockMovementType })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Entrada">Entrada</SelectItem><SelectItem value="Baixa">Baixa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Data</Label><Input type="date" value={movement.date} onChange={(e) => setMovement({ ...movement, date: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>Quantidade</Label><Input type="number" min="1" value={movement.quantity} onChange={(e) => setMovement({ ...movement, quantity: Number(e.target.value) })} /></div>
              <div className="space-y-2"><Label>Custo unitário</Label><Input type="number" min="0" step="0.01" value={movement.unitCost || ""} onChange={(e) => setMovement({ ...movement, unitCost: Number(e.target.value) })} /></div>
            </div>
            <div className="space-y-2"><Label>Observação</Label><Input value={movement.note} onChange={(e) => setMovement({ ...movement, note: e.target.value })} placeholder="Ex: compra no fornecedor" /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setMovementOpen(false)}>Cancelar</Button><Button onClick={handleMovement}>Salvar movimentação</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {stockMovements.length > 0 && (
        <Card className="border-border/50">
          <CardContent className="p-4 sm:p-6">
            <div className="mb-4 flex items-center gap-2"><History className="h-4 w-4 text-primary" /><h3 className="font-semibold">Movimentações recentes</h3></div>
            <div className="space-y-2">
              {[...stockMovements].reverse().slice(0, 8).map((item) => {
                const product = products.find((p) => p.id === item.productId);
                return <div key={item.id} className="flex items-center justify-between gap-3 rounded-lg border border-border/50 p-3">
                  <div className="min-w-0"><p className="truncate text-sm font-medium">{product?.name ?? "Produto removido"}</p><p className="truncate text-xs text-muted-foreground">{item.date} · {item.note || item.type}</p></div>
                  <div className="flex shrink-0 items-center gap-2"><span className={`font-semibold ${item.type === "Entrada" || (item.type === "Ajuste" && item.quantity > 0) ? "text-orbi-emerald" : "text-orbi-rose"}`}>{item.type === "Entrada" ? "+" : item.type === "Baixa" ? "−" : item.quantity > 0 ? "+" : ""}{item.quantity}</span><Button variant="ghost" size="icon-sm" aria-label="Excluir movimentação" onClick={() => deleteStockMovement(item.id)}><Trash2 className="h-3.5 w-3.5" /></Button></div>
                </div>;
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function MobileMetric({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return <div className="rounded-lg bg-muted/60 p-2.5"><p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p><p className={`mt-0.5 truncate text-sm font-semibold ${highlight ? "text-orbi-rose" : ""}`}>{value}</p></div>;
}
