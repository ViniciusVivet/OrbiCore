"use client";

import { createContext, useContext, useEffect, useState } from "react";
import {
  closestCenter,
  DndContext,
  DragEndEvent,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  rectSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Check, ExternalLink, EyeOff, GripVertical, LayoutGrid, Maximize2, MoreHorizontal, Move, RotateCcw, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useAppStore } from "@/components/store-provider";
import { DashboardBlockKey, DashboardBlockPreference, DashboardBlockSize, DashboardView } from "@/lib/types";

type BlockDefinition = {
  key: DashboardBlockKey;
  label: string;
  description: string;
  defaultSize: DashboardBlockSize;
  href?: string;
  store?: boolean;
  views: DashboardView[];
  allowedSizes: DashboardBlockSize[];
};

export const DASHBOARD_BLOCKS: BlockDefinition[] = [
  { key: "mrr-active", label: "MRR ativo", description: "Fees mensais dos contratos ativos", defaultSize: "small", href: "/contracts", views: ["overview", "commercial"], allowedSizes: ["small", "medium"] },
  { key: "active-contracts", label: "Contratos ativos", description: "Quantidade e vendas do período", defaultSize: "small", href: "/contracts", views: ["commercial"], allowedSizes: ["small", "medium"] },
  { key: "period-mrr", label: "MRR do período", description: "Resultado comparado à meta", defaultSize: "small", href: "/goals", views: ["overview", "commercial"], allowedSizes: ["small", "medium"] },
  { key: "next-year-mrr", label: "MRR do próximo ano", description: "Receita projetada para o próximo ano", defaultSize: "small", href: "/contracts", views: ["commercial"], allowedSizes: ["small", "medium"] },
  { key: "alerts", label: "Atenção necessária", description: "Retornos, vencimentos e riscos", defaultSize: "full", href: "/meetings", views: ["overview", "commercial"], allowedSizes: ["large", "full"] },
  { key: "goal-progress", label: "Progresso da meta", description: "Meta mensal, trimestral ou anual", defaultSize: "full", href: "/goals", views: ["overview", "commercial"], allowedSizes: ["large", "full"] },
  { key: "mrr-evolution", label: "Evolução do MRR", description: "Receita acumulada ao longo do ano", defaultSize: "large", href: "/contracts", views: ["commercial"], allowedSizes: ["medium", "large", "full"] },
  { key: "revenue-composition", label: "Composição da receita", description: "MRR separado por tipo", defaultSize: "medium", href: "/contracts", views: ["commercial"], allowedSizes: ["medium", "large"] },
  { key: "pipeline", label: "Pipeline ponderado", description: "Valor esperado dos negócios abertos", defaultSize: "small", href: "/meetings", views: ["overview", "commercial"], allowedSizes: ["small", "medium"] },
  { key: "churn-risk", label: "Risco de churn", description: "Contratos próximos do vencimento", defaultSize: "small", href: "/contracts", views: ["commercial"], allowedSizes: ["small", "medium"] },
  { key: "client-concentration", label: "Concentração", description: "Dependência dos principais clientes", defaultSize: "small", href: "/contracts", views: ["commercial"], allowedSizes: ["small", "medium"] },
  { key: "commission", label: "Comissão vs MRR", description: "Relação entre comissão e receita", defaultSize: "small", href: "/payroll", views: ["commercial"], allowedSizes: ["small", "medium"] },
  { key: "client-ranking", label: "Ranking de clientes", description: "Distribuição do MRR por cliente", defaultSize: "full", href: "/contracts", views: ["commercial"], allowedSizes: ["large", "full"] },
  { key: "inventory-summary", label: "Resumo do estoque", description: "Produtos, valor e reposição", defaultSize: "medium", href: "/products", store: true, views: ["overview", "store"], allowedSizes: ["small", "medium"] },
  { key: "sales-summary", label: "Resumo de vendas", description: "Receita, lucro e itens vendidos", defaultSize: "medium", href: "/sales", store: true, views: ["overview", "store"], allowedSizes: ["small", "medium"] },
  { key: "stock-levels", label: "Estoque por produto", description: "Saldo atual e estoque mínimo", defaultSize: "medium", href: "/products", store: true, views: ["store"], allowedSizes: ["medium", "large", "full"] },
  { key: "sales-by-product", label: "Vendas por produto", description: "Produtos com maior faturamento", defaultSize: "medium", href: "/sales", store: true, views: ["store"], allowedSizes: ["medium", "large", "full"] },
  { key: "recent-movements", label: "Movimentações recentes", description: "Entradas, baixas e ajustes", defaultSize: "medium", href: "/products", store: true, views: ["store"], allowedSizes: ["medium", "large"] },
];

// Defaults curados: cada visão já vem com um recorte limpo e bonito, contando uma
// história clara. Os demais blocos ficam disponíveis em "Gráficos e cards" para quem
// quiser adicionar — assim o padrão nunca chega poluído.
function buildLayout(entries: [DashboardBlockKey, DashboardBlockSize][]): DashboardBlockPreference[] {
  return entries.map(([key, size]) => ({ key, size }));
}

