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
        // h-16 (64px) : Surface de clic maximale
        // text-base (16px) : EMPECHE LE ZOOM AUTOMATIQUE SUR IPHONE
        "flex h-16 w-full min-w-0 rounded-[1.25rem] border-2 border-slate-200 bg-slate-50/50 px-6 py-4 text-base font-bold text-slate-900 transition-all shadow-inner outline-none",
        
        "placeholder:text-slate-400 placeholder:font-medium",
        
        // Focus : Bordure plus épaisse et fond blanc
        "focus-visible:bg-white focus-visible:border-primary focus-visible:ring-8 focus-visible:ring-primary/5 focus-visible:shadow-none",
        
        "disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed disabled:opacity-60",
        "aria-invalid:border-red-500 aria-invalid:ring-red-100",
        
        // Taille du texte pour les fichiers aussi
        "file:border-0 file:bg-transparent file:text-base file:font-black file:text-primary",
        
        className
      )}
      {...props}
    />
  )
}

export { Input }