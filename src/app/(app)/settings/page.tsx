"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Settings, Save, RotateCcw, Orbit, Check } from "lucide-react";
import { useAppStore } from "@/components/store-provider";
import { toast } from "sonner";
import { ModuleKey } from "@/lib/types";

const ALL_MODULES: { key: ModuleKey; label: string; description: string }[] = [
  { key: "dashboard", label: "Dashboard", description: "Painel principal com metricas e graficos" },
  { key: "contracts", label: "Contratos", description: "Gestao de contratos e MRR" },
  { key: "meetings", label: "Reunioes", description: "Pipeline de vendas e reunioes" },
  { key: "goals", label: "Metas", description: "Definicao e acompanhamento de metas" },
  { key: "products", label: "Produtos", description: "Catalogo e controle de estoque" },
  { key: "sales", label: "Vendas", description: "Lancamento de vendas" },
  { key: "payroll", label: "Calculo Mensal", description: "Simulacao de folha de pagamento" },
  { key: "export", label: "Exportar", description: "Exportacao de dados para Excel" },
];

export default function SettingsPage() {
  const { data, loaded, updateProfile, resetData } = useAppStore();
  const [name, setName] = useState("");
  const [year, setYear] = useState(2026);
  const [enabledModules, setEnabledModules] = useState<ModuleKey[]>([]);

  useEffect(() => {
    if (loaded) {
      setName(data.profile.name);
      setYear(data.profile.currentYear);
      setEnabledModules(data.profile.enabledModules);
    }
  }, [loaded, data.profile.name, data.profile.currentYear, data.profile.enabledModules]);

  if (!loaded) return null;

  function toggleModule(key: ModuleKey) {
    // Dashboard is always enabled
    if (key === "dashboard") return;
    setEnabledModules((prev) =>
      prev.includes(key) ? prev.filter((m) => m !== key) : [...prev, key]
    );
  }

  function handleSave() {
    updateProfile({ name, currentYear: year, enabledModules });
    toast.success("Configuracoes salvas!");
  }

  function handleReset() {
    if (confirm("Isso vai resetar TODOS os dados para os valores iniciais. Tem certeza?")) {
      resetData();
      toast.success("Dados resetados!");
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Configuracoes</h2>
        <p className="text-muted-foreground">Gerencie seu perfil e preferencias</p>
      </div>

      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Orbit className="h-5 w-5 text-orbi-cyan" />
            Perfil
          </CardTitle>
          <CardDescription>Informacoes basicas do seu workspace</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Ano Fiscal</Label>
              <Input type="number" value={year} onChange={(e) => setYear(parseInt(e.target.value) || 2026)} />
            </div>
          </div>
          <Button onClick={handleSave} className="gap-2">
            <Save className="h-4 w-4" />
            Salvar
          </Button>
        </CardContent>
      </Card>

      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-muted-foreground" />
            Modulos
          </CardTitle>
          <CardDescription>Ative ou desative modulos do seu painel</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {ALL_MODULES.map((mod) => {
              const isEnabled = enabledModules.includes(mod.key);
              const isDashboard = mod.key === "dashboard";
              return (
                <button
                  key={mod.key}
                  onClick={() => toggleModule(mod.key)}
                  disabled={isDashboard}
                  className={`flex items-start gap-3 rounded-lg border p-4 text-left transition-all ${
                    isEnabled
                      ? "border-primary/40 bg-primary/5"
                      : "border-border/50 opacity-60 hover:opacity-80"
                  } ${isDashboard ? "cursor-default" : "cursor-pointer hover:border-primary/30"}`}
                >
                  <div className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors ${
                    isEnabled ? "bg-primary border-primary" : "border-muted-foreground/30"
                  }`}>
                    {isEnabled && <Check className="h-3 w-3 text-primary-foreground" />}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{mod.label}</p>
                    <p className="text-xs text-muted-foreground">{mod.description}</p>
                  </div>
                </button>
              );
            })}
          </div>
          <Button onClick={handleSave} className="gap-2 mt-4">
            <Save className="h-4 w-4" />
            Salvar modulos
          </Button>
        </CardContent>
      </Card>

      <Card className="border-border/50 border-orbi-rose/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-orbi-rose">
            <RotateCcw className="h-5 w-5" />
            Zona de Perigo
          </CardTitle>
          <CardDescription>Acoes irreversiveis</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Resetar todos os dados para o estado inicial. Essa acao nao pode ser desfeita.
          </p>
          <Button variant="destructive" onClick={handleReset} className="gap-2">
            <RotateCcw className="h-4 w-4" />
            Resetar Todos os Dados
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
