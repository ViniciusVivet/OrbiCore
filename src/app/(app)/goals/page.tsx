"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save, TrendingUp, Users, ShoppingCart, FileText, Pencil, Check } from "lucide-react";
import { useAppStore } from "@/components/store-provider";
import { currency, percent, shortMonthName, monthName } from "@/lib/format";
import { mrrInMonth, mrrInQuarter, mrrEnteringYear, activeContractsCount, weightedPipelineRevenue, saleProfitAndMargin } from "@/lib/calculations";
import { toast } from "sonner";
import type { GoalPlan } from "@/lib/types";

const repeat = (value: number) => Array.from({ length: 12 }, () => value);

export default function GoalsPage() {
  const { data, loaded, updateProfile, upsertGoalPlan } = useAppStore();
  const [yearlyGoal, setYearlyGoal] = useState(0);
  const [meetingGoalMonthly, setMeetingGoalMonthly] = useState(0);
  const [closeRateTarget, setCloseRateTarget] = useState(0);
  const [newContractsMonthly, setNewContractsMonthly] = useState(0);
  const [salesRevenueMonthly, setSalesRevenueMonthly] = useState(0);
  const [selectedYear, setSelectedYear] = useState(0);
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [monthlyRevenueGoals, setMonthlyRevenueGoals] = useState<number[]>(repeat(0));
  const [monthlyMeetingGoals, setMonthlyMeetingGoals] = useState<number[]>(repeat(0));
  const [monthlyCloseRateTargets, setMonthlyCloseRateTargets] = useState<number[]>(repeat(0));
  const [monthlyNewContractGoals, setMonthlyNewContractGoals] = useState<number[]>(repeat(0));
  const [monthlySalesRevenueGoals, setMonthlySalesRevenueGoals] = useState<number[]>(repeat(0));

  useEffect(() => {
    if (loaded && selectedYear === 0) {
      setSelectedYear(data.profile.currentYear);
    }
  }, [loaded, selectedYear, data.profile.currentYear]);

  useEffect(() => {
    if (loaded && selectedYear) {
      const p = data.profile;
      const plan = data.goalPlans.find((item) => item.year === selectedYear);
      const revenue = plan?.monthlyRevenueGoals ?? repeat(p.yearlyGoal / 12);
      const meetings = plan?.monthlyMeetingGoals ?? repeat(p.meetingGoalMonthly ?? 20);
      const closeRates = plan?.monthlyCloseRateTargets ?? repeat(p.closeRateTarget ?? 0.25);
      const contracts = plan?.monthlyNewContractGoals ?? repeat(p.newContractsMonthly ?? 3);
      const sales = plan?.monthlySalesRevenueGoals ?? repeat(p.salesRevenueMonthly ?? 10000);
      setMonthlyRevenueGoals(revenue);
      setMonthlyMeetingGoals(meetings);
      setMonthlyCloseRateTargets(closeRates);
      setMonthlyNewContractGoals(contracts);
      setMonthlySalesRevenueGoals(sales);
      setYearlyGoal(revenue.reduce((sum, value) => sum + value, 0));
      const monthIndex = new Date().getMonth();
      setMeetingGoalMonthly(meetings[monthIndex] ?? 0);
      setCloseRateTarget(closeRates[monthIndex] ?? 0);
      setNewContractsMonthly(contracts[monthIndex] ?? 0);
      setSalesRevenueMonthly(sales[monthIndex] ?? 0);
    }
  }, [loaded, selectedYear, data.goalPlans, data.profile]);

  useEffect(() => {
    const index = new Date().getMonth();
    setYearlyGoal(monthlyRevenueGoals.reduce((sum, value) => sum + value, 0));
    setMeetingGoalMonthly(monthlyMeetingGoals[index] ?? 0);
    setCloseRateTarget(monthlyCloseRateTargets[index] ?? 0);
    setNewContractsMonthly(monthlyNewContractGoals[index] ?? 0);
    setSalesRevenueMonthly(monthlySalesRevenueGoals[index] ?? 0);
  }, [monthlyRevenueGoals, monthlyMeetingGoals, monthlyCloseRateTargets, monthlyNewContractGoals, monthlySalesRevenueGoals]);

  if (!loaded) return null;

  const year = selectedYear || data.profile.currentYear;
  const { contracts, meetings } = data;
  const currentMonth = new Date().getMonth() + 1;
  const currentQuarter = Math.ceil(currentMonth / 3);

  const monthIndex = currentMonth - 1;
  const monthlyGoal = monthlyRevenueGoals[monthIndex] ?? 0;
  const quarterlyGoal = monthlyRevenueGoals
    .slice((currentQuarter - 1) * 3, currentQuarter * 3)
    .reduce((sum, value) => sum + value, 0);

  function saveAll() {
    const plan: GoalPlan = {
      year,
      monthlyRevenueGoals,
      monthlyMeetingGoals,
      monthlyCloseRateTargets,
      monthlyNewContractGoals,
      monthlySalesRevenueGoals,
    };
    upsertGoalPlan(plan);
    updateProfile({
      ...(year === data.profile.currentYear ? {
        yearlyGoal,
        meetingGoalMonthly: monthlyMeetingGoals[new Date().getMonth()] ?? 0,
        closeRateTarget: monthlyCloseRateTargets[new Date().getMonth()] ?? 0,
        newContractsMonthly: monthlyNewContractGoals[new Date().getMonth()] ?? 0,
        salesRevenueMonthly: monthlySalesRevenueGoals[new Date().getMonth()] ?? 0,
      } : {}),
    });
    setEditingSection(null);
    setSaved(true);
    toast.success("Metas salvas com sucesso!");
    setTimeout(() => setSaved(false), 2000);
  }

  function updateMonth(
    setter: React.Dispatch<React.SetStateAction<number[]>>,
    month: number,
    value: number
  ) {
    setter((current) => current.map((item, index) => index === month ? value : item));
  }

  // Current metrics for comparison
  const mrrYear = mrrEnteringYear(contracts, year, "Ativo");
  const mrrMonth = mrrInMonth(contracts, year, currentMonth, "Ativo");
  const mrrQuarter = mrrInQuarter(contracts, year, currentQuarter, "Ativo");
  const activeContracts = activeContractsCount(contracts);
  const pipeline = weightedPipelineRevenue(meetings);

  const meetingsThisMonth = meetings.filter((m) => {
    const d = new Date(m.date);
    return d.getFullYear() === year && d.getMonth() + 1 === currentMonth;
  }).length;

  const closedThisMonth = meetings.filter((m) => {
    const d = new Date(m.date);
    return d.getFullYear() === year && d.getMonth() + 1 === currentMonth && m.status === "Fechada";
  }).length;

  const actualCloseRate = meetingsThisMonth > 0 ? closedThisMonth / meetingsThisMonth : 0;

  const newContractsThisMonth = contracts.filter((c) => {
    const d = new Date(c.saleDate);
    return d.getFullYear() === year && d.getMonth() + 1 === currentMonth;
  }).length;

  const yearOptions = [year - 1, year, year + 1];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Metas</h2>
          <p className="text-muted-foreground">Defina objetivos e acompanhe o progresso em tempo real</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={String(year)} onValueChange={(v) => setSelectedYear(Number(v))}>
            <SelectTrigger className="w-[100px] h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {yearOptions.map((y) => (
                <SelectItem key={y} value={String(y)}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={saveAll} className="gap-2">
            {saved ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
            {saved ? "Salvo!" : "Salvar tudo"}
          </Button>
        </div>
      </div>

      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-base">Planejamento mensal de {year}</CardTitle>
          <CardDescription>Edite qualquer mês passado ou futuro. Os comparativos usam a meta correspondente ao período.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <div className="min-w-[760px] space-y-2">
              <div className="grid grid-cols-[80px_repeat(5,1fr)] gap-2 px-1 text-xs text-muted-foreground">
                <span>Mês</span><span>MRR (R$)</span><span>Reuniões</span><span>Conversão (%)</span><span>Contratos</span><span>Vendas (R$)</span>
              </div>
              {Array.from({ length: 12 }, (_, index) => (
                <div key={index} className="grid grid-cols-[80px_repeat(5,1fr)] items-center gap-2">
                  <span className="text-sm font-medium">{shortMonthName(index + 1)}</span>
                  <Input type="number" min="0" step="0.01" value={monthlyRevenueGoals[index] || ""} onChange={(e) => updateMonth(setMonthlyRevenueGoals, index, Number(e.target.value) || 0)} />
                  <Input type="number" min="0" value={monthlyMeetingGoals[index] || ""} onChange={(e) => updateMonth(setMonthlyMeetingGoals, index, Number(e.target.value) || 0)} />
                  <Input type="number" min="0" max="100" value={Math.round((monthlyCloseRateTargets[index] ?? 0) * 100) || ""} onChange={(e) => updateMonth(setMonthlyCloseRateTargets, index, (Number(e.target.value) || 0) / 100)} />
                  <Input type="number" min="0" value={monthlyNewContractGoals[index] || ""} onChange={(e) => updateMonth(setMonthlyNewContractGoals, index, Number(e.target.value) || 0)} />
                  <Input type="number" min="0" step="0.01" value={monthlySalesRevenueGoals[index] || ""} onChange={(e) => updateMonth(setMonthlySalesRevenueGoals, index, Number(e.target.value) || 0)} />
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* MRR Goals */}
      <Card className="border-border/50">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="rounded-md p-2 bg-orbi-cyan/10">
                <TrendingUp className="h-4 w-4 text-orbi-cyan" />
              </div>
              <div>
                <CardTitle className="text-base">Metas de Receita (MRR)</CardTitle>
                <CardDescription className="text-xs">Meta mensal e trimestral calculadas a partir da anual</CardDescription>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setEditingSection(editingSection === "mrr" ? null : "mrr")}
              className="gap-1 text-xs"
            >
              <Pencil className="h-3 w-3" />
              Editar
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {editingSection === "mrr" ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-lg bg-muted/50 border border-border/50">
              <div className="space-y-2">
                <Label className="text-xs">Meta Anual (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={yearlyGoal || ""}
                  onChange={(e) => {
                    const total = parseFloat(e.target.value) || 0;
                    setYearlyGoal(total);
                    setMonthlyRevenueGoals(repeat(total / 12));
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Mensal (auto)</Label>
                <Input value={currency(yearlyGoal / 12)} disabled className="bg-muted" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Trimestral (auto)</Label>
                <Input value={currency(yearlyGoal / 4)} disabled className="bg-muted" />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-4">
              <MetricBox label="Meta Anual" value={currency(yearlyGoal)} />
              <MetricBox label="Meta Mensal" value={currency(monthlyGoal)} />
              <MetricBox label="Meta Trimestral" value={currency(quarterlyGoal)} />
            </div>
          )}

          {/* Progress */}
          <div className="space-y-3">
            <ProgressBar
              label={`Ano ${year}`}
              current={mrrYear}
              target={yearlyGoal}
            />
            <ProgressBar
              label={`T${currentQuarter}`}
              current={mrrQuarter}
              target={quarterlyGoal}
            />
            <ProgressBar
              label={monthName(currentMonth)}
              current={mrrMonth}
              target={monthlyGoal}
            />
          </div>

          {/* Monthly breakdown */}
          <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-12 gap-2">
            {Array.from({ length: 12 }, (_, i) => {
              const m = i + 1;
              const mrr = mrrInMonth(contracts, year, m, "Ativo");
              const pct = monthlyGoal > 0 ? mrr / monthlyGoal : 0;
              const isCurrent = m === currentMonth;
              return (
                <div
                  key={m}
                  className={`rounded-lg p-2 text-center border transition-colors ${
                    isCurrent ? "border-primary/50 bg-primary/5" : "border-border/50"
                  }`}
                >
                  <p className="text-[10px] text-muted-foreground">{shortMonthName(m)}</p>
                  <p className="text-xs font-semibold mt-0.5">{mrr > 0 ? `${(mrr / 1000).toFixed(0)}k` : "—"}</p>
                  <div className="h-1 rounded-full bg-muted overflow-hidden mt-1">
                    <div
                      className={`h-full rounded-full ${pct >= 1 ? "bg-orbi-emerald" : "bg-orbi-cyan"}`}
                      style={{ width: `${Math.min(pct * 100, 100)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Meetings Goals */}
      <Card className="border-border/50">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="rounded-md p-2 bg-purple-400/10">
                <Users className="h-4 w-4 text-purple-400" />
              </div>
              <div>
                <CardTitle className="text-base">Metas de Reuniões</CardTitle>
                <CardDescription className="text-xs">Volume de reuniões e taxa de conversão</CardDescription>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setEditingSection(editingSection === "meetings" ? null : "meetings")}
              className="gap-1 text-xs"
            >
              <Pencil className="h-3 w-3" />
              Editar
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {editingSection === "meetings" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-lg bg-muted/50 border border-border/50">
              <div className="space-y-2">
                <Label className="text-xs">Reuniões por mês</Label>
                <Input
                  type="number"
                  value={meetingGoalMonthly || ""}
                  onChange={(e) => setMeetingGoalMonthly(parseInt(e.target.value) || 0)}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Taxa de fechamento alvo (%)</Label>
                <Input
                  type="number"
                  step="1"
                  min="0"
                  max="100"
                  value={Math.round(closeRateTarget * 100) || ""}
                  onChange={(e) => setCloseRateTarget((parseInt(e.target.value) || 0) / 100)}
                />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <MetricBox label="Meta mensal" value={`${meetingGoalMonthly} reuniões`} />
              <MetricBox label="Taxa alvo" value={percent(closeRateTarget)} />
              <MetricBox
                label={`Realizadas (${shortMonthName(currentMonth)})`}
                value={`${meetingsThisMonth}`}
                sub={meetingGoalMonthly > 0 ? percent(meetingsThisMonth / meetingGoalMonthly) : "—"}
              />
              <MetricBox
                label="Fechadas / Rate"
                value={`${closedThisMonth}`}
                sub={percent(actualCloseRate)}
                highlight={actualCloseRate >= closeRateTarget}
              />
            </div>
          )}

          <ProgressBar
            label={`Reuniões ${shortMonthName(currentMonth)}`}
            current={meetingsThisMonth}
            target={meetingGoalMonthly}
            format="number"
          />
          <ProgressBar
            label="Taxa de Fechamento"
            current={actualCloseRate}
            target={closeRateTarget}
            format="percent"
          />
        </CardContent>
      </Card>

      {/* Contracts Goals */}
      <Card className="border-border/50">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="rounded-md p-2 bg-orbi-blue/10">
                <FileText className="h-4 w-4 text-orbi-blue" />
              </div>
              <div>
                <CardTitle className="text-base">Metas de Contratos</CardTitle>
                <CardDescription className="text-xs">Novos contratos e crescimento da base</CardDescription>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setEditingSection(editingSection === "contracts" ? null : "contracts")}
              className="gap-1 text-xs"
            >
              <Pencil className="h-3 w-3" />
              Editar
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {editingSection === "contracts" ? (
            <div className="p-4 rounded-lg bg-muted/50 border border-border/50">
              <div className="space-y-2 max-w-xs">
                <Label className="text-xs">Novos contratos por mês</Label>
                <Input
                  type="number"
                  value={newContractsMonthly || ""}
                  onChange={(e) => setNewContractsMonthly(parseInt(e.target.value) || 0)}
                />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <MetricBox label="Meta mensal" value={`${newContractsMonthly} novos`} />
              <MetricBox
                label={`Novos (${shortMonthName(currentMonth)})`}
                value={`${newContractsThisMonth}`}
                highlight={newContractsThisMonth >= newContractsMonthly}
              />
              <MetricBox label="Ativos total" value={`${activeContracts}`} />
              <MetricBox label="Pipeline" value={currency(pipeline.weighted)} sub={`${pipeline.dealCount} deals`} />
            </div>
          )}

          <ProgressBar
            label={`Novos contratos ${shortMonthName(currentMonth)}`}
            current={newContractsThisMonth}
            target={newContractsMonthly}
            format="number"
          />
        </CardContent>
      </Card>

      {/* Sales Goals */}
      <Card className="border-border/50">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="rounded-md p-2 bg-orbi-emerald/10">
                <ShoppingCart className="h-4 w-4 text-orbi-emerald" />
              </div>
              <div>
                <CardTitle className="text-base">Metas de Vendas</CardTitle>
                <CardDescription className="text-xs">Receita de vendas de produtos</CardDescription>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setEditingSection(editingSection === "sales" ? null : "sales")}
              className="gap-1 text-xs"
            >
              <Pencil className="h-3 w-3" />
              Editar
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {editingSection === "sales" ? (
            <div className="p-4 rounded-lg bg-muted/50 border border-border/50">
              <div className="space-y-2 max-w-xs">
                <Label className="text-xs">Receita mensal de vendas (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={salesRevenueMonthly || ""}
                  onChange={(e) => setSalesRevenueMonthly(parseFloat(e.target.value) || 0)}
                />
              </div>
            </div>
          ) : (
            (() => {
              const salesThisMonth = data.sales.filter((s) => {
                const d = new Date(s.date);
                return d.getFullYear() === year && d.getMonth() + 1 === currentMonth;
              });
              const salesRevenue = salesThisMonth.reduce((sum, s) => {
                const p = data.products.find((x) => x.id === s.productId);
                return sum + (p ? saleProfitAndMargin(s, p).revenue : 0);
              }, 0);

              return (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    <MetricBox label="Meta mensal" value={currency(salesRevenueMonthly)} />
                    <MetricBox
                      label={`Vendido (${shortMonthName(currentMonth)})`}
                      value={currency(salesRevenue)}
                      highlight={salesRevenue >= salesRevenueMonthly}
                    />
                    <MetricBox label="Vendas no mês" value={`${salesThisMonth.length}`} />
                  </div>
                  <ProgressBar
                    label={`Vendas ${shortMonthName(currentMonth)}`}
                    current={salesRevenue}
                    target={salesRevenueMonthly}
                  />
                </>
              );
            })()
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// --- Sub-components ---

function MetricBox({ label, value, sub, highlight }: {
  label: string; value: string; sub?: string; highlight?: boolean;
}) {
  return (
    <div className="rounded-lg border border-border/50 p-3">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className={`text-sm font-semibold mt-0.5 ${highlight ? "text-orbi-emerald" : ""}`}>{value}</p>
      {sub && <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}

function ProgressBar({ label, current, target, format }: {
  label: string;
  current: number;
  target: number;
  format?: "currency" | "number" | "percent";
}) {
  const pct = target > 0 ? current / target : 0;
  const exceeded = pct >= 1;

  const formatValue = (v: number) => {
    if (format === "number") return String(Math.round(v));
    if (format === "percent") return percent(v);
    return currency(v);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="text-xs">
          <span className={exceeded ? "text-orbi-emerald font-medium" : ""}>
            {formatValue(current)}
          </span>
          <span className="text-muted-foreground"> / {formatValue(target)}</span>
        </span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            exceeded ? "bg-orbi-emerald" : pct >= 0.7 ? "bg-orbi-cyan" : "bg-orbi-amber"
          }`}
          style={{ width: `${Math.min(pct * 100, 100)}%` }}
        />
      </div>
    </div>
  );
}
