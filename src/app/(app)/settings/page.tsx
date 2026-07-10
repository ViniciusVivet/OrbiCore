"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Settings, Save, RotateCcw, Orbit } from "lucide-react";
import { useAppStore } from "@/components/store-provider";
import { toast } from "sonner";

export default function SettingsPage() {
  const { data, loaded, updateProfile, resetData } = useAppStore();
  const [name, setName] = useState("");
  const [year, setYear] = useState(2026);

  useEffect(() => {
    if (loaded) {
      setName(data.profile.name);
      setYear(data.profile.currentYear);
    }
  }, [loaded, data.profile.name, data.profile.currentYear]);

  if (!loaded) return null;

  function handleSave() {
    updateProfile({ name, currentYear: year });
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
          <div className="grid grid-cols-2 gap-4">
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
            Modulos Ativos
          </CardTitle>
          <CardDescription>Modulos habilitados no seu perfil</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {data.profile.enabledModules.map((mod) => (
              <div key={mod} className="rounded-lg bg-orbi-cyan/10 border border-orbi-cyan/20 px-4 py-3 text-center">
                <p className="text-sm font-medium capitalize">{mod}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            A configuracao de modulos sera expandida nas proximas versoes.
          </p>
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
            Resetar todos os dados para o estado inicial (dados de exemplo do Vagner).
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
