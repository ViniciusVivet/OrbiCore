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
import { ModuleKey } from "@/lib/types";

const mainNav = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard, module: "dashboard" as ModuleKey },
  { title: "Contratos", href: "/contracts", icon: FileText, module: "contracts" as ModuleKey },
  { title: "Reuniões", href: "/meetings", icon: Users, module: "meetings" as ModuleKey },
  { title: "Metas", href: "/goals", icon: Target, module: "goals" as ModuleKey },
];

const operationsNav = [
  { title: "Produtos", href: "/products", icon: Package, module: "products" as ModuleKey },
  { title: "Vendas", href: "/sales", icon: ShoppingCart, module: "sales" as ModuleKey },
];

const toolsNav = [
  { title: "Cálculo Mensal", href: "/payroll", icon: Calculator, module: "payroll" as ModuleKey },
  { title: "Exportar Excel", href: "/export", icon: FileSpreadsheet, module: "export" as ModuleKey },
  { title: "Configurações", href: "/settings", icon: Settings },
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

function NavSection({ label, items }: { label: string; items: { title: string; href: string; icon: typeof LayoutDashboard; module?: ModuleKey }[] }) {
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
  const { data, logout } = useAppStore();
  const { theme, setTheme } = useTheme();
  const router = useRouter();

  async function handleLogout() {
    await logout();
    router.push("/login");
    router.refresh();
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
              Gestão inteligente
            </p>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent data-tour="sidebar">
        <NavSection label="Principal" items={mainNav.filter((item) => data.profile.enabledModules.includes(item.module))} />
        <NavSection label="Operações" items={operationsNav.filter((item) => data.profile.enabledModules.includes(item.module))} />
        <NavSection label="Ferramentas" items={toolsNav.filter((item) => !item.module || data.profile.enabledModules.includes(item.module))} />
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
