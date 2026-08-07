"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { Plus, FileText, Pencil, Trash2, Shield, TrendingUp, CircleHelp } from "lucide-react";
import { useAppStore } from "@/components/store-provider";
import { currency, dateFormat, percent } from "@/lib/format";
import { monthsInYear, clientConcentration, mrrByRevenueType, churnRisk, contractFeeAt, contractRevenueInYear, parseLocalDate } from "@/lib/calculations";
import { Contract, ContractStatus, RevenueType } from "@/lib/types";
import { useSortable } from "@/hooks/use-sortable";
import { SortableHeader } from "@/components/sortable-header";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell, PieChart, Pie, CartesianGrid } from "recharts";
import { chartTokens, chartSeries, chartTooltipStyle } from "@/lib/chart-theme";
import { toast } from "sonner";
import { CurrencyInput } from "@/components/currency-input";

const COLORS = {
  cyan: chartTokens.cyan,
  amber: chartTokens.amber,
  muted: chartTokens.grid,
  text: chartTokens.axis,
};

const PIE_COLORS = chartSeries;

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
  feeHistory: [],
};

type ContractRow = Contract & {
  currentFee: number;
  nextYearFee: number;
  mrrYear: number;
  mrrNextYear: number;
  mInYear: number;
};

export default function ContractsPage() {
  const { data, loaded, addContract, updateContract, deleteContract } = useAppStore();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [formNextYearFee, setFormNextYearFee] = useState(0);
  const [formNextYearTouched, setFormNextYearTouched] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("Todos");
  const [planningContract, setPlanningContract] = useState<Contract | null>(null);
  const [plannedMonthlyFee, setPlannedMonthlyFee] = useState(0);
  const [planningYear, setPlanningYear] = useState(new Date().getFullYear() + 1);

  const year = loaded ? data.profile.currentYear : new Date().getFullYear();
  const filtered = loaded
    ? data.contracts.filter((c) => statusFilter === "Todos" || c.status === statusFilter)
    : [];

  const enriched: ContractRow[] = filtered.map((c) => {
    const mInYear = monthsInYear(c.saleDate, c.durationMonths, year);
    const now = new Date();
    return {
      ...c,
      currentFee: contractFeeAt(c, now.getFullYear(), now.getMonth() + 1),
      nextYearFee: contractFeeAt(c, year + 1, 1),
      mInYear,
      mrrYear: contractRevenueInYear(c, year),
      mrrNextYear: contractRevenueInYear(c, year + 1),
    };
  });

  const { sorted: contracts, sortKey, sortDir, toggleSort } = useSortable<ContractRow>(enriched);

  if (!loaded) return null;

  function openNew() {
    setEditingId(null);
    setForm(emptyForm);
    setFormNextYearFee(0);
    setFormNextYearTouched(false);
    setDialogOpen(true);
  }

  function openEdit(c: Contract) {
    setEditingId(c.id);
    setForm({
      saleDate: c.saleDate,
      client: c.client,
      monthlyFee: contractFeeAt(c, new Date().getFullYear(), new Date().getMonth() + 1),
      durationMonths: c.durationMonths,
      status: c.status,
      revenueType: c.revenueType,
      onboardingValue: c.onboardingValue,
      upsellCrossSellValue: c.upsellCrossSellValue,
      feeHistory: [...(c.feeHistory ?? [])],
    });
    setFormNextYearFee(contractFeeAt(c, year + 1, 1));
    setFormNextYearTouched(false);
    setDialogOpen(true);
  }

  function handleSave() {
    if (!form.client.trim()) {
      toast.error("Informe o nome do cliente para salvar o contrato.");
      return;
    }
    if (form.monthlyFee <= 0) {
      toast.error("Informe um fee mensal maior que zero. Ex.: 20 significa R$ 20,00.");
      return;
    }
    if (!form.saleDate || form.durationMonths <= 0) {
      toast.error("Confira a data da venda e a duração do contrato.");
      return;
    }
    let durationMonths = form.durationMonths;
    let feeHistory = [...(form.feeHistory ?? [])];
    const existingContract = editingId
      ? data.contracts.find((contract) => contract.id === editingId)
      : undefined;
    if (existingContract) {
      const now = new Date();
      const effectiveMonth = year === now.getFullYear() ? now.getMonth() + 1 : 1;
      const previousCurrentFee = contractFeeAt(existingContract, year, effectiveMonth);
      if (form.monthlyFee !== previousCurrentFee) {
        const effectiveFrom = `${year}-${String(effectiveMonth).padStart(2, "0")}`;
        feeHistory = [
          ...feeHistory.filter((change) => change.effectiveFrom !== effectiveFrom),
          { effectiveFrom, monthlyFee: form.monthlyFee },
        ];
      }
    }
    if (formNextYearTouched && formNextYearFee > 0) {
      feeHistory = [
        ...feeHistory.filter((change) => change.effectiveFrom !== `${year + 1}-01`),
        { effectiveFrom: `${year + 1}-01`, monthlyFee: formNextYearFee },
      ];
      if (monthsInYear(form.saleDate, durationMonths, year + 1) === 0) {
        const start = parseLocalDate(form.saleDate);
        const startIndex = start.getFullYear() * 12 + start.getMonth() + 1;
        durationMonths = Math.max(durationMonths, (year + 1) * 12 + 12 - startIndex + 1);
      }
    }
    const normalizedForm = {
      ...form,
      monthlyFee: existingContract?.monthlyFee ?? form.monthlyFee,
      durationMonths,
      feeHistory: feeHistory
        .filter((change) => change.effectiveFrom && change.monthlyFee > 0)
        .sort((a, b) => a.effectiveFrom.localeCompare(b.effectiveFrom)),
    };
    if (editingId) {
      updateContract(editingId, normalizedForm);
      toast.success(`Contrato e MRR atualizados. ${formNextYearTouched ? `Planejamento de ${year + 1} incluído. ` : ""}Sincronizando com a nuvem.`);
    } else {
      addContract(normalizedForm);
      toast.success("Contrato cadastrado. Sincronizando com a nuvem.");
    }
    setDialogOpen(false);
  }

  function historyWithPlannedFee(contract: Contract, monthlyFee: number, targetYear = planningYear) {
    const effectiveFrom = `${targetYear}-01`;
    return [
      ...(contract.feeHistory ?? []).filter((change) => change.effectiveFrom !== effectiveFrom),
      { effectiveFrom, monthlyFee },
    ].sort((a, b) => a.effectiveFrom.localeCompare(b.effectiveFrom));
  }

  function openNextYearPlan(contract: Contract) {
    const targetYear = year + 1;
    setPlanningContract(contract);
    setPlanningYear(targetYear);
    setPlannedMonthlyFee(contractFeeAt(contract, targetYear, 1));
  }

  function changePlanningYear(contract: Contract, targetYear: number) {
    setPlanningYear(targetYear);
    setPlannedMonthlyFee(contractFeeAt(contract, targetYear, 1));
  }

  function durationThroughPlanningYear(contract: Contract) {
    const start = parseLocalDate(contract.saleDate);
    const startIndex = start.getFullYear() * 12 + start.getMonth() + 1;
    const planningYearEndIndex = planningYear * 12 + 12;
    return Math.max(contract.durationMonths, planningYearEndIndex - startIndex + 1);
  }

  function planningDuration(contract: Contract) {
    return monthsInYear(contract.saleDate, contract.durationMonths, planningYear) > 0
      ? contract.durationMonths
      : durationThroughPlanningYear(contract);
  }

  function saveNextYearPlan() {
    if (!planningContract) return;
    if (plannedMonthlyFee <= 0) {
      toast.error("Informe um fee mensal maior que zero.");
      return;
    }
    const needsPlannedRenewal =
      monthsInYear(planningContract.saleDate, planningContract.durationMonths, planningYear) === 0;
    updateContract(planningContract.id, {
      feeHistory: historyWithPlannedFee(planningContract, plannedMonthlyFee),
      ...(needsPlannedRenewal
        ? { durationMonths: durationThroughPlanningYear(planningContract) }
        : {}),
    });
    toast.success(`MRR mensal de ${planningYear} salvo para ${planningContract.client}.`);
    setPlanningContract(null);
  }

  function handleDelete(contract: Contract) {
    if (!window.confirm(`Excluir o contrato de ${contract.client}? Esta ação não pode ser desfeita.`)) return;
    deleteContract(contract.id);
    toast.success("Contrato excluído.");
  }

  const totalMRR = data.contracts
    .filter((c) => c.status === "Ativo")
    .reduce((s, c) => s + contractFeeAt(c, new Date().getFullYear(), new Date().getMonth() + 1), 0);

  // Insights
  const concentration = clientConcentration(data.contracts);
  const revenueByType = mrrByRevenueType(data.contracts);
  const churnEnabled = data.profile.enabledFeatures?.includes("churn-risk-90d") ?? false;
  const churn = churnRisk(data.contracts, year, 3);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold tracking-tight">Contratos</h2>
            <Popover>
              <PopoverTrigger className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label="Como planejar o MRR dos contratos">
                <CircleHelp className="h-4 w-4" />
              </PopoverTrigger>
              <PopoverContent align="start" className="w-80">
                <p className="font-semibold">Como planejar o MRR</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Edite um contrato para ajustar o valor atual ou clique no MRR do próximo ano na lista. No planejamento, você pode escolher qualquer ano de {year} a {year + 10}.
                </p>
              </PopoverContent>
            </Popover>
          </div>
          <p className="text-muted-foreground">Gerencie seus contratos e receita recorrente</p>
        </div>
        <Button onClick={openNew} className="w-full gap-2 sm:w-auto">
          <Plus className="h-4 w-4" />
          Novo Contrato
        </Button>
      </div>

      {/* Summary cards */}
      <div className={`grid gap-4 ${churnEnabled ? "md:grid-cols-4" : "md:grid-cols-3"}`}>
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
            <p className="text-sm text-muted-foreground">Ticket Médio</p>
            <p className="text-2xl font-bold">
              {data.contracts.filter((c) => c.status === "Ativo").length > 0
                ? currency(totalMRR / data.contracts.filter((c) => c.status === "Ativo").length)
                : "—"}
            </p>
          </CardContent>
        </Card>
        {churnEnabled && (
          <Card className={`border-border/50 ${churn.count > 0 ? "border-orbi-rose/30" : ""}`}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-orbi-rose" />
                <p className="text-sm text-muted-foreground">Risco Churn (90d)</p>
              </div>
              <p className="text-2xl font-bold">{churn.count > 0 ? `${churn.count} (${percent(churn.percentOfTotal)})` : "Seguro"}</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Client concentration */}
        {concentration.length > 0 && (
          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Concentração de Clientes</CardTitle>
              <CardDescription>Distribuição do MRR — clientes em amarelo representam &gt;35%</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={concentration} layout="vertical" margin={{ left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={COLORS.muted} horizontal={false} />
                    <XAxis type="number" stroke={COLORS.text} fontSize={11} tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`} />
                    <YAxis type="category" dataKey="client" stroke={COLORS.text} fontSize={10} width={120} />
                    <Tooltip
                      contentStyle={chartTooltipStyle}
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
              <CardDescription>Composição: Novo, Onboarding, Upsell, Cross-sell</CardDescription>
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
                      stroke="var(--card)"
                      label={(props) => `${props.name}: ${currency(Number(props.value))}`}
                    >
                      {revenueByType.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={chartTooltipStyle}
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
            <>
            {/* Mobile: cards */}
            <div className="grid gap-3 p-3 md:hidden">
              {contracts.map((c) => (
                <article key={c.id} className="rounded-xl border border-border/60 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="truncate font-semibold">{c.client}</h3>
                      <p className="text-xs text-muted-foreground">{dateFormat(c.saleDate)} · {c.durationMonths}m · {c.revenueType}</p>
                    </div>
                    <Badge className={statusColors[c.status]}>{c.status}</Badge>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <div className="rounded-lg bg-muted/60 p-2.5">
                      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">MRR {year}</p>
                      <p className="mt-0.5 truncate text-sm font-semibold">{currency(c.currentFee)}</p>
                    </div>
                    <div className="rounded-lg bg-muted/60 p-2.5">
                      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Receita {year}</p>
                      <p className="mt-0.5 truncate text-sm font-semibold">{currency(c.mrrYear)}</p>
                    </div>
                    <button
                      type="button"
                      className="col-span-2 rounded-lg border border-orbi-amber/20 bg-orbi-amber/10 p-2.5 text-left transition-colors hover:border-orbi-amber/50"
                      onClick={() => openNextYearPlan(c)}
                      aria-label={`Planejar MRR de ${year + 1} para ${c.client}`}
                    >
                      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">MRR {year + 1}</p>
                      <p className="mt-0.5 truncate text-sm font-semibold text-orbi-amber">{currency(c.nextYearFee)}</p>
                      <p className="mt-1 text-[9px] text-muted-foreground">Toque para editar</p>
                    </button>
                  </div>
                  <div className="mt-3 flex justify-end gap-1 border-t border-border/50 pt-3">
                    <Button variant="outline" size="sm" className="min-h-10 gap-2" onClick={() => openEdit(c)}>
                      <Pencil className="h-4 w-4" />Editar
                    </Button>
                    <Button variant="ghost" size="icon" className="h-10 w-10" aria-label={`Excluir contrato de ${c.client}`} onClick={() => handleDelete(c)}>
                      <Trash2 className="h-4 w-4 text-orbi-rose" />
                    </Button>
                  </div>
                </article>
              ))}
            </div>
            {/* Desktop: tabela */}
            <div className="hidden overflow-x-auto md:block">
              <Table>
                <thead>
                  <tr className="border-b">
                    <SortableHeader label="Data" sortKey={"saleDate" as keyof ContractRow} currentKey={sortKey} direction={sortDir} onSort={toggleSort} />
                    <SortableHeader label="Cliente" sortKey={"client" as keyof ContractRow} currentKey={sortKey} direction={sortDir} onSort={toggleSort} />
                    <SortableHeader label={`MRR mensal ${year}`} sortKey={"currentFee" as keyof ContractRow} currentKey={sortKey} direction={sortDir} onSort={toggleSort} className="text-right" />
                    <SortableHeader label="Duração" sortKey={"durationMonths" as keyof ContractRow} currentKey={sortKey} direction={sortDir} onSort={toggleSort} className="text-center" />
                    <SortableHeader label="Meses Ano" sortKey={"mInYear" as keyof ContractRow} currentKey={sortKey} direction={sortDir} onSort={toggleSort} className="text-center" />
                    <SortableHeader label={`Receita ${year}`} sortKey={"mrrYear" as keyof ContractRow} currentKey={sortKey} direction={sortDir} onSort={toggleSort} className="text-right" />
                    <SortableHeader label={`MRR mensal ${year + 1} · editar`} sortKey={"nextYearFee" as keyof ContractRow} currentKey={sortKey} direction={sortDir} onSort={toggleSort} className="text-right" />
                    <SortableHeader label="Status" sortKey={"status" as keyof ContractRow} currentKey={sortKey} direction={sortDir} onSort={toggleSort} className="text-center" />
                    <SortableHeader label="Tipo" sortKey={"revenueType" as keyof ContractRow} currentKey={sortKey} direction={sortDir} onSort={toggleSort} className="text-center" />
                    <th className="h-10 px-4 text-right text-sm font-medium text-muted-foreground">Ações</th>
                  </tr>
                </thead>
                <TableBody>
                  {contracts.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="whitespace-nowrap">{dateFormat(c.saleDate)}</TableCell>
                      <TableCell className="font-medium">{c.client}</TableCell>
                      <TableCell className="text-right">
                        {currency(c.currentFee)}
                        {(c.feeHistory?.length ?? 0) > 0 && (
                          <span className="ml-1 text-xs text-orbi-emerald" title={`${c.feeHistory?.length} reajuste(s)`}>
                            <TrendingUp className="inline h-3 w-3" />
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">{c.durationMonths}m</TableCell>
                      <TableCell className="text-center">{c.mInYear}</TableCell>
                      <TableCell className="text-right">{currency(c.mrrYear)}</TableCell>
                      <TableCell className="text-right">
                        <button
                          type="button"
                          className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-orbi-amber/20 bg-orbi-amber/10 px-2.5 font-medium text-orbi-amber transition-colors hover:border-orbi-amber/50"
                          onClick={() => openNextYearPlan(c)}
                          aria-label={`Planejar MRR de ${year + 1} para ${c.client}`}
                        >
                          {currency(c.nextYearFee)}
                          <Pencil className="h-3 w-3" />
                        </button>
                      </TableCell>
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
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(c)}>
                            <Trash2 className="h-4 w-4 text-orbi-rose" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={Boolean(planningContract)} onOpenChange={(open) => !open && setPlanningContract(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Planejar MRR mensal</DialogTitle>
          </DialogHeader>
          {planningContract && (
            <div className="space-y-4 py-2">
              <div className="rounded-lg bg-muted/60 p-3">
                <p className="font-medium">{planningContract.client}</p>
                <p className="text-sm text-muted-foreground">
                  Escolha o ano e informe o valor mensal que valerá a partir de janeiro.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="planning-year">Ano do planejamento</Label>
                <Select value={String(planningYear)} onValueChange={(value) => changePlanningYear(planningContract, Number(value))}>
                  <SelectTrigger id="planning-year"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 11 }, (_, index) => year + index).map((optionYear) => (
                      <SelectItem key={optionYear} value={String(optionYear)}>{optionYear}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {monthsInYear(planningContract.saleDate, planningContract.durationMonths, planningYear) === 0 && (
                <div className="rounded-lg border border-orbi-rose/30 bg-orbi-rose/10 p-4">
                  <p className="font-medium">Renovação planejada</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Este contrato termina antes de {planningYear}. Ao salvar, a projeção será renovada até dezembro de {planningYear}.
                  </p>
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="planned-next-year-fee">MRR mensal planejado para {planningYear}</Label>
                    <CurrencyInput
                      id="planned-next-year-fee"
                      value={plannedMonthlyFee}
                      onValueChange={setPlannedMonthlyFee}
                    />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-border/60 p-3">
                  <p className="text-xs text-muted-foreground">Meses projetados em {planningYear}</p>
                  <p className="mt-1 text-lg font-semibold">
                    {monthsInYear(
                      planningContract.saleDate,
                      planningDuration(planningContract),
                      planningYear
                    )}
                  </p>
                </div>
                <div className="rounded-lg border border-orbi-amber/30 bg-orbi-amber/10 p-3">
                  <p className="text-xs text-muted-foreground">Projeção anual</p>
                  <p className="mt-1 text-lg font-semibold text-orbi-amber">
                    {currency(contractRevenueInYear({
                      ...planningContract,
                      durationMonths: planningDuration(planningContract),
                      feeHistory: plannedMonthlyFee > 0
                        ? historyWithPlannedFee(planningContract, plannedMonthlyFee)
                        : planningContract.feeHistory,
                    }, planningYear))}
                  </p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                O valor é salvo como reajuste futuro e não altera o fee vigente deste ano.
              </p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPlanningContract(null)}>Cancelar</Button>
            {planningContract ? (
              <Button onClick={saveNextYearPlan} disabled={plannedMonthlyFee <= 0}>
                Salvar planejamento
              </Button>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
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
            <div className="rounded-xl border border-orbi-cyan/25 bg-orbi-cyan/5 p-4">
              <div className="mb-4">
                <p className="font-semibold">MRR mensal do contrato</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Preencha somente o valor mensal. Ex.: 2.500 significa R$ 2.500,00 por mês.
                </p>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>MRR mensal atual — {year}</Label>
                  <CurrencyInput
                    value={form.monthlyFee}
                    onValueChange={(monthlyFee) => setForm({ ...form, monthlyFee })}
                    hint={`Valor vigente no ano atual (${year}).`}
                  />
                </div>
                <div className="space-y-2">
                  <Label>MRR mensal do próximo ano — {year + 1}</Label>
                  <CurrencyInput
                    value={formNextYearFee}
                    onValueChange={(value) => {
                      setFormNextYearFee(value);
                      setFormNextYearTouched(true);
                    }}
                    hint={`Planejamento para ${year + 1}. Não altera o valor de ${year}.`}
                  />
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Duração (meses)</Label>
              <Input type="number" value={form.durationMonths || ""} onChange={(e) => setForm({ ...form, durationMonths: parseInt(e.target.value) || 0 })} />
              {formNextYearTouched && formNextYearFee > 0 && monthsInYear(form.saleDate, form.durationMonths, year + 1) === 0 && (
                <p className="text-xs text-orbi-amber">
                  Ao salvar, o planejamento será estendido até dezembro de {year + 1}.
                </p>
              )}
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
                <CurrencyInput value={form.onboardingValue} onValueChange={(onboardingValue) => setForm({ ...form, onboardingValue })} hint={false} />
              </div>
              <div className="space-y-2">
                <Label>Valor Upsell/Cross-sell (R$)</Label>
                <CurrencyInput value={form.upsellCrossSellValue} onValueChange={(upsellCrossSellValue) => setForm({ ...form, upsellCrossSellValue })} hint={false} />
              </div>
            </div>
            <div className="space-y-3 rounded-lg border border-border/60 p-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <Label>Histórico de reajustes</Label>
                  <p className="mt-1 text-xs text-muted-foreground">
                    O novo fee passa a valer a partir do mês informado.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="shrink-0 gap-1"
                  onClick={() =>
                    setForm({
                      ...form,
                      feeHistory: [
                        ...(form.feeHistory ?? []),
                        { effectiveFrom: "", monthlyFee: 0 },
                      ],
                    })
                  }
                >
                  <Plus className="h-3.5 w-3.5" />
                  Reajuste
                </Button>
              </div>
              {(form.feeHistory ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum reajuste cadastrado.</p>
              ) : (
                <div className="space-y-2">
                  {(form.feeHistory ?? []).map((change, index) => (
                    <div className="grid grid-cols-1 items-end gap-2 sm:grid-cols-[1fr_1fr_auto]" key={index}>
                      <div className="space-y-1">
                        <Label className="text-xs">Vigência</Label>
                        <Input
                          type="month"
                          value={change.effectiveFrom}
                          onChange={(event) => {
                            const feeHistory = [...(form.feeHistory ?? [])];
                            feeHistory[index] = { ...change, effectiveFrom: event.target.value };
                            setForm({ ...form, feeHistory });
                          }}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Novo fee (R$)</Label>
                        <CurrencyInput
                          value={change.monthlyFee}
                          onValueChange={(monthlyFee) => {
                            const feeHistory = [...(form.feeHistory ?? [])];
                            feeHistory[index] = {
                              ...change,
                              monthlyFee,
                            };
                            setForm({ ...form, feeHistory });
                          }}
                          hint={false}
                        />
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label="Remover reajuste"
                        onClick={() =>
                          setForm({
                            ...form,
                            feeHistory: (form.feeHistory ?? []).filter((_, itemIndex) => itemIndex !== index),
                          })
                        }
                      >
                        <Trash2 className="h-4 w-4 text-orbi-rose" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
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
