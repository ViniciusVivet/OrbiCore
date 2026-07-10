"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { TrendingUp, FileText, AlertTriangle, ArrowUpRight, ArrowDownRight, Shield, Target, Users } from "lucide-react";
import { useAppStore } from "@/components/store-provider";
import { currency, percent, monthName, shortMonthName } from "@/lib/format";
import {
  mrrActiveMonthly,
  activeContractsCount,
  mrrEnteringYear,
  mrrNextYear,
  mrrInMonth,
  mrrInQuarter,
  mrrChartData,
  meetingAlert,
  clientConcentration,
  mrrByRevenueType,
  churnRisk,
  weightedPipelineRevenue,
} from "@/lib/calculations";
import { Badge } from "@/components/ui/badge";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine,
  ResponsiveContainer, BarChart, Bar, Cell, PieChart, Pie,
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

export default function DashboardPage() {
  const { data, loaded } = useAppStore();
  if (!loaded) return null;

  const { contracts, meetings, payroll, profile } = data;
  const year = profile.currentYear;
  const currentMonth = new Date().getMonth() + 1;
  const currentQuarter = Math.ceil(currentMonth / 3);

  // --- MRR Metrics ---
  const mrrActive = mrrActiveMonthly(contracts);
  const activeCount = activeContractsCount(contracts);
  const mrrYear = mrrEnteringYear(contracts, year, "Ativo");
  const mrrNext = mrrNextYear(contracts, year, "Ativo");
  const mrrMonthVal = mrrInMonth(contracts, year, currentMonth, "Ativo");
  const mrrQuarterVal = mrrInQuarter(contracts, year, currentQuarter, "Ativo");

  // --- Goals ---
  const yearlyGoal = profile.yearlyGoal;
  const monthlyGoal = yearlyGoal / 12;
  const quarterlyGoal = yearlyGoal / 4;
  const yearPct = yearlyGoal > 0 ? mrrYear / yearlyGoal : 0;
  const monthPct = monthlyGoal > 0 ? mrrMonthVal / monthlyGoal : 0;
  const quarterPct = quarterlyGoal > 0 ? mrrQuarterVal / quarterlyGoal : 0;

  // --- Chart data ---
  const chartData = mrrChartData(contracts, year, "Ativo");

  // --- Alerts ---
  const overdueAlerts = meetings.filter((m) => meetingAlert(m) === "Retorno vencido");
  const upcomingAlerts = meetings.filter((m) => meetingAlert(m) === "Retorno proximo");

  // --- Cross-module insights ---
  const concentration = clientConcentration(contracts);
  const revenueByType = mrrByRevenueType(contracts);
  const churn = churnRisk(contracts, year, 3);
  const pipeline = weightedPipelineRevenue(meetings);

  // --- Commission vs MRR (cross: payroll x contracts) ---
  const currentPayroll = payroll.find((p) => p.month === currentMonth && p.year === year);
  const commissionThisMonth = currentPayroll?.commission ?? 0;
  const mrrSoldThisMonth = mrrMonthVal;

  // Top client concentration risk
  const topClient = concentration[0];
  const top3Pct = concentration.length >= 3 ? concentration[2].cumulativePercent : (topClient?.cumulativePercent ?? 0);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground">
          Visao geral — {monthName(currentMonth)} {year}
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="MRR Ativo"
          value={currency(mrrActive)}
          description="Soma dos fees mensais ativos"
          icon={<TrendingUp className="h-4 w-4 text-orbi-cyan" />}
          bg="bg-orbi-cyan/10"
        />
        <StatCard
          title="Contratos Ativos"
          value={String(activeCount)}
          description={`${currency(mrrMonthVal)} vendido em ${shortMonthName(currentMonth)}`}
          icon={<FileText className="h-4 w-4 text-orbi-blue" />}
          bg="bg-orbi-blue/10"
        />
        <StatCard
          title="MRR no Ano"
          value={currency(mrrYear)}
          description={yearPct >= 1
            ? `Meta superada em ${percent(yearPct - 1)}`
            : `Falta ${percent(1 - yearPct)} da meta`}
          icon={<ArrowUpRight className="h-4 w-4 text-orbi-emerald" />}
          bg="bg-orbi-emerald/10"
        />
        <StatCard
          title="MRR Proximo Ano"
          value={currency(mrrNext)}
          description="Receita que transborda para o proximo ano"
          icon={<ArrowDownRight className="h-4 w-4 text-orbi-amber" />}
          bg="bg-orbi-amber/10"
        />
      </div>

      {/* Goal progress */}
      <div className="grid gap-4 md:grid-cols-3">
        <GoalCard label={`Meta Mensal (${shortMonthName(currentMonth)})`} current={mrrMonthVal} target={monthlyGoal} pct={monthPct} />
        <GoalCard label={`Meta Trimestral (T${currentQuarter})`} current={mrrQuarterVal} target={quarterlyGoal} pct={quarterPct} />
        <GoalCard label={`Meta Anual (${year})`} current={mrrYear} target={yearlyGoal} pct={yearPct} />
      </div>

      {/* Cross-module insight cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Pipeline ponderado */}
        <Card className="border-border/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-1">
              <Target className="h-4 w-4 text-purple-400" />
              <p className="text-sm text-muted-foreground">Pipeline Ponderado</p>
            </div>
            <p className="text-2xl font-bold">{currency(pipeline.weighted)}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {pipeline.dealCount} deals abertos — melhor caso: {currency(pipeline.bestCase)}
            </p>
          </CardContent>
        </Card>

        {/* Churn risk */}
        <Card className={`border-border/50 ${churn.count > 0 ? "border-orbi-rose/30" : ""}`}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-1">
              <Shield className="h-4 w-4 text-orbi-rose" />
              <p className="text-sm text-muted-foreground">Risco de Churn (90d)</p>
            </div>
            <p className="text-2xl font-bold">{churn.count > 0 ? currency(churn.mrrAtRisk) : "Seguro"}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {churn.count > 0
                ? `${churn.count} contrato(s) vencem — ${percent(churn.percentOfTotal)} do MRR`
                : "Nenhum contrato vence nos proximos 90 dias"}
            </p>
          </CardContent>
        </Card>

        {/* Client concentration */}
        <Card className={`border-border/50 ${topClient && topClient.percent > 0.4 ? "border-orbi-amber/30" : ""}`}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-1">
              <Users className="h-4 w-4 text-orbi-amber" />
              <p className="text-sm text-muted-foreground">Concentracao</p>
            </div>
            <p className="text-2xl font-bold">{topClient ? percent(topClient.percent) : "—"}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {topClient
                ? `${topClient.client} — Top 3 = ${percent(top3Pct)} do MRR`
                : "Sem contratos ativos"}
            </p>
          </CardContent>
        </Card>

        {/* Commission vs MRR */}
        <Card className="border-border/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-4 w-4 text-orbi-emerald" />
              <p className="text-sm text-muted-foreground">Comissao vs MRR</p>
            </div>
            {commissionThisMonth > 0 ? (
              <>
                <p className="text-2xl font-bold">{currency(commissionThisMonth)}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {mrrSoldThisMonth > 0
                    ? `Ratio: ${percent(commissionThisMonth / (mrrSoldThisMonth * 12))} da receita anual vendida`
                    : "Sem MRR vendido neste mes"}
                </p>
              </>
            ) : (
              <>
                <p className="text-2xl font-bold">—</p>
                <p className="text-xs text-muted-foreground mt-1">Sem dados de folha para {shortMonthName(currentMonth)}</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts row */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* MRR accumulated chart - 2 cols */}
        <Card className="border-border/50 lg:col-span-2">
          <CardHeader>
            <CardTitle>MRR Acumulado no Ano</CardTitle>
            <CardDescription>Receita acumulada vs meta anual — {year}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
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
                  <Tooltip
                    contentStyle={{ background: COLORS.bg, border: `1px solid ${COLORS.border}`, borderRadius: "8px" }}
                    labelStyle={{ color: "oklch(0.95 0 0)" }}
                    formatter={(value) => [currency(Number(value)), ""]}
                  />
                  <ReferenceLine y={yearlyGoal} stroke={COLORS.rose} strokeDasharray="5 5" label={{ value: "Meta", fill: COLORS.rose, fontSize: 11 }} />
                  <Area type="monotone" dataKey="mrrAcumulado" stroke={COLORS.cyan} fill="url(#mrrGrad)" strokeWidth={2} name="MRR Acumulado" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Revenue type pie chart */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle>MRR por Tipo</CardTitle>
            <CardDescription>Composicao da receita ativa</CardDescription>
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
                    <Tooltip
                      contentStyle={{ background: COLORS.bg, border: `1px solid ${COLORS.border}`, borderRadius: "8px" }}
                      formatter={(value) => [currency(Number(value)), ""]}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap gap-3 justify-center">
                  {revenueByType.map((r, i) => (
                    <div key={r.type} className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                      <span className="text-xs text-muted-foreground">{r.type}</span>
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
            <CardTitle>Concentracao de Clientes</CardTitle>
            <CardDescription>Distribuicao do MRR por cliente — identifique riscos de dependencia</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={concentration} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={COLORS.muted} horizontal={false} />
                  <XAxis type="number" stroke={COLORS.text} fontSize={12} tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`} />
                  <YAxis type="category" dataKey="client" stroke={COLORS.text} fontSize={11} width={140} />
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

      {/* Alerts */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orbi-amber" />
            Alertas
          </CardTitle>
        </CardHeader>
        <CardContent>
          {overdueAlerts.length === 0 && upcomingAlerts.length === 0 && churn.count === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum alerta no momento.</p>
          ) : (
            <div className="space-y-2">
              {churn.contracts.map((c) => (
                <div key={c.id} className="flex items-center justify-between rounded-lg bg-orbi-rose/10 px-4 py-2">
                  <span className="text-sm">{c.client} — contrato vence em breve ({currency(c.monthlyFee)}/mes)</span>
                  <Badge variant="destructive">Churn Risk</Badge>
                </div>
              ))}
              {overdueAlerts.map((m) => (
                <div key={m.id} className="flex items-center justify-between rounded-lg bg-orbi-rose/10 px-4 py-2">
                  <span className="text-sm">{m.clientLead} — retorno vencido</span>
                  <Badge variant="destructive">Vencido</Badge>
                </div>
              ))}
              {upcomingAlerts.map((m) => (
                <div key={m.id} className="flex items-center justify-between rounded-lg bg-orbi-amber/10 px-4 py-2">
                  <span className="text-sm">{m.clientLead} — retorno proximo</span>
                  <Badge className="bg-orbi-amber text-black">Proximo</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ title, value, description, icon, bg }: {
  title: string; value: string; description: string; icon: React.ReactNode; bg: string;
}) {
  return (
    <Card className="border-border/50">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className={`rounded-md p-2 ${bg}`}>{icon}</div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
      </CardContent>
    </Card>
  );
}

function GoalCard({ label, current, target, pct }: {
  label: string; current: number; target: number; pct: number;
}) {
  const exceeded = pct >= 1;
  return (
    <Card className="border-border/50">
      <CardContent className="pt-6">
        <p className="text-sm font-medium text-muted-foreground mb-2">{label}</p>
        <div className="text-xl font-bold">{currency(current)}</div>
        <p className="text-xs text-muted-foreground">de {currency(target)}</p>
        <div className="mt-3 h-2 rounded-full bg-muted overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${exceeded ? "bg-orbi-emerald" : "bg-orbi-cyan"}`}
            style={{ width: `${Math.min(pct * 100, 100)}%` }}
          />
        </div>
        <p className={`text-xs mt-1 ${exceeded ? "text-orbi-emerald" : "text-muted-foreground"}`}>
          {exceeded ? `Superou em ${percent(pct - 1)}` : `${percent(pct)} atingido`}
        </p>
      </CardContent>
    </Card>
  );
}
