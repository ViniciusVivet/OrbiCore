import { normalizeData } from "./data";
import type { AppData } from "./types";

export const BACKUP_FORMAT = "orbicore-backup";
export const BACKUP_VERSION = 2;

export interface BackupCounts {
  contracts: number;
  meetings: number;
  products: number;
  sales: number;
  stockMovements: number;
  payroll: number;
  goalPlans: number;
}

export interface OrbiCoreBackup {
  format: typeof BACKUP_FORMAT;
  version: number;
  exportedAt: string;
  app: "OrbiCore";
  counts: BackupCounts;
  data: AppData;
}

export function backupCounts(data: AppData): BackupCounts {
  return {
    contracts: data.contracts.length,
    meetings: data.meetings.length,
    products: data.products.length,
    sales: data.sales.length,
    stockMovements: data.stockMovements.length,
    payroll: data.payroll.length,
    goalPlans: data.goalPlans.length,
  };
}

export function createBackup(data: AppData, exportedAt = new Date().toISOString()): OrbiCoreBackup {
  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt,
    app: "OrbiCore",
    counts: backupCounts(data),
    data,
  };
}

export type BackupValidation =
  | { ok: true; backup: OrbiCoreBackup }
  | { ok: false; error: string };

export function validateBackup(value: unknown): BackupValidation {
  if (!value || typeof value !== "object") {
    return { ok: false, error: "O arquivo não contém um backup válido." };
  }

  const candidate = value as Record<string, unknown>;
  if (candidate.format !== BACKUP_FORMAT) {
    return { ok: false, error: "Este arquivo não foi gerado pelo OrbiCore." };
  }
  if (typeof candidate.version !== "number" || candidate.version < 1 || candidate.version > BACKUP_VERSION) {
    return { ok: false, error: "A versão deste backup não é compatível com o OrbiCore atual." };
  }
  if (typeof candidate.exportedAt !== "string" || Number.isNaN(Date.parse(candidate.exportedAt))) {
    return { ok: false, error: "O backup não possui uma data de geração válida." };
  }
  if (!candidate.data || typeof candidate.data !== "object") {
    return { ok: false, error: "O backup não contém dados para restaurar." };
  }

  const rawData = candidate.data as Record<string, unknown>;
  const requiredArrays = ["contracts", "meetings", "products", "sales", "payroll", "goalPlans"];
  if (!rawData.profile || typeof rawData.profile !== "object" || requiredArrays.some((key) => !Array.isArray(rawData[key]))) {
    return { ok: false, error: "O backup está incompleto ou corrompido." };
  }

  const data = normalizeData(rawData as Partial<AppData>);
  return {
    ok: true,
    backup: {
      format: BACKUP_FORMAT,
      version: candidate.version,
      exportedAt: candidate.exportedAt,
      app: "OrbiCore",
      counts: backupCounts(data),
      data,
    },
  };
}
