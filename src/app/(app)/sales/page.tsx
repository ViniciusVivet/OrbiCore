import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, ShoppingCart } from "lucide-react";

export default function SalesPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Vendas</h2>
          <p className="text-muted-foreground">
            Registre vendas e acompanhe receita e lucro
          </p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Nova Venda
        </Button>
      </div>

      <Card className="border-border/50">
        <CardContent>
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="rounded-full bg-muted p-6 mb-4">
              <ShoppingCart className="h-10 w-10 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Nenhuma venda registrada</h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              Registre vendas para acompanhar faturamento, lucro e desempenho por produto.
            </p>
            <Button className="mt-6 gap-2">
              <Plus className="h-4 w-4" />
              Registrar primeira venda
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
