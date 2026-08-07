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
        // Fond ultra-sombre pour le contraste
        "flex h-14 w-full min-w-0 rounded-2xl border border-white/10 bg-slate-950 px-6 py-4 text-base font-bold text-white transition-all shadow-inner outline-none",
        
        // Placeholder gris ardoise
        "placeholder:text-slate-600 placeholder:font-medium",
        
        // Focus : Lueur émeraude sur la bordure
        "focus-visible:bg-slate-900 focus-visible:border-primary/50 focus-visible:ring-4 focus-visible:ring-primary/10",
        
        // États désactivés ou invalides
        "disabled:bg-slate-900 disabled:text-slate-600 disabled:cursor-not-allowed",
        "aria-invalid:border-red-500 aria-invalid:ring-red-500/20",
        
        // Style pour l'upload de fichiers
        "file:border-0 file:bg-transparent file:text-sm file:font-black file:text-primary",
        
        className
      )}
      {...props}
    />
  )
}

export { Input }