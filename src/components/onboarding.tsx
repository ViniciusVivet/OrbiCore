"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { X, ChevronRight, Orbit } from "lucide-react";

interface Step {
  target: string; // CSS selector
  title: string;
  description: string;
  position: "bottom" | "right" | "left" | "top";
}

const STEPS: Step[] = [
  {
    target: "[data-tour='welcome']",
    title: "Bem-vindo ao OrbiCore!",
    description: "Seu painel de gestão inteligente. Vamos fazer um tour rápido para você entender como tudo funciona.",
    position: "bottom",
  },
  {
    target: "[data-tour='sidebar']",
    title: "Menu de navegação",
    description: "Use o menu lateral para acessar cada módulo: contratos, reuniões, produtos, vendas, metas e mais.",
    position: "right",
  },
  {
    target: "[data-tour='filters']",
    title: "Filtros do dashboard",
    description: "Filtre os dados por ano, mês ou trimestre. Tudo se atualiza em tempo real conforme você muda.",
    position: "bottom",
  },
  {
    target: "[data-tour='kpi-cards']",
    title: "Cards interativos",
    description: "Cada card mostra uma métrica importante e é clicável — leva direto para a página com mais detalhes.",
    position: "bottom",
  },
  {
    target: "[data-tour='goal-bar']",
    title: "Acompanhe suas metas",
    description: "Veja o progresso das metas e clique nos períodos para navegar entre ano, trimestre e mês.",
    position: "top",
  },
];

const ONBOARDING_KEY = "orbicore_onboarding_done";

export function Onboarding() {
  const [active, setActive] = useState(false);
  const [step, setStep] = useState(0);
  const [spotlightRect, setSpotlightRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    const done = localStorage.getItem(ONBOARDING_KEY);
    if (!done) {
      // Small delay to let the page render
      const timer = setTimeout(() => setActive(true), 800);
      return () => clearTimeout(timer);
    }
  }, []);

  const updateSpotlight = useCallback(() => {
    if (!active) return;
    const currentStep = STEPS[step];
    if (!currentStep) return;

    const el = document.querySelector(currentStep.target);
    if (el) {
      const rect = el.getBoundingClientRect();
      setSpotlightRect(rect);
    } else {
      setSpotlightRect(null);
    }
  }, [active, step]);

  useEffect(() => {
    updateSpotlight();
    window.addEventListener("resize", updateSpotlight);
    return () => window.removeEventListener("resize", updateSpotlight);
  }, [updateSpotlight]);

  function finish() {
    localStorage.setItem(ONBOARDING_KEY, "true");
    setActive(false);
  }

  function next() {
    if (step < STEPS.length - 1) {
      setStep(step + 1);
    } else {
      finish();
    }
  }

  function skip() {
    finish();
  }

  if (!active) return null;

  const currentStep = STEPS[step];
  const pad = 8;

  // Tooltip position
  let tooltipStyle: React.CSSProperties = {};
  if (spotlightRect) {
    const pos = currentStep.position;
    if (pos === "bottom") {
      tooltipStyle = {
        top: spotlightRect.bottom + pad + 12,
        left: Math.max(16, Math.min(spotlightRect.left, window.innerWidth - 340)),
      };
    } else if (pos === "top") {
      tooltipStyle = {
        bottom: window.innerHeight - spotlightRect.top + pad + 12,
        left: Math.max(16, Math.min(spotlightRect.left, window.innerWidth - 340)),
      };
    } else if (pos === "right") {
      tooltipStyle = {
        top: spotlightRect.top,
        left: spotlightRect.right + pad + 12,
      };
    } else {
      tooltipStyle = {
        top: spotlightRect.top,
        right: window.innerWidth - spotlightRect.left + pad + 12,
      };
    }
  } else {
    // Center fallback
    tooltipStyle = {
      top: "50%",
      left: "50%",
      transform: "translate(-50%, -50%)",
    };
  }

  return (
    <div className="fixed inset-0 z-[100]">
      {/* Dark overlay with spotlight cutout */}
      <div className="absolute inset-0">
        <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
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
          <rect
            width="100%"
            height="100%"
            fill="rgba(0,0,0,0.75)"
            mask="url(#spotlight-mask)"
          />
        </svg>
      </div>

      {/* Spotlight border glow */}
      {spotlightRect && (
        <div
          className="absolute border-2 border-primary/60 rounded-xl pointer-events-none"
          style={{
            top: spotlightRect.top - pad,
            left: spotlightRect.left - pad,
            width: spotlightRect.width + pad * 2,
            height: spotlightRect.height + pad * 2,
            boxShadow: "0 0 20px oklch(0.75 0.15 195 / 0.3)",
          }}
        />
      )}

      {/* Tooltip card */}
      <div
        className="absolute z-10 w-[320px] rounded-xl border border-border bg-card p-5 shadow-2xl"
        style={tooltipStyle}
      >
        {/* Step indicator */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Orbit className="h-4 w-4 text-primary" />
            <span className="text-xs text-muted-foreground font-medium">
              {step + 1} de {STEPS.length}
            </span>
          </div>
          <button onClick={skip} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <h3 className="text-base font-semibold mb-1.5">{currentStep.title}</h3>
        <p className="text-sm text-muted-foreground leading-relaxed mb-4">{currentStep.description}</p>

        {/* Progress dots */}
        <div className="flex items-center justify-between">
          <div className="flex gap-1.5">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all ${
                  i === step ? "w-6 bg-primary" : i < step ? "w-1.5 bg-primary/50" : "w-1.5 bg-muted"
                }`}
              />
            ))}
          </div>

          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={skip} className="text-xs h-8">
              Pular
            </Button>
            <Button size="sm" onClick={next} className="text-xs h-8 gap-1">
              {step === STEPS.length - 1 ? "Começar!" : "Próximo"}
              {step < STEPS.length - 1 && <ChevronRight className="h-3 w-3" />}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
