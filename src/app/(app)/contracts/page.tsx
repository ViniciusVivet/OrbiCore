"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { Plus, FileText, Pencil, Trash2, Shield } from "lucide-react";
import { useAppStore } from "@/components/store-provider";
import { currency, dateFormat, percent } from "@/lib/format";
import { monthsInYear, monthsNextYear, clientConcentration, mrrByRevenueType, churnRisk } from "@/lib/calculations";
import { Contract, ContractStatus, RevenueType } from "@/lib/types";
import { useSortable } from "@/hooks/use-sortable";
import { SortableHeader } from "@/components/sortable-header";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell, PieChart, Pie, CartesianGrid } from "recharts";

const COLORS = {
  cyan: "oklch(0.75 0.15 195)",
  blue: "oklch(0.65 0.15 250)",
  emerald: "oklch(0.7 0.17 155)",
  amber: "oklch(0.8 0.15 75)",
  rose: "oklch(0.65 0.2 15)",
  purple: "oklch(0.65 0.2 300)",
  muted: "oklch(0.28 0.01 260)",
  text: "oklch(0.65 0.01 260)",
  bg: "oklch(0.18 0.005 260)",
  border: "oklch(0.28 0.01 260)",
};

const PIE_COLORS = [COLORS.cyan, COLORS.blue, COLORS.emerald, COLORS.amber, COLORS.purple];

const statusColors: Record<ContractStatus, string> = {
  Ativo: "bg-orbi-emerald/20 text-orbi-emerald",
  Cancelado: "bg-orbi-rose/20 text-orbi-rose",
  Inativo: "bg-muted text-muted-foreground",
};

type FormData = Omit<Contract, "id" | "createdAt">;

const emptyForm: FormData = {
  saleDate: new Date().toISOString().split("T")[0],
  client: "",
  monthlyFee: 0,
  durationMonths: 12,
  status: "Ativo",
  revenueType: "Novo",
  onboardingValue: 0,
  upsellCrossSellValue: 0,
};

type ContractRow = Contract & { mrrYear: number; mrrNextYear: number; mInYear: number };

