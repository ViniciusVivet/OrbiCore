"use client";

import { useMemo, useState } from "react";
import { Image as ImageIcon, Upload, Trash2, Layers, LayoutGrid, Check } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/components/store-provider";
import { DashboardView } from "@/lib/types";
import { formatFileSize, optimizeImage } from "@/lib/image-optimizer";
import {
  backgroundImageUrl,
  removeBackgroundImages,
  uploadBackgroundImage,
} from "@/lib/background-image";
import { toast } from "sonner";

type Slot = "all" | DashboardView;

const VIEW_LABELS: Record<DashboardView, string> = {
  overview: "Visão geral",
  commercial: "Comercial",
  store: "Loja e estoque",
};

export function BackgroundSettings() {
  const { data, updateProfile } = useAppStore();
  const backgrounds = data.profile.dashboardBackgrounds ?? {};
  const scope: "all" | "area" = backgrounds.scope === "area" ? "area" : "all";

  const availableViews = useMemo<DashboardView[]>(() => {
    const modules = data.profile.enabledModules;
    const financial = modules.some((m) => ["contracts", "meetings", "payroll"].includes(m));
    const store = modules.some((m) => ["products", "sales"].includes(m));
    if (financial && store) return ["overview", "commercial", "store"];
    if (financial) return ["commercial"];
    if (store) return ["store"];
    return ["overview"];
  }, [data.profile.enabledModules]);

  const [previewView, setPreviewView] = useState<DashboardView>(availableViews[0]);
  const [busySlot, setBusySlot] = useState<Slot | null>(null);
  const [status, setStatus] = useState<{ kind: "working" | "success" | "error"; text: string } | null>(null);

  const activeSlot: Slot = scope === "all" ? "all" : previewView;
  const previewUrl = backgroundImageUrl(backgrounds[activeSlot]);

  function patch(next: Partial<typeof backgrounds>) {
    updateProfile({ dashboardBackgrounds: { ...backgrounds, ...next } });
  }

  function setScope(nextScope: "all" | "area") {
    patch({ scope: nextScope });
  }

  async function handleUpload(slot: Slot, event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setBusySlot(slot);
    setStatus({ kind: "working", text: "Preparando e otimizando a imagem..." });
    try {
      const optimized = await optimizeImage(file, {
        maxDimension: 2560,
        targetBytes: 700 * 1024,
        maxBytes: 1.6 * 1024 * 1024,
      });
      setStatus({
        kind: "working",
        text: `Imagem reduzida de ${formatFileSize(optimized.originalBytes)} para ${formatFileSize(optimized.optimizedBytes)}. Enviando...`,
      });
      const previous = backgrounds[slot];
      const path = await uploadBackgroundImage(optimized.file, slot);
      patch({ [slot]: path });
      if (previous) await removeBackgroundImages([previous]).catch(() => undefined);
      setStatus({ kind: "success", text: "Papel de parede aplicado. As alterações já foram salvas." });
      toast.success("Papel de parede atualizado!");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Falha ao enviar a imagem.";
      setStatus({ kind: "error", text: message });
      toast.error(message);
    } finally {
      setBusySlot(null);
    }
  }

  async function handleRemove(slot: Slot) {
    const previous = backgrounds[slot];
    if (!previous) return;
    setBusySlot(slot);
    try {
      patch({ [slot]: undefined });
      await removeBackgroundImages([previous]).catch(() => undefined);
      setStatus({ kind: "success", text: "Papel de parede removido." });
      toast.success("Papel de parede removido!");
    } finally {
      setBusySlot(null);
    }
  }

  const slotsToShow: { slot: Slot; label: string }[] =
    scope === "all"
      ? [{ slot: "all", label: "Todas as áreas" }]
      : availableViews.map((view) => ({ slot: view, label: VIEW_LABELS[view] }));

  return (
    <Card className="border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ImageIcon className="h-5 w-5 text-orbi-cyan" />
          Papel de parede do dashboard
        </CardTitle>
        <CardDescription>
          Deixe o painel com a sua cara. Os cards e gráficos ficam por cima, com um leve efeito de vidro
          para tudo continuar legível.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Escopo: uma para todas ou uma por área */}
        {availableViews.length > 1 && (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setScope("all")}
              className={`flex items-start gap-3 rounded-xl border p-3 text-left transition-colors ${
                scope === "all" ? "border-primary/40 bg-primary/5" : "border-border/50 hover:border-primary/30"
              }`}
            >
              <Layers className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <span>
                <span className="block text-sm font-medium">Uma para todas as áreas</span>
                <span className="block text-xs text-muted-foreground">A mesma imagem em todo o dashboard.</span>
              </span>
            </button>
            <button
              type="button"
              onClick={() => setScope("area")}
              className={`flex items-start gap-3 rounded-xl border p-3 text-left transition-colors ${
                scope === "area" ? "border-primary/40 bg-primary/5" : "border-border/50 hover:border-primary/30"
              }`}
            >
              <LayoutGrid className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <span>
                <span className="block text-sm font-medium">Uma por área</span>
                <span className="block text-xs text-muted-foreground">Imagens diferentes para cada visão.</span>
              </span>
            </button>
          </div>
        )}

        {/* Preview */}
        <div>
          {scope === "area" && availableViews.length > 1 && (
            <div className="mb-2 flex flex-wrap gap-1.5">
              {availableViews.map((view) => (
                <button
                  key={view}
                  type="button"
                  onClick={() => setPreviewView(view)}
                  className={`rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors ${
                    previewView === view
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border/60 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {VIEW_LABELS[view]}
                </button>
              ))}
            </div>
          )}
          <BackgroundPreview url={previewUrl} />
          <p className="mt-2 text-center text-xs text-muted-foreground">
            Prévia de como o {scope === "all" ? "dashboard" : `“${VIEW_LABELS[previewView]}”`} vai ficar.
          </p>
        </div>

        {/* Uploaders */}
        <div className="space-y-2">
          {slotsToShow.map(({ slot, label }) => {
            const hasImage = Boolean(backgrounds[slot]);
            const inputId = `bg-upload-${slot}`;
            return (
              <div
                key={slot}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/50 p-3"
              >
                <div className="flex items-center gap-2">
                  {hasImage ? (
                    <Check className="h-4 w-4 text-orbi-emerald" />
                  ) : (
                    <ImageIcon className="h-4 w-4 text-muted-foreground" />
                  )}
                  <span className="text-sm font-medium">{label}</span>
                  <span className="text-xs text-muted-foreground">
                    {hasImage ? "imagem aplicada" : "sem imagem"}
                  </span>
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={busySlot !== null}
                    render={<label htmlFor={inputId} />}
                  >
                    <Upload className="h-4 w-4" />
                    {busySlot === slot ? "Enviando..." : hasImage ? "Trocar" : "Enviar imagem"}
                  </Button>
                  <input
                    id={inputId}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="sr-only"
                    onChange={(event) => handleUpload(slot, event)}
                  />
                  {hasImage && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={busySlot !== null}
                      onClick={() => handleRemove(slot)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {status && (
          <div
            role="status"
            className={`rounded-lg border p-3 text-sm ${
              status.kind === "success"
                ? "border-orbi-emerald/40 bg-orbi-emerald/10 text-orbi-emerald"
                : status.kind === "error"
                  ? "border-orbi-rose/40 bg-orbi-rose/10 text-orbi-rose"
                  : "border-primary/30 bg-primary/5 text-foreground"
            }`}
          >
            {status.text}
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          Dica: prefira imagens mais escuras e sem muitos detalhes no centro — elas deixam os gráficos mais
          legíveis. Reduzimos e convertemos a foto automaticamente para carregar rápido.
        </p>
      </CardContent>
    </Card>
  );
}

function BackgroundPreview({ url }: { url?: string }) {
  return (
    <div className="relative aspect-[16/9] w-full overflow-hidden rounded-xl border border-border/60">
      {url ? (
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url("${url}")` }} />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-muted to-background" />
      )}
      <div className="absolute inset-0 bg-gradient-to-b from-background/85 to-background/70" />
      {/* Cards de mentira, no mesmo estilo vidro do dashboard */}
      <div className="absolute inset-0 grid grid-cols-3 grid-rows-2 gap-2 p-3">
        <div className="rounded-lg border border-foreground/10 bg-card/80 p-2 backdrop-blur-sm">
          <div className="h-1.5 w-8 rounded-full bg-muted-foreground/40" />
          <div className="mt-1.5 h-3 w-12 rounded bg-foreground/70" />
        </div>
        <div className="rounded-lg border border-foreground/10 bg-card/80 p-2 backdrop-blur-sm">
          <div className="h-1.5 w-6 rounded-full bg-muted-foreground/40" />
          <div className="mt-1.5 h-3 w-10 rounded bg-foreground/70" />
        </div>
        <div className="rounded-lg border border-foreground/10 bg-card/80 p-2 backdrop-blur-sm">
          <div className="h-1.5 w-7 rounded-full bg-muted-foreground/40" />
          <div className="mt-1.5 h-3 w-9 rounded bg-foreground/70" />
        </div>
        <div className="col-span-2 flex items-end gap-1 rounded-lg border border-foreground/10 bg-card/80 p-2 backdrop-blur-sm">
          {[40, 65, 50, 80, 60, 90].map((h, i) => (
            <div key={i} className="flex-1 rounded-sm bg-primary/70" style={{ height: `${h}%` }} />
          ))}
        </div>
        <div className="rounded-lg border border-foreground/10 bg-card/80 p-2 backdrop-blur-sm">
          <div className="h-1.5 w-6 rounded-full bg-muted-foreground/40" />
          <div className="mx-auto mt-2 h-8 w-8 rounded-full border-4 border-primary/70" />
        </div>
      </div>
    </div>
  );
}
