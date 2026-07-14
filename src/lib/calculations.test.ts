import { describe, expect, it } from "vitest";
import { calcDSR, calcINSS, clientConcentration, monthsInYear, parseLocalDate } from "./calculations";
import type { Contract } from "./types";

const contract = (client: string, monthlyFee: number, id: string): Contract => ({
  id, client, monthlyFee, saleDate: "2026-01-15", durationMonths: 12,
  status: "Ativo", revenueType: "Novo", onboardingValue: 0,
  upsellCrossSellValue: 0, createdAt: "2026-01-15T00:00:00Z",
});

describe("cálculos de domínio", () => {
  it("mantém datas de negócio no dia local", () => {
    const date = parseLocalDate("2026-01-15");
    expect([date.getFullYear(), date.getMonth() + 1, date.getDate()]).toEqual([2026, 1, 15]);
  });

  it("calcula meses de contrato entre anos", () => {
    expect(monthsInYear("2026-10-01", 6, 2026)).toBe(3);
    expect(monthsInYear("2026-10-01", 6, 2027)).toBe(3);
  });

  it("agrupa contratos do mesmo cliente na concentração", () => {
    const result = clientConcentration([
      contract("Cliente A", 1000, "1"), contract("Cliente A", 500, "2"), contract("Cliente B", 500, "3"),
    ]);
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({ client: "Cliente A", mrr: 1500, percent: 0.75 });
  });

  it("calcula DSR e limita o INSS ao teto", () => {
    expect(calcDSR(2200, 22, 4)).toBe(400);
    expect(calcINSS(100_000)).toBe(calcINSS(8475.55));
  });
});
