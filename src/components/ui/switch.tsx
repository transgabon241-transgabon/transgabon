"use client"

import * as React from "react"
import * as SwitchPrimitives from "@radix-ui/react-switch"
import { cn } from "@/lib/utils"

const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitives.Root
    className={cn(
      // Rail du switch : Taille ergonomique, coins arrondis max
      "peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-all outline-none focus-visible:ring-4 focus-visible:ring-primary/10 disabled:cursor-not-allowed disabled:opacity-50",
      // Couleurs SaaS : Gris doux vers Vert Gabon (primary)
      "data-[state=unchecked]:bg-slate-200 data-[state=checked]:bg-primary",
      className
    )}
    {...props}
    ref={ref}
  >
    <SwitchPrimitives.Thumb
      className={cn(
        // Le bouton coulissant : Blanc pur, ombre portée pour l'aspect relief
        "pointer-events-none block h-5 w-5 rounded-full bg-white shadow-md ring-0 transition-transform",
        // Déplacement précis (20px)
        "data-[state=unchecked]:translate-x-0 data-[state=checked]:translate-x-5"
      )}
    />
  </SwitchPrimitives.Root>
))
Switch.displayName = SwitchPrimitives.Root.displayName

export { Switch }