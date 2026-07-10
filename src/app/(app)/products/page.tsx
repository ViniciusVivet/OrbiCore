"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Trash2, Package, AlertTriangle } from "lucide-react";
import { useAppStore } from "@/components/store-provider";
import { currency, percent } from "@/lib/format";
import { productStock, productNeedsRestock } from "@/lib/calculations";
import { Product } from "@/lib/types";

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
  const { data, loaded, addProduct, updateProduct, deleteProduct } = useAppStore();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);

  if (!loaded) return null;

  const { products, sales } = data;

  const totalValue = products.reduce((s, p) => s + productStock(p, sales) * p.costPrice, 0);
  const restockCount = products.filter((p) => productNeedsRestock(p, sales)).length;

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Produtos</h2>
          <p className="text-muted-foreground">Catalogo de produtos com custo, preco e margem</p>
        </div>
        <Button onClick={openNew} className="gap-2"><Plus className="h-4 w-4" />Novo Produto</Button>
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
              <p className="text-sm text-muted-foreground">Alertas de Reposicao</p>
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
            <div className="overflow-x-auto">
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
                    <TableHead className="text-right">Acoes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map((p) => {
                    const stock = productStock(p, sales);
                    const needsRestock = productNeedsRestock(p, sales);
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
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Qtd Inicial</Label>
                <Input type="number" value={form.initialQty || ""} onChange={(e) => setForm({ ...form, initialQty: parseInt(e.target.value) || 0 })} />
              </div>
              <div className="space-y-2">
                <Label>Entradas</Label>
                <Input type="number" value={form.entries || ""} onChange={(e) => setForm({ ...form, entries: parseInt(e.target.value) || 0 })} />
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
                <Label>Preco Venda (R$)</Label>
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
    </div>
  );
}
