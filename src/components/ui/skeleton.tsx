"use client"

import { cn } from "@/lib/utils"

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="skeleton"
      className={cn(
        // Animation de pulsation douce
        "animate-pulse",
        // Coins arrondis généreux pour correspondre aux cartes Premium [2rem]
        "rounded-2xl",
        // Couleur Slate SaaS : Gris très léger et propre
        "bg-slate-100",
        className
      )}
      {...props}
    />
  )
}

export { Skeleton }