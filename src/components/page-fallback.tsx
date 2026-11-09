import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

export function PageFallback({ className }: { className?: string }) {
  return (
    <div className={cn("mx-auto w-full max-w-5xl px-6 pt-28 pb-16 sm:px-8", className)}>
      <Skeleton className="h-8 w-48" />
      <Skeleton className="mt-4 h-4 w-full max-w-xl" />
      <div className="mt-10 flex flex-col gap-3">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    </div>
  )
}

export function AdminFallback() {
  return (
    <div className="mx-auto w-full max-w-5xl px-6 pt-16">
      <Skeleton className="h-9 w-40" />
      <Skeleton className="mt-3 h-4 w-64" />
      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
      </div>
    </div>
  )
}
