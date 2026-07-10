"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileSpreadsheet, Download } from "lucide-react";
import { useAppStore } from "@/components/store-provider";
import { dateFormat, monthName, shortMonthName } from "@/lib/format";
import { monthsInYear, monthsNextYear, calcPayroll, mrrInMonth, mrrEnteringYear, meetingAlert, productStock, saleProfitAndMargin } from "@/lib/calculations";
import { toast } from "sonner";

export default function ExportPage() {
  const { data, loaded } = useAppStore();

  if (!loaded) return null;

  async function exportExcel() {
    try {
      const XLSX = await import("xlsx");
      const wb = XLSX.utils.book_new();
      const year = data.profile.currentYear;

      // --- Contratos ---
      const contractRows = data.contracts.map((c) => {
        const mInYear = monthsInYear(c.saleDate, c.durationMonths, year);
        const mNext = monthsNextYear(c.saleDate, c.durationMonths, year);
        return {
          "Data Venda": dateFormat(c.saleDate),
          "Cliente": c.client,
          "Fee Mensal": c.monthlyFee,
          "Duracao (meses)": c.durationMonths,
          "Status": c.status,
          "Tipo": c.revenueType,
          "Meses no Ano": mInYear,
          "MRR Ano": c.monthlyFee * mInYear,
          "Meses Prox Ano": mNext,
          "MRR Prox Ano": c.monthlyFee * mNext,
          "MRR Total": c.monthlyFee * c.durationMonths,
          "Onboarding": c.onboardingValue,
          "Upsell/Cross-sell": c.upsellCrossSellValue,
        };
      });
      if (contractRows.length > 0) {
        const ws1 = XLSX.utils.json_to_sheet(contractRows);
        XLSX.utils.book_append_sheet(wb, ws1, "Contratos");
      }

      // --- Dashboard MRR ---
      const dashRows = Array.from({ length: 12 }, (_, i) => {
        const m = i + 1;
        return {
          "Mes": shortMonthName(m),
          "MRR Vendido": mrrInMonth(data.contracts, year, m, "Ativo"),
        };
      });
      const mrrTotal = mrrEnteringYear(data.contracts, year, "Ativo");
      dashRows.push({ "Mes": "TOTAL", "MRR Vendido": mrrTotal });
      const ws2 = XLSX.utils.json_to_sheet(dashRows);
      XLSX.utils.book_append_sheet(wb, ws2, "Dashboard MRR");

      // --- Reunioes ---
      if (data.meetings.length > 0) {
        const meetRows = data.meetings.map((m) => ({
          "Data": dateFormat(m.date),
          "Cliente/Lead": m.clientLead,
          "Responsavel": m.responsible,
          "Canal": m.channel,
          "Tipo": m.type,
          "Status": m.status,
          "MRR Previsto": m.expectedMRR,
          "Probabilidade": m.probability,
          "Receita Esperada": m.expectedMRR * m.probability,
          "Proximo Retorno": m.nextReturnDate ? dateFormat(m.nextReturnDate) : "",
          "Alerta": meetingAlert(m),
          "Observacoes": m.notes || "",
        }));
        const ws3 = XLSX.utils.json_to_sheet(meetRows);
        XLSX.utils.book_append_sheet(wb, ws3, "Reunioes");
      }

      // --- Produtos ---
      if (data.products.length > 0) {
        const prodRows = data.products.map((p) => {
          const stock = productStock(p, data.sales);
          const profit = p.salePrice - p.costPrice;
          const margin = p.salePrice > 0 ? profit / p.salePrice : 0;
          return {
            "Produto": p.name,
            "Categoria": p.category,
            "Fornecedor": p.supplier,
            "Estoque": stock,
            "Estoque Min": p.minStock,
            "Custo Unit": p.costPrice,
            "Preco Venda": p.salePrice,
            "Lucro Unit": profit,
            "Margem": Math.round(margin * 100) + "%",
            "Status": stock <= p.minStock ? "REPOR" : "OK",
          };
        });
        const ws4 = XLSX.utils.json_to_sheet(prodRows);
        XLSX.utils.book_append_sheet(wb, ws4, "Produtos");
      }

      // --- Vendas ---
      if (data.sales.length > 0) {
        const saleRows = data.sales.map((s) => {
          const p = data.products.find((x) => x.id === s.productId);
          if (!p) return { "Data": dateFormat(s.date), "Produto": "?", "Qtde": s.quantity };
          const { profit, margin, cost } = saleProfitAndMargin(s, p);
          return {
            "Data": dateFormat(s.date),
            "Produto": p.name,
            "Qtde": s.quantity,
            "Custo Unit": p.costPrice,
            "Preco Venda": p.salePrice,
            "Custo Total": cost,
            "Lucro": profit,
            "Margem": Math.round(margin * 100) + "%",
          };
        });
        const ws5 = XLSX.utils.json_to_sheet(saleRows);
        XLSX.utils.book_append_sheet(wb, ws5, "Vendas");
      }

      // --- Calculo Mensal ---
      if (data.payroll.length > 0) {
        const payRows = data.payroll
          .sort((a, b) => a.month - b.month)
          .map((p) => {
            const c = calcPayroll(p);
            return {
              "Mes": monthName(p.month),
              "Salario Base": p.baseSalary,
              "Home Office": p.homeOffice,
              "Comissao": p.commission,
              "Dias Uteis": p.workDays,
              "Dom/Feriados": p.sundaysHolidays,
              "DSR": c.dsr,
              "Total Bruto": c.grossTotal,
              "INSS": c.inss,
              "Base IRRF": c.irrfBase,
              "IRRF": c.irrf,
              "Outros Desc.": p.otherDeductions,
              "Total Liquido": c.netTotal,
            };
          });
        const ws6 = XLSX.utils.json_to_sheet(payRows);
        XLSX.utils.book_append_sheet(wb, ws6, "Calculo Mensal");
      }

      // Download
      XLSX.writeFile(wb, `OrbiCore_${data.profile.name}_${year}.xlsx`);
      toast.success("Excel exportado com sucesso!");
    } catch {
      toast.error("Erro ao exportar Excel");
    }
  }

  const hasData = data.contracts.length > 0 || data.meetings.length > 0 || data.products.length > 0 || data.payroll.length > 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Exportar Excel</h2>
        <p className="text-muted-foreground">Gere uma planilha Excel com todos os seus dados</p>
      </div>

      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-orbi-cyan" />
            Exportacao Completa
          </CardTitle>
          <CardDescription>
            Gera um arquivo .xlsx com todas as abas: Contratos, Dashboard MRR, Reunioes, Produtos, Vendas e Calculo Mensal.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="rounded-lg bg-muted p-4 space-y-2">
              <p className="text-sm font-medium">O que sera exportado:</p>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• {data.contracts.length} contratos</li>
                <li>• {data.meetings.length} reunioes</li>
                <li>• {data.products.length} produtos</li>
                <li>• {data.sales.length} vendas</li>
                <li>• {data.payroll.length} meses de calculo</li>
              </ul>
            </div>
            <Button onClick={exportExcel} className="gap-2 w-full" size="lg" disabled={!hasData}>
              <Download className="h-5 w-5" />
              Exportar Excel
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
