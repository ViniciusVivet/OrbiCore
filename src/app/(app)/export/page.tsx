"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, FileJson, FileSpreadsheet, FileText, Loader2, ShieldCheck } from "lucide-react";
import { useAppStore } from "@/components/store-provider";
import { dateFormat, monthName, shortMonthName } from "@/lib/format";
import {
  calcPayroll,
  contractFeeAt,
  contractRevenueInYear,
  meetingAlert,
  mrrEnteringYear,
  mrrInMonth,
  productStock,
  saleProfitAndMargin,
} from "@/lib/calculations";
import { toast } from "sonner";

type ExportKind = "excel" | "csv" | "json";

function safeFileName(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\w-]+/g, "_");
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function csvCell(value: unknown) {
  const text = value == null ? "" : String(value);
  return `"${text.replace(/"/g, "\"\"")}"`;
}

export default function ExportPage() {
  const { data, loaded } = useAppStore();
  const [exporting, setExporting] = useState<ExportKind | null>(null);

  if (!loaded) return null;

  const year = data.profile.currentYear;
  const profileName = safeFileName(data.profile.name || "usuario");
  const hasData = data.contracts.length > 0
    || data.meetings.length > 0
    || data.products.length > 0
    || data.sales.length > 0
    || data.payroll.length > 0;

  async function runExport(kind: ExportKind, action: () => Promise<void> | void) {
    setExporting(kind);
    try {
      await action();
      toast.success(kind === "excel" ? "Planilha Excel baixada com sucesso." : kind === "csv" ? "CSV de contratos baixado." : "Backup completo baixado.");
    } catch {
      toast.error("Não foi possível gerar o arquivo. Tente novamente.");
    } finally {
      setExporting(null);
    }
  }

  async function exportExcel() {
    const ExcelJS = await import("exceljs");
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "OrbiCore";
    workbook.created = new Date();
    workbook.modified = new Date();

    const moneyHeaders = new Set([
      "MRR Mensal Atual", `MRR Mensal ${year + 1}`, `Receita ${year}`, `Receita ${year + 1}`,
      "Receita Total", "Onboarding", "Upsell/Cross-sell", "MRR Vendido", "MRR Previsto",
      "Receita Esperada", "Custo Unit", "Custo Unitário", "Preço Venda", "Lucro Unit",
      "Custo Total", "Receita", "Lucro", "Salário Base", "Home Office", "Comissão",
      "DSR", "Total Bruto", "INSS", "Base IRRF", "IRRF", "Outros Desc.", "Total Líquido",
    ]);
    const percentHeaders = new Set(["Probabilidade", "Margem", "Conversão"]);

    const addSheet = (name: string, rows: Record<string, unknown>[]) => {
      if (rows.length === 0) return;
      const worksheet = workbook.addWorksheet(name, { views: [{ state: "frozen", ySplit: 1 }] });
      const headers = Object.keys(rows[0]);
      worksheet.columns = headers.map((header) => {
        const contentWidth = rows.slice(0, 100).reduce((largest, row) => Math.max(largest, String(row[header] ?? "").length), header.length);
        return { header, key: header, width: Math.max(12, Math.min(42, contentWidth + 3)) };
      });
      worksheet.addRows(rows);
      worksheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: headers.length } };
      worksheet.getRow(1).height = 26;
      worksheet.getRow(1).eachCell((cell) => {
        cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0891B2" } };
        cell.alignment = { vertical: "middle" };
      });
      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber > 1 && rowNumber % 2 === 0) {
          row.eachCell((cell) => {
            cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1F5F9" } };
          });
        }
        row.eachCell((cell, columnNumber) => {
          const header = headers[columnNumber - 1];
          if (moneyHeaders.has(header) && typeof cell.value === "number") cell.numFmt = '"R$" #,##0.00';
          if (percentHeaders.has(header) && typeof cell.value === "number") cell.numFmt = "0.0%";
          cell.alignment = { ...cell.alignment, vertical: "middle" };
        });
      });
    };

    addSheet("Resumo", [
      { "Indicador": "Empresa/usuário", "Valor": data.profile.name || "Não informado" },
      { "Indicador": "Ano de referência", "Valor": year },
      { "Indicador": "Gerado em", "Valor": new Date().toLocaleString("pt-BR") },
      { "Indicador": "Contratos", "Valor": data.contracts.length },
      { "Indicador": "Reuniões", "Valor": data.meetings.length },
      { "Indicador": "Produtos", "Valor": data.products.length },
      { "Indicador": "Vendas", "Valor": data.sales.length },
      { "Indicador": "Movimentações", "Valor": data.stockMovements.length },
    ]);

    addSheet("Contratos", data.contracts.map((contract) => ({
      "Data Venda": dateFormat(contract.saleDate),
      "Cliente": contract.client,
      "MRR Mensal Atual": contractFeeAt(contract, year, new Date().getMonth() + 1),
      [`MRR Mensal ${year + 1}`]: contractFeeAt(contract, year + 1, 1),
      [`Receita ${year}`]: contractRevenueInYear(contract, year),
      [`Receita ${year + 1}`]: contractRevenueInYear(contract, year + 1),
      "Receita Total": contract.monthlyFee * contract.durationMonths,
      "Duração (meses)": contract.durationMonths,
      "Status": contract.status,
      "Tipo": contract.revenueType,
      "Onboarding": contract.onboardingValue,
      "Upsell/Cross-sell": contract.upsellCrossSellValue,
      "Reajustes cadastrados": contract.feeHistory?.length ?? 0,
    })));

    const dashboardRows = Array.from({ length: 12 }, (_, index) => ({
      "Mês": shortMonthName(index + 1),
      "MRR Vendido": mrrInMonth(data.contracts, year, index + 1, "Ativo"),
    }));
    dashboardRows.push({ "Mês": "TOTAL", "MRR Vendido": mrrEnteringYear(data.contracts, year, "Ativo") });
    addSheet("Dashboard MRR", dashboardRows);

    addSheet("Reuniões", data.meetings.map((meeting) => ({
      "Data": dateFormat(meeting.date),
      "Cliente/Lead": meeting.clientLead,
      "Responsável": meeting.responsible,
      "Canal": meeting.channel,
      "Tipo": meeting.type,
      "Status": meeting.status,
      "MRR Previsto": meeting.expectedMRR,
      "Probabilidade": meeting.probability,
      "Receita Esperada": meeting.expectedMRR * meeting.probability,
      "Próximo Retorno": meeting.nextReturnDate ? dateFormat(meeting.nextReturnDate) : "",
      "Alerta": meetingAlert(meeting),
      "Observações": meeting.notes || "",
    })));

    addSheet("Produtos", data.products.map((product) => {
      const stock = productStock(product, data.sales, data.stockMovements);
      const profit = product.salePrice - product.costPrice;
      return {
        "Produto": product.name,
        "SKU": product.sku ?? "",
        "Categoria": product.category,
        "Fornecedor": product.supplier,
        "Estoque": stock,
        "Estoque Min": product.minStock,
        "Estoque Ideal": product.idealStock ?? "",
        "Custo Unit": product.costPrice,
        "Preço Venda": product.salePrice,
        "Lucro Unit": profit,
        "Margem": product.salePrice > 0 ? profit / product.salePrice : 0,
        "Status": stock <= product.minStock ? "REPOR" : "OK",
      };
    }));

    addSheet("Vendas", data.sales.map((sale) => {
      const product = data.products.find((item) => item.id === sale.productId);
      if (!product) return { "Data": dateFormat(sale.date), "Produto": "Produto removido", "Quantidade": sale.quantity };
      const result = saleProfitAndMargin(sale, product);
      return {
        "Data": dateFormat(sale.date),
        "Produto": product.name,
        "Quantidade": sale.quantity,
        "Custo Unit": sale.unitCostPrice ?? product.costPrice,
        "Preço Venda": sale.unitSalePrice ?? product.salePrice,
        "Custo Total": result.cost,
        "Receita": result.revenue,
        "Lucro": result.profit,
        "Margem": result.margin,
      };
    }));

    addSheet("Movimentações", data.stockMovements.map((movement) => ({
      "Data": dateFormat(movement.date),
      "Produto": data.products.find((product) => product.id === movement.productId)?.name ?? "Produto removido",
      "Tipo": movement.type,
      "Quantidade": movement.quantity,
      "Motivo": movement.reason ?? "",
      "Custo Unitário": movement.unitCost ?? 0,
      "Observação": movement.note ?? "",
    })));

    addSheet("Cálculo Mensal", [...data.payroll].sort((a, b) => a.year - b.year || a.month - b.month).map((payroll) => {
      const calculation = calcPayroll(payroll);
      return {
        "Ano": payroll.year,
        "Mês": monthName(payroll.month),
        "Salário Base": payroll.baseSalary,
        "Home Office": payroll.homeOffice,
        "Comissão": payroll.commission,
        "Dias Úteis": payroll.workDays,
        "Dom/Feriados": payroll.sundaysHolidays,
        "DSR": calculation.dsr,
        "Total Bruto": calculation.grossTotal,
        "INSS": calculation.inss,
        "Base IRRF": calculation.irrfBase,
        "IRRF": calculation.irrf,
        "Outros Desc.": payroll.otherDeductions,
        "Total Líquido": calculation.netTotal,
      };
    }));

    addSheet("Metas", data.goalPlans.flatMap((plan) => plan.monthlyRevenueGoals.map((revenue, index) => ({
      "Ano": plan.year,
      "Mês": shortMonthName(index + 1),
      "Meta MRR": revenue,
      "Meta Reuniões": plan.monthlyMeetingGoals[index] ?? 0,
      "Conversão": plan.monthlyCloseRateTargets[index] ?? 0,
      "Novos Contratos": plan.monthlyNewContractGoals[index] ?? 0,
      "Meta de Vendas": plan.monthlySalesRevenueGoals[index] ?? 0,
    }))));

    const buffer = await workbook.xlsx.writeBuffer();
    downloadBlob(new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), `OrbiCore_${profileName}_${year}.xlsx`);
  }

  function exportContractsCsv() {
    const rows = data.contracts.map((contract) => ({
      cliente: contract.client,
      data_venda: contract.saleDate,
      status: contract.status,
      tipo: contract.revenueType,
      mrr_mensal_atual: contractFeeAt(contract, year, new Date().getMonth() + 1),
      [`mrr_mensal_${year + 1}`]: contractFeeAt(contract, year + 1, 1),
      [`receita_${year}`]: contractRevenueInYear(contract, year),
      [`receita_${year + 1}`]: contractRevenueInYear(contract, year + 1),
      duracao_meses: contract.durationMonths,
    }));
    if (rows.length === 0) throw new Error("Sem contratos");
    const headers = Object.keys(rows[0]);
    const csv = [headers.map(csvCell).join(";"), ...rows.map((row) => headers.map((header) => csvCell(row[header as keyof typeof row])).join(";"))].join("\r\n");
    downloadBlob(new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" }), `OrbiCore_contratos_${year}.csv`);
  }

  function exportJsonBackup() {
    const backup = {
      format: "orbicore-backup",
      version: 1,
      exportedAt: new Date().toISOString(),
      data,
    };
    downloadBlob(new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" }), `OrbiCore_backup_${profileName}_${new Date().toISOString().slice(0, 10)}.json`);
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Exportar dados</h2>
        <p className="text-muted-foreground">Baixe relatórios para análise ou um backup completo dos seus dados.</p>
      </div>

      <div className="rounded-xl border border-orbi-emerald/30 bg-orbi-emerald/10 p-4">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-orbi-emerald" />
          <div>
            <p className="font-medium">Exportar não altera nem apaga nada</p>
            <p className="mt-1 text-sm text-muted-foreground">Os arquivos são apenas cópias. Seus dados continuam salvos normalmente no OrbiCore.</p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <ExportCard
          icon={<FileSpreadsheet className="h-5 w-5 text-orbi-cyan" />}
          title="Excel completo"
          description="Planilha formatada, com filtros, valores em reais e abas de contratos, reuniões, produtos, vendas, estoque, folha e metas."
          buttonLabel="Baixar Excel"
          busy={exporting === "excel"}
          disabled={!hasData || exporting !== null}
          onClick={() => runExport("excel", exportExcel)}
        />
        <ExportCard
          icon={<FileText className="h-5 w-5 text-orbi-amber" />}
          title="CSV de contratos"
          description="Formato leve e universal para importar os contratos em outros sistemas, planilhas ou ferramentas de análise."
          buttonLabel="Baixar CSV"
          busy={exporting === "csv"}
          disabled={data.contracts.length === 0 || exporting !== null}
          onClick={() => runExport("csv", exportContractsCsv)}
        />
        <ExportCard
          icon={<FileJson className="h-5 w-5 text-orbi-emerald" />}
          title="Backup completo (JSON)"
          description="Cópia técnica de todos os dados do usuário, incluindo configurações e históricos. Ideal para segurança e futura restauração."
          buttonLabel="Baixar backup"
          busy={exporting === "json"}
          disabled={exporting !== null}
          onClick={() => runExport("json", exportJsonBackup)}
        />
      </div>

      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-base">Resumo da exportação</CardTitle>
          <CardDescription>O Excel incluirá somente abas relevantes, sem linhas fictícias.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3 lg:grid-cols-6">
            <Count label="Contratos" value={data.contracts.length} />
            <Count label="Reuniões" value={data.meetings.length} />
            <Count label="Produtos" value={data.products.length} />
            <Count label="Vendas" value={data.sales.length} />
            <Count label="Estoque" value={data.stockMovements.length} />
            <Count label="Folhas" value={data.payroll.length} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ExportCard({
  icon,
  title,
  description,
  buttonLabel,
  busy,
  disabled,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  buttonLabel: string;
  busy: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <Card className="flex h-full flex-col border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">{icon}{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="mt-auto">
        <Button onClick={onClick} className="min-h-11 w-full gap-2" disabled={disabled}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          {busy ? "Gerando arquivo…" : buttonLabel}
        </Button>
      </CardContent>
    </Card>
  );
}

function Count({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-muted/60 p-3 text-center">
      <p className="text-xl font-semibold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
