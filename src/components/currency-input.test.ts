import { describe, expect, it } from "vitest";
import { parseBRLInput } from "../lib/brl-input";

describe("entrada de moeda brasileira", () => {
  it("interpreta números simples como reais", () => {
    expect(parseBRLInput("20")).toBe(20);
  });

  it("aceita centavos com vírgula", () => {
    expect(parseBRLInput("20,50")).toBe(20.5);
  });

  it("aceita valor formatado e prefixo", () => {
    expect(parseBRLInput("R$ 1.250,90")).toBe(1250.9);
  });

  it("aceita separador brasileiro de milhar sem centavos", () => {
    expect(parseBRLInput("1.250")).toBe(1250);
  });
});
