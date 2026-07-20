import { describe, expect, it } from "vitest";
import { calcDSR, calcINSS, clientConcentration, contractFeeAt, contractRevenueInYear, monthsInYear, parseLocalDate, productStock, productStockStatus, suggestedRestockQuantity } from "./calculations";
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

  it("aplica reajustes de fee somente a partir da vigência", () => {
    const adjusted = {
      ...contract("Cliente", 1000, "fee"),
      feeHistory: [
        { effectiveFrom: "2026-07", monthlyFee: 1200 },
        { effectiveFrom: "2026-10", monthlyFee: 1500 },
      ],
    };
    expect(contractFeeAt(adjusted, 2026, 6)).toBe(1000);
    expect(contractFeeAt(adjusted, 2026, 7)).toBe(1200);
    expect(contractFeeAt(adjusted, 2026, 12)).toBe(1500);
    expect(contractRevenueInYear(adjusted, 2026)).toBe(14_100);
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

  it("combina estoque legado, vendas e movimentações", () => {
    const product = { ...contract("Produto", 0, "p1"), name: "Doce", category: "", supplier: "", initialQty: 10, entries: 2, minStock: 2, costPrice: 1, salePrice: 2 };
    const { monthlyFee: _, saleDate: __, durationMonths: ___, status: ____, revenueType: _____, onboardingValue: ______, upsellCrossSellValue: _______, client: ________, ...validProduct } = product;
    expect(productStock(validProduct, [{ id: "s1", productId: "p1", date: "2026-01-02", quantity: 3, createdAt: "" }], [
      { id: "m1", productId: "p1", date: "2026-01-03", type: "Entrada", quantity: 5, createdAt: "" },
      { id: "m2", productId: "p1", date: "2026-01-04", type: "Baixa", quantity: 1, createdAt: "" },
    ])).toBe(13);
  });

  it("classifica o saldo e sugere reposição", () => {
    const product = { id: "p", name: "Produto", category: "", supplier: "", initialQty: 2, entries: 0, minStock: 3, idealStock: 10, costPrice: 1, salePrice: 2, createdAt: "" };
    expect(productStockStatus(product, [], [])).toBe("low");
    expect(suggestedRestockQuantity(product, [], [])).toBe(8);
  });
});
