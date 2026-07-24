"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import { X, ChevronRight, Orbit, Handshake, Store, Layers, ArrowRight } from "lucide-react";
import { useAppStore } from "@/components/store-provider";
import { ModuleKey } from "@/lib/types";

interface Step {
  target: string; // CSS selector
  title: string;
  description: string;
  position: "bottom" | "right" | "left" | "top";
  optional?: boolean;
}

type Niche = "services" | "store" | "complete";

const ONBOARDING_KEY = "orbicore_onboarding_done";
const NICHE_KEY = "orbicore_niche_chosen";

const PRESETS: Record<Niche, ModuleKey[]> = {
  services: ["dashboard", "contracts", "meetings", "goals", "payroll", "export"],
  store: ["dashboard", "products", "sales", "goals", "export"],
  complete: ["dashboard", "contracts", "meetings", "goals", "products", "sales", "payroll", "export"],
};

const NICHE_OPTIONS: { key: Niche; icon: React.ReactNode; title: string; description: string }[] = [
  { key: "services", icon: <Handshake className="h-5 w-5" />, title: "Serviços e contratos", description: "Contratos recorrentes, MRR, pipeline e metas" },
  { key: "store", icon: <Store className="h-5 w-5" />, title: "Loja e estoque", description: "Produtos, vendas, lucro e reposição" },
  { key: "complete", icon: <Layers className="h-5 w-5" />, title: "Os dois", description: "Contratos e loja no mesmo painel" },
];

