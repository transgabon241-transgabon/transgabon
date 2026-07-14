"use client"

import { useState } from "react"
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Scale, RefreshCw, CheckCircle2, AlertCircle } from "lucide-react"
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
      // Appel de la fonction transactionnelle de pesée physique (RPC) de Supabase
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
      toast.success("Pesée enregistrée et colis pris en charge !");
      setIsSubmitting(false);
      setTimeout(() => window.location.reload(), 1500); // Recharge pour actualiser les détails et l'historique
    } catch (err) {
      setError("Erreur de connexion.");
      setIsSubmitting(false);
    }
  }

  if (success) {
    return (
      <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-center space-y-1 text-emerald-600 dark:text-emerald-400">
        <CheckCircle2 className="mx-auto h-7 w-7" />
        <p className="font-bold text-xs">Pesée enregistrée !</p>
        <p className="text-[10px] text-muted-foreground">Le colis est officiellement marqué comme PRIS EN CHARGE.</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 text-foreground text-left">
      <div className="grid gap-3 grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="actualWeight" className="text-xs">Poids réel balance (Kg)</Label>
          <div className="relative">
            <Scale className="absolute left-2.5 top-2 h-4 w-4 text-muted-foreground" />
            <Input
              id="actualWeight"
              type="number"
              step="0.1"
              min="0.1"
              required
              className="pl-8 h-8 text-xs font-semibold"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              disabled={isSubmitting}
            />
          </div>
        </div>

        <div className="space-y-1">
          <Label htmlFor="actualQty" className="text-xs">Quantité réelle de colis</Label>
          <Input
            id="actualQty"
            type="number"
            min="1"
            required
            className="h-8 text-xs font-semibold"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            disabled={isSubmitting}
          />
        </div>
      </div>

      {error && (
        <p className="rounded-lg bg-destructive/10 px-2.5 py-1.5 text-[10px] text-destructive flex items-center gap-1.5">
          <AlertCircle className="h-3.5 w-3.5" /> {error}
        </p>
      )}

      <Button type="submit" size="sm" className="w-full gap-1.5 font-bold text-xs h-8 bg-primary text-primary-foreground" disabled={isSubmitting}>
        {isSubmitting ? (
          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Scale className="h-3.5 w-3.5" />
        )}
        Valider la pesée &amp; prendre en charge
      </Button>
    </form>
  )
}