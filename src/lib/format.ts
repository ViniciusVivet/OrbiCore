export function currency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export function percent(value: number, decimals = 1): string {
  return (value * 100).toFixed(decimals) + "%";
}

export function dateFormat(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso + "T12:00:00");
  return d.toLocaleDateString("pt-BR");
}

export function monthName(month: number): string {
  const names = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
  ];
  return names[month - 1] || "";
}

export function shortMonthName(month: number): string {
  const names = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  return names[month - 1] || "";
}

export function quarterLabel(quarter: number): string {
  return `T${quarter}`;
}
