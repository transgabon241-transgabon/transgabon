"use client"

import { Toaster as SonnerToaster } from "sonner"
import { useTheme } from "next-themes"

type ToasterProps = React.ComponentProps<typeof SonnerToaster>

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <SonnerToaster
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      toastOptions={{
        classNames: {
          // Style global du Toast : Très arrondi, ombre portée profonde, bordure SaaS
          toast:
            "group toast group-[.toaster]:bg-white group-[.toaster]:text-slate-900 group-[.toaster]:border-2 group-[.toaster]:border-slate-100 group-[.toaster]:shadow-2xl group-[.toaster]:rounded-[1.5rem] group-[.toaster]:p-4",
          
          // Style de la description (sous le titre)
          description: 
            "group-[.toast]:text-slate-500 group-[.toast]:font-medium group-[.toast]:text-xs",
          
          // Style du bouton d'action (ex: "Annuler")
          actionButton:
            "group-[.toast]:bg-slate-900 group-[.toast]:text-white group-[.toast]:font-black group-[.toast]:uppercase group-[.toast]:text-[10px] group-[.toast]:tracking-widest group-[.toast]:rounded-xl group-[.toast]:h-9",
          
          // Style du bouton annuler
          cancelButton:
            "group-[.toast]:bg-slate-100 group-[.toast]:text-slate-500 group-[.toast]:font-bold group-[.toast]:uppercase group-[.toast]:text-[10px] group-[.toast]:rounded-xl",
          
          // Couleurs spécifiques par type (optionnel mais recommandé)
          success: "group-[.toaster]:border-emerald-100 group-[.toaster]:bg-emerald-50/50",
          error: "group-[.toaster]:border-red-100 group-[.toaster]:bg-red-50/50",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }