import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, FileText } from "lucide-react";

export default function ContractsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Contratos</h2>
          <p className="text-muted-foreground">
            Gerencie seus contratos e receita recorrente
          </p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Novo Contrato
        </Button>
      </div>

      <Card className="border-border/50">
        <CardContent>
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="rounded-full bg-muted p-6 mb-4">
              <FileText className="h-10 w-10 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Nenhum contrato cadastrado</h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              Cadastre seu primeiro contrato para comecar a acompanhar MRR, metas e receita recorrente.
            </p>
            <Button className="mt-6 gap-2">
              <Plus className="h-4 w-4" />
              Cadastrar primeiro contrato
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
