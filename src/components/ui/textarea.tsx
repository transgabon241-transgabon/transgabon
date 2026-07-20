"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          // Base : Fond gris doux, bordure 2px, coins très arrondis et ombre interne
          "flex min-h-[120px] w-full rounded-2xl border-2 border-slate-100 bg-slate-50/50 px-5 py-4 text-sm font-bold text-slate-900 transition-all shadow-inner outline-none",
          
          // Placeholder : Couleur atténuée et police standard
          "placeholder:text-slate-400 placeholder:font-medium",
          
          // Focus : Passage au blanc pur, bordure verte (primary) et halo de lumière
          "focus-visible:bg-white focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/10 focus-visible:shadow-none",
          
          // État Désactivé
          "disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed disabled:opacity-60",
          
          // État Erreur
          "aria-invalid:border-red-500 aria-invalid:ring-red-100",
          
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Textarea.displayName = "Textarea"

export { Textarea }