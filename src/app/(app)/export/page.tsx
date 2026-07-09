import { Card, CardContent } from "@/components/ui/card";
import { FileSpreadsheet } from "lucide-react";

export default function ExportPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Exportar Excel</h2>
        <p className="text-muted-foreground">
          Gere planilhas Excel com seus dados
        </p>
      </div>

      <Card className="border-border/50">
        <CardContent>
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="rounded-full bg-muted p-6 mb-4">
              <FileSpreadsheet className="h-10 w-10 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Exportacao em breve</h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              A exportacao Excel sera implementada nas proximas fases. Cadastre dados primeiro.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
