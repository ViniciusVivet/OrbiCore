import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  TrendingUp,
  FileText,
  Users,
  ShoppingCart,
  Target,
  AlertTriangle,
} from "lucide-react";

const stats = [
  {
    title: "MRR Atual",
    value: "R$ 0,00",
    description: "Receita recorrente mensal",
    icon: TrendingUp,
    color: "text-orbi-cyan",
    bgColor: "bg-orbi-cyan/10",
  },
  {
    title: "Contratos Ativos",
    value: "0",
    description: "Nenhum contrato cadastrado",
    icon: FileText,
    color: "text-orbi-blue",
    bgColor: "bg-orbi-blue/10",
  },
  {
    title: "Reunioes Pendentes",
    value: "0",
    description: "Nenhuma reuniao agendada",
    icon: Users,
    color: "text-orbi-amber",
    bgColor: "bg-orbi-amber/10",
  },
  {
    title: "Vendas do Mes",
    value: "R$ 0,00",
    description: "Nenhuma venda registrada",
    icon: ShoppingCart,
    color: "text-orbi-emerald",
    bgColor: "bg-orbi-emerald/10",
  },
];

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground">
          Visao geral do seu negocio
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title} className="border-border/50">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <div className={`rounded-md p-2 ${stat.bgColor}`}>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {stat.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-orbi-cyan" />
              Metas
            </CardTitle>
            <CardDescription>
              Acompanhe seu progresso
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="rounded-full bg-muted p-4 mb-4">
                <Target className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">
                Configure suas metas para acompanhar o progresso
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orbi-amber" />
              Alertas
            </CardTitle>
            <CardDescription>
              Itens que precisam de atencao
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="rounded-full bg-muted p-4 mb-4">
                <AlertTriangle className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">
                Nenhum alerta no momento. Cadastre dados para receber insights.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
