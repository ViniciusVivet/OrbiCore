import { AppData, OrgProfile } from "./types";

export const DEFAULT_PROFILE: OrgProfile = {
  name: "",
  profileType: "company",
  enabledFeatures: [],
  enabledModules: [
    "dashboard",
    "contracts",
    "meetings",
    "goals",
    "products",
    "sales",
    "payroll",
    "export",
  ],
  yearlyGoal: 0,
  currentYear: new Date().getFullYear(),
  meetingGoalMonthly: 0,
  closeRateTarget: 0,
  newContractsMonthly: 0,
  salesRevenueMonthly: 0,
};

export function createEmptyData(): AppData {
  return {
    profile: { ...DEFAULT_PROFILE },
    contracts: [],
    meetings: [],
    products: [],
    sales: [],
    stockMovements: [],
    payroll: [],
    goalPlans: [],
  };
}

export function normalizeData(value: Partial<AppData> | null | undefined): AppData {
  const empty = createEmptyData();
  const data = value ?? {};

  return {
    profile: { ...empty.profile, ...(data.profile ?? {}) },
    contracts: Array.isArray(data.contracts) ? data.contracts : [],
    meetings: Array.isArray(data.meetings) ? data.meetings : [],
    products: Array.isArray(data.products) ? data.products : [],
    sales: Array.isArray(data.sales) ? data.sales : [],
    stockMovements: Array.isArray(data.stockMovements) ? data.stockMovements : [],
    payroll: Array.isArray(data.payroll) ? data.payroll : [],
    goalPlans: Array.isArray(data.goalPlans) ? data.goalPlans : [],
  };
}

export function removeProductWithReferences(data: AppData, productId: string): AppData {
  return {
    ...data,
    products: data.products.filter((product) => product.id !== productId),
    sales: data.sales.filter((sale) => sale.productId !== productId),
    stockMovements: data.stockMovements.filter(
      (movement) => movement.productId !== productId
    ),
  };
}
