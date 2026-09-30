import type { CommissionRule, CommissionSale, PayrollMonth } from "./types";

export function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function saleCommission(sale: Pick<CommissionSale, "saleAmount" | "rate">): number {
  if (sale.rate === null) return NaN;
  return roundMoney(sale.saleAmount * sale.rate / 100);
}

export function commissionTotal(sales: CommissionSale[]): number {
  // Cada lançamento é arredondado antes da soma, como os valores exibidos.
  return roundMoney(sales.reduce((sum, sale) => sum + saleCommission(sale), 0));
}

export function payrollCommission(payroll: Pick<PayrollMonth, "commission" | "commissionMode" | "commissionSales">): number {
  return payroll.commissionMode === "sales"
    ? commissionTotal(payroll.commissionSales ?? [])
    : payroll.commission;
}

/** Maior limite inicial que não supera o valor da venda. Sem regra, pede taxa manual. */
export function commissionRateForAmount(rules: CommissionRule[], saleAmount: number): number | null {
  if (!Number.isFinite(saleAmount) || saleAmount <= 0) return null;
  const applicable = rules
    .filter((rule) => rule.minSaleAmount <= saleAmount)
    .sort((a, b) => b.minSaleAmount - a.minSaleAmount);
  return applicable[0]?.rate ?? null;
}

export function commissionRulesError(rules: CommissionRule[]): string | null {
  if (rules.length > 30) return "Cadastre no máximo 30 faixas.";
  if (rules.some((rule) => !Number.isFinite(rule.minSaleAmount) || rule.minSaleAmount < 0
    || rule.rate === null || !Number.isFinite(rule.rate) || rule.rate < 0 || rule.rate > 100)) {
    return "Cada faixa precisa de valor inicial não negativo e percentual entre 0% e 100%.";
  }
  if (new Set(rules.map((rule) => rule.minSaleAmount)).size !== rules.length) {
    return "Duas faixas não podem começar no mesmo valor de venda.";
  }
  return null;
}
