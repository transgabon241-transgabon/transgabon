"use client"

import { useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from "@/lib/auth-context";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { 
  Scale, Search, RefreshCw, CheckCircle2, 
  User, Package, Calculator, ArrowRight, Hash, Info, AlertTriangle, ChevronRight
} from 'lucide-react';

export default function AgencyLuggage() {
  const { user } = useAuth();
  const [qrInput, setQrInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  
  const [agencyRates, setAgencyRates] = useState<any[]>([]);
  const [selectedRateId, setSelectedRateId] = useState("");
  const [weightInput, setWeightInput] = useState("");
  const [qtyInput, setQtyInput] = useState("1");

  const loadRates = async (companyId: string) => {
    const { data } = await supabase
      .from('company_luggage_settings')
      .select('*')
      .eq('company_id', companyId);
    setAgencyRates(data || []);
  };

  const handleSearch = async () => {
    if (!qrInput.trim()) return;
    setLoading(true);
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
      await loadRates(b.trip.company_id);
    } catch (e) {
      toast.error("Erreur de recherche");
    } finally {
      setLoading(false);
    }
  };

  const currentRate = useMemo(() => {
    return agencyRates.find(r => r.id === selectedRateId);
  }, [selectedRateId, agencyRates]);

  // --- CALCUL DYNAMIQUE DU PRIX (CORRIGÉ) ---
  const currentCalculation = useMemo(() => {
    if (!result) return 0;

    const weight = parseFloat(weightInput) || 0;
    const qty = parseInt(qtyInput) || 1;

    // 1. Forfait spécifique sélectionné
    if (currentRate) {
      if (currentRate.is_weight_based) return weight * currentRate.price * qty;
      return currentRate.price * qty;
    }

    // 2. Pesée Libre (Avion/Train)
    if (result.trip.type === 'PLANE' || result.trip.type === 'TRAIN') {
      const freeLimit = result.trip.company?.default_free_weight_limit || 0;
      const pricePerKg = result.trip.company?.default_excess_weight_price || 0;
      const excessWeight = Math.max(0, weight - freeLimit);
      return excessWeight * pricePerKg;
    }

    return 0;
  }, [weightInput, selectedRateId, qtyInput, result, currentRate]);

  const hasExcess = currentCalculation > 0;
  const isWeightFilled = weightInput.length > 0 && parseFloat(weightInput) >= 0;

  const handleConfirmInspection = async () => {
    if (!result || !isWeightFilled) return;
    setLoading(true);
    try {
      // On n'enregistre en base de données QUE s'il y a un excédent ou un forfait
      if (hasExcess || selectedRateId) {
        let label = currentRate 
          ? (currentRate.is_weight_based ? `${currentRate.label} (${weightInput}kg)` : currentRate.label)
          : `Excédent Pesée (${weightInput}kg)`;

        const { error: lugError } = await supabase.from('luggages').insert([{
          booking_id: result.id,
          passenger_id: result.passengers[0]?.id,
          label,
          quantity: parseInt(qtyInput),
          total_price: currentCalculation
        }]);
        if (lugError) throw lugError;

        if (hasExcess) {
          await supabase.from('bookings').update({ status: 'ATTENTE' }).eq('id', result.id);
          toast.warning("Excédent enregistré : Passage en caisse requis");
        }
      } else {
        toast.success("Bagages conformes : Embarquement autorisé");
      }

      setWeightInput("");
      setSelectedRateId("");
      handleSearch(); // Refresh pour voir la mise à jour
    } catch (e) {
      toast.error("Erreur système");
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
            <h1 className="text-2xl font-black italic uppercase tracking-tighter text-white leading-none">Vérification Bagages</h1>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Inspection et Pesée Officielle</p>
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
          <Button onClick={handleSearch} disabled={loading} className="h-12 w-12 bg-primary shrink-0 rounded-xl shadow-lg">
             <Search size={20} />
          </Button>
        </div>
      </div>

      {result && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in slide-in-from-bottom-4">
          
          {/* RÉSUMÉ PASSAGER */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-card border-2 border-border p-6 rounded-[2rem] shadow-xl relative overflow-hidden">
              <div className="flex items-center gap-3 mb-6 text-left">
                <div className="h-12 w-12 bg-slate-800 rounded-2xl flex items-center justify-center text-primary border border-slate-700">
                  <User size={24} />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-black text-slate-500 uppercase">Billet Passager</p>
                  <p className="font-black text-white uppercase truncate">{result.passengers[0]?.first_name} {result.passengers[0]?.last_name}</p>
                </div>
              </div>
              
              <div className="space-y-3 pt-4 border-t border-dashed border-slate-800 text-left">
                <div className="flex justify-between text-[10px] font-bold uppercase">
                   <span className="text-slate-500">Référence :</span>
                   <span className="text-primary font-mono">{result.reference}</span>
                </div>
                <div className="flex justify-between text-[10px] font-bold uppercase">
                   <span className="text-slate-500">Franchise :</span>
                   <span className="text-emerald-500">{result.trip.company?.default_free_weight_limit || 0} KG INCLUS</span>
                </div>
                <div className={`flex justify-between text-[10px] font-bold uppercase p-2 rounded-lg mt-2 ${result.status === 'PAYE' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>
                   <span>Statut Billet :</span>
                   <span className="font-black">{result.status}</span>
                </div>
              </div>
            </div>

            {/* HISTORIQUE / INVENTAIRE */}
            <div className="bg-slate-950/50 p-6 rounded-[2rem] border border-border">
               <h3 className="text-[10px] font-black uppercase text-slate-500 mb-4 tracking-widest flex items-center gap-2">
                 <Package size={14} /> Déjà Enregistré
               </h3>
               <div className="space-y-2 text-left">
                  {result.luggages.length === 0 ? (
                    <p className="text-[10px] text-slate-600 italic text-center py-4">Aucun supplément pesé</p>
                  ) : (
                    result.luggages.map((lug: any) => (
                      <div key={lug.id} className="flex justify-between items-center p-3 bg-slate-900 rounded-xl border border-white/5">
                        <div className="min-w-0">
                          <p className="text-[10px] font-black text-white uppercase truncate">{lug.label}</p>
                          <p className="text-[9px] font-bold text-primary">{Number(lug.total_price).toLocaleString()} F</p>
                        </div>
                        <Badge variant="outline" className="text-[8px] border-slate-700 h-5">x{lug.quantity}</Badge>
                      </div>
                    ))
                  )}
               </div>
            </div>
          </div>

          {/* ZONE DE VÉRIFICATION */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-slate-900 border-2 border-primary/20 p-6 md:p-8 rounded-[2.5rem] shadow-2xl text-left">
               <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-primary rounded-2xl text-white shadow-lg">
                      <Calculator size={24} />
                    </div>
                    <h2 className="text-xl font-black text-white uppercase italic tracking-tighter">Poste d'inspection</h2>
                  </div>
                  {hasExcess && (
                    <Badge className="bg-red-500 text-white border-none font-black animate-pulse px-3 py-1">EXCÉDENT DÉTECTÉ</Badge>
                  )}
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Type de bagage supplémentaire (Optionnel)</Label>
                        <select 
                          value={selectedRateId} 
                          onChange={e => setSelectedRateId(e.target.value)}
                          className="w-full h-14 rounded-2xl bg-slate-950 border-none px-4 text-white font-bold text-sm outline-none"
                        >
                            <option value="">Pesée Libre / Standard</option>
                            {agencyRates.map(r => (
                                <option key={r.id} value={r.id}>
                                    {r.label} ({r.price} F{r.is_weight_based ? '/kg' : ''})
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Poids sur balance (KG)</Label>
                        <div className="relative">
                        <Input 
                            type="number" 
                            value={weightInput}
                            onChange={e => setWeightInput(e.target.value)}
                            className="h-16 rounded-2xl bg-slate-950 border-none text-4xl font-black text-white text-center shadow-inner focus:ring-2 focus:ring-primary"
                            placeholder="0.0"
                        />
                        <span className="absolute right-6 top-1/2 -translate-y-1/2 font-black text-slate-700 text-sm">KG</span>
                        </div>
                    </div>
                  </div>

                  <div className="flex flex-col justify-center items-center bg-slate-950/50 rounded-[2rem] border border-white/5 p-6 text-center">
                      <Label className="text-[10px] font-black uppercase text-slate-500 mb-2 tracking-widest">Montant Excédent</Label>
                      <div className={`text-4xl md:text-5xl font-black tracking-tighter mb-4 ${hasExcess ? 'text-primary' : 'text-emerald-500'}`}>
                        {Math.round(currentCalculation).toLocaleString()} <span className="text-sm">F</span>
                      </div>
                      
                      <div className="mb-8">
                        {hasExcess ? (
                            <div className="flex items-center gap-2 text-amber-500 bg-amber-500/5 p-3 rounded-xl text-[9px] font-bold uppercase italic border border-amber-500/10">
                                <AlertTriangle size={14}/> Passage en caisse requis après validation
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 text-emerald-500 bg-emerald-500/5 p-3 rounded-xl text-[9px] font-bold uppercase italic border border-emerald-500/10">
                                <CheckCircle2 size={14}/> Poids conforme à la franchise
                            </div>
                        )}
                      </div>
                      
                      <Button 
                        onClick={handleConfirmInspection}
                        disabled={loading || !isWeightFilled}
                        className={`w-full h-16 rounded-2xl font-black uppercase tracking-widest shadow-xl active:scale-95 transition-all border-none ${hasExcess ? 'bg-primary text-white' : 'bg-emerald-600 text-white'}`}
                      >
                         {hasExcess ? <><Plus size={20} className="mr-2" /> Enregistrer Excédent</> : <><CheckCircle2 size={20} className="mr-2" /> Confirmer Conformité</>}
                      </Button>
                  </div>
               </div>
            </div>
          </div>

        </div>
      )}

      {!result && (
        <div className="py-20 text-center opacity-10">
          <Scale size={80} className="mx-auto mb-4 text-white" />
          <p className="text-xs font-black uppercase tracking-[0.5em] text-white">Scanner pour vérification</p>
        </div>
      )}
    </div>
  );
}