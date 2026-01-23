import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium transition-all duration-200 backdrop-blur-sm",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground border-transparent",
        secondary: "bg-secondary/80 text-secondary-foreground border-transparent backdrop-blur-md",
        outline: "text-foreground border-border/50 bg-background/50 backdrop-blur-sm",
        success:
          "bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:text-emerald-300 backdrop-blur-md",
        warning:
          "bg-amber-500/10 text-amber-700 border-amber-500/20 dark:text-amber-300 backdrop-blur-md",
        danger: "bg-red-500/10 text-red-700 border-red-500/20 dark:text-red-300 backdrop-blur-md",
      },
    },
    defaultVariants: {
      variant: "secondary",
    },
  }
)

export function Badge({
  className,
  variant,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof badgeVariants>) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

