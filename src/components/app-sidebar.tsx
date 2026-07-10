"use client";

import {
  LayoutDashboard,
  FileText,
  Users,
  Package,
  ShoppingCart,
  Target,
  Calculator,
  FileSpreadsheet,
  Settings,
  Orbit,
  LogOut,
  Moon,
  Sun,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { useAppStore } from "@/components/store-provider";
import { useTheme, ThemeKey } from "@/components/theme-provider";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

const mainNav = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { title: "Contratos", href: "/contracts", icon: FileText },
  { title: "Reunioes", href: "/meetings", icon: Users },
  { title: "Metas", href: "/goals", icon: Target },
];

const operationsNav = [
  { title: "Produtos", href: "/products", icon: Package },
  { title: "Vendas", href: "/sales", icon: ShoppingCart },
];

const toolsNav = [
  { title: "Calculo Mensal", href: "/payroll", icon: Calculator },
  { title: "Exportar Excel", href: "/export", icon: FileSpreadsheet },
  { title: "Configuracoes", href: "/settings", icon: Settings },
];

const THEME_CYCLE: ThemeKey[] = ["dark", "light", "vibrant"];
const THEME_ICONS: Record<ThemeKey, React.ReactNode> = {
  dark: <Moon className="h-4 w-4" />,
  light: <Sun className="h-4 w-4" />,
  vibrant: <Sparkles className="h-4 w-4" />,
};
const THEME_LABELS: Record<ThemeKey, string> = {
  dark: "Dark",
  light: "Light",
  vibrant: "Vibrant",
};

function NavSection({ label, items }: { label: string; items: typeof mainNav }) {
  const pathname = usePathname();

  return (
    <SidebarGroup>
      <SidebarGroupLabel>{label}</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.href}>
              <SidebarMenuButton
                isActive={pathname === item.href}
                render={<Link href={item.href} />}
              >
                <item.icon className="h-4 w-4" />
                <span>{item.title}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

export function AppSidebar() {
  const { logout } = useAppStore();
  const { theme, setTheme } = useTheme();
  const router = useRouter();

  async function handleLogout() {
    await logout();
    router.push("/login");
    router.refresh();
  }

  function cycleTheme() {
    const idx = THEME_CYCLE.indexOf(theme);
    const next = THEME_CYCLE[(idx + 1) % THEME_CYCLE.length];
    setTheme(next);
  }

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border px-4 py-4">
        <Link href="/dashboard" className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
            <Orbit className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight text-foreground">
              OrbiCore
            </h1>
            <p className="text-[11px] text-muted-foreground">
              Gestao inteligente
            </p>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent data-tour="sidebar">
        <NavSection label="Principal" items={mainNav} />
        <NavSection label="Operacoes" items={operationsNav} />
        <NavSection label="Ferramentas" items={toolsNav} />
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-4 space-y-3">
        {/* Theme switcher */}
        <div className="flex rounded-lg border border-border overflow-hidden">
          {THEME_CYCLE.map((t) => (
            <button
              key={t}
              onClick={() => setTheme(t)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-[11px] font-medium transition-colors ${
                theme === t
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
              title={THEME_LABELS[t]}
            >
              {THEME_ICONS[t]}
              <span className="hidden sm:inline">{THEME_LABELS[t]}</span>
            </button>
          ))}
        </div>

        <div className="flex items-center justify-between">
          <p className="text-[11px] text-muted-foreground">
            OrbiCore v0.1.0
          </p>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-destructive"
            onClick={handleLogout}
            title="Sair"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
