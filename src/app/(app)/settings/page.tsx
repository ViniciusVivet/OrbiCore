"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Settings, Save, RotateCcw, Orbit, Check, Moon, Sun, Sparkles, Palette, GraduationCap, Building2, User, Upload, Trash2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAppStore } from "@/components/store-provider";
import { useTheme, ThemeKey } from "@/components/theme-provider";
import { toast } from "sonner";
import { ModuleKey } from "@/lib/types";
import { profileImageUrl, profileInitials, removeProfileImage, uploadProfileImage } from "@/lib/profile-image";
import { formatFileSize, optimizeImage } from "@/lib/image-optimizer";
import { removeProductImages } from "@/lib/product-images";

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
  { key: "contracts", label: "Contratos e Clientes", description: "Gestão de contratos, clientes e MRR" },
  { key: "meetings", label: "Pipeline Comercial", description: "Oportunidades, reuniões e retornos" },
  { key: "goals", label: "Metas", description: "Definição e acompanhamento de metas" },
  { key: "products", label: "Produtos e Estoque", description: "Catálogo, saldo, reposição e movimentações" },
  { key: "sales", label: "Vendas da Loja", description: "Registro de vendas, receita e lucro" },
  { key: "payroll", label: "Cálculo de Remuneração", description: "Simulação de folha de pagamento" },
  { key: "export", label: "Exportar Dados", description: "Exportação de dados para Excel" },
];

