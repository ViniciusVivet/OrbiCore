"use client";

import { CheckCircle2, CloudOff, LoaderCircle, TriangleAlert } from "lucide-react";
import { useAppStore } from "@/components/store-provider";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export function SyncIndicator() {
  const { syncStatus, reloadFromCloud, retrySync } = useAppStore();
  const states = {
    loading: { label: "Carregando", icon: LoaderCircle, className: "animate-spin" },
    saving: { label: "Salvando", icon: LoaderCircle, className: "animate-spin" },
    synced: { label: "Salvo", icon: CheckCircle2, className: "text-orbi-emerald" },
    offline: { label: "Salvo neste dispositivo", icon: CloudOff, className: "text-orbi-amber" },
    error: { label: "Não sincronizado — salvo neste dispositivo", icon: TriangleAlert, className: "text-orbi-rose" },
    conflict: { label: "Outra versão encontrada", icon: TriangleAlert, className: "text-orbi-amber" },
  } as const;
  const state = states[syncStatus];
  const Icon = state.icon;

  if (syncStatus !== "conflict" && syncStatus !== "error") return <span className="ml-auto flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground" title={state.label}><Icon className={`h-3.5 w-3.5 ${state.className}`} /><span className="max-w-36 truncate sm:max-w-none">{state.label}</span></span>;

  return <Popover><PopoverTrigger className="ml-auto flex min-w-0 items-center gap-1.5 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-muted" aria-label="Resolver problema de sincronização"><Icon className={`h-3.5 w-3.5 ${state.className}`} /><span className="max-w-36 truncate sm:max-w-none">{state.label}</span></PopoverTrigger><PopoverContent align="end" className="w-80"><p className="font-semibold">Sincronização precisa de atenção</p><p className="text-sm text-muted-foreground">Você pode carregar a versão salva na nuvem ou tentar enviar novamente as alterações deste dispositivo.</p><div className="grid gap-2"><Button size="sm" onClick={() => void reloadFromCloud()}>Usar versão da nuvem</Button><Button size="sm" variant="outline" onClick={retrySync}>Tentar enviar novamente</Button></div></PopoverContent></Popover>;
}
