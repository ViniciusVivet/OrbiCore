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

const LEGACY_DEFAULT_MODULES = [
  "dashboard",
  "contracts",
  "meetings",
  "goals",
  "payroll",
  "export",
] as const;

function normalizeEnabledModules(profile: Partial<OrgProfile> | undefined): OrgProfile["enabledModules"] {
  const modules = profile?.enabledModules;
  if (!Array.isArray(modules)) return [...DEFAULT_PROFILE.enabledModules];
  const isLegacyDefault =
    modules.length === LEGACY_DEFAULT_MODULES.length &&
    LEGACY_DEFAULT_MODULES.every((module) => modules.includes(module));
  return isLegacyDefault ? [...DEFAULT_PROFILE.enabledModules] : modules;
}

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
    profile: {
      ...empty.profile,
      ...(data.profile ?? {}),
      enabledModules: normalizeEnabledModules(data.profile),
    },
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
