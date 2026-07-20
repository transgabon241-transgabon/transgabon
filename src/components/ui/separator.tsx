"use client"

import * as React from "react"
import { Separator as SeparatorPrimitive } from "@base-ui/react/separator"
import { cn } from "@/lib/utils"

function Separator({
  className,
  orientation = "horizontal",
  decorative = true,
  ...props
}: SeparatorPrimitive.Props & { decorative?: boolean }) {
  return (
    <SeparatorPrimitive
      data-slot="separator"
      orientation={orientation}
      className={cn(
        // Couleur subtile Slate-100, extrémités arrondies
        "shrink-0 bg-slate-100 rounded-full",
        
        // Style horizontal : 1px de hauteur, pleine largeur
        "data-[orientation=horizontal]:h-px data-[orientation=horizontal]:w-full",
        
        // Style vertical : 1px de largeur, s'étire pour remplir le parent
        "data-[orientation=vertical]:w-px data-[orientation=vertical]:h-full data-[orientation=vertical]:self-stretch",
        
        className
      )}
      {...props}
    />
  )
}

export { Separator }