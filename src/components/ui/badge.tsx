"use client"

import { mergeProps } from "@base-ui/react/merge-props"
import { useRender } from "@base-ui/react/use-render"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  // Base : typographie forte, majuscule, espacement des lettres, coins arrondis
  "group/badge inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-full border px-2.5 py-0.5 text-[9px] font-black uppercase tracking-widest whitespace-nowrap transition-all focus-visible:outline-none [&>svg]:size-3",
  {
    variants: {
      variant: {
        // Variante par défaut (Primaire - Vert Gabon)
        default: 
          "bg-primary/10 text-primary border-primary/20",
        
        // Variante secondaire (Gris élégant)
        secondary:
          "bg-slate-100 text-slate-600 border-slate-200",
        
        // Variante succès (Émeraude - pour "Payé", "Confirmé", "Livré")
        success:
          "bg-emerald-50 text-emerald-700 border-emerald-100",
        
        // Variante alerte (Ambre - pour "En attente", "Escale")
        warning:
          "bg-amber-50 text-amber-700 border-amber-100",
        
        // Variante destructive (Rouge - pour "Annulé", "Remboursé")
        destructive:
          "bg-red-50 text-red-700 border-red-100",
        
        // Variante Premium (Sombre - pour "VIP", "1ère Classe", "Admin")
        premium:
          "bg-slate-900 text-white border-slate-900 shadow-sm",
        
        // Variante outline (Transparent avec bordure)
        outline:
          "border-slate-200 text-slate-500 bg-transparent",
        
        // Variante fantôme (Sans fond)
        ghost:
          "border-transparent text-slate-400 hover:text-primary",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  render,
  ...props
}: useRender.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return useRender({
    defaultTagName: "span",
    props: mergeProps<"span">(
      {
        className: cn(badgeVariants({ variant }), className),
      },
      props
    ),
    render,
    state: {
      slot: "badge",
      variant,
    },
  })
}

export { Badge, badgeVariants }