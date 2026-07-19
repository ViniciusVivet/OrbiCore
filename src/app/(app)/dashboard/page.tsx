"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  TrendingUp, FileText, AlertTriangle, ArrowUpRight, ArrowDownRight,
  Shield, Target, Users, BarChart3, LineChart, AreaChart as AreaChartIcon,
  PieChart as PieChartIcon, ChevronRight, Calendar,
} from "lucide-react";
import Link from "next/link";
import { useAppStore } from "@/components/store-provider";
import { StoreDashboard } from "@/components/store-dashboard";
import { currency, percent, monthName, shortMonthName } from "@/lib/format";
import {
  mrrActiveMonthly, activeContractsCount, mrrEnteringYear, mrrNextYear,
  mrrInMonth, mrrInQuarter, mrrChartData, meetingAlert,
  clientConcentration, mrrByRevenueType, churnRisk, weightedPipelineRevenue,
} from "@/lib/calculations";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine,
  ResponsiveContainer, BarChart, Bar, Cell, PieChart, Pie, LineChart as RLineChart, Line,
} from "recharts";

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

type ChartType = "area" | "bar" | "line";
type PeriodView = "month" | "quarter" | "year";

const CHART_ICONS: Record<ChartType, React.ReactNode> = {
  area: <AreaChartIcon className="h-4 w-4" />,
  bar: <BarChart3 className="h-4 w-4" />,
  line: <LineChart className="h-4 w-4" />,
};

const tooltipStyle = {
  background: COLORS.bg,
  border: `1px solid ${COLORS.border}`,
  borderRadius: "8px",
};

