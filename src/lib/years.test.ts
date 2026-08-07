import { describe, expect, it } from "vitest";
import { createEmptyData } from "./data";
import { availableYears, currentCalendarYear } from "./years";

describe("anos disponíveis", () => {
  it("acompanha automaticamente a virada do calendário", () => {
    expect(currentCalendarYear(new Date(2026, 11, 31))).toBe(2026);
    expect(currentCalendarYear(new Date(2027, 0, 1))).toBe(2027);
  });

  it("preserva anos históricos e oferece cinco anos futuros", () => {
    const data = createEmptyData();
    data.sales.push({ id: "s", productId: "p", date: "2022-01-01", quantity: 1, createdAt: "" });
    const years = availableYears(data, new Date(2026, 7, 7));
    expect(years[0]).toBe(2022);
    expect(years.at(-1)).toBe(2031);
  });
});
