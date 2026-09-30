import { payrollCommission } from "./commission";
import type { CommissionSale, PayrollMonth } from "./types";

export interface PayrollForm {
  baseSalary: number;
  homeOffice: number;
  commission: number; // Valor manual, preservado ao alternar de modo.
  commissionMode: "manual" | "sales";
  commissionSales: CommissionSale[];
  workDays: number;
  sundaysHolidays: number;
  otherDeductions: number;
}

export function payrollFormFromMonth(p?: PayrollMonth): PayrollForm {
  return {
    baseSalary: p?.baseSalary ?? 0,
    homeOffice: p?.homeOffice ?? 0,
    commission: p?.commissionMode === "sales" ? p.manualCommission ?? p.commission : p?.commission ?? 0,
    commissionMode: p?.commissionMode ?? "manual",
    commissionSales: (p?.commissionSales ?? []).map((sale) => ({ ...sale })),
    workDays: p?.workDays ?? 22,
    sundaysHolidays: p?.sundaysHolidays ?? 4,
    otherDeductions: p?.otherDeductions ?? 0,
  };
}

export function payrollFormError(form: PayrollForm): string | null {
  if ([form.baseSalary, form.homeOffice, form.commission, form.otherDeductions]
    .some((value) => !Number.isFinite(value) || value < 0)) {
    return "Informe valores válidos, maiores ou iguais a zero.";
  }
  if (!Number.isInteger(form.workDays) || form.workDays < 1 || form.workDays > 31
    || !Number.isInteger(form.sundaysHolidays) || form.sundaysHolidays < 0 || form.sundaysHolidays > 31) {
    return "Informe dias úteis entre 1 e 31 e domingos/feriados entre 0 e 31, sem frações.";
  }
  if (form.commissionMode === "sales") {
    if (form.commissionSales.length === 0) return "Adicione uma venda ou use o modo de comissão manual.";
    for (const [index, sale] of form.commissionSales.entries()) {
      if (!Number.isFinite(sale.saleAmount) || sale.saleAmount <= 0) return `Venda ${index + 1}: informe um valor maior que zero.`;
      if (sale.rate === null || !Number.isFinite(sale.rate) || sale.rate < 0 || sale.rate > 100) return `Venda ${index + 1}: informe uma comissão entre 0% e 100%.`;
    }
  }
  if (!Number.isFinite(payrollCommission(form))) return "O total da comissão excede o limite de cálculo.";
  return null;
}

export function payrollPayload(form: PayrollForm, month: number, year: number): Omit<PayrollMonth, "id" | "createdAt"> {
  return {
    ...form,
    month,
    year,
    commission: payrollCommission(form),
    manualCommission: form.commission,
    commissionSales: form.commissionSales.map((sale) => ({ ...sale })),
  };
}
