"use client"

import * as React from "react"
import { Tabs as TabsPrimitive } from "@base-ui/react/tabs"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

function Tabs({
  className,
  orientation = "horizontal",
  ...props
}: TabsPrimitive.Root.Props) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      data-orientation={orientation}
      className={cn(
        "group/tabs flex gap-4 data-[orientation=horizontal]:flex-col",
        className
      )}
      {...props}
    />
  )
}

const tabsListVariants = cva(
  // Rail SaaS : Fond gris très clair, coins arrondis larges, padding pour l'effet "bouton interne"
  "group/tabs-list inline-flex w-fit items-center justify-center rounded-2xl bg-slate-100 p-1.5 text-slate-500 shadow-inner border border-white/50",
  {
    variants: {
      variant: {
        default: "h-14",
        line: "bg-transparent border-b border-slate-100 rounded-none h-auto p-0 gap-8 shadow-none",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function TabsList({
  className,
  variant = "default",
  ...props
}: TabsPrimitive.List.Props & VariantProps<typeof tabsListVariants>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      className={cn(tabsListVariants({ variant }), className)}
      {...props}
    />
  )
}

function TabsTrigger({ className, ...props }: TabsPrimitive.Tab.Props) {
  return (
    <TabsPrimitive.Tab
      data-slot="tabs-trigger"
      className={cn(
        // État Inactif : Typographie forte mais couleur atténuée
        "relative inline-flex flex-1 items-center justify-center gap-2 rounded-xl px-6 py-2 text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all outline-none",
        "hover:text-slate-900 focus-visible:ring-2 focus-visible:ring-primary/20",
        
        // État Actif (data-[state=active]) : Fond blanc, ombre portée, texte noir
        "data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-md data-[state=active]:scale-[1.02]",
        
        // Variante Line (si utilisée)
        "group-data-[variant=line]/tabs-list:rounded-none group-data-[variant=line]/tabs-list:px-0 group-data-[variant=line]/tabs-list:bg-transparent group-data-[variant=line]/tabs-list:data-[state=active]:shadow-none group-data-[variant=line]/tabs-list:data-[state=active]:bg-transparent",
        "group-data-[variant=line]/tabs-list:after:absolute group-data-[variant=line]/tabs-list:after:bottom-0 group-data-[variant=line]/tabs-list:after:h-0.5 group-data-[variant=line]/tabs-list:after:w-full group-data-[variant=line]/tabs-list:after:bg-primary group-data-[variant=line]/tabs-list:after:opacity-0 group-data-[variant=line]/tabs-list:data-[state=active]:after:opacity-100",
        
        className
      )}
      {...props}
    />
  )
}

function TabsContent({ className, ...props }: TabsPrimitive.Panel.Props) {
  return (
    <TabsPrimitive.Panel
      data-slot="tabs-content"
      className={cn(
        "flex-1 text-sm outline-none animate-in fade-in slide-in-from-bottom-2 duration-300", 
        className
      )}
      {...props}
    />
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent, tabsListVariants }