export default function ContractsPage() {
  const { data, loaded, addContract, updateContract, deleteContract } = useAppStore();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [statusFilter, setStatusFilter] = useState<string>("Todos");

  const year = loaded ? data.profile.currentYear : new Date().getFullYear();
  const filtered = loaded
    ? data.contracts.filter((c) => statusFilter === "Todos" || c.status === statusFilter)
    : [];

  const enriched: ContractRow[] = filtered.map((c) => {
    const mInYear = monthsInYear(c.saleDate, c.durationMonths, year);
    const mNext = monthsNextYear(c.saleDate, c.durationMonths, year);
    return { ...c, mInYear, mrrYear: c.monthlyFee * mInYear, mrrNextYear: c.monthlyFee * mNext };
  });

  const { sorted: contracts, sortKey, sortDir, toggleSort } = useSortable<ContractRow>(enriched);

  if (!loaded) return null;

  function openNew() {
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  }

  function openEdit(c: Contract) {
    setEditingId(c.id);
    setForm({
      saleDate: c.saleDate,
      client: c.client,
      monthlyFee: c.monthlyFee,
      durationMonths: c.durationMonths,
      status: c.status,
      revenueType: c.revenueType,
      onboardingValue: c.onboardingValue,
      upsellCrossSellValue: c.upsellCrossSellValue,
    });
    setDialogOpen(true);
  }

  function handleSave() {
    if (!form.client || !form.monthlyFee) return;
    if (editingId) {
      updateContract(editingId, form);
    } else {
      addContract(form);
    }
    setDialogOpen(false);
  }

  const totalMRR = data.contracts
    .filter((c) => c.status === "Ativo")
    .reduce((s, c) => s + c.monthlyFee, 0);

  // Insights
  const concentration = clientConcentration(data.contracts);
  const revenueByType = mrrByRevenueType(data.contracts);
  const churn = churnRisk(data.contracts, year, 3);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Contratos</h2>
          <p className="text-muted-foreground">
            Gerencie seus contratos e receita recorrente
          </p>
        </div>
        <Button onClick={openNew} className="gap-2">
          <Plus className="h-4 w-4" />
          Novo Contrato
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-border/50">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">MRR Ativo</p>
            <p className="text-2xl font-bold text-orbi-cyan">{currency(totalMRR)}</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Contratos Ativos</p>
            <p className="text-2xl font-bold">{data.contracts.filter((c) => c.status === "Ativo").length}</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Ticket Medio</p>
            <p className="text-2xl font-bold">
              {data.contracts.filter((c) => c.status === "Ativo").length > 0
                ? currency(totalMRR / data.contracts.filter((c) => c.status === "Ativo").length)
                : "—"}
            </p>
          </CardContent>
        </Card>
        <Card className={`border-border/50 ${churn.count > 0 ? "border-orbi-rose/30" : ""}`}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-orbi-rose" />
              <p className="text-sm text-muted-foreground">Risco Churn (90d)</p>
            </div>
            <p className="text-2xl font-bold">{churn.count > 0 ? `${churn.count} (${percent(churn.percentOfTotal)})` : "Seguro"}</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Client concentration */}
        {concentration.length > 0 && (
          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Concentracao de Clientes</CardTitle>
              <CardDescription>Distribuicao do MRR — clientes em amarelo representam &gt;35%</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={concentration} layout="vertical" margin={{ left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={COLORS.muted} horizontal={false} />
                    <XAxis type="number" stroke={COLORS.text} fontSize={11} tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`} />
                    <YAxis type="category" dataKey="client" stroke={COLORS.text} fontSize={10} width={120} />
                    <Tooltip
                      contentStyle={{ background: COLORS.bg, border: `1px solid ${COLORS.border}`, borderRadius: "8px" }}
                      formatter={(value) => [currency(Number(value)), "MRR"]}
                    />
                    <Bar dataKey="mrr" radius={[0, 4, 4, 0]}>
                      {concentration.map((c, i) => (
                        <Cell key={i} fill={c.percent > 0.35 ? COLORS.amber : COLORS.cyan} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Revenue type */}
        {revenueByType.length > 0 && (
          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Receita por Tipo</CardTitle>
              <CardDescription>Composicao: Novo, Onboarding, Upsell, Cross-sell</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[200px] flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={revenueByType}
                      dataKey="value"
                      nameKey="type"
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={75}
                      strokeWidth={2}
                      stroke="oklch(0.15 0.005 260)"
                      label={(props) => `${props.name}: ${currency(Number(props.value))}`}
                    >
                      {revenueByType.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ background: COLORS.bg, border: `1px solid ${COLORS.border}`, borderRadius: "8px" }}
                      formatter={(value) => [currency(Number(value)), ""]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        {["Todos", "Ativo", "Cancelado", "Inativo"].map((s) => (
          <Button
            key={s}
            variant={statusFilter === s ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter(s)}
          >
            {s}
          </Button>
        ))}
      </div>

      {/* Table */}
      <Card className="border-border/50">
        <CardContent className="p-0">
          {contracts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="rounded-full bg-muted p-6 mb-4">
                <FileText className="h-10 w-10 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Nenhum contrato encontrado</h3>
              <Button onClick={openNew} className="mt-4 gap-2">
                <Plus className="h-4 w-4" />
                Cadastrar contrato
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <thead>
                  <tr className="border-b">
                    <SortableHeader label="Data" sortKey={"saleDate" as keyof ContractRow} currentKey={sortKey} direction={sortDir} onSort={toggleSort} />
                    <SortableHeader label="Cliente" sortKey={"client" as keyof ContractRow} currentKey={sortKey} direction={sortDir} onSort={toggleSort} />
                    <SortableHeader label="Fee Mensal" sortKey={"monthlyFee" as keyof ContractRow} currentKey={sortKey} direction={sortDir} onSort={toggleSort} className="text-right" />
                    <SortableHeader label="Duracao" sortKey={"durationMonths" as keyof ContractRow} currentKey={sortKey} direction={sortDir} onSort={toggleSort} className="text-center" />
                    <SortableHeader label="Meses Ano" sortKey={"mInYear" as keyof ContractRow} currentKey={sortKey} direction={sortDir} onSort={toggleSort} className="text-center" />
                    <SortableHeader label="MRR Ano" sortKey={"mrrYear" as keyof ContractRow} currentKey={sortKey} direction={sortDir} onSort={toggleSort} className="text-right" />
                    <SortableHeader label="MRR Prox" sortKey={"mrrNextYear" as keyof ContractRow} currentKey={sortKey} direction={sortDir} onSort={toggleSort} className="text-right" />
                    <SortableHeader label="Status" sortKey={"status" as keyof ContractRow} currentKey={sortKey} direction={sortDir} onSort={toggleSort} className="text-center" />
                    <SortableHeader label="Tipo" sortKey={"revenueType" as keyof ContractRow} currentKey={sortKey} direction={sortDir} onSort={toggleSort} className="text-center" />
                    <th className="h-10 px-4 text-right text-sm font-medium text-muted-foreground">Acoes</th>
                  </tr>
                </thead>
                <TableBody>
                  {contracts.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="whitespace-nowrap">{dateFormat(c.saleDate)}</TableCell>
                      <TableCell className="font-medium">{c.client}</TableCell>
                      <TableCell className="text-right">{currency(c.monthlyFee)}</TableCell>
                      <TableCell className="text-center">{c.durationMonths}m</TableCell>
                      <TableCell className="text-center">{c.mInYear}</TableCell>
                      <TableCell className="text-right">{currency(c.mrrYear)}</TableCell>
                      <TableCell className="text-right">{currency(c.mrrNextYear)}</TableCell>
                      <TableCell className="text-center">
                        <Badge className={statusColors[c.status]}>{c.status}</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline">{c.revenueType}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(c)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => deleteContract(c.id)}>
                            <Trash2 className="h-4 w-4 text-orbi-rose" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar Contrato" : "Novo Contrato"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Data da Venda</Label>
                <Input type="date" value={form.saleDate} onChange={(e) => setForm({ ...form, saleDate: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Cliente</Label>
                <Input value={form.client} onChange={(e) => setForm({ ...form, client: e.target.value })} placeholder="Nome do cliente" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Fee Mensal (R$)</Label>
                <Input type="number" step="0.01" value={form.monthlyFee || ""} onChange={(e) => setForm({ ...form, monthlyFee: parseFloat(e.target.value) || 0 })} />
              </div>
              <div className="space-y-2">
                <Label>Duracao (meses)</Label>
                <Input type="number" value={form.durationMonths || ""} onChange={(e) => setForm({ ...form, durationMonths: parseInt(e.target.value) || 0 })} />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as ContractStatus })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Ativo">Ativo</SelectItem>
                    <SelectItem value="Cancelado">Cancelado</SelectItem>
                    <SelectItem value="Inativo">Inativo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Tipo de Receita</Label>
                <Select value={form.revenueType} onValueChange={(v) => setForm({ ...form, revenueType: v as RevenueType })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Novo">Novo</SelectItem>
                    <SelectItem value="Onboarding">Onboarding</SelectItem>
                    <SelectItem value="Upsell">Upsell</SelectItem>
                    <SelectItem value="Cross-sell">Cross-sell</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Valor Onboarding (R$)</Label>
                <Input type="number" step="0.01" value={form.onboardingValue || ""} onChange={(e) => setForm({ ...form, onboardingValue: parseFloat(e.target.value) || 0 })} />
              </div>
              <div className="space-y-2">
                <Label>Valor Upsell/Cross-sell (R$)</Label>
                <Input type="number" step="0.01" value={form.upsellCrossSellValue || ""} onChange={(e) => setForm({ ...form, upsellCrossSellValue: parseFloat(e.target.value) || 0 })} />
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
