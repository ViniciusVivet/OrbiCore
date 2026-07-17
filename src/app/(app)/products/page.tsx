"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Trash2, Package, AlertTriangle, ArrowDownToLine, History, Search, Boxes, Banknote, ShoppingCart, Eye } from "lucide-react";
import { useAppStore } from "@/components/store-provider";
import { currency, percent } from "@/lib/format";
import { productStock, productNeedsRestock, productStockStatus, suggestedRestockQuantity } from "@/lib/calculations";
import { Product, StockMovement, StockMovementType } from "@/lib/types";
import { toast } from "sonner";

type FormData = Omit<Product, "id" | "createdAt">;
type MovementForm = Omit<StockMovement, "id" | "createdAt"> & {
  reason: NonNullable<StockMovement["reason"]>;
  unitCost: number;
  note: string;
};

const emptyForm: FormData = {
  name: "",
  sku: "",
  unit: "un.",
  category: "",
  supplier: "",
  initialQty: 0,
  entries: 0,
  minStock: 10,
  idealStock: 20,
  costPrice: 0,
  salePrice: 0,
};

export default function ProductsPage() {
  const { data, loaded, addProduct, updateProduct, deleteProduct, addStockMovement, deleteStockMovement } = useAppStore();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [movementOpen, setMovementOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [movement, setMovement] = useState<MovementForm>({
    productId: "", date: new Date().toISOString().split("T")[0],
    type: "Entrada" as StockMovementType, quantity: 1, unitCost: 0, reason: "Reposição", note: "",
  });

  const { products, sales, stockMovements } = data;

  const totalValue = products.reduce((s, p) => s + productStock(p, sales, stockMovements) * p.costPrice, 0);
  const potentialValue = products.reduce((s, p) => s + Math.max(0, productStock(p, sales, stockMovements)) * p.salePrice, 0);
  const totalUnits = products.reduce((s, p) => s + Math.max(0, productStock(p, sales, stockMovements)), 0);
  const restockCount = products.filter((p) => productNeedsRestock(p, sales, stockMovements)).length;
  const outOfStockCount = products.filter((p) => productStockStatus(p, sales, stockMovements) === "out").length;
  const categories = [...new Set(products.map((p) => p.category).filter(Boolean))].sort();
  const filteredProducts = useMemo(() => products.filter((product) => {
    const term = search.trim().toLocaleLowerCase("pt-BR");
    const matchesSearch = !term || [product.name, product.sku, product.category, product.supplier]
      .some((value) => value?.toLocaleLowerCase("pt-BR").includes(term));
    const status = productStockStatus(product, sales, stockMovements);
    return matchesSearch
      && (statusFilter === "all" || status === statusFilter)
      && (categoryFilter === "all" || product.category === categoryFilter);
  }), [products, sales, stockMovements, search, statusFilter, categoryFilter]);
  const stockChartData = products.map((product) => ({
    name: product.name,
    estoque: Math.max(0, productStock(product, sales, stockMovements)),
    minimo: product.minStock,
  })).sort((a, b) => a.estoque - b.estoque).slice(0, 8);
  const salesByProduct = products.map((product) => ({
    name: product.name,
    vendidos: sales.filter((sale) => sale.productId === product.id).reduce((sum, sale) => sum + sale.quantity, 0),
  })).filter((item) => item.vendidos > 0).sort((a, b) => b.vendidos - a.vendidos).slice(0, 8);
  const selectedProduct = products.find((product) => product.id === detailId);

  function openNew() {
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  }

  function openEdit(p: Product) {
    setEditingId(p.id);
    setForm({
      name: p.name, sku: p.sku ?? "", unit: p.unit ?? "un.", category: p.category, supplier: p.supplier,
      initialQty: p.initialQty, entries: p.entries, minStock: p.minStock,
      idealStock: p.idealStock ?? p.minStock * 2, costPrice: p.costPrice, salePrice: p.salePrice,
      active: p.active ?? true,
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
    const product = products.find((item) => item.id === productId);
    const suggestion = product ? suggestedRestockQuantity(product, sales, stockMovements) : 0;
    setMovement({ productId, date: new Date().toISOString().split("T")[0], type: "Entrada", quantity: suggestion || 1, unitCost: product?.costPrice ?? 0, reason: "Reposição", note: "" });
    setMovementOpen(true);
  }

  function handleMovement() {
    if (!movement.productId || movement.quantity === 0) return;
    const product = products.find((item) => item.id === movement.productId);
    if (movement.type === "Baixa" && product && movement.quantity > productStock(product, sales, stockMovements)) {
      toast.error("A saída é maior que o estoque disponível.");
      return;
    }
    addStockMovement({ ...movement, quantity: Math.abs(movement.quantity) });
    setMovementOpen(false);
  }

  if (!loaded) return null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Produtos e Estoque</h2>
          <p className="text-muted-foreground">Controle simples de produtos, reposições, vendas e saldo</p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex">
          <Button variant="outline" className="min-h-11 gap-2" render={<Link href="/sales" />}>
            <ShoppingCart className="h-4 w-4" />Registrar venda
          </Button>
          <Button variant="outline" onClick={() => openMovement()} className="min-h-11 gap-2" disabled={products.length === 0}>
            <ArrowDownToLine className="h-4 w-4" />Adicionar estoque
          </Button>
          <Button onClick={openNew} className="min-h-11 gap-2"><Plus className="h-4 w-4" />Novo Produto</Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <StockMetric label="Produtos" value={String(products.length)} icon={<Package className="h-4 w-4 text-orbi-cyan" />} />
        <StockMetric label="Unidades" value={String(totalUnits)} icon={<Boxes className="h-4 w-4 text-orbi-blue" />} />
        <StockMetric label="Valor em estoque" value={currency(totalValue)} icon={<Banknote className="h-4 w-4 text-orbi-emerald" />} />
        <StockMetric label="Venda potencial" value={currency(potentialValue)} icon={<ShoppingCart className="h-4 w-4 text-orbi-emerald" />} />
        <StockMetric label="Para repor" value={String(restockCount)} alert={restockCount > 0} icon={<AlertTriangle className="h-4 w-4 text-orbi-amber" />} />
        <StockMetric label="Sem estoque" value={String(outOfStockCount)} alert={outOfStockCount > 0} icon={<AlertTriangle className="h-4 w-4 text-orbi-rose" />} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <StockChart title="Menores estoques" data={stockChartData} primaryKey="estoque" secondaryKey="minimo" />
        <StockChart title="Produtos mais vendidos" data={salesByProduct} primaryKey="vendidos" />
      </div>

      <Card className="border-border/50">
        <CardContent className="grid gap-3 p-4 md:grid-cols-[1fr_220px_180px]">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input className="pl-9" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por nome, código, categoria ou fornecedor" />
          </div>
          <Select value={categoryFilter} onValueChange={(value) => setCategoryFilter(value ?? "all")}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="all">Todas as categorias</SelectItem>{categories.map((category) => <SelectItem key={category} value={category}>{category}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value ?? "all")}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="all">Todas as situações</SelectItem><SelectItem value="ok">Estoque normal</SelectItem><SelectItem value="low">Estoque baixo</SelectItem><SelectItem value="out">Sem estoque</SelectItem></SelectContent>
          </Select>
        </CardContent>
      </Card>

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
              {filteredProducts.map((p) => {
                const stock = productStock(p, sales, stockMovements);
                const status = productStockStatus(p, sales, stockMovements);
                const margin = p.salePrice > 0 ? (p.salePrice - p.costPrice) / p.salePrice : 0;
                return (
                  <article key={p.id} className="rounded-xl border border-border/60 bg-card p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="truncate font-semibold">{p.name}</h3>
                        <p className="truncate text-xs text-muted-foreground">{p.sku ? `${p.sku} · ` : ""}{p.category || "Sem categoria"} · {p.supplier || "Sem fornecedor"}</p>
                      </div>
                      <Badge className={status === "ok" ? "bg-orbi-emerald/20 text-orbi-emerald" : "bg-orbi-rose/20 text-orbi-rose"}>
                        {status === "out" ? "Esgotado" : status === "low" ? "Repor" : "Em dia"}
                      </Badge>
                    </div>
                    <div className="mt-4 grid grid-cols-3 gap-2">
                      <MobileMetric label="Estoque" value={`${stock} ${p.unit ?? "un."}`} highlight={status !== "ok"} />
                      <MobileMetric label="Venda" value={currency(p.salePrice)} />
                      <MobileMetric label="Margem" value={percent(margin, 0)} />
                    </div>
                    <div className="mt-4 grid grid-cols-[1fr_auto_auto_auto] gap-2 border-t border-border/50 pt-3">
                      <Button variant="outline" className="min-h-11 justify-start gap-2" onClick={() => openMovement(p.id)}>
                        <ArrowDownToLine className="h-4 w-4" />Movimentar
                      </Button>
                      <Button variant="ghost" size="icon" className="h-11 w-11" aria-label={`Ver ${p.name}`} onClick={() => setDetailId(p.id)}><Eye className="h-4 w-4" /></Button>
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
                  {filteredProducts.map((p) => {
                    const stock = productStock(p, sales, stockMovements);
                    const status = productStockStatus(p, sales, stockMovements);
                    const profit = p.salePrice - p.costPrice;
                    const margin = p.salePrice > 0 ? profit / p.salePrice : 0;
                    return (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium"><button className="text-left hover:underline" onClick={() => setDetailId(p.id)}>{p.name}</button>{p.sku && <p className="text-xs font-normal text-muted-foreground">{p.sku}</p>}</TableCell>
                        <TableCell>{p.category}</TableCell>
                        <TableCell>{p.supplier}</TableCell>
                        <TableCell className="text-center">{stock} {p.unit ?? "un."}</TableCell>
                        <TableCell className="text-center">{p.minStock}</TableCell>
                        <TableCell className="text-right">{currency(p.costPrice)}</TableCell>
                        <TableCell className="text-right">{currency(p.salePrice)}</TableCell>
                        <TableCell className="text-right">{currency(profit)}</TableCell>
                        <TableCell className="text-center">{percent(margin, 0)}</TableCell>
                        <TableCell className="text-center">
                          <Badge className={status === "ok" ? "bg-orbi-emerald/20 text-orbi-emerald" : "bg-orbi-rose/20 text-orbi-rose"}>
                            {status === "out" ? "ESGOTADO" : status === "low" ? "REPOR" : "OK"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" onClick={() => openMovement(p.id)}><ArrowDownToLine className="h-4 w-4" /></Button>
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
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Código / SKU</Label>
                <Input value={form.sku ?? ""} onChange={(e) => setForm({ ...form, sku: e.target.value })} placeholder="Ex: CAM-001" />
              </div>
              <div className="space-y-2">
                <Label>Unidade</Label>
                <Select value={form.unit ?? "un."} onValueChange={(value) => setForm({ ...form, unit: value ?? "un." })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="un.">Unidade</SelectItem><SelectItem value="kg">Quilo</SelectItem><SelectItem value="m">Metro</SelectItem><SelectItem value="cx">Caixa</SelectItem><SelectItem value="pct">Pacote</SelectItem></SelectContent>
                </Select>
              </div>
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
            <div className="space-y-2">
              <Label>Estoque ideal para reposição</Label>
              <Input type="number" min="0" value={form.idealStock || ""} onChange={(e) => setForm({ ...form, idealStock: parseInt(e.target.value) || 0 })} />
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
                <Select value={movement.type} onValueChange={(value) => {
                  const type = (value ?? "Entrada") as StockMovementType;
                  setMovement({ ...movement, type, reason: type === "Entrada" ? "Reposição" : "Perda" });
                }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Entrada">Entrada</SelectItem><SelectItem value="Baixa">Baixa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Data</Label><Input type="date" value={movement.date} onChange={(e) => setMovement({ ...movement, date: e.target.value })} /></div>
            </div>
            <div className="space-y-2">
              <Label>Motivo</Label>
              <Select value={movement.reason} onValueChange={(value) => setMovement({ ...movement, reason: (value ?? "Reposição") as typeof movement.reason })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {movement.type === "Entrada" ? <><SelectItem value="Reposição">Compra ou reposição</SelectItem><SelectItem value="Devolução">Devolução recebida</SelectItem><SelectItem value="Correção">Correção de estoque</SelectItem></> : <><SelectItem value="Perda">Perda</SelectItem><SelectItem value="Avaria">Avaria</SelectItem><SelectItem value="Uso interno">Uso interno</SelectItem><SelectItem value="Correção">Correção de estoque</SelectItem></>}
                </SelectContent>
              </Select>
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

      <Dialog open={Boolean(selectedProduct)} onOpenChange={(open) => !open && setDetailId(null)}>
        <DialogContent className="sm:max-w-2xl">
          {selectedProduct && (() => {
            const stock = productStock(selectedProduct, sales, stockMovements);
            const sold = sales.filter((sale) => sale.productId === selectedProduct.id).reduce((sum, sale) => sum + sale.quantity, 0);
            const movements = stockMovements.filter((item) => item.productId === selectedProduct.id).slice().reverse();
            const status = productStockStatus(selectedProduct, sales, stockMovements);
            return <>
              <DialogHeader><DialogTitle>{selectedProduct.name}</DialogTitle></DialogHeader>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <MobileMetric label="Estoque atual" value={`${stock} ${selectedProduct.unit ?? "un."}`} highlight={status !== "ok"} />
                <MobileMetric label="Total vendido" value={`${sold} ${selectedProduct.unit ?? "un."}`} />
                <MobileMetric label="Valor em estoque" value={currency(Math.max(0, stock) * selectedProduct.costPrice)} />
                <MobileMetric label="Sugestão de compra" value={`${suggestedRestockQuantity(selectedProduct, sales, stockMovements)} ${selectedProduct.unit ?? "un."}`} highlight={status !== "ok"} />
              </div>
              <div className="grid gap-2 rounded-xl border border-border/50 p-4 text-sm sm:grid-cols-2">
                <p><span className="text-muted-foreground">Código:</span> {selectedProduct.sku || "Não informado"}</p>
                <p><span className="text-muted-foreground">Categoria:</span> {selectedProduct.category || "Sem categoria"}</p>
                <p><span className="text-muted-foreground">Fornecedor:</span> {selectedProduct.supplier || "Não informado"}</p>
                <p><span className="text-muted-foreground">Margem:</span> {percent(selectedProduct.salePrice > 0 ? (selectedProduct.salePrice - selectedProduct.costPrice) / selectedProduct.salePrice : 0, 0)}</p>
              </div>
              <div>
                <h3 className="mb-2 font-semibold">Histórico de estoque</h3>
                {movements.length === 0 ? <p className="rounded-lg bg-muted/50 p-4 text-sm text-muted-foreground">Nenhuma movimentação registrada.</p> : <div className="max-h-52 space-y-2 overflow-y-auto">{movements.map((item) => <div key={item.id} className="flex items-center justify-between rounded-lg border border-border/50 p-3 text-sm"><div><p className="font-medium">{item.reason ?? item.type}</p><p className="text-xs text-muted-foreground">{item.date}{item.note ? ` · ${item.note}` : ""}</p></div><span className={item.type === "Entrada" ? "font-semibold text-orbi-emerald" : "font-semibold text-orbi-rose"}>{item.type === "Entrada" ? "+" : "−"}{item.quantity}</span></div>)}</div>}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => openEdit(selectedProduct)}><Pencil className="h-4 w-4" />Editar</Button>
                <Button onClick={() => { setDetailId(null); openMovement(selectedProduct.id); }}><ArrowDownToLine className="h-4 w-4" />Movimentar estoque</Button>
              </DialogFooter>
            </>;
          })()}
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
                  <div className="min-w-0"><p className="truncate text-sm font-medium">{product?.name ?? "Produto removido"}</p><p className="truncate text-xs text-muted-foreground">{item.date} · {item.reason || item.note || item.type}</p></div>
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

function StockMetric({ label, value, icon, alert = false }: { label: string; value: string; icon: React.ReactNode; alert?: boolean }) {
  return <Card className="border-border/50"><CardContent className="pt-5"><div className="mb-1 flex items-center gap-2">{icon}<p className="truncate text-xs text-muted-foreground">{label}</p></div><p className={`truncate text-xl font-bold ${alert ? "text-orbi-rose" : ""}`}>{value}</p></CardContent></Card>;
}

function StockChart({ title, data, primaryKey, secondaryKey }: { title: string; data: { name: string; [key: string]: string | number }[]; primaryKey: string; secondaryKey?: string }) {
  return <Card className="border-border/50"><CardHeader><CardTitle className="text-base">{title}</CardTitle></CardHeader><CardContent>{data.length === 0 ? <p className="py-14 text-center text-sm text-muted-foreground">Os dados aparecerão aqui.</p> : <div className="h-56"><ResponsiveContainer width="100%" height="100%"><BarChart data={data} margin={{ left: -22, right: 4 }}><CartesianGrid strokeDasharray="3 3" className="stroke-border" /><XAxis dataKey="name" fontSize={10} tickFormatter={(value: string) => value.length > 10 ? `${value.slice(0, 10)}…` : value} /><YAxis fontSize={10} /><Tooltip contentStyle={{ borderRadius: 8 }} /><Bar dataKey={primaryKey} fill="oklch(0.75 0.15 195)" radius={[4, 4, 0, 0]} />{secondaryKey && <Bar dataKey={secondaryKey} fill="oklch(0.7 0.17 155)" radius={[4, 4, 0, 0]} />}</BarChart></ResponsiveContainer></div>}</CardContent></Card>;
}
