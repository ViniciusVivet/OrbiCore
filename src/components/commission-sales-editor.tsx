"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CurrencyInput } from "@/components/currency-input";
import { useConfirm } from "@/components/confirm-provider";
import { currency } from "@/lib/format";
import { commissionRateForAmount, commissionRulesError, commissionTotal, saleCommission } from "@/lib/commission";
import type { CommissionRule, CommissionSale } from "@/lib/types";

export function CommissionSalesEditor({ sales, rules, onChange }: {
  sales: CommissionSale[];
  rules: CommissionRule[];
  onChange: (sales: CommissionSale[]) => void;
}) {
  const confirm = useConfirm();

  function update(id: string, patch: Partial<CommissionSale>) {
    onChange(sales.map((sale) => sale.id === id ? { ...sale, ...patch } : sale));
  }

  async function remove(sale: CommissionSale) {
    if (!await confirm({
      title: "Retirar venda do cálculo?",
      description: "Isso retira somente este lançamento da simulação de comissão. Nenhum contrato ou venda da loja será excluído. A alteração só será gravada ao salvar o mês.",
      confirmLabel: "Retirar lançamento",
    })) return;
    onChange(sales.filter((item) => item.id !== sale.id));
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Informe a base de venda combinada com a empresa e o percentual de cada comissão.
        Ex.: R$ 7.000 × 5% = R$ 350 de comissão bruta. Configure faixas para preencher o percentual pela venda ou informe-o em cada lançamento.
        Estes lançamentos não criam nem alteram contratos, vendas da loja ou estoque.
      </p>
      {sales.map((sale, index) => (
        <fieldset key={sale.id} className="space-y-3 rounded-lg border border-border p-3">
          <legend className="px-1 text-sm font-medium">Venda {index + 1}</legend>
          <div className="space-y-2">
            <Label htmlFor={`description-${sale.id}`}>Cliente ou contrato (opcional)</Label>
            <Input id={`description-${sale.id}`} value={sale.description} maxLength={200}
              placeholder="Identifique a venda" onChange={(event) => update(sale.id, { description: event.target.value })} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor={`amount-${sale.id}`}>Valor da venda (R$)</Label>
              <CurrencyInput id={`amount-${sale.id}`} value={sale.saleAmount} hint={false}
                onValueChange={(saleAmount) => update(sale.id, {
                  saleAmount,
                  ...(sale.rateSource === "auto" ? { rate: commissionRateForAmount(rules, saleAmount) } : {}),
                })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`rate-${sale.id}`}>Comissão (%)</Label>
              <Input id={`rate-${sale.id}`} type="number" inputMode="decimal" min={0} max={100} step="0.01"
                value={sale.rate ?? ""}
                aria-invalid={sale.rate === null || !Number.isFinite(sale.rate) || sale.rate < 0 || sale.rate > 100}
                placeholder="Ex.: 5" onChange={(event) => update(sale.id, { rate: event.target.value === "" ? null : Number(event.target.value), rateSource: "manual" })} />
            </div>
          </div>
          {rules.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
              <span>{sale.rateSource === "auto" ? "Percentual preenchido pela faixa da venda; fica registrado ao salvar." : "Percentual informado neste lançamento."}</span>
              {sale.rateSource !== "auto" && <Button type="button" size="sm" variant="outline" onClick={() => update(sale.id, { rateSource: "auto", rate: commissionRateForAmount(rules, sale.saleAmount) })}>Usar faixa</Button>}
            </div>
          )}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm">Comissão bruta: <strong className="text-orbi-cyan">{sale.rate !== null && Number.isFinite(sale.rate) && sale.rate >= 0 && sale.rate <= 100 ? currency(saleCommission(sale)) : "Informe o percentual"}</strong></p>
            <Button type="button" size="sm" variant="ghost" aria-label={`Retirar venda ${index + 1}`} onClick={() => void remove(sale)}>
              <Trash2 className="mr-1 h-4 w-4" />Retirar
            </Button>
          </div>
        </fieldset>
      ))}
      <Button type="button" variant="outline" className="w-full gap-2" onClick={() => onChange([
        ...sales, { id: crypto.randomUUID(), description: "", saleAmount: 0, rate: null, rateSource: rules.length > 0 ? "auto" : "manual" },
      ])}>
        <Plus className="h-4 w-4" />Adicionar venda para comissão
      </Button>
      {sales.length > 0 && sales.every((sale) => sale.rate !== null && Number.isFinite(sale.rate) && sale.rate >= 0 && sale.rate <= 100) && (
        <p className="text-sm font-medium">Comissão bruta do mês: {currency(commissionTotal(sales))}</p>
      )}
    </div>
  );
}

export function CommissionRulesEditor({ rules, onChange, onSave, dirty }: {
  rules: CommissionRule[];
  onChange: (rules: CommissionRule[]) => void;
  onSave: () => void;
  dirty: boolean;
}) {
  const error = commissionRulesError(rules);

  function update(id: string, patch: Partial<CommissionRule>) {
    onChange(rules.map((rule) => rule.id === id ? { ...rule, ...patch } : rule));
  }

  return (
    <details className="rounded-lg border border-border/70 p-3 text-sm">
      <summary className="cursor-pointer font-medium">Configurar faixas automáticas de comissão {rules.length > 0 ? `(${rules.length})` : ""}</summary>
      <div className="mt-3 space-y-3">
        <p className="text-xs text-muted-foreground">Defina o percentual a partir de cada valor de venda. Vale a faixa com o maior valor inicial que ainda não ultrapassa a venda. Ex.: a partir de R$ 0 = 5%; a partir de R$ 10.000 = 7%. Os lançamentos já salvos guardam o percentual que foi aplicado na época.</p>
        {rules.map((rule, index) => (
          <div key={rule.id} className="grid items-end gap-2 rounded-lg border border-border p-2 sm:grid-cols-[1fr_1fr_auto]">
            <div className="space-y-1.5">
              <Label htmlFor={`rule-amount-${rule.id}`}>A partir de (R$)</Label>
              <CurrencyInput id={`rule-amount-${rule.id}`} value={rule.minSaleAmount} hint={false}
                onValueChange={(minSaleAmount) => update(rule.id, { minSaleAmount })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`rule-rate-${rule.id}`}>Comissão (%)</Label>
              <Input id={`rule-rate-${rule.id}`} type="number" inputMode="decimal" min={0} max={100} step="0.01"
                value={rule.rate ?? ""} placeholder="Ex.: 5"
                onChange={(event) => update(rule.id, { rate: event.target.value === "" ? null : Number(event.target.value) })} />
            </div>
            <Button type="button" variant="ghost" size="sm" aria-label={`Retirar faixa ${index + 1}`}
              onClick={() => onChange(rules.filter((item) => item.id !== rule.id))}>
              <Trash2 className="mr-1 h-4 w-4" />Retirar
            </Button>
          </div>
        ))}
        <Button type="button" variant="outline" size="sm" disabled={rules.length >= 30}
          onClick={() => onChange([...rules, { id: crypto.randomUUID(), minSaleAmount: 0, rate: null }])}>
          <Plus className="mr-1 h-4 w-4" />Adicionar faixa
        </Button>
        {error && <p role="status" className="text-xs text-orbi-amber">{error}</p>}
        <p className="text-xs text-muted-foreground">Salvar as faixas não altera folhas já gravadas. Para usar as faixas no mês atual, preencha ou atualize os lançamentos e salve o mês.</p>
        <Button type="button" size="sm" onClick={onSave} disabled={!dirty || Boolean(error)}>Salvar faixas</Button>
      </div>
    </details>
  );
}