export function Onboarding() {
  const { data, updateProfile } = useAppStore();
  const [phase, setPhase] = useState<"choice" | "tour" | null>(null);
  const [step, setStep] = useState(0);
  const [spotlightRect, setSpotlightRect] = useState<DOMRect | null>(null);
  const retryRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryCountRef = useRef(0);

  const modules = data.profile.enabledModules;
  const financial = modules.some((m) => ["contracts", "meetings", "payroll"].includes(m));
  const store = modules.some((m) => ["products", "sales"].includes(m));

  // Passos do tour, adaptados ao nicho do cliente.
  const steps = useMemo<Step[]>(() => {
    const welcome = financial && store
      ? "Seu painel reúne contratos, loja e metas num lugar só. Bora dar um tour rápido?"
      : store
        ? "Seu painel reúne estoque, vendas e lucro num lugar só. Bora dar um tour rápido?"
        : "Seu painel reúne contratos, MRR e metas num lugar só. Bora dar um tour rápido?";

    const list: Step[] = [
      { target: "[data-tour='welcome']", title: "Bem-vindo ao OrbiCore!", description: welcome, position: "bottom" },
    ];
    if (financial && store) {
      list.push({
        target: "[data-tour='area-tabs']",
        title: "Suas áreas",
        description: "Alterne entre Visão geral, Comercial e Loja aqui. Cada aba mostra o que importa para aquela parte do negócio.",
        position: "bottom",
      });
    }
    list.push({
      target: "[data-tour='filters']",
      title: "Você escolhe o período",
      description: "Filtre por ano, mês ou trimestre — os números e gráficos se atualizam na hora.",
      position: "bottom",
    });
    list.push({
      target: "[data-tour='dashboard-customize']",
      title: "O painel é do seu jeito",
      description: "Escolha quais cards e gráficos aparecem e arraste para organizar. Nada some de verdade — é só a sua visão.",
      position: "bottom",
      optional: true,
    });
    list.push({
      target: "[data-tour='sidebar']",
      title: "Navegue pelos módulos",
      description: "Acesse contratos, reuniões, produtos, vendas, metas e configurações pelo menu.",
      position: "right",
    });
    return list;
  }, [financial, store]);

  // Decide o que mostrar no primeiro acesso.
  useEffect(() => {
    if (localStorage.getItem(ONBOARDING_KEY)) return;
    const chosen = localStorage.getItem(NICHE_KEY);
    const timer = setTimeout(() => setPhase(chosen ? "tour" : "choice"), chosen ? 600 : 350);
    return () => clearTimeout(timer);
  }, []);

  // Trava o scroll enquanto o tutorial está aberto.
  useEffect(() => {
    if (!phase) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previousOverflow; };
  }, [phase]);

  const updateSpotlight = useCallback(() => {
    if (phase !== "tour") return;
    if (retryRef.current) { clearTimeout(retryRef.current); retryRef.current = null; }
    const currentStep = steps[step];
    if (!currentStep) return;

    const isMobile = window.innerWidth < 768;
    const target = isMobile && currentStep.target === "[data-tour='sidebar']"
      ? "[data-tour='mobile-menu']"
      : currentStep.target;
    const el = document.querySelector(target);
    const box = el?.getBoundingClientRect();
    const missing = !el || (box!.width === 0 && box!.height === 0);
    if (missing) {
      // Elemento ainda não pronto (dashboard re-renderizando) — tenta de novo, com limite.
      if (retryCountRef.current < 14) {
        retryCountRef.current += 1;
        retryRef.current = setTimeout(updateSpotlight, 160);
      }
      setSpotlightRect(null);
      return;
    }
    retryCountRef.current = 0;
    if (box!.top < 16 || box!.bottom > window.innerHeight - (isMobile ? 250 : 16)) {
      el!.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    setSpotlightRect(el!.getBoundingClientRect());
  }, [phase, step, steps]);

  useEffect(() => {
    retryCountRef.current = 0;
    updateSpotlight();
    window.addEventListener("resize", updateSpotlight);
    window.addEventListener("scroll", updateSpotlight, true);
    return () => {
      window.removeEventListener("resize", updateSpotlight);
      window.removeEventListener("scroll", updateSpotlight, true);
      if (retryRef.current) clearTimeout(retryRef.current);
    };
  }, [updateSpotlight]);

  function finish() {
    localStorage.setItem(ONBOARDING_KEY, "true");
    setPhase(null);
  }

  function chooseNiche(niche: Niche) {
    updateProfile({ enabledModules: PRESETS[niche] });
    localStorage.setItem(NICHE_KEY, "true");
    setStep(0);
    setPhase("tour");
  }

  function next() {
    if (step < steps.length - 1) {
      let nextStep = step + 1;
      while (nextStep < steps.length - 1 && steps[nextStep].optional && !document.querySelector(steps[nextStep].target)) nextStep++;
      setStep(nextStep);
    } else {
      finish();
    }
  }

  if (!phase) return null;

  // ----- Fase 1: escolha do nicho -----
  if (phase === "choice") {
    return (
      <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/70 p-3 backdrop-blur-sm sm:items-center sm:p-4">
        <div className="flex max-h-[92dvh] w-full max-w-md flex-col overflow-y-auto rounded-2xl border border-border bg-card shadow-2xl">
          <div className="flex items-center gap-3 border-b border-border/60 p-5">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Orbit className="h-6 w-6" />
            </span>
            <div className="min-w-0">
              <h2 className="text-lg font-bold leading-tight">Bem-vindo ao OrbiCore!</h2>
              <p className="text-sm text-muted-foreground">O que você vai gerenciar?</p>
            </div>
          </div>
          <div className="space-y-2 p-4">
            {NICHE_OPTIONS.map((option) => (
              <button
                key={option.key}
                type="button"
                onClick={() => chooseNiche(option.key)}
                className="flex w-full items-center gap-3 rounded-xl border border-border/60 p-4 text-left transition-colors hover:border-primary/50 hover:bg-primary/5 active:translate-y-px"
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  {option.icon}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold">{option.title}</span>
                  <span className="block text-xs text-muted-foreground">{option.description}</span>
                </span>
                <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </button>
            ))}
            <p className="px-1 pt-1 text-center text-xs text-muted-foreground">
              Não se preocupe: dá para mudar tudo depois em Configurações.
            </p>
            <Button variant="ghost" className="min-h-11 w-full" onClick={finish}>
              Pular apresentação
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ----- Fase 2: tour guiado -----
  const currentStep = steps[step];
  const pad = 8;
  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;

  let tooltipStyle: React.CSSProperties = {};
  if (isMobile) {
    tooltipStyle = { left: 12, right: 12, bottom: "max(12px, env(safe-area-inset-bottom))" };
  } else if (spotlightRect) {
    const pos = currentStep.position;
    if (pos === "bottom") {
      tooltipStyle = { top: spotlightRect.bottom + pad + 12, left: Math.max(16, Math.min(spotlightRect.left, window.innerWidth - 340)) };
    } else if (pos === "top") {
      tooltipStyle = { bottom: window.innerHeight - spotlightRect.top + pad + 12, left: Math.max(16, Math.min(spotlightRect.left, window.innerWidth - 340)) };
    } else if (pos === "right") {
      tooltipStyle = { top: spotlightRect.top, left: spotlightRect.right + pad + 12 };
    } else {
      tooltipStyle = { top: spotlightRect.top, right: window.innerWidth - spotlightRect.left + pad + 12 };
    }
  } else {
    tooltipStyle = { top: "50%", left: "50%", transform: "translate(-50%, -50%)" };
  }

  return (
    <div className="fixed inset-0 z-[100]">
      {/* Overlay escuro com recorte de destaque */}
      <div className="absolute inset-0">
        <svg className="h-full w-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <mask id="spotlight-mask">
              <rect width="100%" height="100%" fill="white" />
              {spotlightRect && (
                <rect
                  x={spotlightRect.left - pad}
                  y={spotlightRect.top - pad}
                  width={spotlightRect.width + pad * 2}
                  height={spotlightRect.height + pad * 2}
                  rx="12"
                  fill="black"
                />
              )}
            </mask>
          </defs>
          <rect width="100%" height="100%" fill="rgba(0,0,0,0.75)" mask="url(#spotlight-mask)" />
        </svg>
      </div>

      {/* Brilho da borda do destaque */}
      {spotlightRect && (
        <div
          className="pointer-events-none absolute rounded-xl border-2 border-primary/60"
          style={{
            top: spotlightRect.top - pad,
            left: spotlightRect.left - pad,
            width: spotlightRect.width + pad * 2,
            height: spotlightRect.height + pad * 2,
            boxShadow: "0 0 24px oklch(0.75 0.15 195 / 0.35)",
          }}
        />
      )}

      {/* Card do passo */}
      <div
        className="absolute z-10 w-auto max-w-none rounded-2xl border border-border bg-card p-4 shadow-2xl sm:w-[320px] sm:max-w-[320px] sm:p-5"
        style={tooltipStyle}
      >
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Orbit className="h-4 w-4 text-primary" />
            <span className="text-xs font-medium text-muted-foreground">
              Passo {step + 1} de {steps.length}
            </span>
          </div>
          <button
            onClick={finish}
            aria-label="Sair do tutorial"
            className="-m-2 flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <h3 className="mb-1.5 text-base font-semibold">{currentStep.title}</h3>
        <p className="mb-4 text-sm leading-relaxed text-muted-foreground">{currentStep.description}</p>

        <div className="flex items-center justify-between gap-3">
          {/* Bolinhas de progresso: transparentes, a atual em destaque */}
          <div className="flex items-center gap-1.5">
            {steps.map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Ir para o passo ${i + 1}`}
                onClick={() => setStep(i)}
                className={`h-2 rounded-full transition-all ${
                  i === step ? "w-5 bg-primary" : "w-2 bg-foreground/20 hover:bg-foreground/40"
                }`}
              />
            ))}
          </div>

          <div className="flex shrink-0 gap-1 sm:gap-2">
            <Button variant="ghost" size="sm" onClick={finish} className="h-10 px-2 text-xs sm:h-8">
              Sair
            </Button>
            <Button size="sm" onClick={next} className="h-10 gap-1 px-3 text-xs sm:h-8">
              {step === steps.length - 1 ? "Começar!" : "Próximo"}
              {step < steps.length - 1 && <ChevronRight className="h-3 w-3" />}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
