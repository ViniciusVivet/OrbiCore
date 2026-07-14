"use client";

import { CheckCircle2, CloudOff, LoaderCircle, TriangleAlert } from "lucide-react";
import { useAppStore } from "@/components/store-provider";

export function SyncIndicator() {
  const { syncStatus } = useAppStore();
  const states = {
    loading: { label: "Carregando", icon: LoaderCircle, className: "animate-spin" },
    saving: { label: "Salvando", icon: LoaderCircle, className: "animate-spin" },
    synced: { label: "Sincronizado", icon: CheckCircle2, className: "text-orbi-emerald" },
    offline: { label: "Salvo neste dispositivo", icon: CloudOff, className: "text-orbi-amber" },
    error: { label: "Falha ao sincronizar", icon: TriangleAlert, className: "text-orbi-rose" },
  } as const;
  const state = states[syncStatus];
  const Icon = state.icon;

  return (
    <span className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground" title={state.label}>
      <Icon className={`h-3.5 w-3.5 ${state.className}`} />
      <span className="hidden sm:inline">{state.label}</span>
    </span>
  );
}
