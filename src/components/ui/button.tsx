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
        default: "bg-primary text-white shadow-xl shadow-primary/20 hover:bg-primary/90 font-black",
        destructive: "bg-red-600 text-white shadow-xl shadow-red-100 hover:bg-red-700 font-black",
        outline: "border-2 border-slate-200 bg-white hover:bg-slate-50 hover:border-primary/30 text-slate-900 font-black shadow-sm",
        secondary: "bg-slate-100 text-slate-900 hover:bg-slate-200 font-bold",
        premium: "bg-slate-900 text-white shadow-2xl shadow-slate-200 hover:bg-black font-black",
        ghost: "hover:bg-primary/5 hover:text-primary font-black text-slate-600",
        link: "text-primary underline-offset-4 hover:underline font-black",
      },
      size: {
        // h-16 (64px) : Le nouveau standard pour votre app
        default: "h-16 px-10 rounded-[1.25rem] text-base",
        // h-12 (48px) pour les petites actions
        sm: "h-12 px-6 rounded-xl text-sm",
        // h-20 (80px) pour les boutons d'action critique (Rechercher, Payer)
        lg: "h-20 px-14 rounded-[2rem] text-lg",
        icon: "h-16 w-16 rounded-[1.25rem]",
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