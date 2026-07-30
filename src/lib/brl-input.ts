export function parseBRLInput(raw: string): number {
  const cleaned = raw.replace(/[^\d,.-]/g, "");
  if (!cleaned) return 0;

  const dots = cleaned.match(/\./g)?.length ?? 0;
  const lastDotDigits = cleaned.includes(".") ? cleaned.length - cleaned.lastIndexOf(".") - 1 : 0;
  const normalized = cleaned.includes(",")
    ? cleaned.replace(/\./g, "").replace(",", ".")
    : dots > 1 || lastDotDigits === 3
      ? cleaned.replace(/\./g, "")
      : cleaned;
  const value = Number(normalized);

  return Number.isFinite(value) ? Math.max(0, value) : 0;
}
