"use client"

import * as React from "react"
import * as SelectPrimitive from "@radix-ui/react-select"
import { Check, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

const Select = SelectPrimitive.Root
const SelectValue = SelectPrimitive.Value

const SelectTrigger = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Trigger
    ref={ref}
    className={cn(
      // Harmonisation avec Input.tsx : h-12, rounded-2xl, fond gris doux
      "flex h-12 w-full items-center justify-between rounded-2xl border-2 border-slate-100 bg-slate-50/50 px-5 py-2 text-sm font-bold text-slate-900 transition-all shadow-inner outline-none",
      // Focus : Bordure primaire et fond blanc
      "focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1",
      className
    )}
    {...props}
  >
    {children}
    <SelectPrimitive.Icon asChild>
      <ChevronDown className="h-4 w-4 text-slate-400" />
    </SelectPrimitive.Icon>
  </SelectPrimitive.Trigger>
))
SelectTrigger.displayName = SelectPrimitive.Trigger.displayName

const SelectContent = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content>
>(({ className, children, position = "popper", ...props }, ref) => (
  <SelectPrimitive.Portal>
    <SelectPrimitive.Content
      ref={ref}
      className={cn(
        // Menu Premium : Très arrondi, ombre portée profonde, z-index élevé pour les modales
        "relative z-[100] max-h-96 min-w-[10rem] overflow-hidden rounded-[1.5rem] border border-slate-100 bg-white text-slate-900 shadow-2xl animate-in zoom-in-95 duration-200",
        position === "popper" &&
          "data-[side=bottom]:translate-y-2 data-[side=left]:-translate-x-2 data-[side=right]:translate-x-2 data-[side=top]:-translate-y-2",
        className
      )}
      position={position}
      // CORRECTIF : Empêche le conflit avec les dialogues Shadcn
      onPointerDownOutside={(e) => e.preventDefault()}
      {...props}
    >
      <SelectPrimitive.Viewport
        className={cn(
          "p-2",
          position === "popper" &&
            "h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)]"
        )}
      >
        {children}
      </SelectPrimitive.Viewport>
    </SelectPrimitive.Content>
  </SelectPrimitive.Portal>
))
SelectContent.displayName = SelectPrimitive.Content.displayName

const SelectItem = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Item
    ref={ref}
    className={cn(
      // Items : Plus d'espace (py-3), police grasse, transition propre
      "relative flex w-full cursor-pointer select-none items-center rounded-xl py-3 pl-10 pr-4 text-xs font-bold text-slate-600 outline-none transition-all hover:bg-slate-50 hover:text-primary focus:bg-primary/5 focus:text-primary data-disabled:pointer-events-none data-disabled:opacity-50",
      className
    )}
    {...props}
  >
    <span className="absolute left-3 flex h-4 w-4 items-center justify-center">
      <SelectPrimitive.ItemIndicator>
        <Check className="h-4 w-4 text-primary" strokeWidth={3} />
      </SelectPrimitive.ItemIndicator>
    </span>

    <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
  </SelectPrimitive.Item>
))
SelectItem.displayName = SelectPrimitive.Item.displayName

export {
  Select,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectItem,
}