import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const skeletonVariants = cva(
  "shimmer rounded-xl bg-muted/50 backdrop-blur-sm",
  {
    variants: {
      variant: {
        default: "animate-pulse",
        glass: "bg-white/20 dark:bg-white/5 backdrop-blur-md border border-white/10",
      },
      size: {
        sm: "h-4",
        md: "h-8",
        lg: "h-12",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Skeleton({ 
  className, 
  variant,
  size,
  ...props 
}: React.ComponentProps<"div"> & VariantProps<typeof skeletonVariants>) {
  return (
    <div
      data-slot="skeleton"
      className={cn(skeletonVariants({ variant, size }), className)}
      {...props}
    />
  )
}

export { Skeleton, skeletonVariants }
