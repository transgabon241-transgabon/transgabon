"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

function Card({
  className,
  size = "default",
  ...props
}: React.ComponentProps<"div"> & { size?: "default" | "sm" }) {
  return (
    <div
      data-slot="card"
      data-size={size}
      className={cn(
        // Design Premium : Bordure légère, coins très arrondis et ombre portée élégante
        "group/card flex flex-col overflow-hidden rounded-[2.5rem] bg-white border-2 border-slate-50 text-sm text-card-foreground shadow-xl shadow-slate-200/50 transition-all duration-300 hover:shadow-2xl hover:border-primary/10 [--card-spacing:--spacing(6)]",
        // Ajustement spécifique pour les images
        "*:[img:first-child]:rounded-t-[2.5rem] *:[img:last-child]:rounded-b-[2.5rem]",
        // Mode compact (sm)
        "data-[size=sm]:[--card-spacing:--spacing(4)] data-[size=sm]:rounded-[1.5rem]",
        className
      )}
      {...props}
    />
  )
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "group/card-header flex flex-col space-y-1.5 p-(--card-spacing) pb-2",
        className
      )}
      {...props}
    />
  )
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-title"
      className={cn(
        // Style de titre SaaS : Gras, Italique, Majuscule, Tracking serré
        "text-xl font-black italic uppercase tracking-tighter text-slate-900 leading-none group-data-[size=sm]/card:text-base",
        className
      )}
      {...props}
    />
  )
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      className={cn(
        // Style étiquette : Petit, gras, espacement des lettres
        "text-[10px] font-bold uppercase tracking-widest text-muted-foreground opacity-70",
        className
      )}
      {...props}
    />
  )
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn(
        "ml-auto flex items-center gap-2",
        className
      )}
      {...props}
    />
  )
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn("p-(--card-spacing) pt-2", className)}
      {...props}
    />
  )
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn(
        // Pied de carte : Fond gris très léger pour séparer les actions
        "flex items-center p-(--card-spacing) pt-4 bg-slate-50/50 border-t border-slate-100 mt-auto",
        className
      )}
      {...props}
    />
  )
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
}