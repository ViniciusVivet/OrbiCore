"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { AppData, Contract, Meeting, Product, Sale, StockMovement, PayrollMonth, OrgProfile, SyncStatus } from "./types";
import { SEED_DATA } from "./seed-data";
import { createEmptyData, normalizeData, removeProductWithReferences } from "./data";
import { createClient } from "./supabase/client";

const LEGACY_STORAGE_KEY = "orbicore_data";
const storageKey = (userId: string) => `orbicore_data:${userId}`;

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

// LocalStorage as fast cache
function loadLocalCache(userId: string): AppData | null {
  if (typeof window === "undefined") return null;
  try {
    const key = storageKey(userId);
    const raw = localStorage.getItem(key) ?? localStorage.getItem(LEGACY_STORAGE_KEY);
    if (raw) return normalizeData(JSON.parse(raw) as Partial<AppData>);
  } catch {}
  return null;
}

function saveLocalCache(userId: string, data: AppData) {
  if (typeof window === "undefined") return;
  localStorage.setItem(storageKey(userId), JSON.stringify(data));
}

// Supabase sync
type RemoteData = { data: AppData; revision: number };

async function loadFromSupabase(userId: string): Promise<RemoteData | null | undefined> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("app_data")
      .select("data, revision")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) return undefined;
    if (!data) return null;
    return {
      data: normalizeData(data.data as Partial<AppData>),
      revision: Number(data.revision ?? 0),
    };
  } catch {
    return undefined;
  }
}

async function createInSupabase(userId: string, appData: AppData): Promise<boolean> {
  try {
    const supabase = createClient();
    const { error } = await supabase
      .from("app_data")
      .upsert({
        user_id: userId,
        data: appData,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: "user_id",
      });
    return !error;
  } catch {
    return false;
  }
}

async function saveToSupabase(appData: AppData, revision: number): Promise<number | null> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase.rpc("save_app_data", {
      new_data: appData,
      expected_revision: revision,
    });
    if (error) return null;
    return Number(data);
  } catch {
    return null;
  }
}

export function useStore() {
  const [data, setData] = useState<AppData>(() => createEmptyData());
  const [loaded, setLoaded] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("loading");
  const userIdRef = useRef<string | null>(null);
  const revisionRef = useRef(0);
  const saveQueueRef = useRef(Promise.resolve());

  useEffect(() => {
    async function init() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setSyncStatus("offline");
        setLoaded(true);
        return;
      }
      userIdRef.current = user.id;

      // O cache é isolado por usuário. A chave antiga só serve como migração.
      const cached = loadLocalCache(user.id);
      if (cached) setData(cached);

      const remote = await loadFromSupabase(user.id);
      if (remote) {
        revisionRef.current = remote.revision;
        setData(remote.data);
        saveLocalCache(user.id, remote.data);
        localStorage.removeItem(LEGACY_STORAGE_KEY);
        setSyncStatus("synced");
      } else if (remote === undefined) {
        // Falha de rede/servidor: nunca sobrescreve o remoto com cache possivelmente antigo.
        setSyncStatus(navigator.onLine ? "error" : "offline");
      } else if (!cached) {
        const emptyData = createEmptyData();
        setData(emptyData);
        saveLocalCache(user.id, emptyData);
        const saved = await createInSupabase(user.id, emptyData);
        setSyncStatus(saved ? "synced" : "offline");
      } else {
        saveLocalCache(user.id, cached);
        const saved = await createInSupabase(user.id, cached);
        if (saved) localStorage.removeItem(LEGACY_STORAGE_KEY);
        setSyncStatus(saved ? "synced" : "offline");
      }

      setLoaded(true);
    }

    init();
  }, []);

  const update = useCallback((updater: (prev: AppData) => AppData) => {
    setData((prev) => {
      const next = updater(prev);
      const userId = userIdRef.current;
      if (userId) {
        saveLocalCache(userId, next);
        setSyncStatus("saving");
        saveQueueRef.current = saveQueueRef.current.then(async () => {
          const revision = await saveToSupabase(next, revisionRef.current);
          if (revision !== null) {
            revisionRef.current = revision;
            setSyncStatus("synced");
            return;
          }

          const remote = await loadFromSupabase(userId);
          if (remote) {
            revisionRef.current = remote.revision;
            setData(remote.data);
            saveLocalCache(userId, remote.data);
          }
          setSyncStatus(navigator.onLine ? "error" : "offline");
        });
      }
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
    update((d) => removeProductWithReferences(d, id));
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

  // --- Stock movements ---
  const addStockMovement = useCallback((movement: Omit<StockMovement, "id" | "createdAt">) => {
    update((d) => ({
      ...d,
      stockMovements: [...(d.stockMovements ?? []), {
        ...movement,
        id: generateId(),
        createdAt: new Date().toISOString(),
      }],
    }));
  }, [update]);

  const deleteStockMovement = useCallback((id: string) => {
    update((d) => ({ ...d, stockMovements: (d.stockMovements ?? []).filter((x) => x.id !== id) }));
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
    update(() => createEmptyData());
  }, [update]);

  const loadDemoData = useCallback(() => {
    update(() => normalizeData(SEED_DATA));
  }, [update]);

  // --- Logout ---
  const logout = useCallback(async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    if (userIdRef.current) localStorage.removeItem(storageKey(userIdRef.current));
    userIdRef.current = null;
  }, []);

  return {
    data,
    loaded,
    syncStatus,
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
    addStockMovement,
    deleteStockMovement,
    upsertPayroll,
    resetData,
    loadDemoData,
    logout,
  };
}
