"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

function Label({ className, ...props }: React.ComponentProps<"label">) {
  return (
    <label
      data-slot="label"
      // Remplace la ligne de classe par celle-ci :
      className={cn(
        // On passe de slate-500 à slate-800 pour un contraste maximal
        "flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.12em] text-slate-800 select-none leading-none",
        "group-data-[disabled=true]:opacity-50 peer-disabled:opacity-50 ml-1",
        className
      )}
      {...props}
    />
  )
}

export { Label }