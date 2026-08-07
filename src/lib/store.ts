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

type SaveResult =
  | { status: "saved"; revision: number }
  | { status: "conflict" }
  | { status: "error" };

async function saveToSupabase(appData: AppData, revision: number): Promise<SaveResult> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase.rpc("save_app_data", {
      new_data: appData,
      expected_revision: revision,
    });
    if (error) return { status: "error" };
    const nextRevision = Number(data);
    if (nextRevision === -1) return { status: "conflict" };
    if (!Number.isSafeInteger(nextRevision) || nextRevision < 0) return { status: "error" };
    return { status: "saved", revision: nextRevision };
  } catch {
    return { status: "error" };
  }
}

const SAVE_DEBOUNCE_MS = 800;

export function useStore() {
  const [data, setData] = useState<AppData>(() => createEmptyData());
  const [loaded, setLoaded] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("loading");
  const userIdRef = useRef<string | null>(null);
  const revisionRef = useRef(0);
  // Espelho síncrono do estado, para compor updates seguidos sem depender do re-render.
  const dataRef = useRef<AppData>(data);
  // Dados pendentes de salvar (coalescidos) + controle de debounce e concorrência.
  const dirtyRef = useRef<AppData | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savingRef = useRef(false);

  const applyData = useCallback((next: AppData) => {
    dataRef.current = next;
    setData(next);
  }, []);

  // Persiste no Supabase o último estado pendente. Um save por vez, e no conflito
  // adota o remoto SEM re-salvar — isso mata o loop de conflito que sobrecarregava o banco.
  const flush = useCallback(async () => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    const userId = userIdRef.current;
    if (!userId || savingRef.current || !dirtyRef.current) return;

    const payload = dirtyRef.current;
    dirtyRef.current = null;
    savingRef.current = true;
    const result = await saveToSupabase(payload, revisionRef.current);
    savingRef.current = false;

    if (result.status === "saved") {
      revisionRef.current = result.revision;
      setSyncStatus("synced");
      // Se chegaram edições enquanto salvava, agenda mais um save.
      if (dirtyRef.current) saveTimerRef.current = setTimeout(() => { void flush(); }, SAVE_DEBOUNCE_MS);
      return;
    }

    // Conflito/erro: recarrega o remoto e descarta o pendente local para não
    // reenviar uma versão desatualizada em loop (a mudança segue no cache local).
    dirtyRef.current ??= payload;

    if (result.status === "conflict") {
      const remote = await loadFromSupabase(userId);
      if (remote) {
        revisionRef.current = remote.revision;
      }
    }
    setSyncStatus(navigator.onLine ? "error" : "offline");
  }, []);

  const scheduleSave = useCallback(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => { void flush(); }, SAVE_DEBOUNCE_MS);
  }, [flush]);

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
      if (cached) applyData(cached);

      const remote = await loadFromSupabase(user.id);
      if (remote) {
        revisionRef.current = remote.revision;
        applyData(remote.data);
        saveLocalCache(user.id, remote.data);
        localStorage.removeItem(LEGACY_STORAGE_KEY);
        setSyncStatus("synced");
      } else if (remote === undefined) {
        // Falha de rede/servidor: nunca sobrescreve o remoto com cache possivelmente antigo.
        setSyncStatus(navigator.onLine ? "error" : "offline");
      } else if (!cached) {
        const emptyData = createEmptyData();
        applyData(emptyData);
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
  }, [applyData]);

  // Garante que o último save pendente vá embora antes de sair/minimizar a aba.
  useEffect(() => {
    function flushIfDirty() {
      if (dirtyRef.current) void flush();
    }
    function onVisibility() {
      if (document.visibilityState === "hidden") flushIfDirty();
    }
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", flushIfDirty);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", flushIfDirty);
    };
  }, [flush]);

  // Ao recuperar conexão, tenta novamente o payload preservado na fila/cache.
  useEffect(() => {
    function retryWhenOnline() {
      if (!dirtyRef.current || savingRef.current) return;
      setSyncStatus("saving");
      scheduleSave();
    }
    window.addEventListener("online", retryWhenOnline);
    return () => window.removeEventListener("online", retryWhenOnline);
  }, [scheduleSave]);

  const update = useCallback((updater: (prev: AppData) => AppData) => {
    const next = updater(dataRef.current);
    applyData(next);
    const userId = userIdRef.current;
    if (!userId) return;
    saveLocalCache(userId, next);
    dirtyRef.current = next;
    setSyncStatus("saving");
    scheduleSave();
  }, [applyData, scheduleSave]);

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

  const updateSale = useCallback((id: string, s: Partial<Sale>) => {
    update((d) => ({
      ...d,
      sales: d.sales.map((x) => (x.id === id ? { ...x, ...s } : x)),
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

  const updateStockMovement = useCallback((id: string, movement: Partial<StockMovement>) => {
    update((d) => ({
      ...d,
      stockMovements: (d.stockMovements ?? []).map((x) =>
        x.id === id ? { ...x, ...movement } : x
      ),
    }));
  }, [update]);

  const upsertGoalPlan = useCallback((plan: AppData["goalPlans"][number]) => {
    update((d) => ({
      ...d,
      goalPlans: d.goalPlans.some((item) => item.year === plan.year)
        ? d.goalPlans.map((item) => item.year === plan.year ? plan : item)
        : [...d.goalPlans, plan],
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

  const restoreData = useCallback((backupData: AppData) => {
    update(() => normalizeData(backupData));
  }, [update]);

  // --- Logout ---
  const logout = useCallback(async () => {
    // Descarta saves pendentes/agendados para não escrever após o signOut.
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    dirtyRef.current = null;
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
    updateSale,
    deleteSale,
    addStockMovement,
    updateStockMovement,
    deleteStockMovement,
    upsertGoalPlan,
    upsertPayroll,
    resetData,
    loadDemoData,
    restoreData,
    logout,
  };
}
