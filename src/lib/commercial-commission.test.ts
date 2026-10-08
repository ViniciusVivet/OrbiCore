import { describe, expect, it } from "vitest";
import { createBackup, validateBackup } from "./backup";
import { normalizeData } from "./data";
import { SEED_DATA } from "./seed-data";
import {
  DEFAULT_COMMERCIAL_SETTINGS,
  calculateCommercialCommission,
  commercialSettings,
  commercialSettingsError,
} from "./commercial-commission";

describe("simulador de comissão comercial", () => {
  it("mostra bruto, cada tributo, líquido, meta e comissão sobre o líquido", () => {
    expect(calculateCommercialCommission(7000, 0, 12, DEFAULT_COMMERCIAL_SETTINGS)).toEqual({
      gross: 84000,
      taxes: { iss: 4200, pis: 546, cofins: 2520, irrf: 1260, csll: 840 },
      totalTaxes: 9366,
      net: 74634,
      soldWithContract: 7000,
      attainment: 7000 / 3900 * 100,
      band: "150% ou mais",
      rate: 15,
      commissionBase: 74634,
      commission: 11195.10,
    });
  });

  it.each([
    [2339.99, 8], [2340, 11], [3899.99, 11], [3900, 12],
    [4679.99, 12], [4680, 13], [5849.99, 13], [5850, 15],
  ])("aplica a faixa exata para R$ %s vendidos", (amount, expectedRate) => {
    expect(calculateCommercialCommission(amount, 0, 12, DEFAULT_COMMERCIAL_SETTINGS)?.rate).toBe(expectedRate);
  });

  it("soma vendas anteriores só no atingimento e permite comissão sobre bruto", () => {
    const settings = { ...DEFAULT_COMMERCIAL_SETTINGS, commissionBasis: "gross" as const };
    const result = calculateCommercialCommission(2000, 3850, 12, settings);
    expect(result?.soldWithContract).toBe(5850);
    expect(result?.rate).toBe(15);
    expect(result?.gross).toBe(24000);
    expect(result?.commission).toBe(3600);
  });

  it("usa o prazo deste contrato sem alterar a meta mensal", () => {
    const result = calculateCommercialCommission(7000, 0, 6, DEFAULT_COMMERCIAL_SETTINGS);
    expect(result?.gross).toBe(42000);
    expect(result?.net).toBe(37317);
    expect(result?.attainment).toBe(7000 / 3900 * 100);
    expect(result?.commission).toBe(5597.55);
  });

  it("bloqueia configurações inválidas e não calcula entrada vazia", () => {
    expect(calculateCommercialCommission(0, 0, 12, DEFAULT_COMMERCIAL_SETTINGS)).toBeNull();
    expect(calculateCommercialCommission(7000, -1, 12, DEFAULT_COMMERCIAL_SETTINGS)).toBeNull();
    expect(calculateCommercialCommission(7000, 0, 0, DEFAULT_COMMERCIAL_SETTINGS)).toBeNull();
    expect(calculateCommercialCommission(7000, 0, 1.5, DEFAULT_COMMERCIAL_SETTINGS)).toBeNull();
    expect(commercialSettingsError({ ...DEFAULT_COMMERCIAL_SETTINGS, monthlyGoal: 0 })).toMatch(/meta mensal/);
    expect(commercialSettingsError({ ...DEFAULT_COMMERCIAL_SETTINGS, taxRates: { ...DEFAULT_COMMERCIAL_SETTINGS.taxRates, iss: 101 } })).toMatch(/alíquotas/);
    expect(commercialSettingsError({ ...DEFAULT_COMMERCIAL_SETTINGS, attainmentRates: { ...DEFAULT_COMMERCIAL_SETTINGS.attainmentRates, from150: -1 } })).toMatch(/faixa/);
  });

  it("mantém os dados de produção e as configurações no backup JSON", () => {
    const before = JSON.stringify(SEED_DATA);
    const legacy = normalizeData(SEED_DATA);
    expect(commercialSettings(legacy.profile.commercialCommissionSettings)).toEqual(DEFAULT_COMMERCIAL_SETTINGS);
    expect(JSON.stringify(SEED_DATA)).toBe(before);
    const configured = normalizeData({ ...legacy, profile: {
      ...legacy.profile,
      commercialCommissionSettings: { ...DEFAULT_COMMERCIAL_SETTINGS, monthlyGoal: 5000 },
    } });
    const restored = validateBackup(JSON.parse(JSON.stringify(createBackup(configured))));
    expect(restored.ok).toBe(true);
    if (restored.ok) {
      expect(restored.backup.data).toEqual(configured);
      expect(restored.backup.data.payroll).toEqual(legacy.payroll);
      expect(restored.backup.data.contracts).toEqual(legacy.contracts);
    }
  });
});
