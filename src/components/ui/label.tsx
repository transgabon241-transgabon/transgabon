"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

function Label({ className, ...props }: React.ComponentProps<"label">) {
  return (
    <label
      data-slot="label"
      className={cn(
        // Agrandi à text-xs (12px) pour une lisibilité sans effort
        // Ajout d'une marge basse (mb-2) pour ne pas coller à l'input
        "flex items-center gap-2 text-xs font-black uppercase tracking-[0.15em] text-slate-900 select-none leading-none mb-2 ml-1 opacity-80",
        "group-data-[disabled=true]:opacity-50 peer-disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
}

export { Label }