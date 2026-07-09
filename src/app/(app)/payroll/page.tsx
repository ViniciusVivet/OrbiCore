import { Card, CardContent } from "@/components/ui/card";
import { Calculator } from "lucide-react";

export default function PayrollPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Calculo Mensal</h2>
        <p className="text-muted-foreground">
          Simule salario, comissao, DSR e descontos
        </p>
      </div>

      <Card className="border-border/50">
        <CardContent>
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="rounded-full bg-muted p-6 mb-4">
              <Calculator className="h-10 w-10 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Simulador em breve</h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              O simulador de calculo mensal sera implementado nas proximas fases.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
