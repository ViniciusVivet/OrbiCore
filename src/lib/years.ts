import type { AppData } from "./types";

export function currentCalendarYear(now = new Date()): number {
  return now.getFullYear();
}

export function availableYears(data: AppData, now = new Date(), futureYears = 5): number[] {
  const current = currentCalendarYear(now);
  const values = [
    data.profile.currentYear,
    ...data.contracts.map((item) => Number(item.saleDate.slice(0, 4))),
    ...data.contracts.flatMap((item) => (item.feeHistory ?? []).map((change) => Number(change.effectiveFrom.slice(0, 4)))),
    ...data.meetings.map((item) => Number(item.date.slice(0, 4))),
    ...data.sales.map((item) => Number(item.date.slice(0, 4))),
    ...data.stockMovements.map((item) => Number(item.date.slice(0, 4))),
    ...data.payroll.map((item) => item.year),
    ...data.goalPlans.map((item) => item.year),
  ].filter((value) => Number.isInteger(value) && value >= 2000 && value <= 2100);
  const first = Math.min(current - 2, ...values);
  const last = Math.max(current + futureYears, ...values);
  return Array.from({ length: last - first + 1 }, (_, index) => first + index);
}
