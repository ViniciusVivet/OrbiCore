"use client";

import { useState } from "react";
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
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ArrowDown, ArrowUp, Check, GripVertical, Orbit, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAppStore } from "@/components/store-provider";
import { DashboardSectionKey, DashboardWidgetKey } from "@/lib/types";

export const DEFAULT_DASHBOARD_SECTIONS: DashboardSectionKey[] = [
  "business-summary",
  "attention",
  "goals",
  "evolution",
  "store-operation",
  "analysis",
];

export const DEFAULT_STORE_WIDGETS: DashboardWidgetKey[] = [
  "inventory-summary",
  "sales-summary",
  "stock-levels",
  "sales-by-product",
  "recent-movements",
];

const SECTIONS: { key: DashboardSectionKey; label: string; description: string }[] = [
  { key: "business-summary", label: "Saúde do negócio", description: "MRR, contratos, período e projeção" },
  { key: "attention", label: "Atenção necessária", description: "Alertas, retornos e riscos" },
  { key: "goals", label: "Metas do período", description: "Progresso mensal, trimestral e anual" },
  { key: "evolution", label: "Evolução da receita", description: "Gráfico de MRR ao longo do ano" },
  { key: "store-operation", label: "Operação da loja", description: "Estoque, vendas e movimentações" },
  { key: "analysis", label: "Análises detalhadas", description: "Pipeline, concentração e composição da receita" },
];

const STORE_WIDGETS: { key: DashboardWidgetKey; label: string; description: string }[] = [
  { key: "inventory-summary", label: "Resumo do estoque", description: "Valor, produtos e reposição" },
  { key: "sales-summary", label: "Resumo de vendas", description: "Receita, lucro e itens vendidos" },
  { key: "stock-levels", label: "Estoque por produto", description: "Saldo atual e estoque mínimo" },
  { key: "sales-by-product", label: "Vendas por produto", description: "Produtos com maior faturamento" },
  { key: "recent-movements", label: "Movimentações recentes", description: "Entradas, baixas e ajustes" },
];

type OrganizerItem = {
  key: string;
  label: string;
  description: string;
};

export function DashboardOrganizer() {
  const { data, updateProfile } = useAppStore();
  const [open, setOpen] = useState(false);
  const [sections, setSections] = useState<DashboardSectionKey[]>([]);
  const [widgets, setWidgets] = useState<DashboardWidgetKey[]>([]);
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );
  const hasStore = data.profile.enabledModules.some((module) => module === "products" || module === "sales");

  function showOrganizer() {
    setSections(data.profile.dashboardSections ?? DEFAULT_DASHBOARD_SECTIONS);
    setWidgets(data.profile.dashboardWidgets ?? DEFAULT_STORE_WIDGETS);
    setOpen(true);
  }

  function save() {
    updateProfile({ dashboardSections: sections, dashboardWidgets: widgets });
    setOpen(false);
  }

  function reset() {
    setSections([...DEFAULT_DASHBOARD_SECTIONS]);
    setWidgets([...DEFAULT_STORE_WIDGETS]);
  }

  return (
    <>
      <Button
        variant="outline"
        className="min-h-10 gap-2 border-primary/30 bg-primary/5 hover:bg-primary/10"
        onClick={showOrganizer}
        aria-label="Abrir Minha Órbita"
      >
        <Orbit className="h-5 w-5 text-primary" />
        <span className="hidden sm:inline">Minha Órbita</span>
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Orbit className="h-5 w-5 text-primary" />
              Minha Órbita
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Escolha o que importa e organize a ordem. Os controles aparecem somente aqui.
          </p>

          <OrganizerGroup
            title="Áreas do dashboard"
            items={SECTIONS.filter((section) => hasStore || section.key !== "store-operation")}
            selected={sections}
            setSelected={(items) => setSections(items as DashboardSectionKey[])}
            sensors={sensors}
          />

          {hasStore && (
            <OrganizerGroup
              title="Dentro de Operação da loja"
              items={STORE_WIDGETS}
              selected={widgets}
              setSelected={(items) => setWidgets(items as DashboardWidgetKey[])}
              sensors={sensors}
            />
          )}

          <DialogFooter className="gap-2 sm:justify-between">
            <Button variant="ghost" className="gap-2" onClick={reset}>
              <RotateCcw className="h-4 w-4" />
              Restaurar padrão
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button onClick={save}>Salvar organização</Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function OrganizerGroup({
  title,
  items,
  selected,
  setSelected,
  sensors,
}: {
  title: string;
  items: OrganizerItem[];
  selected: string[];
  setSelected: (items: string[]) => void;
  sensors: ReturnType<typeof useSensors>;
}) {
  const ordered = [
    ...selected.flatMap((key) => {
      const item = items.find((candidate) => candidate.key === key);
      return item ? [item] : [];
    }),
    ...items.filter((item) => !selected.includes(item.key)),
  ];

  function toggle(key: string) {
    setSelected(selected.includes(key) ? selected.filter((item) => item !== key) : [...selected, key]);
  }

  function move(key: string, direction: -1 | 1) {
    const index = selected.indexOf(key);
    const next = index + direction;
    if (index < 0 || next < 0 || next >= selected.length) return;
    setSelected(arrayMove(selected, index, next));
  }

  function dragEnd(event: DragEndEvent) {
    if (!event.over || event.active.id === event.over.id) return;
    const from = selected.indexOf(String(event.active.id));
    const to = selected.indexOf(String(event.over.id));
    if (from >= 0 && to >= 0) setSelected(arrayMove(selected, from, to));
  }

  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</h3>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={dragEnd}>
        <SortableContext items={selected} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {ordered.map((item) => {
              const active = selected.includes(item.key);
              const index = selected.indexOf(item.key);
              return (
                <OrganizerRow key={item.key} id={item.key} disabled={!active}>
                  <button
                    type="button"
                    className="min-w-0 flex-1 text-left"
                    onClick={() => toggle(item.key)}
                  >
                    <span className="block truncate text-sm font-medium">{item.label}</span>
                    <span className="block truncate text-xs text-muted-foreground">{item.description}</span>
                  </button>
                  {active && (
                    <div className="flex shrink-0 gap-1">
                      <Button variant="ghost" size="icon-sm" aria-label={`Mover ${item.label} para cima`} disabled={index === 0} onClick={() => move(item.key, -1)}>
                        <ArrowUp className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon-sm" aria-label={`Mover ${item.label} para baixo`} disabled={index === selected.length - 1} onClick={() => move(item.key, 1)}>
                        <ArrowDown className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                  <button
                    type="button"
                    aria-label={active ? `Ocultar ${item.label}` : `Mostrar ${item.label}`}
                    className={`flex size-9 shrink-0 items-center justify-center rounded-lg border transition-colors ${
                      active ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground"
                    }`}
                    onClick={() => toggle(item.key)}
                  >
                    {active && <Check className="h-4 w-4" />}
                  </button>
                </OrganizerRow>
              );
            })}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}

function OrganizerRow({ id, disabled, children }: { id: string; disabled: boolean; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id, disabled });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`flex items-center gap-2 rounded-xl border p-2.5 ${
        disabled ? "border-border/50 opacity-60" : "border-primary/20 bg-primary/[0.03]"
      } ${isDragging ? "z-30 bg-background shadow-xl" : ""}`}
    >
      <button
        type="button"
        className="flex size-10 shrink-0 touch-none items-center justify-center rounded-lg text-muted-foreground"
        style={{ touchAction: "none" }}
        disabled={disabled}
        aria-label="Arrastar para reorganizar"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-5 w-5" />
      </button>
      {children}
    </div>
  );
}
