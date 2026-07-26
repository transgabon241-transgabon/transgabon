"use client"

import { useState, useMemo, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from "@/lib/auth-context";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { 
  Scale, Search, RefreshCw, Plus, 
  User, Package, Calculator, ArrowRight, Hash, Info, AlertTriangle
} from 'lucide-react';

export default function AgencyLuggage() {
  const { user } = useAuth();
  const [qrInput, setQrInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  
  // Paramètres de pesée
  const [agencyRates, setAgencyRates] = useState<any[]>([]);
  const [selectedRateId, setSelectedRateId] = useState("");
  const [weightInput, setWeightInput] = useState("");
  const [qtyInput, setQtyInput] = useState("1");

  // Charger les politiques de la compagnie
  const loadRates = async (companyId: string) => {
    const { data, error } = await supabase
      .from('company_luggage_settings')
      .select('*')
      .eq('company_id', companyId);
    
    if (error) {
      console.error("Erreur tarifs:", error);
      return;
    }
    setAgencyRates(data || []);
  };

  const handleSearch = async () => {
    if (!qrInput.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      const { data: b, error } = await supabase
        .from('bookings')
        .select(`
          *, 
          trip:trips(
            *, 
            from:cities!from_id(name), 
            to:cities!to_id(name), 
            company:companies(*)
          ), 
          passengers(*), 
          luggages(*)
        `)
        .eq('reference', qrInput.toUpperCase().trim())
        .maybeSingle();

      if (error) throw error;
      if (!b) {
        toast.error("Billet introuvable");
        return;
      }

      setResult(b);
      // Charger les tarifs spécifiques de cette compagnie
      await loadRates(b.trip.company_id);
    } catch (e) {
      toast.error("Erreur de recherche");
    } finally {
      setLoading(false);
    }
  };

  // Trouver la politique sélectionnée
  const currentRate = useMemo(() => {
    return agencyRates.find(r => r.id === selectedRateId);
  }, [selectedRateId, agencyRates]);

  // CALCUL DYNAMIQUE DU PRIX
  const currentCalculation = useMemo(() => {
    if (!result) return 0;

    // CAS 1 : C'est un vol ou train et on fait une pesée libre (sans forfait sélectionné)
    if ((result.trip.type === 'PLANE' || result.trip.type === 'TRAIN') && !selectedRateId) {
      const w = parseFloat(weightInput) || 0;
      const freeLimit = result.trip.company?.default_free_weight_limit || 23;
      const pricePerKg = result.trip.company?.default_excess_weight_price || 1000;
      return Math.max(0, w - freeLimit) * pricePerKg;
    }

    // CAS 2 : Un forfait ou une politique spécifique est sélectionnée
    if (currentRate) {
      const qty = parseInt(qtyInput) || 1;
      // Si la politique elle-même est basée sur le poids
      if (currentRate.is_weight_based) {
        const w = parseFloat(weightInput) || 0;
        return w * currentRate.price * qty;
      }
      // Sinon c'est un prix fixe par unité (ex: sac, carton)
      return currentRate.price * qty;
    }

    return 0;
  }, [weightInput, selectedRateId, qtyInput, result, currentRate]);

  const handleAddLuggage = async () => {
    if (!result) return;
    setLoading(true);
    try {
      let label = "";
      if (currentRate) {
        label = currentRate.is_weight_based 
          ? `${currentRate.label} (${weightInput}kg)` 
          : currentRate.label;
      } else {
        label = `Excédent Standard (${weightInput}kg)`;
      }

      const { error: lugError } = await supabase.from('luggages').insert([{
        booking_id: result.id,
        passenger_id: result.passengers[0]?.id,
        label,
        quantity: parseInt(qtyInput),
        total_price: currentCalculation
      }]);

      if (lugError) throw lugError;

      // Si prix > 0, on met le billet en "ATTENTE" pour forcer le passage en caisse
      if (currentCalculation > 0) {
        await supabase.from('bookings').update({ status: 'ATTENTE' }).eq('id', result.id);
        toast.warning("Excédent détecté : Règlement en caisse requis");
      } else {
        toast.success("Bagage conforme enregistré");
      }

      setWeightInput("");
      setSelectedRateId("");
      await handleSearch(); // Rafraîchir les données
    } catch (e) {
      toast.error("Erreur d'enregistrement");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-4 space-y-6 text-left animate-in fade-in duration-500 bg-background pb-20">
      
      {/* BARRE DE RECHERCHE */}
      <div className="bg-card p-6 rounded-[2rem] border-2 border-border shadow-2xl flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-primary/10 rounded-2xl border border-primary/20 text-primary">
            <Scale size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-black italic uppercase tracking-tighter text-white leading-none">Poste de Pesage</h1>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Certification des bagages et kilos</p>
          </div>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <Input 
            placeholder="RÉFÉRENCE BILLET..." 
            value={qrInput} 
            onChange={e => setQrInput(e.target.value)}
            className="h-12 bg-slate-950 border-border text-white font-black"
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
          />
          <Button onClick={handleSearch} disabled={loading} className="h-12 w-12 bg-primary shrink-0 rounded-xl">
             <Search size={20} />
          </Button>
        </div>
      </div>

      {result && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in slide-in-from-bottom-4">
          
          {/* COLONNE GAUCHE : RÉCAPITULATIF */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-card border-2 border-border p-6 rounded-[2rem] shadow-xl">
              <div className="flex items-center gap-3 mb-6">
                <div className="h-12 w-12 bg-slate-800 rounded-2xl flex items-center justify-center text-primary border border-slate-700">
                  <User size={24} />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-black text-slate-500 uppercase">Passager</p>
                  <p className="font-black text-white uppercase truncate">{result.passengers[0]?.first_name} {result.passengers[0]?.last_name}</p>
                </div>
              </div>
              
              <div className="space-y-3 pt-4 border-t border-dashed border-slate-800">
                <div className="flex justify-between text-[10px] font-bold uppercase">
                   <span className="text-slate-500 text-left">Référence :</span>
                   <span className="text-primary text-right">{result.reference}</span>
                </div>
                <div className="flex justify-between text-[10px] font-bold uppercase">
                   <span className="text-slate-500 text-left">Franchise :</span>
                   <span className="text-emerald-500 text-right">{result.trip.company?.default_free_weight_limit || 0} KG GRATUIT</span>
                </div>
                <div className={`flex justify-between text-[10px] font-bold uppercase p-2 rounded-lg mt-2 ${result.status === 'PAYE' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'}`}>
                   <span>Statut :</span>
                   <span className="font-black">{result.status}</span>
                </div>
              </div>
            </div>

            {/* LISTE DES BAGAGES DÉJÀ PESÉS */}
            <div className="bg-slate-950/50 p-6 rounded-[2rem] border border-border">
               <h3 className="text-[10px] font-black uppercase text-slate-500 mb-4 tracking-widest flex items-center gap-2">
                 <Package size={14} /> Inventaire Pesée
               </h3>
               <div className="space-y-2 text-left">
                  {result.luggages.length === 0 ? (
                    <p className="text-[10px] text-slate-600 italic text-center py-4">Aucune pesée enregistrée</p>
                  ) : (
                    result.luggages.map((lug: any) => (
                      <div key={lug.id} className="flex justify-between items-center p-3 bg-slate-900 rounded-xl border border-white/5">
                        <div>
                          <p className="text-[10px] font-black text-white uppercase">{lug.label}</p>
                          <p className="text-[9px] font-bold text-primary">{Number(lug.total_price).toLocaleString()} F</p>
                        </div>
                        <Badge variant="outline" className="text-[8px] border-slate-700">x{lug.quantity}</Badge>
                      </div>
                    ))
                  )}
               </div>
            </div>
          </div>

          {/* COLONNE DROITE : LA CONSOLE */}
          <div className="lg:col-span-2 space-y-6 text-left">
            <div className="bg-slate-900 border-2 border-primary/20 p-6 md:p-8 rounded-[2.5rem] shadow-2xl">
               <div className="flex items-center gap-3 mb-8">
                  <div className="p-3 bg-primary rounded-2xl text-white">
                    <Calculator size={24} />
                  </div>
                  <h2 className="text-xl font-black text-white uppercase italic tracking-tighter">Nouvel Enregistrement</h2>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    {/* SÉLECTEUR DE POLITIQUE */}
                    <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Type de Bagage / Politique</Label>
                        <select 
                          value={selectedRateId} 
                          onChange={e => setSelectedRateId(e.target.value)}
                          className="w-full h-14 rounded-2xl bg-slate-950 border-none px-4 text-white font-bold text-sm outline-none focus:ring-2 focus:ring-primary/50"
                        >
                            <option value="">
                                {result.trip.type === 'PLANE' ? "Pesée libre (Standard)" : "Sélectionner un tarif..."}
                            </option>
                            {agencyRates.map(r => (
                                <option key={r.id} value={r.id}>
                                    {r.label} ({r.price} F{r.is_weight_based ? '/kg' : ''})
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* CHAMP POIDS (Actif si Avion/Train OU si la politique est basée sur le poids) */}
                    {(result.trip.type === 'PLANE' || result.trip.type === 'TRAIN' || currentRate?.is_weight_based) && (
                       <div className="space-y-2 animate-in fade-in zoom-in-95">
                          <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Poids sur la balance (KG)</Label>
                          <div className="relative">
                            <Input 
                              type="number" 
                              value={weightInput}
                              onChange={e => setWeightInput(e.target.value)}
                              className="h-16 rounded-2xl bg-slate-950 border-none text-4xl font-black text-white text-center shadow-inner"
                              placeholder="0.0"
                            />
                            <span className="absolute right-6 top-1/2 -translate-y-1/2 font-black text-slate-700 text-sm">KG</span>
                          </div>
                          {!currentRate && result.trip.type === 'PLANE' && (
                             <p className="text-[9px] font-bold text-slate-500 uppercase mt-2 px-2 flex items-center gap-1">
                                <Info size={10}/> Franchise incluse: {result.trip.company?.default_free_weight_limit || 23}kg
                             </p>
                          )}
                       </div>
                    )}

                    {!currentRate?.is_weight_based && selectedRateId && (
                        <div className="space-y-2 animate-in fade-in">
                            <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Quantité d'articles</Label>
                            <Input 
                              type="number" 
                              value={qtyInput}
                              onChange={e => setQtyInput(e.target.value)}
                              className="h-14 rounded-2xl bg-slate-950 border-none text-center font-black text-xl"
                            />
                        </div>
                    )}
                  </div>

                  {/* RÉSUMÉ DU PRIX ET ACTION */}
                  <div className="flex flex-col justify-center items-center bg-slate-950/50 rounded-[2rem] border border-white/5 p-6 text-center">
                      <Label className="text-[10px] font-black uppercase text-slate-500 mb-2 tracking-widest">Excédent Calculé</Label>
                      <div className={`text-4xl md:text-5xl font-black tracking-tighter mb-4 ${currentCalculation > 0 ? 'text-primary' : 'text-slate-700'}`}>
                        {Math.round(currentCalculation).toLocaleString()} <span className="text-sm">F</span>
                      </div>
                      
                      {currentCalculation > 0 && (
                          <div className="flex items-center gap-2 text-amber-500 bg-amber-500/5 p-3 rounded-xl text-[9px] font-bold uppercase mb-8 italic border border-amber-500/10">
                            <AlertTriangle size={14}/> Règlement à la caisse obligatoire
                          </div>
                      )}
                      
                      <Button 
                        onClick={handleAddLuggage}
                        disabled={loading || (result.trip.type !== 'PLANE' && !selectedRateId)}
                        className="w-full h-16 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase tracking-widest shadow-xl active:scale-95 transition-all border-none"
                      >
                         <Plus size={20} className="mr-2" /> Valider Pesée
                      </Button>
                  </div>
               </div>
            </div>
          </div>

        </div>
      )}

      {/* ÉCRAN VIDE */}
      {!result && (
        <div className="py-20 text-center opacity-10">
          <Scale size={80} className="mx-auto mb-4 text-white" />
          <p className="text-xs font-black uppercase tracking-[0.5em] text-white">Prêt pour pesée officielle</p>
        </div>
      )}
    </div>
  );
}