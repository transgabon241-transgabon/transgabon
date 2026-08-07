"use client"

import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-3 whitespace-nowrap transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:pointer-events-none disabled:opacity-50 active:scale-95 [&_svg]:pointer-events-none [&_svg]:size-5 [&_svg]:shrink-0 uppercase tracking-[0.15em]",
  {
    variants: {
      variant: {
        // VERT ÉMÉRAUDE AVEC GLOW (Action principale)
        default: "bg-primary text-white shadow-[0_10px_30px_rgba(16,185,129,0.3)] hover:bg-primary/90 font-black border-none",
        // ROUGE PREMIUM
        destructive: "bg-red-600 text-white shadow-xl shadow-red-900/20 hover:bg-red-700 font-black",
        // EFFET VERRE (Bordure fine)
        outline: "border border-white/10 bg-white/5 hover:bg-white/10 hover:border-primary/50 text-white font-black backdrop-blur-md",
        // NAVY FONCÉ
        secondary: "bg-slate-900 text-slate-200 hover:bg-slate-800 font-bold border border-white/5",
        // VARIANT GRADIENT (Pour les actions critiques comme Payer/Réserver)
        premium: "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-2xl hover:brightness-110 font-black border-none",
        // DISCRET
        ghost: "hover:bg-white/5 text-slate-400 hover:text-primary font-black",
        link: "text-primary underline-offset-4 hover:underline font-black",
      },
      size: {
        default: "h-14 px-10 rounded-2xl text-sm",
        sm: "h-11 px-6 rounded-xl text-xs",
        lg: "h-20 px-14 rounded-3xl text-lg",
        icon: "h-14 w-14 rounded-2xl",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }