"use client";

import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { Separator } from "@/components/ui/separator";
import { StoreProvider } from "@/components/store-provider";
import { Onboarding } from "@/components/onboarding";
import { SyncIndicator } from "@/components/sync-indicator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAppStore } from "@/components/store-provider";
import { profileImageUrl, profileInitials } from "@/lib/profile-image";
import Link from "next/link";

function MobileProfile() {
  const { data } = useAppStore();

  return (
    <Link
      href="/settings"
      className="ml-auto flex items-center gap-2 rounded-lg p-1 md:hidden"
      aria-label="Abrir perfil e configurações"
    >
      <span className="max-w-28 truncate text-sm font-medium">
        {data.profile.name || "OrbiCore"}
      </span>
      <Avatar className="size-9 rounded-lg">
        <AvatarImage
          className="rounded-lg object-cover"
          src={profileImageUrl(data.profile.imagePath)}
          alt={data.profile.name || "Imagem do perfil"}
        />
        <AvatarFallback className="rounded-lg bg-primary/10 text-xs font-semibold text-primary">
          {profileInitials(data.profile.name)}
        </AvatarFallback>
      </Avatar>
    </Link>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <StoreProvider>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border px-4">
            <SidebarTrigger className="-ml-1 min-h-10 min-w-10 sm:min-h-8 sm:min-w-8" data-tour="mobile-menu" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <span className="hidden text-sm text-muted-foreground sm:inline">OrbiCore</span>
            <SyncIndicator />
            <MobileProfile />
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