export const DEFAULT_DASHBOARD_LAYOUTS: Record<DashboardView, DashboardBlockPreference[]> = {
  // Visão geral (clientes completos): panorama cruzado comercial + loja.
  overview: buildLayout([
    ["mrr-active", "small"],
    ["period-mrr", "small"],
    ["sales-summary", "medium"],
    ["inventory-summary", "medium"],
    ["goal-progress", "full"],
    ["alerts", "full"],
  ]),
  // Comercial: a jornada da receita recorrente, sem excesso de indicadores avançados.
  commercial: buildLayout([
    ["mrr-active", "small"],
    ["active-contracts", "small"],
    ["period-mrr", "small"],
    ["next-year-mrr", "small"],
    ["goal-progress", "full"],
    ["mrr-evolution", "large"],
    ["revenue-composition", "medium"],
    ["client-ranking", "full"],
    ["alerts", "full"],
  ]),
  // Loja: receita e lucro primeiro, depois giro de produtos e movimentações.
  store: buildLayout([
    ["sales-summary", "medium"],
    ["inventory-summary", "medium"],
    ["sales-by-product", "medium"],
    ["stock-levels", "medium"],
    ["recent-movements", "medium"],
  ]),
};

const SIZE_CLASSES: Record<DashboardBlockSize, string> = {
  small: "col-span-12 md:col-span-6 xl:col-span-3",
  medium: "col-span-12 lg:col-span-6",
  large: "col-span-12 xl:col-span-8",
  full: "col-span-12",
};

const SIZE_LABELS: Record<DashboardBlockSize, string> = {
  small: "Pequeno",
  medium: "Médio",
  large: "Grande",
  full: "Largura total",
};

type LayoutContextValue = {
  editing: boolean;
  setEditing: (editing: boolean) => void;
  layout: DashboardBlockPreference[];
  visible: (key: DashboardBlockKey) => boolean;
  hide: (key: DashboardBlockKey) => void;
  resize: (key: DashboardBlockKey, size: DashboardBlockSize) => void;
  saveLayout: (layout: DashboardBlockPreference[]) => void;
  hasStore: boolean;
  view: DashboardView;
};

const LayoutContext = createContext<LayoutContextValue | null>(null);

function useDashboardLayout() {
  const value = useContext(LayoutContext);
  if (!value) throw new Error("Dashboard layout is unavailable.");
  return value;
}

export function DashboardLayoutProvider({ view, children }: { view: DashboardView; children: React.ReactNode }) {
  const { data, updateProfile } = useAppStore();
  const [editing, setEditing] = useState(false);
  const hasStore = data.profile.enabledModules.some((module) => module === "products" || module === "sales");
  const layout = data.profile.dashboardLayouts?.[view] ?? DEFAULT_DASHBOARD_LAYOUTS[view];

  useEffect(() => {
    setEditing(false);
  }, [view]);

  function saveLayout(next: DashboardBlockPreference[]) {
    updateProfile({
      dashboardLayouts: {
        ...(data.profile.dashboardLayouts ?? {}),
        [view]: next,
      },
    });
  }

  const value: LayoutContextValue = {
    editing,
    setEditing,
    layout,
    visible: (key) => layout.some((item) => item.key === key),
    hide: (key) => saveLayout(layout.filter((item) => item.key !== key)),
    resize: (key, size) => saveLayout(layout.map((item) => item.key === key ? { ...item, size } : item)),
    saveLayout,
    hasStore,
    view,
  };

  return <LayoutContext.Provider value={value}>{children}</LayoutContext.Provider>;
}

export function DashboardGrid({ children }: { children: React.ReactNode }) {
  const { layout, saveLayout, editing } = useDashboardLayout();
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 140, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function dragEnd(event: DragEndEvent) {
    if (!event.over || event.active.id === event.over.id) return;
    const from = layout.findIndex((item) => item.key === event.active.id);
    const to = layout.findIndex((item) => item.key === event.over?.id);
    if (from >= 0 && to >= 0) saveLayout(arrayMove(layout, from, to));
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={dragEnd}>
      <SortableContext items={layout.map((item) => item.key)} strategy={rectSortingStrategy}>
        <div className={`grid grid-cols-12 gap-4 ${editing ? "rounded-2xl border border-dashed border-primary/30 bg-primary/[0.02] p-2 sm:p-3" : ""}`}>
          {children}
        </div>
      </SortableContext>
    </DndContext>
  );
}

