"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { TrendingUp, FileText, AlertTriangle, ArrowUpRight, ArrowDownRight } from "lucide-react";
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
} from "@/lib/calculations";
import { Badge } from "@/components/ui/badge";
import { AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine, ResponsiveContainer } from "recharts";

export default function DashboardPage() {
  const { data, loaded } = useAppStore();
  if (!loaded) return null;

  const { contracts, meetings, profile } = data;
  const year = profile.currentYear;
  const currentMonth = new Date().getMonth() + 1;
  const currentQuarter = Math.ceil(currentMonth / 3);

  const mrrActive = mrrActiveMonthly(contracts);
  const activeCount = activeContractsCount(contracts);
  const mrrYear = mrrEnteringYear(contracts, year, "Ativo");
  const mrrNext = mrrNextYear(contracts, year, "Ativo");
  const mrrMonthVal = mrrInMonth(contracts, year, currentMonth, "Ativo");
  const mrrQuarterVal = mrrInQuarter(contracts, year, currentQuarter, "Ativo");

  const yearlyGoal = profile.yearlyGoal;
  const monthlyGoal = yearlyGoal / 12;
  const quarterlyGoal = yearlyGoal / 4;

  const yearPct = yearlyGoal > 0 ? mrrYear / yearlyGoal : 0;
  const monthPct = monthlyGoal > 0 ? mrrMonthVal / monthlyGoal : 0;
  const quarterPct = quarterlyGoal > 0 ? mrrQuarterVal / quarterlyGoal : 0;

  const chartData = mrrChartData(contracts, year, "Ativo");

  const overdueAlerts = meetings.filter((m) => meetingAlert(m) === "Retorno vencido");
  const upcomingAlerts = meetings.filter((m) => meetingAlert(m) === "Retorno proximo");

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground">
          Visao geral — {monthName(currentMonth)} {year}
        </p>
      </div>

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

      <div className="grid gap-4 md:grid-cols-3">
        <GoalCard label={`Meta Mensal (${shortMonthName(currentMonth)})`} current={mrrMonthVal} target={monthlyGoal} pct={monthPct} />
        <GoalCard label={`Meta Trimestral (T${currentQuarter})`} current={mrrQuarterVal} target={quarterlyGoal} pct={quarterPct} />
        <GoalCard label={`Meta Anual (${year})`} current={mrrYear} target={yearlyGoal} pct={yearPct} />
      </div>

      <Card className="border-border/50">
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
                    <stop offset="5%" stopColor="oklch(0.75 0.15 195)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="oklch(0.75 0.15 195)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.28 0.01 260)" />
                <XAxis dataKey="name" stroke="oklch(0.65 0.01 260)" fontSize={12} />
                <YAxis stroke="oklch(0.65 0.01 260)" fontSize={12} tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={{ background: "oklch(0.18 0.005 260)", border: "1px solid oklch(0.28 0.01 260)", borderRadius: "8px" }}
                  labelStyle={{ color: "oklch(0.95 0 0)" }}
                  formatter={(value) => [currency(Number(value)), ""]}
                />
                <ReferenceLine y={yearlyGoal} stroke="oklch(0.65 0.2 15)" strokeDasharray="5 5" />
                <Area type="monotone" dataKey="mrrAcumulado" stroke="oklch(0.75 0.15 195)" fill="url(#mrrGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orbi-amber" />
            Alertas
          </CardTitle>
        </CardHeader>
        <CardContent>
          {overdueAlerts.length === 0 && upcomingAlerts.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum alerta no momento.</p>
          ) : (
            <div className="space-y-2">
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
