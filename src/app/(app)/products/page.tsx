import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Package } from "lucide-react";

export default function ProductsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Produtos</h2>
          <p className="text-muted-foreground">
            Catalogo de produtos com custo, preco e margem
          </p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Novo Produto
        </Button>
      </div>

      <Card className="border-border/50">
        <CardContent>
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="rounded-full bg-muted p-6 mb-4">
              <Package className="h-10 w-10 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Nenhum produto cadastrado</h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              Cadastre produtos para controlar estoque, vendas e margem de lucro.
            </p>
            <Button className="mt-6 gap-2">
              <Plus className="h-4 w-4" />
              Cadastrar primeiro produto
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
