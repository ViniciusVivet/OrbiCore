import { describe, expect, it } from "vitest";
import { createEmptyData, normalizeData, removeProductWithReferences } from "./data";
import { profileInitials } from "./profile-image";
import { formatFileSize } from "./image-optimizer";

describe("dados da aplicação", () => {
  it("cria uma conta nova sem dados de demonstração", () => {
    const data = createEmptyData();
    expect(data.contracts).toEqual([]);
    expect(data.products).toEqual([]);
    expect(data.profile.yearlyGoal).toBe(0);
  });

  it("normaliza documentos antigos sem inventar conteúdo", () => {
    const data = normalizeData({
      profile: { name: "Loja", enabledModules: ["dashboard"], yearlyGoal: 100, currentYear: 2025 },
    });
    expect(data.stockMovements).toEqual([]);
    expect(data.profile.name).toBe("Loja");
  });

  it("remove produto e referências dependentes", () => {
    const data = createEmptyData();
    data.products = [{ id: "p1", name: "Produto", category: "", supplier: "", initialQty: 1, entries: 0, minStock: 0, costPrice: 1, salePrice: 2, createdAt: "" }];
    data.sales = [{ id: "s1", productId: "p1", date: "2026-01-01", quantity: 1, createdAt: "" }];
    data.stockMovements = [{ id: "m1", productId: "p1", date: "2026-01-01", type: "Entrada", quantity: 1, createdAt: "" }];

    const result = removeProductWithReferences(data, "p1");
    expect(result.products).toEqual([]);
    expect(result.sales).toEqual([]);
    expect(result.stockMovements).toEqual([]);
  });

  it("gera iniciais para pessoa, empresa e perfil vazio", () => {
    expect(profileInitials("Maria Silva")).toBe("MS");
    expect(profileInitials("Orbitamos Tecnologia")).toBe("OT");
    expect(profileInitials("")).toBe("OC");
  });

  it("apresenta tamanhos de imagem de forma compreensível", () => {
    expect(formatFileSize(240 * 1024)).toBe("240 KB");
    expect(formatFileSize(2.5 * 1024 * 1024)).toBe("2.5 MB");
  });
});
