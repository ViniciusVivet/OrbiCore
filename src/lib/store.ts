"use client";

import { useState, useEffect, useCallback } from "react";
import { AppData, Contract, Meeting, Product, Sale, PayrollMonth, Goal, OrgProfile } from "./types";
import { SEED_DATA } from "./seed-data";

const STORAGE_KEY = "orbicore_data";

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function loadData(): AppData {
  if (typeof window === "undefined") return SEED_DATA;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  // First load: seed with Vagner's data
  localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_DATA));
  return SEED_DATA;
}

function saveData(data: AppData) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function useStore() {
  const [data, setData] = useState<AppData>(SEED_DATA);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setData(loadData());
    setLoaded(true);
  }, []);

  const update = useCallback((updater: (prev: AppData) => AppData) => {
    setData((prev) => {
      const next = updater(prev);
      saveData(next);
      return next;
    });
  }, []);

  // --- Profile ---
  const updateProfile = useCallback((profile: Partial<OrgProfile>) => {
    update((d) => ({ ...d, profile: { ...d.profile, ...profile } }));
  }, [update]);

  // --- Contracts ---
  const addContract = useCallback((c: Omit<Contract, "id" | "createdAt">) => {
    update((d) => ({
      ...d,
      contracts: [...d.contracts, { ...c, id: generateId(), createdAt: new Date().toISOString() }],
    }));
  }, [update]);

  const updateContract = useCallback((id: string, c: Partial<Contract>) => {
    update((d) => ({
      ...d,
      contracts: d.contracts.map((x) => (x.id === id ? { ...x, ...c } : x)),
    }));
  }, [update]);

  const deleteContract = useCallback((id: string) => {
    update((d) => ({ ...d, contracts: d.contracts.filter((x) => x.id !== id) }));
  }, [update]);

  // --- Meetings ---
  const addMeeting = useCallback((m: Omit<Meeting, "id" | "createdAt">) => {
    update((d) => ({
      ...d,
      meetings: [...d.meetings, { ...m, id: generateId(), createdAt: new Date().toISOString() }],
    }));
  }, [update]);

  const updateMeeting = useCallback((id: string, m: Partial<Meeting>) => {
    update((d) => ({
      ...d,
      meetings: d.meetings.map((x) => (x.id === id ? { ...x, ...m } : x)),
    }));
  }, [update]);

  const deleteMeeting = useCallback((id: string) => {
    update((d) => ({ ...d, meetings: d.meetings.filter((x) => x.id !== id) }));
  }, [update]);

  // --- Products ---
  const addProduct = useCallback((p: Omit<Product, "id" | "createdAt">) => {
    update((d) => ({
      ...d,
      products: [...d.products, { ...p, id: generateId(), createdAt: new Date().toISOString() }],
    }));
  }, [update]);

  const updateProduct = useCallback((id: string, p: Partial<Product>) => {
    update((d) => ({
      ...d,
      products: d.products.map((x) => (x.id === id ? { ...x, ...p } : x)),
    }));
  }, [update]);

  const deleteProduct = useCallback((id: string) => {
    update((d) => ({ ...d, products: d.products.filter((x) => x.id !== id) }));
  }, [update]);

  // --- Sales ---
  const addSale = useCallback((s: Omit<Sale, "id" | "createdAt">) => {
    update((d) => ({
      ...d,
      sales: [...d.sales, { ...s, id: generateId(), createdAt: new Date().toISOString() }],
    }));
  }, [update]);

  const deleteSale = useCallback((id: string) => {
    update((d) => ({ ...d, sales: d.sales.filter((x) => x.id !== id) }));
  }, [update]);

  // --- Payroll ---
  const upsertPayroll = useCallback((p: Omit<PayrollMonth, "id" | "createdAt">) => {
    update((d) => {
      const existing = d.payroll.find((x) => x.month === p.month && x.year === p.year);
      if (existing) {
        return {
          ...d,
          payroll: d.payroll.map((x) =>
            x.id === existing.id ? { ...x, ...p } : x
          ),
        };
      }
      return {
        ...d,
        payroll: [...d.payroll, { ...p, id: generateId(), createdAt: new Date().toISOString() }],
      };
    });
  }, [update]);

  // --- Reset ---
  const resetData = useCallback(() => {
    saveData(SEED_DATA);
    setData(SEED_DATA);
  }, []);

  return {
    data,
    loaded,
    updateProfile,
    addContract,
    updateContract,
    deleteContract,
    addMeeting,
    updateMeeting,
    deleteMeeting,
    addProduct,
    updateProduct,
    deleteProduct,
    addSale,
    deleteSale,
    upsertPayroll,
    resetData,
  };
}
