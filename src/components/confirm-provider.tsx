"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type ConfirmOptions = {
  title: string;
  description: string;
  confirmLabel?: string;
  confirmationText?: string;
  destructive?: boolean;
};

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;
const ConfirmContext = createContext<ConfirmFn | null>(null);

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const [typed, setTyped] = useState("");
  const resolver = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback<ConfirmFn>((nextOptions) => {
    resolver.current?.(false);
    setTyped("");
    setOptions(nextOptions);
    return new Promise((resolve) => { resolver.current = resolve; });
  }, []);

  function finish(value: boolean) {
    resolver.current?.(value);
    resolver.current = null;
    setOptions(null);
    setTyped("");
  }

  const allowed = !options?.confirmationText || typed === options.confirmationText;

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Dialog open={Boolean(options)} onOpenChange={(open) => !open && finish(false)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>{options?.title}</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">{options?.description}</p>
          {options?.confirmationText && (
            <div className="space-y-2">
              <Label htmlFor="strong-confirmation">Digite {options.confirmationText} para confirmar</Label>
              <Input id="strong-confirmation" value={typed} onChange={(event) => setTyped(event.target.value.toUpperCase())} autoComplete="off" />
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => finish(false)}>Cancelar</Button>
            <Button variant={options?.destructive === false ? "default" : "destructive"} disabled={!allowed} onClick={() => finish(true)}>{options?.confirmLabel ?? "Confirmar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const context = useContext(ConfirmContext);
  if (!context) throw new Error("useConfirm precisa estar dentro de ConfirmProvider");
  return context;
}
