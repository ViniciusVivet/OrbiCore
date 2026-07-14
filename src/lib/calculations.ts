import { Contract, PayrollMonth, Meeting, Product, Sale } from "./types";

/** Interpreta datas de negócio sem deslocamento de dia por fuso horário. */
export function parseLocalDate(value: string): Date {
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  if (year && month && day) return new Date(year, month - 1, day);
  return new Date(value);
}

// =============================================
// MRR Calculations
// =============================================

/** Meses do contrato que caem no ano especificado */
export function monthsInYear(saleDate: string, durationMonths: number, year: number): number {
  const d = parseLocalDate(saleDate);
  const startYear = d.getFullYear();
  const startMonth = d.getMonth() + 1; // 1-based

  const contractStart = startYear * 12 + startMonth;
  const contractEnd = contractStart + durationMonths - 1;
  const yearStart = year * 12 + 1;
  const yearEnd = year * 12 + 12;

  return Math.max(0, Math.min(contractEnd, yearEnd) - Math.max(contractStart, yearStart) + 1);
}

/** Meses do contrato que caem no proximo ano */
export function monthsNextYear(saleDate: string, durationMonths: number, year: number): number {
  return monthsInYear(saleDate, durationMonths, year + 1);
}

/** MRR vendido no mes (soma fee mensal dos contratos vendidos naquele mes) */
export function mrrInMonth(contracts: Contract[], year: number, month: number, statusFilter?: string): number {
  return contracts
    .filter((c) => {
      const d = parseLocalDate(c.saleDate);
      const matchDate = d.getFullYear() === year && d.getMonth() + 1 === month;
      const matchStatus = !statusFilter || statusFilter === "Todos" || c.status === statusFilter;
      return matchDate && matchStatus;
    })
    .reduce((sum, c) => sum + c.monthlyFee, 0);
}

/** MRR vendido no trimestre */
export function mrrInQuarter(contracts: Contract[], year: number, quarter: number, statusFilter?: string): number {
  const startMonth = (quarter - 1) * 3 + 1;
  let total = 0;
  for (let m = startMonth; m <= startMonth + 2; m++) {
    total += mrrInMonth(contracts, year, m, statusFilter);
  }
  return total;
}

/** MRR acumulado que entra no ano (fee * meses no ano, para cada contrato) */
export function mrrEnteringYear(contracts: Contract[], year: number, statusFilter?: string): number {
  return contracts
    .filter((c) => {
      const matchStatus = !statusFilter || statusFilter === "Todos" || c.status === statusFilter;
      return matchStatus;
    })
    .reduce((sum, c) => sum + c.monthlyFee * monthsInYear(c.saleDate, c.durationMonths, year), 0);
}

/** MRR que entra no proximo ano */
export function mrrNextYear(contracts: Contract[], year: number, statusFilter?: string): number {
  return mrrEnteringYear(contracts, year + 1, statusFilter);
}

/** MRR ativo mensal (soma dos fees dos contratos ativos) */
export function mrrActiveMonthly(contracts: Contract[]): number {
  return contracts.filter((c) => c.status === "Ativo").reduce((sum, c) => sum + c.monthlyFee, 0);
}

/** Contratos ativos */
export function activeContractsCount(contracts: Contract[]): number {
  return contracts.filter((c) => c.status === "Ativo").length;
}

/** Total meses de receita no ano */
export function totalMonthsInYear(contracts: Contract[], year: number, statusFilter?: string): number {
  return contracts
    .filter((c) => !statusFilter || statusFilter === "Todos" || c.status === statusFilter)
    .reduce((sum, c) => sum + monthsInYear(c.saleDate, c.durationMonths, year), 0);
}

/** Dados para grafico MRR acumulado por mes */
export function mrrChartData(contracts: Contract[], year: number, statusFilter?: string) {
  const months = [
    "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
    "Jul", "Ago", "Set", "Out", "Nov", "Dez",
  ];

  return months.map((name, i) => {
    const month = i + 1;
    // MRR acumulado = soma de fee*mesesNoAno para contratos vendidos ate esse mes
    const mrrMonth = mrrInMonth(contracts, year, month, statusFilter);

    // MRR acumulado real = soma fee * meses que ja passaram no ano ate esse mes
    const accReal = contracts
      .filter((c) => {
        const d = parseLocalDate(c.saleDate);
        const matchStatus = !statusFilter || statusFilter === "Todos" || c.status === statusFilter;
        return d <= new Date(year, month, 0) && matchStatus;
      })
      .reduce((sum, c) => {
        const mInYear = monthsInYear(c.saleDate, c.durationMonths, year);
        const d = parseLocalDate(c.saleDate);
        const contractStartMonth = d.getFullYear() === year ? d.getMonth() + 1 : 1;
        const monthsCounted = Math.max(0, Math.min(month, contractStartMonth + mInYear - 1) - Math.max(contractStartMonth, 1) + 1);
        return sum + c.monthlyFee * monthsCounted;
      }, 0);

    return {
      name,
      month,
      mrrMes: mrrMonth,
      mrrAcumulado: accReal,
    };
  });
}

