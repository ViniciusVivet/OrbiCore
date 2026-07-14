"use client";

import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { Separator } from "@/components/ui/separator";
import { StoreProvider } from "@/components/store-provider";
import { Onboarding } from "@/components/onboarding";
import { SyncIndicator } from "@/components/sync-indicator";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <StoreProvider>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border px-4">
            <SidebarTrigger className="-ml-1 min-h-10 min-w-10 sm:min-h-8 sm:min-w-8" data-tour="mobile-menu" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <span className="text-sm text-muted-foreground">OrbiCore</span>
            <SyncIndicator />
          </header>
          <main className="flex-1 overflow-auto p-3 pb-[max(1rem,env(safe-area-inset-bottom))] sm:p-6">
            {children}
          </main>
        </SidebarInset>
        <Onboarding />
      </SidebarProvider>
    </StoreProvider>
  );
}
