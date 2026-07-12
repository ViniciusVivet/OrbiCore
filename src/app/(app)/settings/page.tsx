"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Settings, Save, RotateCcw, Orbit, Check, Moon, Sun, Sparkles, Palette } from "lucide-react";
import { useAppStore } from "@/components/store-provider";
import { useTheme, ThemeKey } from "@/components/theme-provider";
import { toast } from "sonner";
import { ModuleKey } from "@/lib/types";

const THEMES: { key: ThemeKey; label: string; description: string; icon: React.ReactNode; preview: string[] }[] = [
  {
    key: "dark",
    label: "Dark",
    description: "Tema escuro original — clean e profissional",
    icon: <Moon className="h-5 w-5" />,
    preview: ["oklch(0.13 0.005 260)", "oklch(0.18 0.005 260)", "oklch(0.75 0.15 195)"],
  },
  {
    key: "light",
    label: "Light",
    description: "Tema claro — leve e minimalista",
    icon: <Sun className="h-5 w-5" />,
    preview: ["oklch(0.98 0.002 260)", "oklch(1 0 0)", "oklch(0.55 0.18 230)"],
  },
  {
    key: "vibrant",
    label: "Vibrant",
    description: "Tema neon — cores vibrantes e marcantes",
    icon: <Sparkles className="h-5 w-5" />,
    preview: ["oklch(0.1 0.02 280)", "oklch(0.15 0.025 280)", "oklch(0.75 0.25 310)"],
  },
];

const ALL_MODULES: { key: ModuleKey; label: string; description: string }[] = [
  { key: "dashboard", label: "Dashboard", description: "Painel principal com métricas e gráficos" },
  { key: "contracts", label: "Contratos", description: "Gestão de contratos e MRR" },
  { key: "meetings", label: "Reuniões", description: "Pipeline de vendas e reuniões" },
  { key: "goals", label: "Metas", description: "Definição e acompanhamento de metas" },
  { key: "products", label: "Produtos", description: "Catálogo e controle de estoque" },
  { key: "sales", label: "Vendas", description: "Lançamento de vendas" },
  { key: "payroll", label: "Cálculo Mensal", description: "Simulação de folha de pagamento" },
  { key: "export", label: "Exportar", description: "Exportação de dados para Excel" },
];

export default function SettingsPage() {
  const { data, loaded, updateProfile, resetData } = useAppStore();
  const { theme, setTheme } = useTheme();
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
    toast.success("Configurações salvas!");
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
        <h2 className="text-2xl font-bold tracking-tight">Configurações</h2>
        <p className="text-muted-foreground">Gerencie seu perfil e preferências</p>
      </div>

      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Orbit className="h-5 w-5 text-orbi-cyan" />
            Perfil
          </CardTitle>
          <CardDescription>Informações básicas do seu workspace</CardDescription>
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
            <Palette className="h-5 w-5 text-primary" />
            Tema
          </CardTitle>
          <CardDescription>Escolha a aparência do seu painel</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {THEMES.map((t) => (
              <button
                key={t.key}
                onClick={() => setTheme(t.key)}
                className={`relative flex flex-col items-center gap-3 rounded-xl border-2 p-4 transition-all ${
                  theme === t.key
                    ? "border-primary bg-primary/5 shadow-md shadow-primary/10"
                    : "border-border/50 hover:border-primary/30"
                }`}
              >
                {theme === t.key && (
                  <div className="absolute top-2 right-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary">
                    <Check className="h-3 w-3 text-primary-foreground" />
                  </div>
                )}
                {/* Preview */}
                <div className="flex gap-1.5">
                  {t.preview.map((color, i) => (
                    <div
                      key={i}
                      className="h-8 w-8 rounded-lg border border-black/10"
                      style={{ background: color }}
                    />
                  ))}
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1.5 mb-0.5">
                    {t.icon}
                    <span className="text-sm font-medium">{t.label}</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">{t.description}</p>
                </div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-muted-foreground" />
            Modulos
          </CardTitle>
          <CardDescription>Ative ou desative módulos do seu painel</CardDescription>
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
            Salvar módulos
          </Button>
        </CardContent>
      </Card>

      <Card className="border-border/50 border-orbi-rose/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-orbi-rose">
            <RotateCcw className="h-5 w-5" />
            Zona de Perigo
          </CardTitle>
          <CardDescription>Ações irreversíveis</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Resetar todos os dados para o estado inicial. Essa ação não pode ser desfeita.
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
