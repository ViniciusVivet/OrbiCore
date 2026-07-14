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
      const ExcelJS = await import("exceljs");
      const wb = new ExcelJS.Workbook();
      const year = data.profile.currentYear;
      const addSheet = (name: string, rows: Record<string, unknown>[]) => {
        if (rows.length === 0) return;
        const worksheet = wb.addWorksheet(name);
        worksheet.columns = Object.keys(rows[0]).map((header) => ({
          header, key: header, width: Math.max(14, Math.min(36, header.length + 4)),
        }));
        worksheet.addRows(rows);
        worksheet.views = [{ state: "frozen", ySplit: 1 }];
        worksheet.getRow(1).font = { bold: true };
      };

      // --- Contratos ---
      const contractRows = data.contracts.map((c) => {
        const mInYear = monthsInYear(c.saleDate, c.durationMonths, year);
        const mNext = monthsNextYear(c.saleDate, c.durationMonths, year);
        return {
          "Data Venda": dateFormat(c.saleDate),
          "Cliente": c.client,
          "Fee Mensal": c.monthlyFee,
          "Duração (meses)": c.durationMonths,
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
      addSheet("Contratos", contractRows);

      // --- Dashboard MRR ---
      const dashRows = Array.from({ length: 12 }, (_, i) => {
        const m = i + 1;
        return {
          "Mês": shortMonthName(m),
          "MRR Vendido": mrrInMonth(data.contracts, year, m, "Ativo"),
        };
      });
      const mrrTotal = mrrEnteringYear(data.contracts, year, "Ativo");
      dashRows.push({ "Mês": "TOTAL", "MRR Vendido": mrrTotal });
      addSheet("Dashboard MRR", dashRows);

      // --- Reunioes ---
      if (data.meetings.length > 0) {
        const meetRows = data.meetings.map((m) => ({
          "Data": dateFormat(m.date),
          "Cliente/Lead": m.clientLead,
          "Responsável": m.responsible,
          "Canal": m.channel,
          "Tipo": m.type,
          "Status": m.status,
          "MRR Previsto": m.expectedMRR,
          "Probabilidade": m.probability,
          "Receita Esperada": m.expectedMRR * m.probability,
          "Próximo Retorno": m.nextReturnDate ? dateFormat(m.nextReturnDate) : "",
          "Alerta": meetingAlert(m),
          "Observações": m.notes || "",
        }));
        addSheet("Reuniões", meetRows);
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
            "Preço Venda": p.salePrice,
            "Lucro Unit": profit,
            "Margem": Math.round(margin * 100) + "%",
            "Status": stock <= p.minStock ? "REPOR" : "OK",
          };
        });
        addSheet("Produtos", prodRows);
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
            "Preço Venda": p.salePrice,
            "Custo Total": cost,
            "Lucro": profit,
            "Margem": Math.round(margin * 100) + "%",
          };
        });
        addSheet("Vendas", saleRows);
      }

      // --- Calculo Mensal ---
      if (data.payroll.length > 0) {
        const payRows = data.payroll
          .sort((a, b) => a.month - b.month)
          .map((p) => {
            const c = calcPayroll(p);
            return {
              "Mês": monthName(p.month),
              "Salário Base": p.baseSalary,
              "Home Office": p.homeOffice,
              "Comissão": p.commission,
              "Dias Úteis": p.workDays,
              "Dom/Feriados": p.sundaysHolidays,
              "DSR": c.dsr,
              "Total Bruto": c.grossTotal,
              "INSS": c.inss,
              "Base IRRF": c.irrfBase,
              "IRRF": c.irrf,
              "Outros Desc.": p.otherDeductions,
              "Total Líquido": c.netTotal,
            };
          });
        addSheet("Cálculo Mensal", payRows);
      }

      // Download
      const buffer = await wb.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `OrbiCore_${data.profile.name}_${year}.xlsx`;
      link.click();
      URL.revokeObjectURL(url);
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
            Exportação Completa
          </CardTitle>
          <CardDescription>
            Gera um arquivo .xlsx com todas as abas: Contratos, Dashboard MRR, Reuniões, Produtos, Vendas e Cálculo Mensal.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="rounded-lg bg-muted p-4 space-y-2">
              <p className="text-sm font-medium">O que será exportado:</p>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• {data.contracts.length} contratos</li>
                <li>• {data.meetings.length} reuniões</li>
                <li>• {data.products.length} produtos</li>
                <li>• {data.sales.length} vendas</li>
                <li>• {data.payroll.length} meses de cálculo</li>
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
