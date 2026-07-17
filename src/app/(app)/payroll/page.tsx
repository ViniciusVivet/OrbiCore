"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Calculator, Save } from "lucide-react";
import { useAppStore } from "@/components/store-provider";
import { currency, monthName } from "@/lib/format";
import { calcPayroll } from "@/lib/calculations";
import { PayrollMonth } from "@/lib/types";

const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);

export default function PayrollPage() {
  const { data, loaded, upsertPayroll } = useAppStore();
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [form, setForm] = useState({
    baseSalary: 0,
    homeOffice: 0,
    commission: 0,
    workDays: 22,
    sundaysHolidays: 4,
    otherDeductions: 0,
  });

  const year = loaded ? data.profile.currentYear : new Date().getFullYear();

  useEffect(() => {
    if (loaded) {
      const existing = data.payroll.find((p) => p.month === selectedMonth && p.year === year);
      if (existing) {
        setForm({
          baseSalary: existing.baseSalary,
          homeOffice: existing.homeOffice,
          commission: existing.commission,
          workDays: existing.workDays,
          sundaysHolidays: existing.sundaysHolidays,
          otherDeductions: existing.otherDeductions,
        });
      }
    }
  }, [loaded, data.payroll, selectedMonth, year]);

  if (!loaded) return null;

  function loadMonth(month: number) {
    setSelectedMonth(month);
    const p = data.payroll.find((x) => x.month === month && x.year === year);
    setForm({
      baseSalary: p?.baseSalary ?? 0,
      homeOffice: p?.homeOffice ?? 0,
      commission: p?.commission ?? 0,
      workDays: p?.workDays ?? 22,
      sundaysHolidays: p?.sundaysHolidays ?? 4,
      otherDeductions: p?.otherDeductions ?? 0,
    });
  }

  function handleSave() {
    upsertPayroll({
      month: selectedMonth,
      year,
      ...form,
    });
  }

  const payrollData: PayrollMonth = {
    id: "", month: selectedMonth, year,
    createdAt: "",
    ...form,
  };
  const calc = calcPayroll(payrollData);

  // Annual summary
  const annualData = MONTHS.map((m) => {
    const p = data.payroll.find((x) => x.month === m && x.year === year);
    if (!p) return null;
    return { month: m, ...calcPayroll(p) };
  }).filter(Boolean);

  const annualTotals = annualData.reduce(
    (acc, d) => {
      if (!d) return acc;
      return {
        gross: acc.gross + d.grossTotal,
        inss: acc.inss + d.inss,
        irrf: acc.irrf + d.irrf,
        net: acc.net + d.netTotal,
      };
    },
    { gross: 0, inss: 0, irrf: 0, net: 0 }
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Cálculo Mensal</h2>
        <p className="text-muted-foreground">Simule salário, comissão, DSR e descontos — {year}</p>
      </div>

      <div className="flex items-center gap-2 p-1 bg-muted rounded-lg w-fit">
        <Badge variant="outline" className="border-orbi-amber text-orbi-amber">
          <AlertTriangle className="h-3 w-3 mr-1" />
          Simulação — valide com contador/DP
        </Badge>
      </div>

      {/* Month selector */}
      <div className="flex gap-1 flex-wrap">
        {MONTHS.map((m) => {
          const hasData = data.payroll.some((p) => p.month === m && p.year === year);
          return (
            <Button
              key={m}
              variant={selectedMonth === m ? "default" : "outline"}
              size="sm"
              onClick={() => loadMonth(m)}
              className={hasData && selectedMonth !== m ? "border-orbi-cyan/30" : ""}
            >
              {monthName(m).slice(0, 3)}
            </Button>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Input form */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5 text-orbi-cyan" />
              {monthName(selectedMonth)} {year}
            </CardTitle>
            <CardDescription>Preencha os valores. Home Office não entra na base de INSS/IRRF.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Salário Base (R$)</Label>
                <Input type="number" step="0.01" value={form.baseSalary || ""} onChange={(e) => setForm({ ...form, baseSalary: parseFloat(e.target.value) || 0 })} />
              </div>
              <div className="space-y-2">
                <Label>Auxílio Home Office (R$)</Label>
                <Input type="number" step="0.01" value={form.homeOffice || ""} onChange={(e) => setForm({ ...form, homeOffice: parseFloat(e.target.value) || 0 })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Comissão (R$)</Label>
              <Input type="number" step="0.01" value={form.commission || ""} onChange={(e) => setForm({ ...form, commission: parseFloat(e.target.value) || 0 })} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Dias Úteis</Label>
                <Input type="number" value={form.workDays || ""} onChange={(e) => setForm({ ...form, workDays: parseInt(e.target.value) || 0 })} />
              </div>
              <div className="space-y-2">
                <Label>Domingos/Feriados</Label>
                <Input type="number" value={form.sundaysHolidays || ""} onChange={(e) => setForm({ ...form, sundaysHolidays: parseInt(e.target.value) || 0 })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Outros Descontos (R$)</Label>
              <Input type="number" step="0.01" value={form.otherDeductions || ""} onChange={(e) => setForm({ ...form, otherDeductions: parseFloat(e.target.value) || 0 })} />
            </div>
            <Button onClick={handleSave} className="w-full gap-2">
              <Save className="h-4 w-4" />
              Salvar {monthName(selectedMonth)}
            </Button>
          </CardContent>
        </Card>

        {/* Results */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle>Resultado</CardTitle>
            <CardDescription>Cálculos automáticos baseados nas tabelas 2026</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <ResultRow label="DSR sobre Comissão" value={calc.dsr} />
              <ResultRow label="Total Bruto" value={calc.grossTotal} highlight />
              <div className="border-t border-border my-2" />
              <ResultRow label="Base Tributável (sem Home Office)" value={calc.taxableBase} muted />
              <ResultRow label="INSS" value={-calc.inss} negative />
              <ResultRow label="Base IRRF" value={calc.irrfBase} muted />
              <ResultRow label="IRRF" value={-calc.irrf} negative />
              {form.otherDeductions > 0 && <ResultRow label="Outros Descontos" value={-form.otherDeductions} negative />}
              <div className="border-t border-border my-2" />
              <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-orbi-emerald/10">
                <span className="font-bold text-orbi-emerald">Total Líquido</span>
                <span className="text-xl font-bold text-orbi-emerald">{currency(calc.netTotal)}</span>
              </div>
            </div>

            {annualData.length > 0 && (
              <div className="mt-6 pt-4 border-t border-border">
                <p className="text-sm font-medium text-muted-foreground mb-3">Acumulado no Ano ({annualData.length} meses)</p>
                <div className="space-y-2">
                  <ResultRow label="Total Bruto" value={annualTotals.gross} />
                  <ResultRow label="Total INSS" value={-annualTotals.inss} negative />
                  <ResultRow label="Total IRRF" value={-annualTotals.irrf} negative />
                  <ResultRow label="Total Líquido" value={annualTotals.net} highlight />
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ResultRow({ label, value, highlight, negative, muted }: {
  label: string; value: number; highlight?: boolean; negative?: boolean; muted?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className={`text-sm ${muted ? "text-muted-foreground" : ""}`}>{label}</span>
      <span className={`font-mono text-sm font-medium ${highlight ? "text-orbi-cyan text-base" : ""} ${negative ? "text-orbi-rose" : ""}`}>
        {currency(value)}
      </span>
    </div>
  );
}
