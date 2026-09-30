import { describe, expect, it } from "vitest";
import { commissionRateForAmount, commissionRulesError, commissionTotal, payrollCommission, roundMoney, saleCommission } from "./commission";
import { calcCommissionImpact, calcPayroll } from "./calculations";
import { payrollFormError, payrollFormFromMonth, payrollPayload } from "./payroll-form";
import { normalizeData, upsertPayrollInData } from "./data";
import { createBackup, validateBackup } from "./backup";
import { SEED_DATA } from "./seed-data";
import type { CommissionSale, PayrollMonth } from "./types";

const sale = (saleAmount = 7000, rate: number | null = 5, id = "s1"): CommissionSale => ({
  id, description: "Contrato de teste", saleAmount, rate,
});
const legacy: PayrollMonth = {
  id: "old", month: 1, year: 2026, baseSalary: 4800.68, homeOffice: 300,
  commission: 23650.70, workDays: 25, sundaysHolidays: 5,
  otherDeductions: 0, createdAt: "2026-01-01T00:00:00.000Z",
};

describe("comissão sobre vendas", () => {
  it("seleciona automaticamente a maior faixa aplicável sem inventar percentual fora das faixas", () => {
    const rules = [
      { id: "high", minSaleAmount: 10000, rate: 7 },
      { id: "base", minSaleAmount: 0, rate: 5 },
    ];
    expect(commissionRateForAmount(rules, 0)).toBeNull();
    expect(commissionRateForAmount(rules, 0.01)).toBe(5);
    expect(commissionRateForAmount(rules, 9999.99)).toBe(5);
    expect(commissionRateForAmount(rules, 10000)).toBe(7);
    expect(commissionRateForAmount(rules, 12000)).toBe(7);
    expect(commissionRateForAmount(rules.slice(0, 1), 7000)).toBeNull();
    expect(commissionRulesError(rules)).toBeNull();
    expect(commissionRulesError([...rules, { id: "duplicate", minSaleAmount: 0, rate: 9 }])).toMatch(/mesmo valor/);
    expect(commissionRulesError([{ id: "blank", minSaleAmount: 0, rate: null }])).toMatch(/percentual/);
    expect(commissionRulesError([{ id: "bad", minSaleAmount: 0, rate: 101 }])).toMatch(/percentual/);
  });

  it("calcula valor x percentual e aceita percentuais fracionários e zero", () => {
    expect(saleCommission(sale())).toBe(350);
    expect(saleCommission(sale(7000, 2.5))).toBe(175);
    expect(saleCommission(sale(7000, 0))).toBe(0);
    expect(saleCommission(sale(7000, 100))).toBe(7000);
    expect(saleCommission(sale(1000, null))).toBeNaN();
  });

  it("soma centavos arredondados por venda, sem multiplicar novamente pelo número de meses", () => {
    expect(commissionTotal([sale(10.10, 5, "1"), sale(10.10, 5, "2")])).toBe(1.02);
    expect(commissionTotal([sale(), sale(12000, 2.5, "2")])).toBe(650);
    expect(commissionTotal([])).toBe(0);
  });

  it("mantém comissão legada, ignora lançamentos no modo manual e usa uma única fonte no automático", () => {
    expect(payrollCommission(legacy)).toBe(23650.70);
    expect(payrollCommission({ ...legacy, commissionSales: [sale()] })).toBe(23650.70);
    expect(payrollCommission({ ...legacy, commissionMode: "sales", commissionSales: [sale()] })).toBe(350);
  });

  it("reproduz a folha original sem alterar valores antigos", () => {
    const { taxableBase, ...result } = calcPayroll(legacy);
    expect(taxableBase).toBeCloseTo(33181.52, 8);
    expect(result).toEqual({
      dsr: 4730.14, grossTotal: 33481.52,
      inss: 988.09, irrfBase: 32193.43, irrf: 7944.46, netTotal: 24548.97,
    });
    expect(calcPayroll({ ...legacy, commissionMode: "sales", commissionSales: [sale(473014, 5)] })).toEqual(calcPayroll(legacy));
  });

  it.each([0, 4500, 9000])("reconcilia comissão líquida e folha total com salário de %s", (baseSalary) => {
    const p: PayrollMonth = { ...legacy, baseSalary, otherDeductions: 80, commissionMode: "sales", commissionSales: [sale()] };
    const result = calcCommissionImpact(p);
    const full = calcPayroll(p);
    const fixed = calcPayroll({ ...p, commissionMode: "manual", commission: 0 });
    expect(result.commission).toBe(350);
    expect(result.dsr).toBe(70);
    expect(result.gross).toBe(420);
    expect(result.net).toBe(roundMoney(result.gross - result.inss - result.irrf));
    expect(roundMoney(fixed.netTotal + result.net)).toBe(full.netTotal);
    expect(calcCommissionImpact({ ...p, otherDeductions: 0 })).toEqual(result);
    expect(calcPayroll({ ...p, homeOffice: 0 }).inss).toBe(full.inss);
    expect(calcPayroll({ ...p, homeOffice: 0 }).irrf).toBe(full.irrf);
  });

  it("preserva o valor manual ao salvar e reabrir o modo por vendas", () => {
    const form = { ...payrollFormFromMonth(legacy), commissionMode: "sales" as const, commissionSales: [sale()] };
    const payload = payrollPayload(form, 1, 2026);
    expect(payload.commission).toBe(350);
    expect(payload.manualCommission).toBe(23650.7);
    const reopened = payrollFormFromMonth({ ...legacy, ...payload });
    expect(reopened).toEqual(form);
    expect(payrollPayload({ ...reopened, commissionMode: "manual" }, 1, 2026).commission).toBe(23650.7);
    reopened.commissionSales[0].saleAmount = 1;
    expect(payload.commissionSales?.[0].saleAmount).toBe(7000);
  });

  it("diferencia percentual não informado de 0% e rejeita valores inválidos", () => {
    const form = { ...payrollFormFromMonth(), commissionMode: "sales" as const, commissionSales: [sale()] };
    expect(payrollFormError(form)).toBeNull();
    for (const rate of [null, -1, 101, NaN, Infinity]) {
      expect(payrollFormError({ ...form, commissionSales: [sale(7000, rate)] })).toMatch(/comissão entre/);
    }
    expect(payrollFormError({ ...form, commissionSales: [sale(7000, 0)] })).toBeNull();
    for (const amount of [-1, 0, NaN, Infinity]) {
      expect(payrollFormError({ ...form, commissionSales: [sale(amount)] })).toMatch(/valor maior/);
    }
    expect(payrollFormError({ ...form, commissionSales: [] })).toMatch(/Adicione uma venda/);
    expect(payrollFormError({ ...form, workDays: 0 })).toMatch(/dias úteis/);
    expect(payrollFormError({ ...form, workDays: 22.5 })).toMatch(/dias úteis/);
    expect(payrollFormError({ ...form, sundaysHolidays: -1 })).toMatch(/dias úteis/);
  });
});

