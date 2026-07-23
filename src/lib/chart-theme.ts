// =============================================
// OrbiCore - Tokens de gráfico (theme-aware)
// =============================================
// Os gráficos leem as variáveis CSS do tema ativo (dark/light/vibrant)
// em vez de cores fixas, então adaptam sozinhos em qualquer tema.

export const chartTokens = {
  series1: "var(--chart-1)",
  series2: "var(--chart-2)",
  series3: "var(--chart-3)",
  series4: "var(--chart-4)",
  series5: "var(--chart-5)",
  cyan: "var(--orbi-cyan)",
  blue: "var(--orbi-blue)",
  emerald: "var(--orbi-emerald)",
  amber: "var(--orbi-amber)",
  rose: "var(--orbi-rose)",
  grid: "color-mix(in oklab, var(--border) 70%, transparent)",
  axis: "var(--muted-foreground)",
  surface: "var(--card)",
} as const;

/** Paleta ordenada para séries categóricas (pizza, ranking, etc.). */
export const chartSeries = [
  chartTokens.cyan,
  chartTokens.blue,
  chartTokens.emerald,
  chartTokens.amber,
  chartTokens.rose,
];

/** Estilo do tooltip do Recharts — segue o popover do tema. */
export const chartTooltipStyle = {
  background: "var(--popover)",
  border: "1px solid var(--border)",
  borderRadius: "10px",
  color: "var(--popover-foreground)",
  boxShadow: "0 8px 24px oklch(0 0 0 / 0.18)",
} as const;

export const chartTooltipLabelStyle = {
  color: "var(--popover-foreground)",
} as const;