// =============================================
// Insights Cruzados & Metricas Avancadas
// =============================================

/** Concentracao de clientes — top clientes por MRR com % acumulado */
export function clientConcentration(contracts: Contract[]) {
  const active = contracts.filter((c) => c.status === "Ativo");
  const totalMRR = active.reduce((s, c) => s + c.monthlyFee, 0);
  const grouped = active.reduce<Record<string, number>>((clients, contract) => {
    const client = contract.client.trim() || "Sem cliente";
    clients[client] = (clients[client] ?? 0) + contract.monthlyFee;
    return clients;
  }, {});
  const sorted = Object.entries(grouped).sort((a, b) => b[1] - a[1]);
  let cumulative = 0;
  return sorted.map(([client, mrr]) => {
    cumulative += mrr;
    return {
      client,
      mrr,
      percent: totalMRR > 0 ? mrr / totalMRR : 0,
      cumulativePercent: totalMRR > 0 ? cumulative / totalMRR : 0,
    };
  });
}

/** Breakdown de MRR por tipo de receita */
export function mrrByRevenueType(contracts: Contract[]) {
  const active = contracts.filter((c) => c.status === "Ativo");
  const groups: Record<string, number> = {};
  active.forEach((c) => {
    groups[c.revenueType] = (groups[c.revenueType] || 0) + c.monthlyFee;
  });
  return Object.entries(groups).map(([type, value]) => ({ type, value }));
}

