import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Target } from "lucide-react";

export default function GoalsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Metas</h2>
          <p className="text-muted-foreground">
            Defina e acompanhe metas mensais, trimestrais e anuais
          </p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Nova Meta
        </Button>
      </div>

      <Card className="border-border/50">
        <CardContent>
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="rounded-full bg-muted p-6 mb-4">
              <Target className="h-10 w-10 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Nenhuma meta definida</h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              Defina metas para visualizar seu progresso e saber quanto falta para bater.
            </p>
            <Button className="mt-6 gap-2">
              <Plus className="h-4 w-4" />
              Definir primeira meta
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
