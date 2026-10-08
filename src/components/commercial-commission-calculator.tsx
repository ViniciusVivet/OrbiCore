"use client";

import { useState } from "react";
import { ArrowDown, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CurrencyInput } from "@/components/currency-input";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { currency } from "@/lib/format";
import {
  ATTAINMENT_BANDS,
  COMMERCIAL_TAXES,
  calculateCommercialCommission,
  commercialSettingsError,
} from "@/lib/commercial-commission";
import type { CommercialCommissionSettings } from "@/lib/types";

const percentage = (value: number) => new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 }).format(value);

export function CommercialCommissionCalculator({ settings, dirty, onSettingsChange, onSaveSettings, onDiscardSettings, onUseInPayroll, savingDisabled }: {
  settings: CommercialCommissionSettings;
  dirty: boolean;
  onSettingsChange: (settings: CommercialCommissionSettings) => void;
  onSaveSettings: () => void;
  onDiscardSettings: () => void;
  onUseInPayroll: (commission: number) => void;
  savingDisabled: boolean;
}) {
  const [monthlyAmount, setMonthlyAmount] = useState(0);
  const [soldBefore, setSoldBefore] = useState(0);
  const [durationMonths, setDurationMonths] = useState(12);
  const settingsError = commercialSettingsError(settings);
  const inputError = !Number.isFinite(monthlyAmount) || monthlyAmount < 0
    || !Number.isFinite(soldBefore) || soldBefore < 0
    || !Number.isInteger(durationMonths) || durationMonths < 1 || durationMonths > 120;
  const result = calculateCommercialCommission(monthlyAmount, soldBefore, durationMonths, settings);

  return (
    <Card className="border-orbi-cyan/25" id="commercial-calculator">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Settings2 className="h-5 w-5 text-orbi-cyan" />Simulador de comissão comercial</CardTitle>
        <CardDescription>Digite o valor mensal do contrato. Veja o valor após os tributos informados pela empresa, a faixa pela meta mensal e sua comissão estimada.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
        <div className="space-y-4">
          <div className="space-y-2 rounded-lg border border-orbi-cyan/30 bg-orbi-cyan/5 p-4">
            <Label htmlFor="commercial-monthly-amount" className="text-sm font-semibold">Valor mensal do contrato vendido (R$)</Label>
            <CurrencyInput id="commercial-monthly-amount" value={monthlyAmount} onValueChange={setMonthlyAmount} hint={false} aria-invalid={inputError} />
            <p className="text-xs text-muted-foreground">Prazo deste contrato: {durationMonths} meses · Meta mensal: {currency(settings.monthlyGoal)}</p>
          </div>

          <details className="rounded-lg border border-border p-3 text-sm">
            <summary className="cursor-pointer font-medium">O prazo deste contrato é diferente de 12 meses?</summary>
            <div className="mt-3 space-y-2">
              <Label htmlFor="commercial-duration">Prazo deste contrato (meses)</Label>
              <Input id="commercial-duration" type="number" min={1} max={120} step={1} inputMode="numeric" value={durationMonths}
                onChange={(event) => setDurationMonths(Number(event.target.value))} />
            </div>
          </details>

          <details className="rounded-lg border border-border p-3 text-sm">
            <summary className="cursor-pointer font-medium">Já vendeu outros contratos neste mês?</summary>
            <div className="mt-3 space-y-2">
              <Label htmlFor="commercial-sold-before">Valor mensal já vendido antes deste contrato (R$)</Label>
              <CurrencyInput id="commercial-sold-before" value={soldBefore} onValueChange={setSoldBefore} hint={false} aria-invalid={inputError} />
              <p className="text-xs text-muted-foreground">Opcional. Use a soma mensal das outras vendas para calcular o atingimento total da meta. Nada é importado ou salvo automaticamente.</p>
            </div>
          </details>

          <details className="rounded-lg border border-border p-3 text-sm">
            <summary className="cursor-pointer font-medium">Configurar cálculo: meta, impostos e faixas {dirty ? "• alterações não salvas" : ""}</summary>
            <div className="mt-4 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="commercial-goal">Meta mensal de vendas (R$)</Label>
                <CurrencyInput id="commercial-goal" value={settings.monthlyGoal} onValueChange={(monthlyGoal) => onSettingsChange({ ...settings, monthlyGoal })} hint={false} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="commercial-basis">Calcular a comissão sobre</Label>
                <select id="commercial-basis" value={settings.commissionBasis}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  onChange={(event) => onSettingsChange({ ...settings, commissionBasis: event.target.value as "net" | "gross" })}>
                  <option value="net">Valor líquido após os tributos da empresa</option>
                  <option value="gross">Valor bruto do contrato</option>
                </select>
              </div>
              <div className="space-y-2">
                <p className="font-medium">Alíquotas sobre o valor bruto do contrato</p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {COMMERCIAL_TAXES.map(({ key, label }) => (
                    <div key={key} className="space-y-1">
                      <Label htmlFor={`commercial-tax-${key}`}>{label} (%)</Label>
                      <Input id={`commercial-tax-${key}`} type="number" min={0} max={100} step="0.01" inputMode="decimal"
                        value={settings.taxRates[key]} onChange={(event) => onSettingsChange({ ...settings,
                          taxRates: { ...settings.taxRates, [key]: Number(event.target.value) },
                        })} />
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <p className="font-medium">Comissão pelo atingimento da meta</p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {ATTAINMENT_BANDS.map(({ key, label }) => (
                    <div key={key} className="space-y-1">
                      <Label htmlFor={`commercial-band-${key}`}>{label}</Label>
                      <div className="flex items-center gap-1">
                        <Input id={`commercial-band-${key}`} type="number" min={0} max={100} step="0.01" inputMode="decimal"
                          value={settings.attainmentRates[key]} onChange={(event) => onSettingsChange({ ...settings,
                            attainmentRates: { ...settings.attainmentRates, [key]: Number(event.target.value) },
                          })} />
                        <span className="text-muted-foreground">%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              {settingsError && <p role="status" className="text-xs text-orbi-amber">{settingsError}</p>}
              <p className="text-xs text-muted-foreground">As taxas são parâmetros da simulação, não uma apuração fiscal. Confirme com o contador quais se aplicam à empresa. Alterar estas regras não atualiza folhas já preenchidas.</p>
              <div className="flex flex-wrap gap-2">
                <Button type="button" size="sm" disabled={!dirty || Boolean(settingsError) || savingDisabled} onClick={onSaveSettings}>Salvar configurações</Button>
                {dirty && <Button type="button" size="sm" variant="outline" onClick={onDiscardSettings}>Descartar mudanças</Button>}
              </div>
            </div>
          </details>
        </div>

        <div className="min-w-0 rounded-lg border border-border bg-muted/20 p-4" aria-live="polite">
          {settingsError || inputError ? (
            <p role="status" className="text-sm text-orbi-amber">{settingsError ?? "Informe valores válidos e não negativos."}</p>
          ) : !result ? (
            <div className="flex h-full min-h-48 flex-col items-center justify-center gap-2 text-center text-muted-foreground">
              <ArrowDown className="h-5 w-5 text-orbi-cyan" />
              <p className="text-sm">Informe o valor mensal do contrato para ver os dois cálculos.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <section className="space-y-2">
                <h3 className="text-sm font-semibold">1. Receita do contrato ({durationMonths} meses)</h3>
                <SummaryRow label="Valor bruto" value={result.gross} />
                {COMMERCIAL_TAXES.map(({ key, label }) => (
                  <SummaryRow key={key} label={`${label} (${percentage(settings.taxRates[key])}%)`} value={-result.taxes[key]} negative />
                ))}
                <div className="border-t border-border pt-2"><SummaryRow label="Tributos informados" value={-result.totalTaxes} negative /></div>
                <div className="rounded-lg bg-orbi-emerald/10 p-2.5"><SummaryRow label="Valor líquido estimado do contrato" value={result.net} prominent /></div>
              </section>
              <section className="space-y-2 border-t border-border pt-3">
                <h3 className="text-sm font-semibold">2. Sua comissão</h3>
                <p className="text-xs text-muted-foreground">Vendas mensais: {currency(soldBefore)} já vendidos + {currency(monthlyAmount)} deste contrato = {currency(result.soldWithContract)}</p>
                <SummaryRow label="Meta mensal" value={settings.monthlyGoal} />
                <p className="text-sm">Atingimento: <strong className="text-orbi-cyan">{percentage(result.attainment)}%</strong> · {result.band}</p>
                <p className="text-sm">Faixa de comissão: <strong>{percentage(result.rate)}%</strong> sobre o valor {settings.commissionBasis === "net" ? "líquido" : "bruto"}</p>
                <SummaryRow label="Base da comissão" value={result.commissionBase} />
                <div className="rounded-lg bg-orbi-cyan/10 p-2.5"><SummaryRow label="Comissão estimada" value={result.commission} prominent /></div>
                <p className="text-xs text-muted-foreground">A comissão acima é antes dos descontos pessoais da folha. ISS, PIS, COFINS, IRRF da empresa e CSLL não são descontados outra vez na folha.</p>
                <Button type="button" variant="outline" className="w-full" disabled={dirty} onClick={() => onUseInPayroll(result.commission)}>
                  Preencher comissão na folha abaixo
                </Button>
                <p className="text-center text-xs text-muted-foreground">{dirty ? "Salve ou descarte as mudanças nas configurações antes de preencher a folha." : "Copia a comissão total para o mês selecionado; para guardar, use “Salvar” na folha."}</p>
              </section>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function SummaryRow({ label, value, negative, prominent }: { label: string; value: number; negative?: boolean; prominent?: boolean }) {
  return <div className="flex items-start justify-between gap-3 text-sm">
    <span className={prominent ? "font-semibold" : "text-muted-foreground"}>{label}</span>
    <span className={`shrink-0 font-mono font-semibold ${negative ? "text-orbi-rose" : prominent ? "text-orbi-cyan" : ""}`}>{currency(value)}</span>
  </div>;
}