/** Risco de churn — contratos que vencem nos proximos N meses */
export function churnRisk(contracts: Contract[], year: number, withinMonths = 3) {
  const current = new Date();
  const now = current.getFullYear() === year ? current : new Date(year, 0, 1);
  const active = contracts.filter((c) => c.status === "Ativo");
  const totalMRR = active.reduce((s, c) => s + c.monthlyFee, 0);
  const atRisk = active.filter((c) => {
    const start = parseLocalDate(c.saleDate);
    const end = new Date(start);
    end.setMonth(end.getMonth() + c.durationMonths);
    const diffDays = (end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    return diffDays > 0 && diffDays <= withinMonths * 30;
  });
  const mrrAtRisk = atRisk.reduce((s, c) => s + c.monthlyFee, 0);
  return {
    contracts: atRisk,
    mrrAtRisk,
    percentOfTotal: totalMRR > 0 ? mrrAtRisk / totalMRR : 0,
    count: atRisk.length,
  };
}

/** Funil de reunioes — contagem por status na ordem do pipeline */
export function meetingFunnel(meetings: Meeting[]) {
  const order: string[] = ["Agendada", "Realizada", "Proposta enviada", "Fechada"];
  return order.map((status) => {
    const filtered = meetings.filter((m) => m.status === status);
    const revenue = filtered.reduce((s, m) => s + m.expectedMRR * m.probability, 0);
    return { status, count: filtered.length, revenue };
  });
}

/** Performance por canal — contagem, receita, e taxa de fechamento */
export function channelPerformance(meetings: Meeting[]) {
  const channels: Record<string, { total: number; closed: number; revenue: number; expectedMRR: number }> = {};
  meetings.forEach((m) => {
    if (!channels[m.channel]) channels[m.channel] = { total: 0, closed: 0, revenue: 0, expectedMRR: 0 };
    channels[m.channel].total++;
    channels[m.channel].expectedMRR += m.expectedMRR;
    if (m.status === "Fechada") {
      channels[m.channel].closed++;
      channels[m.channel].revenue += m.expectedMRR;
    }
  });
  return Object.entries(channels)
    .map(([channel, data]) => ({
      channel,
      ...data,
      closeRate: data.total > 0 ? data.closed / data.total : 0,
    }))
    .sort((a, b) => b.revenue - a.revenue);
}

/** Receita ponderada do pipeline (WAR) — deals abertos pesados por probabilidade */
export function weightedPipelineRevenue(meetings: Meeting[]) {
  const open = meetings.filter((m) => !["Fechada", "Perdida"].includes(m.status));
  const weighted = open.reduce((s, m) => s + m.expectedMRR * m.probability, 0);
  const bestCase = open.reduce((s, m) => s + m.expectedMRR, 0);
  return { weighted, bestCase, dealCount: open.length };
}

/** Taxa de crescimento trimestral */
export function quarterlyGrowthRate(contracts: Contract[], year: number) {
  const quarters = [1, 2, 3, 4].map((q) => ({
    quarter: q,
    mrr: mrrInQuarter(contracts, year, q, "Ativo"),
  }));
  return quarters.map((q, i) => ({
    ...q,
    growth: i > 0 && quarters[i - 1].mrr > 0
      ? (q.mrr - quarters[i - 1].mrr) / quarters[i - 1].mrr
      : null,
  }));
}

// =============================================
// Reunioes Calculations
// =============================================

export function expectedRevenue(meetings: Meeting[]): number {
  return meetings.reduce((sum, m) => sum + m.expectedMRR * m.probability, 0);
}

export function meetingsByStatus(meetings: Meeting[]) {
  const statuses: Record<string, { count: number; revenue: number }> = {};
  meetings.forEach((m) => {
    if (!statuses[m.status]) statuses[m.status] = { count: 0, revenue: 0 };
    statuses[m.status].count++;
    statuses[m.status].revenue += m.expectedMRR * m.probability;
  });
  return statuses;
}

export function meetingAlert(meeting: Meeting): string {
  if (meeting.status === "Fechada") return "Fechada";
  if (meeting.status === "Perdida") return "Perdida";
  if (!meeting.nextReturnDate) return "Sem retorno";
  const diff = Math.floor(
    (parseLocalDate(meeting.nextReturnDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
  );
  if (diff < 0) return "Retorno vencido";
  if (diff <= 3) return "Retorno próximo";
  return "Em dia";
}

// =============================================
// Estoque Calculations
// =============================================

export function productStock(product: Product, sales: Sale[]): number {
  const sold = sales
    .filter((s) => s.productId === product.id)
    .reduce((sum, s) => sum + s.quantity, 0);
  return product.initialQty + product.entries - sold;
}

export function productNeedsRestock(product: Product, sales: Sale[]): boolean {
  return productStock(product, sales) <= product.minStock;
}

export function saleProfitAndMargin(sale: Sale, product: Product) {
  const profit = (product.salePrice - product.costPrice) * sale.quantity;
  const margin = product.salePrice > 0 ? (product.salePrice - product.costPrice) / product.salePrice : 0;
  return { profit, margin, revenue: product.salePrice * sale.quantity, cost: product.costPrice * sale.quantity };
}

// =============================================
// Calculo Mensal (Payroll)
// =============================================

/** DSR sobre comissao */
export function calcDSR(commission: number, workDays: number, sundaysHolidays: number): number {
  if (workDays === 0) return 0;
  return Math.round((commission / workDays) * sundaysHolidays * 100) / 100;
}

/** INSS progressivo 2026 */
export function calcINSS(taxableBase: number): number {
  // Faixas 2026
  const f1 = Math.min(Math.max(0, taxableBase), 1621) * 0.075;
  const f2 = Math.max(0, Math.min(Math.max(0, taxableBase), 2902.84) - 1621) * 0.09;
  const f3 = Math.max(0, Math.min(Math.max(0, taxableBase), 4354.27) - 2902.84) * 0.12;
  const f4 = Math.max(0, Math.min(Math.max(0, taxableBase), 8475.55) - 4354.27) * 0.14;
  return Math.round((f1 + f2 + f3 + f4) * 100) / 100;
}

/** IRRF progressivo 2026 com reducao */
export function calcIRRF(irrfBase: number): number {
  let irrf: number;
  if (irrfBase <= 2428.8) irrf = 0;
  else if (irrfBase <= 2826.65) irrf = irrfBase * 0.075 - 182.16;
  else if (irrfBase <= 3751.05) irrf = irrfBase * 0.15 - 394.16;
  else if (irrfBase <= 4664.68) irrf = irrfBase * 0.225 - 675.49;
  else irrf = irrfBase * 0.275 - 908.73;

  // Reducao 2026
  let reduction = 0;
  if (irrfBase <= 5000) {
    reduction = irrf; // zera
  } else if (irrfBase <= 7350) {
    reduction = Math.max(0, 978.62 - 0.133145 * irrfBase);
  }

  return Math.round(Math.max(0, irrf - reduction) * 100) / 100;
}

/** Calculo completo do mes */
export function calcPayroll(p: PayrollMonth) {
  const dsr = calcDSR(p.commission, p.workDays, p.sundaysHolidays);
  const grossTotal = Math.round((p.baseSalary + p.homeOffice + p.commission + dsr) * 100) / 100;

  // Base tributavel = salario + comissao + DSR (SEM home office)
  const taxableBase = p.baseSalary + p.commission + dsr;
  const inss = calcINSS(taxableBase);

  // Base IRRF = base tributavel - INSS
  const irrfBase = Math.round(Math.max(0, taxableBase - inss) * 100) / 100;
  const irrf = calcIRRF(irrfBase);

  const netTotal = Math.round((grossTotal - inss - irrf - p.otherDeductions) * 100) / 100;

  return { dsr, grossTotal, taxableBase, inss, irrfBase, irrf, netTotal };
}