export default function DashboardPage() {
  const { data, loaded } = useAppStore();
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentQuarter = Math.ceil(currentMonth / 3);

  // Filters
  const [year, setYear] = useState(data.profile.currentYear);
  const [periodView, setPeriodView] = useState<PeriodView>("month");
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [selectedQuarter, setSelectedQuarter] = useState(currentQuarter);
  const [chartType, setChartType] = useState<ChartType>("area");

  if (!loaded) return null;

  const { contracts, meetings, payroll, profile } = data;
  const churnEnabled = profile.enabledFeatures?.includes("churn-risk-90d") ?? false;
  const showFinancialDashboard = profile.enabledModules.some((module) => ["contracts", "meetings", "goals", "payroll"].includes(module));

  // --- MRR Metrics ---
  const mrrActive = mrrActiveMonthly(contracts);
  const activeCount = activeContractsCount(contracts);
  const mrrYear = mrrEnteringYear(contracts, year, "Ativo");
  const mrrNext = mrrNextYear(contracts, year, "Ativo");

  // Period-specific values
  const mrrMonthVal = mrrInMonth(contracts, year, selectedMonth, "Ativo");
  const mrrQuarterVal = mrrInQuarter(contracts, year, selectedQuarter, "Ativo");

  const periodMRR = periodView === "month" ? mrrMonthVal
    : periodView === "quarter" ? mrrQuarterVal
    : mrrYear;

  const periodLabel = periodView === "month" ? monthName(selectedMonth)
    : periodView === "quarter" ? `${selectedQuarter}o Trimestre`
    : `Ano ${year}`;

  // --- Goals ---
  const goalPlan = data.goalPlans.find((plan) => plan.year === year);
  const yearlyGoal = goalPlan
    ? goalPlan.monthlyRevenueGoals.reduce((sum, value) => sum + value, 0)
    : profile.yearlyGoal;
  const monthlyGoal = goalPlan?.monthlyRevenueGoals[selectedMonth - 1] ?? yearlyGoal / 12;
  const quarterlyGoal = goalPlan
    ? goalPlan.monthlyRevenueGoals
      .slice((selectedQuarter - 1) * 3, selectedQuarter * 3)
      .reduce((sum, value) => sum + value, 0)
    : yearlyGoal / 4;

  const periodGoal = periodView === "month" ? monthlyGoal
    : periodView === "quarter" ? quarterlyGoal
    : yearlyGoal;

  const periodPct = periodGoal > 0 ? periodMRR / periodGoal : 0;

  // --- Chart data ---
  const chartData = mrrChartData(contracts, year, "Ativo");

  // --- Alerts ---
  const overdueAlerts = meetings.filter((m) => meetingAlert(m) === "Retorno vencido");
  const upcomingAlerts = meetings.filter((m) => meetingAlert(m) === "Retorno próximo");

  // --- Cross-module insights ---
  const concentration = clientConcentration(contracts);
  const revenueByType = mrrByRevenueType(contracts);
  const churn = churnRisk(contracts, year, 3);
  const pipeline = weightedPipelineRevenue(meetings);

  // --- Commission ---
  const currentPayroll = payroll.find((p) => p.month === selectedMonth && p.year === year);
  const commissionThisMonth = currentPayroll?.commission ?? 0;

  // Top client concentration risk
  const topClient = concentration[0];
  const top3Pct = concentration.length >= 3 ? concentration[2].cumulativePercent : (topClient?.cumulativePercent ?? 0);

  const yearOptions = [year - 1, year, year + 1];

  return (
    <div className="space-y-6">
      {/* Header + Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between" data-tour="welcome">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground">
            Visão geral — {periodLabel} {periodView !== "year" ? year : ""}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2" data-tour="filters">
          {/* Year */}
          <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
            <SelectTrigger className="w-[100px] h-9">
              <Calendar className="h-3.5 w-3.5 mr-1 text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {yearOptions.map((y) => (
                <SelectItem key={y} value={String(y)}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Period type */}
          <div className="flex rounded-lg border border-border overflow-hidden">
            {(["month", "quarter", "year"] as PeriodView[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriodView(p)}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                  periodView === p
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                {p === "month" ? "Mês" : p === "quarter" ? "Trimestre" : "Ano"}
              </button>
            ))}
          </div>

          {/* Month/Quarter selector */}
          {periodView === "month" && (
            <Select value={String(selectedMonth)} onValueChange={(v) => setSelectedMonth(Number(v))}>
              <SelectTrigger className="w-[110px] h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 12 }, (_, i) => (
                  <SelectItem key={i + 1} value={String(i + 1)}>{monthName(i + 1)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {periodView === "quarter" && (
            <Select value={String(selectedQuarter)} onValueChange={(v) => setSelectedQuarter(Number(v))}>
              <SelectTrigger className="w-[130px] h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[1, 2, 3, 4].map((q) => (
                  <SelectItem key={q} value={String(q)}>{q}o Trimestre</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      <StoreDashboard />

      {showFinancialDashboard && <>
      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4" data-tour="kpi-cards">
        <ClickableStatCard
          href="/contracts"
          title="MRR Ativo"
          value={currency(mrrActive)}
          description="Soma dos fees mensais ativos"
          icon={<TrendingUp className="h-4 w-4 text-orbi-cyan" />}
          bg="bg-orbi-cyan/10"
        />
        <ClickableStatCard
          href="/contracts"
          title="Contratos Ativos"
          value={String(activeCount)}
          description={`${currency(mrrMonthVal)} vendido em ${shortMonthName(selectedMonth)}`}
          icon={<FileText className="h-4 w-4 text-orbi-blue" />}
          bg="bg-orbi-blue/10"
        />
        <ClickableStatCard
          href="/goals"
          title={`MRR ${periodView === "month" ? shortMonthName(selectedMonth) : periodView === "quarter" ? `T${selectedQuarter}` : "Ano"}`}
          value={currency(periodMRR)}
          description={periodPct >= 1
            ? `Meta superada em ${percent(periodPct - 1)}`
            : `Falta ${percent(1 - periodPct)} da meta`}
          icon={<ArrowUpRight className="h-4 w-4 text-orbi-emerald" />}
          bg="bg-orbi-emerald/10"
          badge={periodPct >= 1 ? "Meta batida" : undefined}
          badgeColor={periodPct >= 1 ? "bg-orbi-emerald/20 text-orbi-emerald" : undefined}
        />
        <ClickableStatCard
          href="/contracts"
          title="MRR Próximo Ano"
          value={currency(mrrNext)}
          description="Receita que transborda para o próximo ano"
          icon={<ArrowDownRight className="h-4 w-4 text-orbi-amber" />}
          bg="bg-orbi-amber/10"
        />
      </div>

      {/* Goal progress bar */}
      <Card className="border-border/50" data-tour="goal-bar">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm font-medium">Meta: {periodLabel} {periodView !== "year" ? year : ""}</p>
              <p className="text-xs text-muted-foreground">
                {currency(periodMRR)} de {currency(periodGoal)}
              </p>
            </div>
            <div className="text-right">
              <p className={`text-2xl font-bold ${periodPct >= 1 ? "text-orbi-emerald" : ""}`}>
                {percent(periodPct)}
              </p>
              <Link href="/goals" className="text-xs text-primary hover:underline inline-flex items-center gap-0.5">
                Editar metas <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
          </div>
          <div className="h-3 rounded-full bg-muted overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${periodPct >= 1 ? "bg-orbi-emerald" : periodPct >= 0.7 ? "bg-orbi-cyan" : "bg-orbi-amber"}`}
              style={{ width: `${Math.min(periodPct * 100, 100)}%` }}
            />
          </div>
          {/* Mini quarter breakdown when viewing year */}
          {periodView === "year" && (
            <div className="grid grid-cols-4 gap-3 mt-4">
              {[1, 2, 3, 4].map((q) => {
                const qMRR = mrrInQuarter(contracts, year, q, "Ativo");
                const qPct = quarterlyGoal > 0 ? qMRR / quarterlyGoal : 0;
                return (
                  <button
                    key={q}
                    onClick={() => { setPeriodView("quarter"); setSelectedQuarter(q); }}
                    className="rounded-lg border border-border/50 p-3 text-left hover:border-primary/50 transition-colors"
                  >
                    <p className="text-xs text-muted-foreground">T{q}</p>
                    <p className="text-sm font-semibold">{currency(qMRR)}</p>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden mt-2">
                      <div
                        className={`h-full rounded-full ${qPct >= 1 ? "bg-orbi-emerald" : "bg-orbi-cyan"}`}
                        style={{ width: `${Math.min(qPct * 100, 100)}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1">{percent(qPct)}</p>
                  </button>
                );
              })}
            </div>
          )}
          {/* Mini month breakdown when viewing quarter */}
          {periodView === "quarter" && (
            <div className="grid grid-cols-3 gap-3 mt-4">
              {[0, 1, 2].map((offset) => {
                const m = (selectedQuarter - 1) * 3 + 1 + offset;
                const mMRR = mrrInMonth(contracts, year, m, "Ativo");
                const mPct = monthlyGoal > 0 ? mMRR / monthlyGoal : 0;
                return (
                  <button
                    key={m}
                    onClick={() => { setPeriodView("month"); setSelectedMonth(m); }}
                    className="rounded-lg border border-border/50 p-3 text-left hover:border-primary/50 transition-colors"
                  >
                    <p className="text-xs text-muted-foreground">{shortMonthName(m)}</p>
                    <p className="text-sm font-semibold">{currency(mMRR)}</p>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden mt-2">
                      <div
                        className={`h-full rounded-full ${mPct >= 1 ? "bg-orbi-emerald" : "bg-orbi-cyan"}`}
                        style={{ width: `${Math.min(mPct * 100, 100)}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1">{percent(mPct)}</p>
                  </button>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Insight cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <ClickableStatCard
          href="/meetings"
          title="Pipeline Ponderado"
          value={currency(pipeline.weighted)}
          description={`${pipeline.dealCount} deals abertos — melhor caso: ${currency(pipeline.bestCase)}`}
          icon={<Target className="h-4 w-4 text-purple-400" />}
          bg="bg-purple-400/10"
        />
        {churnEnabled && <ClickableStatCard
          href="/contracts"
          title="Risco de Churn (90d)"
          value={churn.count > 0 ? currency(churn.mrrAtRisk) : "Seguro"}
          description={churn.count > 0
            ? `${churn.count} contrato(s) vencem — ${percent(churn.percentOfTotal)} do MRR`
            : "Nenhum contrato vence nos próximos 90 dias"}
          icon={<Shield className="h-4 w-4 text-orbi-rose" />}
          bg="bg-orbi-rose/10"
          highlight={churn.count > 0}
        />}
        <ClickableStatCard
          href="/contracts"
          title="Concentração"
          value={topClient ? percent(topClient.percent) : "—"}
          description={topClient
            ? `${topClient.client} — Top 3 = ${percent(top3Pct)} do MRR`
            : "Sem contratos ativos"}
          icon={<Users className="h-4 w-4 text-orbi-amber" />}
          bg="bg-orbi-amber/10"
          highlight={topClient ? topClient.percent > 0.4 : false}
        />
        <ClickableStatCard
          href="/payroll"
          title="Comissão vs MRR"
          value={commissionThisMonth > 0 ? currency(commissionThisMonth) : "—"}
          description={commissionThisMonth > 0 && periodMRR > 0
            ? `Ratio: ${percent(commissionThisMonth / (periodMRR * 12))} da receita anual`
            : `Sem dados de folha para ${shortMonthName(selectedMonth)}`}
          icon={<TrendingUp className="h-4 w-4 text-orbi-emerald" />}
          bg="bg-orbi-emerald/10"
        />
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* MRR chart - 2 cols */}
        <Card className="border-border/50 lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>MRR Acumulado no Ano</CardTitle>
                <CardDescription>Receita acumulada vs meta anual — {year}</CardDescription>
              </div>
              {/* Chart type toggle */}
              <div className="flex rounded-lg border border-border overflow-hidden">
                {(["area", "bar", "line"] as ChartType[]).map((type) => (
                  <button
                    key={type}
                    onClick={() => setChartType(type)}
                    className={`p-2 transition-colors ${
                      chartType === type
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    }`}
                    title={type === "area" ? "Area" : type === "bar" ? "Barras" : "Linha"}
                  >
                    {CHART_ICONS[type]}
                  </button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                {chartType === "area" ? (
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="mrrGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={COLORS.cyan} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={COLORS.cyan} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={COLORS.muted} />
                    <XAxis dataKey="name" stroke={COLORS.text} fontSize={12} />
                    <YAxis stroke={COLORS.text} fontSize={12} tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`} />
                    <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: "oklch(0.95 0 0)" }} formatter={(value) => [currency(Number(value)), ""]} />
                    <ReferenceLine y={yearlyGoal} stroke={COLORS.rose} strokeDasharray="5 5" label={{ value: "Meta", fill: COLORS.rose, fontSize: 11 }} />
                    <Area type="monotone" dataKey="mrrAcumulado" stroke={COLORS.cyan} fill="url(#mrrGrad)" strokeWidth={2} name="MRR Acumulado" />
                  </AreaChart>
                ) : chartType === "bar" ? (
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={COLORS.muted} />
                    <XAxis dataKey="name" stroke={COLORS.text} fontSize={12} />
                    <YAxis stroke={COLORS.text} fontSize={12} tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`} />
                    <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: "oklch(0.95 0 0)" }} formatter={(value) => [currency(Number(value)), ""]} />
                    <ReferenceLine y={yearlyGoal} stroke={COLORS.rose} strokeDasharray="5 5" label={{ value: "Meta", fill: COLORS.rose, fontSize: 11 }} />
                    <Bar dataKey="mrrAcumulado" fill={COLORS.cyan} radius={[4, 4, 0, 0]} name="MRR Acumulado" />
                  </BarChart>
                ) : (
                  <RLineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={COLORS.muted} />
                    <XAxis dataKey="name" stroke={COLORS.text} fontSize={12} />
                    <YAxis stroke={COLORS.text} fontSize={12} tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`} />
                    <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: "oklch(0.95 0 0)" }} formatter={(value) => [currency(Number(value)), ""]} />
                    <ReferenceLine y={yearlyGoal} stroke={COLORS.rose} strokeDasharray="5 5" label={{ value: "Meta", fill: COLORS.rose, fontSize: 11 }} />
                    <Line type="monotone" dataKey="mrrAcumulado" stroke={COLORS.cyan} strokeWidth={2} dot={{ fill: COLORS.cyan, r: 4 }} name="MRR Acumulado" />
                  </RLineChart>
                )}
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Revenue type pie chart */}
        <Card className="border-border/50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>MRR por Tipo</CardTitle>
                <CardDescription>Composição da receita ativa</CardDescription>
              </div>
              <PieChartIcon className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            {revenueByType.length > 0 ? (
              <div className="h-[300px] flex flex-col items-center justify-center">
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={revenueByType}
                      dataKey="value"
                      nameKey="type"
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      strokeWidth={2}
                      stroke="oklch(0.15 0.005 260)"
                    >
                      {revenueByType.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} formatter={(value) => [currency(Number(value)), ""]} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap gap-3 justify-center">
                  {revenueByType.map((r, i) => (
                    <div key={r.type} className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                      <span className="text-xs text-muted-foreground">{r.type}: {currency(r.value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">Sem contratos ativos</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Client concentration chart */}
      {concentration.length > 0 && (
        <Card className="border-border/50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Concentração de Clientes</CardTitle>
                <CardDescription>Distribuição do MRR por cliente — identifique riscos de dependência</CardDescription>
              </div>
              <Link href="/contracts">
                <Button variant="ghost" size="sm" className="text-xs gap-1">
                  Ver contratos <ChevronRight className="h-3 w-3" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={concentration} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={COLORS.muted} horizontal={false} />
                  <XAxis type="number" stroke={COLORS.text} fontSize={12} tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`} />
                  <YAxis type="category" dataKey="client" stroke={COLORS.text} fontSize={11} width={140} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(value) => [currency(Number(value)), "MRR"]} />
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

      {/* Alerts */}
      {(overdueAlerts.length > 0 || upcomingAlerts.length > 0 || (churnEnabled && churn.count > 0)) && (
        <Card className="border-border/50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orbi-amber" />
                Alertas
              </CardTitle>
              <Badge variant="outline" className="text-orbi-amber border-orbi-amber/30">
                {overdueAlerts.length + upcomingAlerts.length + (churnEnabled ? churn.count : 0)}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {churnEnabled && churn.contracts.map((c) => (
                <Link key={c.id} href="/contracts" className="flex items-center justify-between rounded-lg bg-orbi-rose/10 px-4 py-2.5 hover:bg-orbi-rose/15 transition-colors">
                  <span className="text-sm">{c.client} — contrato vence em breve ({currency(c.monthlyFee)}/mês)</span>
                  <Badge variant="destructive">Churn Risk</Badge>
                </Link>
              ))}
              {overdueAlerts.map((m) => (
                <Link key={m.id} href="/meetings" className="flex items-center justify-between rounded-lg bg-orbi-rose/10 px-4 py-2.5 hover:bg-orbi-rose/15 transition-colors">
                  <span className="text-sm">{m.clientLead} — retorno vencido</span>
                  <Badge variant="destructive">Vencido</Badge>
                </Link>
              ))}
              {upcomingAlerts.map((m) => (
                <Link key={m.id} href="/meetings" className="flex items-center justify-between rounded-lg bg-orbi-amber/10 px-4 py-2.5 hover:bg-orbi-amber/15 transition-colors">
                  <span className="text-sm">{m.clientLead} — retorno próximo</span>
                  <Badge className="bg-orbi-amber text-black">Próximo</Badge>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
      </>}
    </div>
  );
}

function ClickableStatCard({ href, title, value, description, icon, bg, badge, badgeColor, highlight }: {
  href: string;
  title: string;
  value: string;
  description: string;
  icon: React.ReactNode;
  bg: string;
  badge?: string;
  badgeColor?: string;
  highlight?: boolean;
}) {
  return (
    <Link href={href}>
      <Card className={`border-border/50 hover:border-primary/40 transition-all hover:shadow-md hover:shadow-primary/5 cursor-pointer ${highlight ? "border-orbi-rose/30" : ""}`}>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
          <div className={`rounded-md p-2 ${bg}`}>{icon}</div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold">{value}</span>
            {badge && (
              <Badge className={`text-[10px] ${badgeColor}`}>{badge}</Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
          <p className="text-[10px] text-primary mt-2 flex items-center gap-0.5">
            Ver detalhes <ChevronRight className="h-3 w-3" />
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}
