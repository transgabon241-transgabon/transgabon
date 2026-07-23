"use client"

import { useState } from "react"
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Scale, RefreshCw, CheckCircle2, AlertCircle, PackageCheck, Calculator } from "lucide-react"
import { toast } from "sonner"

export function WeighParcelForm({
  parcelId,
  currentWeight,
  currentQuantity,
}: {
  parcelId: string
  currentWeight: number
  currentQuantity: number
}) {
  const { user } = useAuth()
  const [weight, setWeight] = useState(String(currentWeight))
  const [quantity, setQuantity] = useState(String(currentQuantity))
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    setError(null)
    setSuccess(false)
    setIsSubmitting(true)

    try {
      const { data: res, error } = await supabase.rpc('weigh_and_accept_parcel', {
        p_parcel_id: parcelId,
        p_actual_weight: parseFloat(weight),
        p_quantity: parseInt(quantity),
        p_agent_user_id: user.id
      });

      if (error || !res?.success) {
        setError(error?.message || res?.error || "Une erreur est survenue.");
        setIsSubmitting(false);
        return;
      }

      setSuccess(true);
      toast.success("Mise à jour logistique validée");
      setIsSubmitting(false);
      
      setTimeout(() => window.location.reload(), 1200); 
    } catch (err) {
      setError("Erreur de connexion réseau.");
      setIsSubmitting(false);
    }
  }

  if (success) {
    return (
      <div className="rounded-[1.5rem] border-2 border-emerald-500/30 bg-emerald-500/10 p-6 text-center space-y-3 animate-in zoom-in-95 duration-300">
        <div className="h-12 w-12 bg-emerald-500 text-white rounded-full flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
            <CheckCircle2 size={24} strokeWidth={3} />
        </div>
        <div>
            <p className="font-black text-emerald-400 uppercase text-xs tracking-widest">Pesée Enregistrée</p>
            <p className="text-[10px] text-emerald-500/60 font-bold uppercase mt-1">Colis marqué comme PRIS EN CHARGE</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-slate-900 border-2 border-border rounded-[2rem] p-6 shadow-2xl">
      <div className="flex items-center gap-3 mb-6 border-b border-dashed border-slate-800 pb-4">
         <div className="h-10 w-10 bg-slate-950 rounded-xl flex items-center justify-center text-primary border border-border">
            <Calculator size={20} />
         </div>
         <div className="text-left">
            <h3 className="font-black text-white uppercase text-xs tracking-tighter leading-none">Contrôle de pesée</h3>
            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-1">Validation physique du fret</p>
         </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 text-left">
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="actualWeight" className="text-[10px] font-black uppercase text-slate-500 ml-1">Poids Balance (Kg)</Label>
            <div className="relative">
              <Scale className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-primary" />
              <Input
                id="actualWeight"
                type="number"
                step="0.1"
                min="0.1"
                required
                className="pl-10 h-12 rounded-xl bg-slate-950 border-none font-black text-lg text-white shadow-inner focus-visible:ring-1 focus-visible:ring-primary/50"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="actualQty" className="text-[10px] font-black uppercase text-slate-500 ml-1">Nombre de colis</Label>
            <Input
              id="actualQty"
              type="number"
              min="1"
              required
              className="h-12 rounded-xl bg-slate-950 border-none font-black text-lg text-white text-center shadow-inner focus-visible:ring-1 focus-visible:ring-primary/50"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              disabled={isSubmitting}
            />
          </div>
        </div>

        {error && (
          <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-3 flex items-center gap-2 text-red-400 animate-in fade-in slide-in-from-top-1">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <p className="text-[10px] font-black uppercase leading-tight">{error}</p>
          </div>
        )}

        <Button 
            type="submit" 
            className="w-full h-14 rounded-2xl gap-3 font-black text-xs uppercase tracking-[0.2em] shadow-xl transition-all active:scale-95 bg-primary text-white border-none hover:bg-primary/90" 
            disabled={isSubmitting}
        >
          {isSubmitting ? (
            <RefreshCw className="h-5 w-5 animate-spin" />
          ) : (
            <PackageCheck className="h-5 w-5" />
          )}
          VALIDER & ACCEPTER
        </Button>
      </form>
    </div>
  )
}