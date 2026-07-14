// =============================================
// OrbiCore - Tipos do Sistema
// =============================================

// --- Contratos & MRR ---
export type ContractStatus = "Ativo" | "Cancelado" | "Inativo";
export type RevenueType = "Novo" | "Onboarding" | "Upsell" | "Cross-sell";

export interface Contract {
  id: string;
  saleDate: string; // ISO date
  client: string;
  monthlyFee: number;
  durationMonths: number;
  status: ContractStatus;
  revenueType: RevenueType;
  onboardingValue: number;
  upsellCrossSellValue: number;
  parentContractId?: string;
  createdAt: string;
}

// --- Reunioes ---
export type MeetingStatus =
  | "Agendada"
  | "Realizada"
  | "Remarcar"
  | "Proposta enviada"
  | "Fechada"
  | "Perdida";

export type MeetingChannel =
  | "WhatsApp"
  | "Presencial"
  | "Telefone"
  | "Indicação"
  | "Instagram"
  | "Outro";

export type MeetingType = "Primeiro contato" | "Follow-up" | "Apresentação" | "Negociação" | "Fechamento";

export interface Meeting {
  id: string;
  date: string;
  clientLead: string;
  responsible: string;
  channel: MeetingChannel;
  type: MeetingType;
  status: MeetingStatus;
  expectedMRR: number;
  probability: number; // 0 to 1
  nextReturnDate?: string;
  notes?: string;
  createdAt: string;
}

// --- Produtos & Estoque ---
export interface Product {
  id: string;
  name: string;
  category: string;
  supplier: string;
  initialQty: number;
  entries: number;
  minStock: number;
  costPrice: number;
  salePrice: number;
  createdAt: string;
}

export interface Sale {
  id: string;
  date: string;
  productId: string;
  quantity: number;
  createdAt: string;
}

// --- Calculo Mensal ---
export interface PayrollMonth {
  id: string;
  month: number; // 1-12
  year: number;
  baseSalary: number;
  homeOffice: number;
  commission: number;
  workDays: number;
  sundaysHolidays: number;
  otherDeductions: number;
  createdAt: string;
}

// --- Metas ---
export type GoalPeriod = "monthly" | "quarterly" | "yearly";

export interface Goal {
  id: string;
  module: string;
  period: GoalPeriod;
  year: number;
  targetValue: number;
  createdAt: string;
}

// --- Organizacao / Perfil ---
export type ModuleKey =
  | "dashboard"
  | "contracts"
  | "meetings"
  | "goals"
  | "products"
  | "sales"
  | "payroll"
  | "export";

export interface OrgProfile {
  name: string;
  enabledModules: ModuleKey[];
  yearlyGoal: number;
  currentYear: number;
  meetingGoalMonthly?: number;
  closeRateTarget?: number;
  newContractsMonthly?: number;
  salesRevenueMonthly?: number;
}

export type SyncStatus = "loading" | "synced" | "saving" | "offline" | "error";

// --- Store ---
export interface AppData {
  profile: OrgProfile;
  contracts: Contract[];
  meetings: Meeting[];
  products: Product[];
  sales: Sale[];
  payroll: PayrollMonth[];
  goals: Goal[];
}
