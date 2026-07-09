"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, FileText, Pencil, Trash2, TrendingUp } from "lucide-react";
import { useAppStore } from "@/components/store-provider";
import { currency, dateFormat, shortMonthName } from "@/lib/format";
import { monthsInYear, monthsNextYear } from "@/lib/calculations";
import { Contract, ContractStatus, RevenueType } from "@/lib/types";

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

export default function ContractsPage() {
  const { data, loaded, addContract, updateContract, deleteContract } = useAppStore();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [statusFilter, setStatusFilter] = useState<string>("Todos");

  if (!loaded) return null;

  const year = data.profile.currentYear;
  const contracts = data.contracts.filter(
    (c) => statusFilter === "Todos" || c.status === statusFilter
  );

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
      <div className="grid gap-4 md:grid-cols-3">
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
            <p className="text-sm text-muted-foreground">Total Cadastrados</p>
            <p className="text-2xl font-bold">{data.contracts.length}</p>
          </CardContent>
        </Card>
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
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead className="text-right">Fee Mensal</TableHead>
                    <TableHead className="text-center">Duracao</TableHead>
                    <TableHead className="text-center">Meses no Ano</TableHead>
                    <TableHead className="text-right">MRR Ano</TableHead>
                    <TableHead className="text-right">MRR Prox. Ano</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-center">Tipo</TableHead>
                    <TableHead className="text-right">Acoes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contracts.map((c) => {
                    const mInYear = monthsInYear(c.saleDate, c.durationMonths, year);
                    const mNextYear = monthsNextYear(c.saleDate, c.durationMonths, year);
                    const d = new Date(c.saleDate);
                    const entryMonth = shortMonthName(d.getMonth() + 1);
                    return (
                      <TableRow key={c.id}>
                        <TableCell className="whitespace-nowrap">{dateFormat(c.saleDate)}</TableCell>
                        <TableCell className="font-medium">{c.client}</TableCell>
                        <TableCell className="text-right">{currency(c.monthlyFee)}</TableCell>
                        <TableCell className="text-center">{c.durationMonths}m</TableCell>
                        <TableCell className="text-center">{mInYear}</TableCell>
                        <TableCell className="text-right">{currency(c.monthlyFee * mInYear)}</TableCell>
                        <TableCell className="text-right">{currency(c.monthlyFee * mNextYear)}</TableCell>
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
                    );
                  })}
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
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Data da Venda</Label>
                <Input
                  type="date"
                  value={form.saleDate}
                  onChange={(e) => setForm({ ...form, saleDate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Cliente</Label>
                <Input
                  value={form.client}
                  onChange={(e) => setForm({ ...form, client: e.target.value })}
                  placeholder="Nome do cliente"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Fee Mensal (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.monthlyFee || ""}
                  onChange={(e) => setForm({ ...form, monthlyFee: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label>Duracao (meses)</Label>
                <Input
                  type="number"
                  value={form.durationMonths || ""}
                  onChange={(e) => setForm({ ...form, durationMonths: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
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
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Valor Onboarding (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.onboardingValue || ""}
                  onChange={(e) => setForm({ ...form, onboardingValue: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label>Valor Upsell/Cross-sell (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.upsellCrossSellValue || ""}
                  onChange={(e) => setForm({ ...form, upsellCrossSellValue: parseFloat(e.target.value) || 0 })}
                />
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
