import { cn } from "@/lib/utils"

interface FieldErrorProps {
  id?: string
  message?: string
  className?: string
}

/** Inline field error message shown under invalid inputs */
export function FieldError({ id, message, className }: FieldErrorProps) {
  if (!message) return null

  return (
    <p
      id={id}
      role="alert"
      className={cn("text-sm font-medium text-destructive", className)}
    >
      {message}
    </p>
  )
}

/** Shared input classes when a field has an error (backup if aria-invalid is omitted) */
export function errorInputClass(hasError: boolean): string {
  return hasError
    ? "border-destructive ring-1 ring-destructive/30 focus-visible:border-destructive focus-visible:ring-destructive/30"
    : ""
}
