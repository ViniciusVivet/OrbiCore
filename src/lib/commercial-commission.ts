import { roundMoney } from "./commission";
import type { CommercialCommissionSettings } from "./types";

export const DEFAULT_COMMERCIAL_SETTINGS: CommercialCommissionSettings = {
  monthlyGoal: 3900,
  commissionBasis: "net",
  // Valores editáveis de simulação; PIS e COFINS seguem a nomenclatura da Receita.
  taxRates: { iss: 5, pis: 0.65, cofins: 3, irrf: 1.5, csll: 1 },
  attainmentRates: { below60: 8, from60: 11, from100: 12, from120: 13, from150: 15 },
};

export const COMMERCIAL_TAXES = [
  { key: "iss", label: "ISS" },
  { key: "pis", label: "PIS" },
  { key: "cofins", label: "COFINS" },
  { key: "irrf", label: "IRRF da empresa" },
  { key: "csll", label: "CSLL" },
] as const;

export const ATTAINMENT_BANDS = [
  { key: "below60", label: "Abaixo de 60%", from: 0 },
  { key: "from60", label: "De 60% a menos de 100%", from: 60 },
  { key: "from100", label: "De 100% a menos de 120%", from: 100 },
  { key: "from120", label: "De 120% a menos de 150%", from: 120 },
  { key: "from150", label: "150% ou mais", from: 150 },
] as const;

export function commercialSettings(value?: CommercialCommissionSettings): CommercialCommissionSettings {
  return {
    ...DEFAULT_COMMERCIAL_SETTINGS,
    ...value,
    taxRates: { ...DEFAULT_COMMERCIAL_SETTINGS.taxRates, ...value?.taxRates },
    attainmentRates: { ...DEFAULT_COMMERCIAL_SETTINGS.attainmentRates, ...value?.attainmentRates },
  };
}

export function commercialSettingsError(settings: CommercialCommissionSettings): string | null {
  if (!Number.isFinite(settings.monthlyGoal) || settings.monthlyGoal <= 0) return "Informe uma meta mensal maior que zero.";
  const taxRates = Object.values(settings.taxRates);
  if (taxRates.some((rate) => !Number.isFinite(rate) || rate < 0 || rate > 100)
    || taxRates.reduce((sum, rate) => sum + rate, 0) > 100) {
    return "As alíquotas devem estar entre 0% e 100% e somar no máximo 100%.";
  }
  if (Object.values(settings.attainmentRates).some((rate) => !Number.isFinite(rate) || rate < 0 || rate > 100)) {
    return "Cada faixa de comissão deve ter um percentual entre 0% e 100%.";
  }
  return null;
}

/** Simulação independente da folha: taxas da empresa incidem sobre o bruto do contrato. */
export function calculateCommercialCommission(
  monthlyAmount: number,
  soldBefore: number,
  durationMonths: number,
  settings: CommercialCommissionSettings,
) {
  if (commercialSettingsError(settings)
    || !Number.isFinite(monthlyAmount) || monthlyAmount <= 0
    || !Number.isFinite(soldBefore) || soldBefore < 0
    || !Number.isInteger(durationMonths) || durationMonths < 1 || durationMonths > 120) return null;

  const gross = roundMoney(monthlyAmount * durationMonths);
  const taxes = Object.fromEntries(COMMERCIAL_TAXES.map(({ key }) => [
    key, roundMoney(gross * settings.taxRates[key] / 100),
  ])) as Record<keyof CommercialCommissionSettings["taxRates"], number>;
  const totalTaxes = roundMoney(Object.values(taxes).reduce((sum, amount) => sum + amount, 0));
  const net = roundMoney(gross - totalTaxes);
  const soldWithContract = roundMoney(soldBefore + monthlyAmount);
  const attainment = soldWithContract / settings.monthlyGoal * 100;
  const band = [...ATTAINMENT_BANDS].reverse().find((item) => attainment >= item.from) ?? ATTAINMENT_BANDS[0];
  const rate = settings.attainmentRates[band.key];
  const commissionBase = settings.commissionBasis === "net" ? net : gross;
  return {
    gross,
    taxes,
    totalTaxes,
    net,
    soldWithContract,
    attainment,
    band: band.label,
    rate,
    commissionBase,
    commission: roundMoney(commissionBase * rate / 100),
  };
}
