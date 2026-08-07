import { Skeleton } from "@/components/ui/skeleton";

export function PageLoading() {
  return (
    <div className="space-y-6" role="status" aria-label="Carregando dados">
      <div className="space-y-2"><Skeleton className="h-8 w-48" /><Skeleton className="h-4 w-72 max-w-full" /></div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{Array.from({ length: 4 }, (_, index) => <Skeleton key={index} className="h-28 rounded-xl" />)}</div>
      <div className="grid gap-6 lg:grid-cols-2"><Skeleton className="h-72 rounded-xl" /><Skeleton className="h-72 rounded-xl" /></div>
      <span className="sr-only">Carregando seus dados do OrbiCore…</span>
    </div>
  );
}