describe("preservação dos dados e competências", () => {
  it("carrega dados antigos sem migrar nem recalcular folhas", () => {
    const before = JSON.stringify(SEED_DATA);
    const normalized = normalizeData(SEED_DATA);
    expect(normalized.payroll).toEqual(SEED_DATA.payroll);
    expect(JSON.stringify(SEED_DATA)).toBe(before);
    expect(payrollFormFromMonth(legacy).commissionMode).toBe("manual");
  });

  it("atualiza só o mês escolhido e mantém id, criação, demais anos e outros módulos", () => {
    const data = normalizeData({ ...SEED_DATA, payroll: [legacy, { ...legacy, id: "future", year: 2027 }] });
    const before = JSON.stringify(data);
    const form = { ...payrollFormFromMonth(legacy), commissionMode: "sales" as const, commissionSales: [sale()] };
    const result = upsertPayrollInData(data, payrollPayload(form, 1, 2026), { id: "unused", createdAt: "unused" });
    expect(result.payroll).toHaveLength(2);
    expect(result.payroll[0]).toMatchObject({ id: legacy.id, createdAt: legacy.createdAt, commission: 350 });
    expect(result.payroll[1]).toBe(data.payroll[1]);
    const { payroll: _beforePayroll, ...otherBefore } = data;
    const { payroll: _afterPayroll, ...otherAfter } = result;
    expect(otherAfter).toEqual(otherBefore);
    expect(JSON.stringify(data)).toBe(before);
    const nextYear = upsertPayrollInData(result, payrollPayload(form, 1, 2028), { id: "new", createdAt: "now" });
    expect(nextYear.payroll).toHaveLength(3);
    expect(nextYear.payroll.slice(0, 2)).toEqual(result.payroll);
  });

  it("preserva percentuais, vendas e valor manual no ciclo JSON de backup/restauração", () => {
    const form = { ...payrollFormFromMonth(legacy), commissionMode: "sales" as const, commissionSales: [sale()] };
    const data = normalizeData({ ...SEED_DATA,
      profile: { ...SEED_DATA.profile, commissionRules: [{ id: "base", minSaleAmount: 0, rate: 5 }] },
      payroll: [{ ...legacy, ...payrollPayload(form, 1, 2026) }],
    });
    const restored = validateBackup(JSON.parse(JSON.stringify(createBackup(data))));
    expect(restored.ok).toBe(true);
    if (restored.ok) {
      expect(restored.backup.data).toEqual(data);
      expect(restored.backup.data.profile.commissionRules).toEqual(data.profile.commissionRules);
      expect(calcPayroll(restored.backup.data.payroll[0])).toEqual(calcPayroll(data.payroll[0]));
    }
  });
});
