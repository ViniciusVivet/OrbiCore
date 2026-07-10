"use client";

import { useState, useEffect, useCallback } from "react";
import { AppData, Contract, Meeting, Product, Sale, PayrollMonth, OrgProfile } from "./types";
import { SEED_DATA } from "./seed-data";
import { createClient } from "./supabase/client";

const STORAGE_KEY = "orbicore_data";

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

// LocalStorage as fast cache
function loadLocalCache(): AppData | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
}

function saveLocalCache(data: AppData) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

// Supabase sync
async function loadFromSupabase(): Promise<AppData | null> {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from("app_data")
      .select("data")
      .eq("user_id", user.id)
      .single();

    if (error || !data) return null;
    return data.data as AppData;
  } catch {
    return null;
  }
}

async function saveToSupabase(appData: AppData) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from("app_data")
      .upsert({
        user_id: user.id,
        data: appData,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: "user_id",
      });
  } catch {
    // Fail silently — localStorage still has the data
  }
}

export function useStore() {
  const [data, setData] = useState<AppData>(SEED_DATA);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    async function init() {
      // 1. Load local cache instantly (fast)
      const cached = loadLocalCache();
      if (cached) setData(cached);

      // 2. Try Supabase (source of truth)
      const remote = await loadFromSupabase();
      if (remote) {
        setData(remote);
        saveLocalCache(remote);
      } else if (!cached) {
        // First time user — seed with defaults
        setData(SEED_DATA);
        saveLocalCache(SEED_DATA);
        saveToSupabase(SEED_DATA);
      } else {
        // Has local cache but no remote — push to Supabase
        saveToSupabase(cached);
      }

      setLoaded(true);
    }

    init();
  }, []);

  const update = useCallback((updater: (prev: AppData) => AppData) => {
    setData((prev) => {
      const next = updater(prev);
      saveLocalCache(next);
      saveToSupabase(next);
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
    saveLocalCache(SEED_DATA);
    saveToSupabase(SEED_DATA);
    setData(SEED_DATA);
  }, []);

  // --- Logout ---
  const logout = useCallback(async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    localStorage.removeItem(STORAGE_KEY);
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
    logout,
  };
}
