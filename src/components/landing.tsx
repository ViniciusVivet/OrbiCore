import Link from "next/link";
import {
  Orbit, FileText, Users, Package, ShoppingCart, Calculator, Target,
  ArrowRight, Smartphone, LayoutGrid, ShieldCheck, Sparkles, Check,
} from "lucide-react";

const FEATURES = [
  { icon: FileText, title: "Contratos e MRR", text: "Receita recorrente calculada sozinha — MRR por ano, trimestre e projeção pro próximo ano." },
  { icon: Users, title: "Pipeline comercial", text: "Funil de reuniões, performance por canal, taxa de conversão e alertas de retorno." },
  { icon: Package, title: "Loja e estoque", text: "Produtos, saldo, custo, margem e alertas de reposição num piscar de olhos." },
  { icon: ShoppingCart, title: "Vendas", text: "Lance vendas vinculadas aos produtos e veja lucro e margem na hora." },
  { icon: Calculator, title: "Folha e remuneração", text: "Salário com INSS e IRRF progressivos, DSR sobre comissão e home office." },
  { icon: Target, title: "Metas e exportação", text: "Metas mensais e trimestrais, com exportação completa pra Excel quando precisar." },
];

const BENEFITS = [
  { icon: LayoutGrid, title: "Visual e simples", text: "Sem planilha travada. Tudo em cards e gráficos que qualquer pessoa da equipe entende." },
  { icon: Smartphone, title: "Funciona em qualquer tela", text: "Instale no celular ou no computador. Mobile-first de verdade, não versão espremida." },
  { icon: Sparkles, title: "Do seu jeito", text: "Escolha módulos, arraste os cards, troque o tema e até coloque papel de parede." },
  { icon: ShieldCheck, title: "Seus dados seguros", text: "Cada conta isolada e sincronizada na nuvem, com cache local pra abrir rápido." },
];

const AUDIENCE = [
  "Prestadores de serviço com contratos recorrentes",
  "Lojas e comércios que controlam estoque e vendas",
  "Quem cansou de planilha e quer algo visual",
];

export function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2.5">
            <span className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Orbit className="h-5 w-5" />
            </span>
            <span className="text-lg font-bold tracking-tight">OrbiCore</span>
          </div>
          <Link
            href="/login"
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium transition-colors hover:bg-muted"
          >
            Entrar
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{ background: "radial-gradient(80% 60% at 50% -10%, color-mix(in oklab, var(--orbi-cyan) 16%, transparent), transparent 65%)" }}
        />
        <div className="relative mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-2 lg:items-center lg:gap-8">
          <div className="orbi-fade-up text-center lg:text-left">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
              <Sparkles className="h-3.5 w-3.5" />
              Gestão visual para pequenos negócios
            </span>
            <h1 className="mt-5 text-balance text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
              Sua operação inteira <span className="text-primary">em órbita</span>
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg lg:mx-0">
              Contratos, receita recorrente, estoque, vendas, folha e metas — num painel único,
              bonito e fácil de usar. Troque a planilha por algo que dá gosto de abrir.
            </p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row lg:justify-start">
              <Link
                href="/login?criar=1"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-transform hover:-translate-y-0.5"
              >
                Começar grátis
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/login"
                className="inline-flex min-h-12 items-center justify-center rounded-xl border border-border px-6 text-sm font-semibold transition-colors hover:bg-muted"
              >
                Já tenho conta
              </Link>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              Grátis para começar · Sem cartão · Instala no celular
            </p>
          </div>

          {/* Orbit visual */}
          <div className="orbi-fade-up flex items-center justify-center" style={{ animationDelay: "0.12s" }}>
            <div className="orbi-scene aspect-square w-full max-w-[380px]">
              <div className="orbi-ring orbi-ring-1" />
              <div className="orbi-ring orbi-ring-2" />
              <div className="orbi-ring orbi-ring-3" />
              <div className="orbi-core flex size-24 items-center justify-center rounded-3xl border border-primary/30 bg-card shadow-2xl sm:size-28">
                <Orbit className="h-12 w-12 text-primary sm:h-14 sm:w-14" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-balance text-2xl font-bold tracking-tight sm:text-3xl">
            Tudo o que o seu negócio precisa, num lugar só
          </h2>
          <p className="mt-3 text-muted-foreground">
            Ative apenas os módulos que fazem sentido pra você. O painel se adapta ao seu tipo de negócio.
          </p>
        </div>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature) => (
            <div key={feature.title} className="rounded-2xl border border-border/60 bg-card p-5 transition-colors hover:border-primary/40">
              <span className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <feature.icon className="h-5 w-5" />
              </span>
              <h3 className="mt-4 text-base font-semibold">{feature.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{feature.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Benefits */}
      <section className="border-y border-border/60 bg-muted/30">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {BENEFITS.map((benefit) => (
              <div key={benefit.title}>
                <span className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <benefit.icon className="h-5 w-5" />
                </span>
                <h3 className="mt-4 text-base font-semibold">{benefit.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{benefit.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Audience */}
      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
        <div className="grid gap-8 lg:grid-cols-2 lg:items-center">
          <div>
            <h2 className="text-balance text-2xl font-bold tracking-tight sm:text-3xl">Feito para quem toca o negócio no dia a dia</h2>
            <p className="mt-3 text-muted-foreground">
              Do consultor com contratos mensais à loja de bairro que controla estoque na mão. O OrbiCore
              se molda ao seu jeito de trabalhar.
            </p>
          </div>
          <ul className="space-y-3">
            {AUDIENCE.map((item) => (
              <li key={item} className="flex items-center gap-3 rounded-xl border border-border/60 bg-card p-4">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-orbi-emerald/15 text-orbi-emerald">
                  <Check className="h-4 w-4" />
                </span>
                <span className="text-sm font-medium">{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Final CTA */}
      <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
        <div className="relative overflow-hidden rounded-3xl border border-primary/25 bg-card p-8 text-center sm:p-14">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{ background: "radial-gradient(70% 80% at 50% 0%, color-mix(in oklab, var(--orbi-cyan) 14%, transparent), transparent 60%)" }}
          />
          <div className="relative">
            <h2 className="text-balance text-2xl font-bold tracking-tight sm:text-3xl">Pronto para tirar o negócio do papel?</h2>
            <p className="mx-auto mt-3 max-w-lg text-muted-foreground">
              Crie sua conta em segundos e monte seu painel do jeito que você trabalha.
            </p>
            <Link
              href="/login?criar=1"
              className="mt-7 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-primary px-7 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-transform hover:-translate-y-0.5"
            >
              Criar conta grátis
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/60">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:px-6">
          <div className="flex items-center gap-2">
            <Orbit className="h-4 w-4 text-primary" />
            <span className="font-semibold text-foreground">OrbiCore</span>
            <span>por Orbitamos</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login" className="transition-colors hover:text-foreground">Entrar</Link>
            <span>© {new Date().getFullYear()}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
