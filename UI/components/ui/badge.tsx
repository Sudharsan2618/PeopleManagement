import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center justify-center rounded-sm border px-2 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive transition-[color,box-shadow] overflow-hidden',
  {
    variants: {
      variant: {
        default:
          'border-transparent bg-primary text-primary-foreground [a&]:hover:bg-primary/90',
        secondary:
          'border-transparent bg-secondary text-secondary-foreground [a&]:hover:bg-secondary/90',
        destructive:
          'border-transparent bg-destructive text-white [a&]:hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60',
        outline:
          'text-foreground [a&]:hover:bg-accent [a&]:hover:text-accent-foreground',
        blue:
          'border-transparent bg-[#EDF5FF] text-[#0043CE] dark:bg-[#002d9c]/20 dark:text-[#a6c8ff]',
        neutral:
          'border-transparent bg-[#E0E0E0] text-[#161616] dark:bg-[#393939] dark:text-[#f4f4f4]',
        green:
          'border-transparent bg-[#DEFBE6] text-[#0E6027] dark:bg-[#022d0d]/20 dark:text-[#6fdc8c]',
        red:
          'border-transparent bg-[#FFF1F1] text-[#A2191F] dark:bg-[#ffd7d9]/10 dark:text-[#ffb3b8]',
        amber:
          'border-transparent bg-[#FCF4D6] text-[#684E00] dark:bg-[#f1c21b]/10 dark:text-[#f1c21b]',
        purple:
          'border-transparent bg-[#F6F2FF] text-[#6929C4] dark:bg-[#8a3ffc]/10 dark:text-[#d4bbff]',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)

function Badge({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<'span'> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : 'span'

  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
