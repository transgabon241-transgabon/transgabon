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
      // h-16 et text-base pour matcher l'Input
      "flex h-16 w-full items-center justify-between rounded-[1.25rem] border-2 border-slate-200 bg-slate-50/50 px-6 py-4 text-base font-bold text-slate-900 transition-all shadow-inner outline-none",
      "focus:bg-white focus:border-primary focus:ring-8 focus:ring-primary/5 disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1",
      className
    )}
    {...props}
  >
    {children}
    <SelectPrimitive.Icon asChild>
      <ChevronDown className="h-5 w-5 text-slate-500" strokeWidth={3} />
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
        // Menu très large avec des coins massifs pour le look Premium
        "relative z-[100] max-h-96 min-w-[12rem] overflow-hidden rounded-[2rem] border-2 border-slate-100 bg-white text-slate-900 shadow-2xl animate-in zoom-in-95 duration-200",
        position === "popper" && "data-[side=bottom]:translate-y-2",
        className
      )}
      position={position}
      onPointerDownOutside={(e) => e.preventDefault()}
      {...props}
    >
      <SelectPrimitive.Viewport
        className={cn(
          "p-2.5",
          position === "popper" && "h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)]"
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
      // py-4 (Espace immense pour le pouce) et text-base
      "relative flex w-full cursor-pointer select-none items-center rounded-xl py-4 pl-12 pr-4 text-base font-bold text-slate-700 outline-none transition-all hover:bg-slate-50 hover:text-primary focus:bg-primary/5 focus:text-primary data-disabled:pointer-events-none data-disabled:opacity-50",
      className
    )}
    {...props}
  >
    <span className="absolute left-4 flex h-5 w-5 items-center justify-center">
      <SelectPrimitive.ItemIndicator>
        <Check className="h-5 w-5 text-primary" strokeWidth={4} />
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