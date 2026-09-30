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
import { calcCommissionImpact, calcPayroll } from "@/lib/calculations";
import { PayrollMonth } from "@/lib/types";
import { toast } from "sonner";
import { CurrencyInput } from "@/components/currency-input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { availableYears, currentCalendarYear } from "@/lib/years";
import { PageLoading } from "@/components/page-loading";
import { CommissionRulesEditor, CommissionSalesEditor } from "@/components/commission-sales-editor";
import { useConfirm } from "@/components/confirm-provider";
import { payrollFormError, payrollFormFromMonth, payrollPayload } from "@/lib/payroll-form";
import { commissionBaseAmount, commissionRateForAmount, commissionRulesError } from "@/lib/commission";

const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);

export default function PayrollPage() {
  const { data, loaded } = useAppStore();
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(currentCalendarYear());

  if (!loaded) return <PageLoading />;

  return <PayrollEditor key={`${year}-${selectedMonth}`} year={year} selectedMonth={selectedMonth}
    existing={data.payroll.find((p) => p.month === selectedMonth && p.year === year)}
    onPeriodChange={(month, nextYear) => { setSelectedMonth(month); setYear(nextYear); }} />;
}

function PayrollEditor({ year, selectedMonth, existing, onPeriodChange }: {
  year: number;
  selectedMonth: number;
  existing?: PayrollMonth;
  onPeriodChange: (month: number, year: number) => void;
}) {
  const { data, syncStatus, upsertPayroll, updateProfile } = useAppStore();
  const confirm = useConfirm();
  const [form, setForm] = useState(() => payrollFormFromMonth(existing));
  const [savedForm, setSavedForm] = useState(() => JSON.stringify(payrollFormFromMonth(existing)));
  const [rulesDraft, setRulesDraft] = useState(() => [...(data.profile.commissionRules ?? [])]);
  const rulesDirty = JSON.stringify(rulesDraft) !== JSON.stringify(data.profile.commissionRules ?? []);
  const dirty = JSON.stringify(form) !== savedForm || rulesDirty;
  const formError = payrollFormError(form);

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  async function changePeriod(month: number, nextYear: number) {
    if (month === selectedMonth && nextYear === year) return;
    if (dirty && !await confirm({ title: "Trocar período sem salvar?", description: "Há alterações nesta simulação que ainda não foram salvas. Os dados já gravados continuarão intactos.", confirmLabel: "Descartar alterações" })) return;
    onPeriodChange(month, nextYear);
  }

  function handleSave() {
    if (rulesDirty) {
      toast.error("Salve ou desfaça as alterações nas faixas antes de salvar o mês.");
      return;
    }
    if (formError) {
      toast.error(formError);
      return;
    }
    if (syncStatus === "conflict" || syncStatus === "loading") {
      toast.error("Resolva a sincronização no topo da tela antes de salvar este mês.");
      return;
    }
    upsertPayroll(payrollPayload(form, selectedMonth, year));
    setSavedForm(JSON.stringify(form));
    toast.success(`${monthName(selectedMonth)} atualizado neste dispositivo. Confira a sincronização no topo da tela.`);
  }

  function handleSaveRules() {
    const error = commissionRulesError(rulesDraft);
    if (error) { toast.error(error); return; }
    if (syncStatus === "conflict" || syncStatus === "loading") {
      toast.error("Resolva a sincronização antes de salvar as faixas.");
      return;
    }
    const rules = [...rulesDraft].sort((a, b) => a.minSaleAmount - b.minSaleAmount);
    updateProfile({ commissionRules: rules });
    setRulesDraft(rules);
    setForm((current) => ({
      ...current,
      commissionSales: current.commissionSales.map((sale) => sale.rateSource === "auto"
        ? { ...sale, rate: commissionRateForAmount(rules, commissionBaseAmount(sale)) }
        : sale),
    }));
    toast.success("Faixas salvas. Se houver lançamentos neste mês, confira o percentual e salve o mês para aplicar.");
  }

  const payrollData: PayrollMonth = {
    id: "",
    createdAt: "",
    ...payrollPayload(form, selectedMonth, year),
  };
  const calc = calcPayroll(payrollData);
  const impact = calcCommissionImpact(payrollData);

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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Cálculo Mensal</h2>
          <p className="text-muted-foreground">Simule salário, comissão, DSR e descontos — {year}</p>
        </div>
        <Select value={String(year)} onValueChange={(value) => { if (value) void changePeriod(selectedMonth, Number(value)); }}>
          <SelectTrigger className="w-28" aria-label="Ano do cálculo"><SelectValue /></SelectTrigger>
          <SelectContent>{availableYears(data).map((option) => <SelectItem key={option} value={String(option)}>{option}</SelectItem>)}</SelectContent>
        </Select>
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
              onClick={() => void changePeriod(m, year)}
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
            <CardDescription>Preencha os valores e salve apenas este mês. Home Office não entra na base de INSS/IRRF neste modelo.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="base-salary">Salário Base (R$)</Label>
                <CurrencyInput id="base-salary" value={form.baseSalary} onValueChange={(baseSalary) => setForm({ ...form, baseSalary })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="home-office">Auxílio Home Office (R$)</Label>
                <CurrencyInput id="home-office" value={form.homeOffice} onValueChange={(homeOffice) => setForm({ ...form, homeOffice })} hint={false} />
              </div>
            </div>
            <div className="space-y-3 rounded-lg bg-muted/40 p-3">
              <Label htmlFor="commission-mode">Como calcular a comissão?</Label>
              <Select value={form.commissionMode} onValueChange={(value) => {
                if (value === "manual" || value === "sales") setForm({ ...form, commissionMode: value });
              }}>
                <SelectTrigger id="commission-mode" className="w-full"><SelectValue>{form.commissionMode === "manual" ? "Informar comissão pronta" : "Calcular pelas vendas e percentuais"}</SelectValue></SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">Informar comissão pronta</SelectItem>
                  <SelectItem value="sales">Calcular pelas vendas e percentuais</SelectItem>
                </SelectContent>
              </Select>
              <CommissionRulesEditor rules={rulesDraft} onChange={setRulesDraft} onSave={handleSaveRules} dirty={rulesDirty} />
              {form.commissionMode === "manual" ? (
                <div className="space-y-2">
                  <Label htmlFor="manual-commission">Comissão bruta (R$)</Label>
                  <CurrencyInput id="manual-commission" value={form.commission} onValueChange={(commission) => setForm({ ...form, commission })} hint={false} />
                  <p className="text-xs text-muted-foreground">O valor manual e os lançamentos são preservados ao alternar. Apenas o modo selecionado entra no cálculo.</p>
                </div>
              ) : (
                <>
                  {form.commission > 0 && <p className="text-xs text-muted-foreground">Comissão manual preservada: {currency(form.commission)}. Ela não é somada às vendas.</p>}
                  <CommissionSalesEditor sales={form.commissionSales} rules={data.profile.commissionRules ?? []} onChange={(commissionSales) => setForm({ ...form, commissionSales })} />
                </>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="work-days">Dias Úteis</Label>
                <Input id="work-days" type="number" min={1} max={31} step={1} value={form.workDays || ""} onChange={(e) => setForm({ ...form, workDays: Number(e.target.value) })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="holidays">Domingos/Feriados</Label>
                <Input id="holidays" type="number" min={0} max={31} step={1} value={form.sundaysHolidays} onChange={(e) => setForm({ ...form, sundaysHolidays: Number(e.target.value) })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="other-deductions">Outros Descontos (R$)</Label>
              <CurrencyInput id="other-deductions" value={form.otherDeductions} onValueChange={(otherDeductions) => setForm({ ...form, otherDeductions })} hint={false} />
            </div>
            {dirty && <p className="text-xs text-orbi-amber">Alterações ainda não salvas neste mês.</p>}
            <Button onClick={handleSave} disabled={syncStatus === "conflict" || syncStatus === "loading"} className="w-full gap-2">
              <Save className="h-4 w-4" />
              Salvar {monthName(selectedMonth)}
            </Button>
          </CardContent>
        </Card>

        {/* Results */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle>Resultado</CardTitle>
            <CardDescription>Prévia do mês com as regras da planilha original (referência 2026). Não substitui a folha do DP.</CardDescription>
          </CardHeader>
          <CardContent>
            {formError ? <p role="status" className="text-sm text-orbi-amber">{formError}</p> : <div className="space-y-3">
              <div className="space-y-2 rounded-lg border border-orbi-cyan/30 bg-orbi-cyan/5 p-3">
                <p className="text-sm font-semibold">Quanto a comissão acrescenta ao mês</p>
                <ResultRow label="Comissão bruta" value={impact.commission} />
                <ResultRow label="DSR da comissão" value={impact.dsr} />
                <ResultRow label="INSS adicional" value={-impact.inss} negative />
                <ResultRow label="IRRF adicional" value={-impact.irrf} negative />
                <ResultRow label="Comissão + DSR líquidos estimados" value={impact.net} highlight />
                <p className="text-xs text-muted-foreground">Diferença entre a folha com e sem comissão, mantendo o salário e os demais campos. Outros descontos são abatidos uma única vez no total do mês, abaixo.</p>
              </div>
              <ResultRow label="Salário Base" value={form.baseSalary} />
              <ResultRow label="Home Office" value={form.homeOffice} />
              <ResultRow label="Comissão bruta" value={impact.commission} />
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
            </div>}

            <details className="mt-4 text-xs text-muted-foreground">
              <summary className="cursor-pointer">Sobre os descontos e os anos</summary>
              <p className="mt-2">O modelo preserva as fórmulas da planilha original, inclusive sua redução simplificada de IRRF. Não contempla todas as deduções e particularidades da folha real. As tabelas não mudam automaticamente ao selecionar outro ano. Valide os valores com o contador/DP, especialmente fora de 2026.</p>
              <a className="mt-2 inline-block underline" href="https://www.gov.br/receitafederal/pt-br/assuntos/meu-imposto-de-renda/tabelas/2026" target="_blank" rel="noreferrer">Consultar tabelas oficiais de IRRF 2026</a>
            </details>

            {annualData.length > 0 && (
              <div className="mt-6 pt-4 border-t border-border">
                <p className="text-sm font-medium text-muted-foreground mb-3">Acumulado salvo no ano ({annualData.length} meses)</p>
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
    <div className="flex items-center justify-between gap-3">
      <span className={`text-sm ${muted ? "text-muted-foreground" : ""}`}>{label}</span>
      <span className={`shrink-0 font-mono text-sm font-medium ${highlight ? "text-orbi-cyan text-base" : ""} ${negative ? "text-orbi-rose" : ""}`}>
        {currency(value)}
      </span>
    </div>
  );
}
