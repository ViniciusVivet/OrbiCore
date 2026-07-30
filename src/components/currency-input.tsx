"use client";

import { useEffect, useId, useState } from "react";
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from "@/components/ui/input-group";
import { cn } from "@/lib/utils";
import { parseBRLInput } from "@/lib/brl-input";

function editableBRL(value: number) {
  return value > 0 ? value.toFixed(2).replace(".", ",") : "";
}

function displayBRL(value: number) {
  return value > 0
    ? new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)
    : "";
}

export function CurrencyInput({
  value,
  onValueChange,
  className,
  hint = "Digite apenas o valor. Ex.: 20 vira R$ 20,00.",
  id,
  disabled,
  required,
  "aria-invalid": ariaInvalid,
}: {
  value: number;
  onValueChange: (value: number) => void;
  className?: string;
  hint?: string | false;
  id?: string;
  disabled?: boolean;
  required?: boolean;
  "aria-invalid"?: boolean;
}) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const hintId = `${inputId}-hint`;
  const [focused, setFocused] = useState(false);
  const [draft, setDraft] = useState(() => displayBRL(value));

  useEffect(() => {
    if (!focused) setDraft(displayBRL(value));
  }, [focused, value]);

  return (
    <div className={cn("space-y-1.5", className)}>
      <InputGroup className="h-10">
        <InputGroupAddon>
          <InputGroupText className="font-semibold text-foreground">R$</InputGroupText>
        </InputGroupAddon>
        <InputGroupInput
          id={inputId}
          inputMode="decimal"
          autoComplete="off"
          placeholder="0,00"
          value={draft}
          disabled={disabled}
          required={required}
          aria-invalid={ariaInvalid}
          aria-describedby={hint ? hintId : undefined}
          onFocus={() => {
            setFocused(true);
            setDraft(editableBRL(value));
          }}
          onChange={(event) => {
            const next = event.target.value;
            setDraft(next);
            onValueChange(parseBRLInput(next));
          }}
          onBlur={() => {
            setFocused(false);
            setDraft(displayBRL(value));
          }}
        />
      </InputGroup>
      {hint && <p id={hintId} className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
