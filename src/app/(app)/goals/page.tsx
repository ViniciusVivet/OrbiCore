"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Target, Save } from "lucide-react";
import { useAppStore } from "@/components/store-provider";
import { currency, percent, shortMonthName } from "@/lib/format";
import { mrrInMonth, mrrInQuarter, mrrEnteringYear } from "@/lib/calculations";
import { useState, useEffect } from "react";

export default function GoalsPage() {
  const { data, loaded, updateProfile } = useAppStore();
  const [yearlyGoal, setYearlyGoal] = useState(0);

  useEffect(() => {
    if (loaded) setYearlyGoal(data.profile.yearlyGoal);
  }, [loaded, data.profile.yearlyGoal]);

  if (!loaded) return null;

  const year = data.profile.currentYear;
  const { contracts } = data;
  const monthlyGoal = yearlyGoal / 12;
  const quarterlyGoal = yearlyGoal / 4;

  const months = Array.from({ length: 12 }, (_, i) => {
    const m = i + 1;
    const mrr = mrrInMonth(contracts, year, m, "Ativo");
    const pct = monthlyGoal > 0 ? mrr / monthlyGoal : 0;
    return { month: m, label: shortMonthName(m), mrr, pct };
  });

  const quarters = [1, 2, 3, 4].map((q) => {
    const mrr = mrrInQuarter(contracts, year, q, "Ativo");
    const pct = quarterlyGoal > 0 ? mrr / quarterlyGoal : 0;
    return { quarter: q, label: `T${q}`, mrr, pct };
  });

  const totalYear = mrrEnteringYear(contracts, year, "Ativo");
  const yearPct = yearlyGoal > 0 ? totalYear / yearlyGoal : 0;

  function handleSave() {
    updateProfile({ yearlyGoal });
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Metas</h2>
        <p className="text-muted-foreground">Defina e acompanhe metas mensais, trimestrais e anuais — {year}</p>
      </div>

      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-orbi-cyan" />
            Meta Anual
          </CardTitle>
          <CardDescription>A meta mensal e trimestral sao calculadas automaticamente</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-4">
            <div className="space-y-2 flex-1">
              <Label>Meta Anual (R$)</Label>
              <Input
                type="number"
                step="0.01"
                value={yearlyGoal || ""}
                onChange={(e) => setYearlyGoal(parseFloat(e.target.value) || 0)}
              />
            </div>
            <div className="text-sm text-muted-foreground pb-2">
              Mensal: {currency(monthlyGoal)} | Trimestral: {currency(quarterlyGoal)}
            </div>
            <Button onClick={handleSave} className="gap-2"><Save className="h-4 w-4" />Salvar</Button>
          </div>
        </CardContent>
      </Card>

      {/* Annual progress */}
      <Card className="border-border/50">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium">Progresso Anual</span>
            <span className="text-sm text-muted-foreground">{currency(totalYear)} de {currency(yearlyGoal)}</span>
          </div>
          <div className="h-4 rounded-full bg-muted overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${yearPct >= 1 ? "bg-orbi-emerald" : "bg-orbi-cyan"}`}
              style={{ width: `${Math.min(yearPct * 100, 100)}%` }}
            />
          </div>
          <p className={`text-sm mt-2 ${yearPct >= 1 ? "text-orbi-emerald" : "text-muted-foreground"}`}>
            {yearPct >= 1 ? `Meta superada em ${percent(yearPct - 1)}` : `${percent(yearPct)} atingido — falta ${currency(Math.max(0, yearlyGoal - totalYear))}`}
          </p>
        </CardContent>
      </Card>

      {/* Quarterly */}
      <div>
        <h3 className="text-lg font-semibold mb-3">Por Trimestre</h3>
        <div className="grid gap-4 md:grid-cols-4">
          {quarters.map((q) => (
            <Card key={q.quarter} className="border-border/50">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium">{q.label}</span>
                  <span className={`text-sm ${q.pct >= 1 ? "text-orbi-emerald" : "text-muted-foreground"}`}>
                    {percent(q.pct)}
                  </span>
                </div>
                <p className="text-lg font-bold">{currency(q.mrr)}</p>
                <p className="text-xs text-muted-foreground">de {currency(quarterlyGoal)}</p>
                <div className="mt-2 h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className={`h-full rounded-full ${q.pct >= 1 ? "bg-orbi-emerald" : "bg-orbi-cyan"}`}
                    style={{ width: `${Math.min(q.pct * 100, 100)}%` }}
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Monthly */}
      <div>
        <h3 className="text-lg font-semibold mb-3">Por Mes</h3>
        <div className="grid gap-3 md:grid-cols-4 lg:grid-cols-6">
          {months.map((m) => (
            <Card key={m.month} className="border-border/50">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium">{m.label}</span>
                  <span className={`text-xs ${m.pct >= 1 ? "text-orbi-emerald" : "text-muted-foreground"}`}>
                    {m.mrr > 0 ? percent(m.pct) : "—"}
                  </span>
                </div>
                <p className="text-sm font-bold">{m.mrr > 0 ? currency(m.mrr) : "—"}</p>
                <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className={`h-full rounded-full ${m.pct >= 1 ? "bg-orbi-emerald" : "bg-orbi-cyan"}`}
                    style={{ width: `${Math.min(m.pct * 100, 100)}%` }}
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
