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
  rectSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Check, Eye, EyeOff, GripVertical, RotateCcw, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/components/store-provider";
import { CustomizablePageKey } from "@/lib/types";

export type CustomCard = { key: string; label: string; node: React.ReactNode };

export function CustomizableCards({
  pageKey,
  cards,
  className,
}: {
  pageKey: CustomizablePageKey;
  cards: CustomCard[];
  className: string;
}) {
  const { data, updateProfile } = useAppStore();
  const [editing, setEditing] = useState(false);

  const defByKey = new Map(cards.map((card) => [card.key, card]));
  const saved = data.profile.pageLayouts?.[pageKey];
  const savedOrder = (saved?.order ?? []).filter((key) => defByKey.has(key));
  // Cards novos (adicionados no código depois) entram no fim, visíveis.
  const order = [...savedOrder, ...cards.filter((card) => !savedOrder.includes(card.key)).map((card) => card.key)];
  const hidden = new Set((saved?.hidden ?? []).filter((key) => defByKey.has(key)));

  const visibleOrder = order.filter((key) => !hidden.has(key));
  const renderKeys = editing ? order : visibleOrder;
  const hiddenCount = order.length - visibleOrder.length;

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 140, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function persist(nextOrder: string[], nextHidden: Set<string>) {
    updateProfile({
      pageLayouts: {
        ...(data.profile.pageLayouts ?? {}),
        [pageKey]: { order: nextOrder, hidden: [...nextHidden] },
      },
    });
  }

  function toggleHide(key: string) {
    const next = new Set(hidden);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    persist(order, next);
  }

  function restore() {
    persist(cards.map((card) => card.key), new Set());
  }

  function dragEnd(event: DragEndEvent) {
    if (!event.over || event.active.id === event.over.id) return;
    const from = order.indexOf(String(event.active.id));
    const to = order.indexOf(String(event.over.id));
    if (from >= 0 && to >= 0) persist(arrayMove(order, from, to), hidden);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="min-w-0 truncate text-xs text-muted-foreground">
          {editing
            ? "Arraste para reordenar · toque no olho para mostrar/ocultar"
            : hiddenCount > 0
              ? `${hiddenCount} card(s) oculto(s)`
              : ""}
        </p>
        <div className="flex shrink-0 gap-2">
          {editing && (
            <Button variant="ghost" size="sm" className="gap-1.5" onClick={restore}>
              <RotateCcw className="h-4 w-4" />
              Restaurar
            </Button>
          )}
          <Button
            variant={editing ? "default" : "outline"}
            size="sm"
            className="gap-1.5"
            onClick={() => setEditing((value) => !value)}
          >
            {editing ? <Check className="h-4 w-4" /> : <SlidersHorizontal className="h-4 w-4" />}
            {editing ? "Concluir" : "Personalizar"}
          </Button>
        </div>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={dragEnd}>
        <SortableContext items={renderKeys} strategy={rectSortingStrategy}>
          <div className={className}>
            {renderKeys.map((key) => {
              const card = defByKey.get(key)!;
              return (
                <SortableCard
                  key={key}
                  id={key}
                  label={card.label}
                  editing={editing}
                  isHidden={hidden.has(key)}
                  onToggle={() => toggleHide(key)}
                >
                  {card.node}
                </SortableCard>
              );
            })}
          </div>
        </SortableContext>
      </DndContext>

      {editing && (
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[80] flex justify-center px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <Button
            className="pointer-events-auto min-h-12 gap-2 rounded-full px-5 shadow-2xl shadow-primary/25"
            onClick={() => setEditing(false)}
          >
            <Check className="h-4 w-4" />
            Concluir
          </Button>
        </div>
      )}
    </div>
  );
}

function SortableCard({
  id,
  label,
  editing,
  isHidden,
  onToggle,
  children,
}: {
  id: string;
  label: string;
  editing: boolean;
  isHidden: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  if (!editing) {
    return (
      <div ref={setNodeRef} style={style} className="h-full min-w-0">
        {children}
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative h-full min-w-0 rounded-xl ${isDragging ? "z-40 opacity-80 shadow-2xl" : ""} ${isHidden ? "opacity-45" : ""}`}
    >
      <div className="absolute inset-x-1 top-1 z-20 flex items-center justify-between gap-1 rounded-lg border border-primary/30 bg-background/95 p-1 shadow backdrop-blur">
        <button
          type="button"
          className="flex min-w-0 flex-1 touch-none items-center gap-1 rounded px-1.5 py-1 text-left"
          style={{ touchAction: "none" }}
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4 shrink-0 text-primary" />
          <span className="truncate text-[11px] font-semibold">{label}</span>
        </button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={isHidden ? `Mostrar ${label}` : `Ocultar ${label}`}
          onClick={onToggle}
        >
          {isHidden ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
        </Button>
      </div>
      <div className="pointer-events-none h-full pt-11">{children}</div>
    </div>
  );
}