export function DashboardBlock({ id, children }: { id: DashboardBlockKey; children: React.ReactNode }) {
  const { editing, setEditing, layout, hide, resize, view } = useDashboardLayout();
  const router = useRouter();
  const preference = layout.find((item) => item.key === id);
  const order = layout.findIndex((item) => item.key === id);
  const definition = DASHBOARD_BLOCKS.find((item) => item.key === id);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  if (!preference || !definition || !definition.views.includes(view)) return null;

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, order }}
      className={`group/dashboard-block relative min-w-0 ${SIZE_CLASSES[preference.size]} ${isDragging ? "z-40 opacity-80 shadow-2xl" : ""}`}
    >
      {editing && (
        <div className="absolute inset-x-2 top-2 z-30 flex items-center justify-between gap-2 rounded-xl border border-primary/30 bg-background/95 p-1.5 shadow-lg backdrop-blur">
          <button
            type="button"
            className="flex min-w-0 flex-1 touch-none items-center gap-2 rounded-lg px-2 py-1.5 text-left"
            style={{ touchAction: "none" }}
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-4 w-4 shrink-0 text-primary" />
            <span className="truncate text-xs font-semibold">{definition.label}</span>
          </button>
          <select
            aria-label={`Tamanho de ${definition.label}`}
            className="h-8 rounded-md border bg-background px-2 text-xs"
            value={preference.size}
            onChange={(event) => resize(id, event.target.value as DashboardBlockSize)}
          >
            {definition.allowedSizes.map((size) => (
              <option key={size} value={size}>{SIZE_LABELS[size]}</option>
            ))}
          </select>
          <Button variant="ghost" size="icon-sm" aria-label={`Ocultar ${definition.label}`} onClick={() => hide(id)}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}
      {!editing && (
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <button
                type="button"
                className="absolute -right-1 -top-2 z-30 flex size-8 items-center justify-center rounded-full border bg-background text-muted-foreground opacity-100 shadow-sm transition-opacity hover:text-foreground sm:opacity-0 sm:focus:opacity-100 sm:group-hover/dashboard-block:opacity-100"
                aria-label={`Opções de ${definition.label}`}
              />
            }
          >
            <MoreHorizontal className="h-4 w-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            {definition.href && (
              <DropdownMenuItem onClick={() => router.push(definition.href!)}>
                <ExternalLink className="h-4 w-4" />
                Ver detalhes
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={() => setEditing(true)}>
              <Move className="h-4 w-4" />
              Mover ou redimensionar
            </DropdownMenuItem>
            <DropdownMenuItem variant="destructive" onClick={() => hide(id)}>
              <EyeOff className="h-4 w-4" />
              Ocultar do dashboard
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
      <div className={editing ? "pointer-events-none h-full pt-12" : "h-full"}>{children}</div>
    </div>
  );
}

export function DashboardLayoutControls() {
  const { editing, setEditing, layout, saveLayout, hasStore, view } = useDashboardLayout();
  const { data } = useAppStore();
  const [open, setOpen] = useState(false);
  const churnEnabled = data.profile.enabledFeatures?.includes("churn-risk-90d") ?? false;
  const available = DASHBOARD_BLOCKS.filter((block) =>
    block.views.includes(view) &&
    (hasStore || !block.store) &&
    (block.key !== "churn-risk" || churnEnabled)
  );

  function toggle(key: DashboardBlockKey) {
    const exists = layout.some((item) => item.key === key);
    if (exists) {
      saveLayout(layout.filter((item) => item.key !== key));
      return;
    }
    const block = DASHBOARD_BLOCKS.find((item) => item.key === key);
    if (block) saveLayout([...layout, { key, size: block.defaultSize }]);
  }

  function restore() {
    saveLayout(DEFAULT_DASHBOARD_LAYOUTS[view].filter((item) => hasStore || !DASHBOARD_BLOCKS.find((block) => block.key === item.key)?.store));
  }

  return (
    <>
      <Button
        variant={editing ? "default" : "outline"}
        className="min-h-10 gap-2"
        onClick={() => editing ? setEditing(false) : setOpen(true)}
        data-tour="dashboard-customize"
      >
        {editing ? <Check className="h-4 w-4" /> : <LayoutGrid className="h-4 w-4" />}
        <span>{editing ? "Concluir organização" : "Gráficos e cards"}</span>
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <LayoutGrid className="h-5 w-5 text-primary" />
              Gráficos e cards
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Ative o que deseja acompanhar. Ocultar um bloco não apaga nenhum dado.
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {available.map((block) => {
              const active = layout.some((item) => item.key === block.key);
              return (
                <button
                  key={block.key}
                  type="button"
                  onClick={() => toggle(block.key)}
                  className={`flex items-center gap-3 rounded-xl border p-3 text-left transition-colors ${
                    active ? "border-primary/40 bg-primary/5" : "border-border/60 opacity-65"
                  }`}
                >
                  <span className={`flex size-8 shrink-0 items-center justify-center rounded-lg border ${active ? "border-primary bg-primary text-primary-foreground" : "border-border"}`}>
                    {active && <Check className="h-4 w-4" />}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">{block.label}</span>
                    <span className="block truncate text-xs text-muted-foreground">{block.description}</span>
                  </span>
                </button>
              );
            })}
          </div>
          <DialogFooter className="gap-2 sm:justify-between">
            <Button variant="ghost" className="gap-2" onClick={restore}>
              <RotateCcw className="h-4 w-4" />
              Organização recomendada
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>Fechar</Button>
              <Button className="gap-2" onClick={() => { setOpen(false); setEditing(true); }}>
                <Maximize2 className="h-4 w-4" />
                Organizar no dashboard
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
