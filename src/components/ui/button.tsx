"use client"

import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  // Base : Flex, centrage, transition fluide, et effet de clic active:scale-95
  "inline-flex items-center justify-center gap-2 whitespace-nowrap transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:pointer-events-none disabled:opacity-50 active:scale-95 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 uppercase tracking-widest",
  {
    variants: {
      variant: {
        // Primaire : Vert Gabon avec ombre portée élégante
        default: 
          "bg-primary text-white shadow-lg shadow-primary/20 hover:bg-primary/90 font-black",
        
        // Destructif : Rouge pour les annulations/suppressions
        destructive: 
          "bg-red-600 text-white shadow-lg shadow-red-100 hover:bg-red-700 font-black",
        
        // Outline : Bordure épaisse (2px) pour un look plus "SaaS"
        outline: 
          "border-2 border-slate-100 bg-white hover:bg-slate-50 hover:border-primary/30 text-slate-600 font-bold shadow-sm",
        
        // Secondaire : Gris ardoise clair
        secondary: 
          "bg-slate-100 text-slate-900 hover:bg-slate-200 font-bold",
        
        // Premium : Noir Ardoise pour les accès Admin ou les sélections VIP
        premium:
          "bg-slate-900 text-white shadow-xl shadow-slate-200 hover:bg-black font-black",
        
        // Ghost : Bouton discret sans fond
        ghost: 
          "hover:bg-primary/5 hover:text-primary font-bold text-slate-500 uppercase",
        
        // Link : Style lien
        link: 
          "text-primary underline-offset-4 hover:underline font-bold",
      },
      size: {
        // Taille par défaut augmentée pour une meilleure ergonomie mobile
        default: "h-11 px-6 py-2 rounded-xl text-[10px]",
        sm: "h-9 px-4 rounded-lg text-[9px]",
        // Taille XL pour les actions majeures (Payer, Rechercher, Valider)
        lg: "h-14 px-10 rounded-2xl text-xs",
        // Icône carrée arrondie
        icon: "h-11 w-11 rounded-xl",
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