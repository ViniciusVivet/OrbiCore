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

      <SidebarContent>
        <NavSection label="Principal" items={mainNav} />
        <NavSection label="Operacoes" items={operationsNav} />
        <NavSection label="Ferramentas" items={toolsNav} />
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-4">
        <p className="text-[11px] text-muted-foreground">
          OrbiCore v0.1.0
        </p>
      </SidebarFooter>
    </Sidebar>
  );
}
