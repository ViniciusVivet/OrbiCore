import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Settings } from "lucide-react";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Configuracoes</h2>
        <p className="text-muted-foreground">
          Gerencie sua conta e modulos ativos
        </p>
      </div>

      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-orbi-cyan" />
            Geral
          </CardTitle>
          <CardDescription>
            Configuracoes da sua organizacao
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            As configuracoes serao implementadas junto com a autenticacao e multi-tenancy.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
