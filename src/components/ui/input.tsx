"use client"

import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"
import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        // Base : Hauteur confortable, fond gris doux, ombre interne et police grasse
        "flex h-12 w-full min-w-0 rounded-2xl border-2 border-slate-100 bg-slate-50/50 px-5 py-2 text-sm font-bold text-slate-900 transition-all shadow-inner outline-none",
        
        // Placeholder : Gris moyen, police un peu plus légère pour le contraste
        "placeholder:text-slate-400 placeholder:font-medium",
        
        // Focus : Le champ devient blanc pur, la bordure passe au vert (primary) et un halo apparaît
        "focus-visible:bg-white focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/10 focus-visible:shadow-none",
        
        // État Désactivé : Gris sourd, curseur barré
        "disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed disabled:opacity-60",
        
        // État Erreur (Aria-invalid) : Bordure rouge et halo rouge
        "aria-invalid:border-red-500 aria-invalid:ring-red-100",
        
        // Spécifique pour les fichiers (input type file)
        "file:border-0 file:bg-transparent file:text-sm file:font-black file:text-primary",
        
        className
      )}
      {...props}
    />
  )
}

export { Input }