export default function SettingsPage() {
  const { data, loaded, updateProfile, resetData, loadDemoData } = useAppStore();
  const { theme, setTheme } = useTheme();
  const [name, setName] = useState("");
  const [profileType, setProfileType] = useState<"person" | "company">("company");
  const [year, setYear] = useState(2026);
  const [enabledModules, setEnabledModules] = useState<ModuleKey[]>([]);
  const [imageBusy, setImageBusy] = useState(false);
  const [imageStatus, setImageStatus] = useState<{ kind: "working" | "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (loaded) {
      setName(data.profile.name);
      setProfileType(data.profile.profileType ?? "company");
      setYear(data.profile.currentYear);
      setEnabledModules(data.profile.enabledModules);
    }
  }, [loaded, data.profile.name, data.profile.profileType, data.profile.currentYear, data.profile.enabledModules]);

  if (!loaded) return null;

  function toggleModule(key: ModuleKey) {
    // Dashboard is always enabled
    if (key === "dashboard") return;
    setEnabledModules((prev) =>
      prev.includes(key) ? prev.filter((m) => m !== key) : [...prev, key]
    );
  }

  function handleSave() {
    updateProfile({ name, profileType, currentYear: year, enabledModules });
    toast.success("Configurações salvas!");
  }

  async function handleReset() {
    if (confirm("Isso vai apagar TODOS os dados da conta. Tem certeza?")) {
      await removeProfileImage(data.profile.imagePath).catch(() => undefined);
      await removeProductImages(data.products.flatMap((product) => product.imagePaths ?? [])).catch(() => undefined);
      resetData();
      toast.success("Dados apagados!");
    }
  }

  async function handleImageUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setImageBusy(true);
    setImageStatus({ kind: "working", text: "Preparando e reduzindo a foto..." });
    try {
      const optimized = await optimizeImage(file, {
        maxDimension: 1000,
        targetBytes: 220 * 1024,
        maxBytes: 400 * 1024,
      });
      setImageStatus({ kind: "working", text: `Foto reduzida de ${formatFileSize(optimized.originalBytes)} para ${formatFileSize(optimized.optimizedBytes)}. Enviando...` });
      const imagePath = await uploadProfileImage(optimized.file, data.profile.imagePath);
      updateProfile({ imagePath });
      setImageStatus({ kind: "success", text: "Foto atualizada e salva com sucesso. Não é necessário clicar em Salvar." });
      toast.success("Imagem atualizada!");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Falha ao enviar a imagem.";
      setImageStatus({ kind: "error", text: message });
      toast.error(message);
    } finally {
      setImageBusy(false);
    }
  }

  async function handleImageRemove() {
    setImageBusy(true);
    setImageStatus({ kind: "working", text: "Removendo a foto..." });
    try {
      await removeProfileImage(data.profile.imagePath);
      updateProfile({ imagePath: undefined });
      setImageStatus({ kind: "success", text: "Foto removida e alteração salva com sucesso." });
      toast.success("Imagem removida!");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Falha ao remover a imagem.";
      setImageStatus({ kind: "error", text: message });
      toast.error(message);
    } finally {
      setImageBusy(false);
    }
  }

  async function handleLoadDemo() {
    if (confirm("Isso vai substituir TODOS os dados atuais pela demonstração. Continuar?")) {
      await removeProductImages(data.products.flatMap((product) => product.imagePaths ?? [])).catch(() => undefined);
      loadDemoData();
      toast.success("Dados de demonstração carregados!");
    }
  }

  function applyPreset(preset: "services" | "store" | "complete") {
    if (preset === "services") setEnabledModules(["dashboard", "contracts", "meetings", "goals", "payroll", "export"]);
    if (preset === "store") setEnabledModules(["dashboard", "products", "sales", "goals", "export"]);
    if (preset === "complete") setEnabledModules(ALL_MODULES.map((module) => module.key));
  }

  function restartTutorial() {
    localStorage.removeItem("orbicore_onboarding_done");
    window.location.assign("/dashboard");
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
          <div className="flex flex-col gap-4 rounded-xl border border-border/50 p-4 sm:flex-row sm:items-center">
            <Avatar className="size-20 rounded-xl" size="lg">
              <AvatarImage className="rounded-xl" src={profileImageUrl(data.profile.imagePath)} alt={name || "Imagem do perfil"} />
              <AvatarFallback className="rounded-xl text-xl font-semibold">
                {profileInitials(name)}
              </AvatarFallback>
            </Avatar>
            <div className="space-y-2">
              <div>
                <p className="text-sm font-medium">Imagem do perfil</p>
                <p className="text-xs text-muted-foreground">
                  Use sua foto ou o logo da empresa. Nós reduzimos imagens grandes automaticamente.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" size="sm" disabled={imageBusy} render={<label htmlFor="profile-image" />}>
                  <Upload className="h-4 w-4" />
                  {imageBusy ? "Enviando..." : "Enviar imagem"}
                </Button>
                <input id="profile-image" type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={handleImageUpload} />
                {data.profile.imagePath && (
                  <Button type="button" variant="ghost" size="sm" disabled={imageBusy} onClick={handleImageRemove}>
                    <Trash2 className="h-4 w-4" />
                    Remover
                  </Button>
                )}
              </div>
              {imageStatus && (
                <div role="status" className={`rounded-lg border p-3 text-sm ${
                  imageStatus.kind === "success"
                    ? "border-orbi-emerald/40 bg-orbi-emerald/10 text-orbi-emerald"
                    : imageStatus.kind === "error"
                      ? "border-orbi-rose/40 bg-orbi-rose/10 text-orbi-rose"
                      : "border-primary/30 bg-primary/5 text-foreground"
                }`}>
                  {imageStatus.text}
                </div>
              )}
            </div>
          </div>
          <div className="space-y-2">
            <Label>Tipo de perfil</Label>
            <div className="grid grid-cols-2 gap-2">
              <Button type="button" variant={profileType === "person" ? "default" : "outline"} onClick={() => setProfileType("person")}>
                <User className="h-4 w-4" />
                Pessoa
              </Button>
              <Button type="button" variant={profileType === "company" ? "default" : "outline"} onClick={() => setProfileType("company")}>
                <Building2 className="h-4 w-4" />
                Empresa
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{profileType === "company" ? "Nome da empresa" : "Nome"}</Label>
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
          <div className="mb-4 grid grid-cols-3 gap-2" data-tour="module-presets">
            <Button type="button" variant="outline" className="min-h-11 px-2 text-xs sm:text-sm" onClick={() => applyPreset("services")}>Serviços</Button>
            <Button type="button" variant="outline" className="min-h-11 px-2 text-xs sm:text-sm" onClick={() => applyPreset("store")}>Loja</Button>
            <Button type="button" variant="outline" className="min-h-11 px-2 text-xs sm:text-sm" onClick={() => applyPreset("complete")}>Completo</Button>
          </div>
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

      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-orbi-cyan" />
            Tutorial
          </CardTitle>
          <CardDescription>Veja novamente o passo a passo do painel.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" onClick={restartTutorial} className="min-h-11 w-full gap-2 sm:w-auto">
            <GraduationCap className="h-4 w-4" />
            Refazer tutorial
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
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" onClick={handleLoadDemo}>
              Carregar demonstração
            </Button>
          <Button variant="destructive" onClick={handleReset} className="gap-2">
            <RotateCcw className="h-4 w-4" />
            Apagar Todos os Dados
          </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
