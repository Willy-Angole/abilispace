import Image from "next/image"
import { cn } from "@/lib/utils"

/** Wordmark plus the red mark from the homepage, for shared surfaces. */
export function BrandMark({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-col items-center gap-3", className)}>
      <Image
        src="/new-logo.png"
        alt="Abilispace"
        width={140}
        height={36}
        className="h-8 w-auto"
      />
      <span className="h-1 w-10 bg-[var(--as-red)]" aria-hidden="true" />
    </div>
  )
}
