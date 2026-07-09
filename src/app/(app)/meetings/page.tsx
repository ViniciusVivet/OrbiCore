import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Users } from "lucide-react";

export default function MeetingsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Reunioes</h2>
          <p className="text-muted-foreground">
            Controle reunioes, propostas e pipeline de vendas
          </p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Nova Reuniao
        </Button>
      </div>

      <Card className="border-border/50">
        <CardContent>
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="rounded-full bg-muted p-6 mb-4">
              <Users className="h-10 w-10 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Nenhuma reuniao registrada</h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              Registre reunioes para acompanhar propostas, status e previsao de receita.
            </p>
            <Button className="mt-6 gap-2">
              <Plus className="h-4 w-4" />
              Registrar primeira reuniao
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
