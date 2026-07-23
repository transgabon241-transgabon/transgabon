"use client"

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from "@/lib/auth-context";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { 
  CheckCircle, Search, RefreshCw, AlertCircle, Package, Ticket, 
  Hash, Ship, Bus, Train, ArrowRight, Phone, Wallet, Plus, Scale, Gem, Calculator
} from 'lucide-react';

export default function AgencyValidate() {
  const { user } = useAuth();
  const [qrInput, setQrInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  // États pour l'ajout de bagages
  const [agencyRates, setAgencyRates] = useState<any[]>([]);
  const [selectedRateId, setSelectedRateId] = useState("");
  const [weightInput, setWeightInput] = useState("");
  const [qtyInput, setQtyInput] = useState("1");
  const [boardingId, setBoardingId] = useState<string | null>(null);

  const userRole = user?.role;
  const canCollectMoney = ['Administrateur', 'Agent', 'Caissier'].includes(userRole || '');
  const canBoard = ['Administrateur', 'Agent', 'Agent Embarquement'].includes(userRole || '');

  // Calcul automatique du prix en temps réel avant ajout
  const currentCalculation = useMemo(() => {
    if (!result?.booking) return 0;
    
    if (result.booking.tripType === 'TRAIN') {
      const w = parseFloat(weightInput) || 0;
      const excess = Math.max(0, w - result.booking.freeWeight);
      return excess * result.booking.excessPrice;
    } else {
      const rate = agencyRates.find(r => r.id === selectedRateId);
      if (!rate) return 0;
      return rate.price * (parseInt(qtyInput) || 1);
    }
  }, [weightInput, selectedRateId, qtyInput, result, agencyRates]);

  const handleValidate = async (forcedRef?: string) => {
    const targetRef = forcedRef || qrInput.trim();
    if (!targetRef) return;

    setLoading(true);
    try {
      let ref = targetRef.toUpperCase();
      try {
        const parsed = JSON.parse(targetRef);
        if (parsed && parsed.ref) ref = parsed.ref.toUpperCase();
      } catch (e) {}

      const { data: b, error } = await supabase
        .from('bookings')
        .select(`
          *,
          trip:trips (
            *,
            from_city:cities!from_id (name),
            to_city:cities!to_id (name),
            company:companies (*),
            vehicle:vehicles (registration)
          ),
          passengers (*),
          luggages (*)
        `)
        .eq('reference', ref)
        .maybeSingle();

      if (error) throw error;
      if (!b) {
        setResult({ valid: false, message: 'BILLET INTROUVABLE' });
        return;
      }

      const { data: rates } = await supabase
        .from('company_luggage_settings')
        .select('*')
        .eq('company_id', b.trip.company_id);
      if (rates) setAgencyRates(rates);

      const classMapping: Record<string, string> = {
        'VIP': 'SALON VIP', 'BUSINESS': 'BUSINESS', '1ERE_CLASSE': '1ÈRE CL.',
        '2EME_CLASSE': '2ÈME CL.', 'ECO': 'ÉCO', 'STANDARD': 'STD'
      };

      const luggageTotal = (b.luggages || []).reduce((sum: number, l: any) => sum + (Number(l.total_price) || 0), 0);

      setResult({
        valid: b.status === 'PAYE',
        message: b.status === 'PAYE' ? 'ACCÈS VALIDE' : 'PAIEMENT REQUIS',
        booking: {
          id: b.id,
          bookingNumber: b.reference,
          passengerName: `${b.passengers[0]?.first_name || ''} ${b.passengers[0]?.last_name || ''}`,
          passengerPhone: b.contact_phone || '—',
          departureCity: b.trip.from_city?.name,
          arrivalCity: b.arrival_city_name || b.trip.to_city?.name,
          classLabel: classMapping[b.class_type] || 'STANDARD',
          registration: b.trip.vehicle?.registration || 'N/A',
          ticketAmount: Number(b.total_amount) || 0,
          luggageAmount: luggageTotal,
          totalToPay: Number(b.total_amount) + luggageTotal,
          passengers: b.passengers || [],
          luggages: b.luggages || [],
          tripType: b.trip.type,
          seatNumber: b.passengers[0]?.seat_number || '—',
          freeWeight: b.trip.company.default_free_weight_limit || 30,
          excessPrice: b.trip.company.default_excess_weight_price || 500
        }
      });
    } catch (e) {
      toast.error('Erreur de lecture');
    } finally {
      setLoading(false);
    }
  };

  const handleAddExtraLuggage = async () => {
    if (!result?.booking || currentCalculation <= 0 && result.booking.tripType === 'TRAIN' && parseFloat(weightInput) < result.booking.freeWeight) {
        if(result.booking.tripType !== 'TRAIN') return;
    }
    
    setLoading(true);
    try {
      let label = "";
      let qty = parseInt(qtyInput) || 1;

      if (result.booking.tripType === 'TRAIN') {
        const w = parseFloat(weightInput) || 0;
        label = `Excédent (${w}kg)`;
        qty = 1;
      } else {
        const rate = agencyRates.find(r => r.id === selectedRateId);
        label = rate.label;
      }

      const { error } = await supabase.from('luggages').insert([{
        booking_id: result.booking.id,
        passenger_id: result.booking.passengers[0]?.id,
        label: label,
        quantity: qty,
        total_price: currentCalculation
      }]);

      if (error) throw error;
      
      // Si le billet était déjà payé, on doit repasser le statut en "ATTENTE" pour forcer le paiement du supplément
      if (result.valid && currentCalculation > 0) {
          await supabase.from('bookings').update({ status: 'ATTENTE' }).eq('id', result.booking.id);
      }

      toast.success("Bagage enregistré");
      setWeightInput("");
      handleValidate(result.booking.bookingNumber);
    } catch (e) {
      toast.error("Erreur");
    } finally { setLoading(false); }
  };

  const handleProcessPayment = async () => {
    if (!result?.booking) return;
    setLoading(true);
    try {
      const { error } = await supabase.from('bookings').update({ status: 'PAYE' }).eq('id', result.booking.id);
      if (error) throw error;
      toast.success("Paiement encaissé !");
      handleValidate(result.booking.bookingNumber);
    } catch (e) { toast.error("Erreur"); }
    finally { setLoading(false); }
  };

  const handleBoardPassenger = async (passengerId: string) => {
    setBoardingId(passengerId);
    try {
      const { error } = await supabase.from('passengers').update({ boarded: true }).eq('id', passengerId);
      if (error) throw error;
      toast.success("Passager à bord");
      handleValidate(result.booking.bookingNumber);
    } finally { setBoardingId(null); }
  };

  return (
    <div className="max-w-2xl mx-auto p-2 sm:p-4 pb-20 space-y-4 sm:space-y-6 animate-in fade-in duration-500 overflow-x-hidden">
      
      {/* HEADER COMPACT */}
      <header className="flex items-center gap-3 bg-white p-4 sm:p-6 rounded-[1.5rem] sm:rounded-[2rem] border-2 border-slate-100 shadow-sm w-full text-left">
        <div className="p-2 sm:p-3 bg-slate-900 rounded-xl sm:rounded-2xl text-white shrink-0"><Scale size={20} className="sm:w-6 sm:h-6" /></div>
        <div className="min-w-0">
          <h1 className="text-lg sm:text-2xl font-black italic tracking-tighter text-slate-900 uppercase leading-none truncate">Enregistrement</h1>
          <p className="text-[8px] sm:text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1 italic">Pesée & Validation Billet</p>
        </div>
      </header>

      {/* ZONE DE RECHERCHE */}
      <div className="bg-white border-2 border-slate-100 rounded-[1.2rem] sm:rounded-[2rem] p-2 shadow-lg flex gap-2">
        <Input 
          value={qrInput} onChange={e => setQrInput(e.target.value)} 
          placeholder="SCAN QR OU RÉFÉRENCE..." 
          className="h-12 sm:h-14 rounded-xl sm:rounded-2xl border-none bg-slate-50 font-black uppercase text-xs sm:text-sm tracking-tighter sm:tracking-widest px-4 shadow-inner"
          onKeyDown={e => e.key === 'Enter' && handleValidate()} 
        />
        <Button onClick={() => handleValidate()} disabled={loading} className="h-12 w-12 sm:h-14 sm:w-14 shrink-0 rounded-xl sm:rounded-2xl bg-primary">
          {loading ? <RefreshCw className="animate-spin" size={18} /> : <Search size={18} />}
        </Button>
      </div>

      {result && result.booking && (
        <div className="space-y-4 animate-in slide-in-from-bottom-4 duration-500 text-left">
          <div className={`border-2 sm:border-4 rounded-[1.5rem] sm:rounded-[3rem] p-4 sm:p-8 shadow-xl bg-white ${result.valid ? 'border-emerald-500' : 'border-amber-500'}`}>
            
            {/* STATUT ET PASSAGER */}
            <div className="flex items-center justify-between mb-4 sm:mb-8 pb-4 border-b border-dashed border-slate-100">
              <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                {result.valid ? <CheckCircle className="text-emerald-600 shrink-0 h-8 w-8 sm:h-10 sm:w-10" /> : <AlertCircle className="text-amber-600 shrink-0 h-8 w-8 sm:h-10 sm:w-10" />}
                <div className="min-w-0">
                  <h2 className="text-sm sm:text-2xl font-black uppercase tracking-tighter leading-none text-slate-900 truncate">{result.message}</h2>
                  <p className="text-[10px] sm:text-sm font-black text-slate-500 mt-1 uppercase truncate">{result.booking.passengerName}</p>
                </div>
              </div>
              <Badge variant="outline" className="shrink-0 border-primary/20 text-primary font-black text-[8px] sm:text-[10px] uppercase">
                {result.booking.classLabel}
              </Badge>
            </div>

            {/* TRAJET */}
            <div className={`rounded-[1.2rem] sm:rounded-[2rem] p-4 sm:p-6 mb-6 relative overflow-hidden shadow-lg text-white ${result.booking.isEscale ? 'bg-amber-600' : 'bg-slate-900'}`}>
                <div className="flex justify-between items-center relative z-10 gap-2">
                    <div className="flex-1 min-w-0">
                        <Label className="text-[8px] sm:text-[10px] font-black uppercase text-white/60">Départ</Label>
                        <p className="text-xs sm:text-lg font-black uppercase truncate">{result.booking.departureCity}</p>
                    </div>
                    <div className="shrink-0 px-2 flex flex-col items-center">
                        <ArrowRight size={14} className="text-white" />
                    </div>
                    <div className="flex-1 min-w-0 text-right">
                        <Label className="text-[8px] sm:text-[10px] font-black uppercase text-white/60">Arrivée</Label>
                        <p className="text-xs sm:text-lg font-black uppercase truncate">{result.booking.arrivalCity}</p>
                    </div>
                </div>
            </div>

            {/* --- CALCULATEUR DE BAGAGES AUTOMATIQUE --- */}
            <div className="bg-slate-50 p-4 sm:p-6 rounded-[1.2rem] sm:rounded-[2rem] border-2 border-slate-100 mb-6">
                <div className="flex items-center justify-between mb-4">
                    <h4 className="text-[9px] sm:text-[10px] font-black uppercase text-slate-900 opacity-60 flex items-center gap-2 tracking-widest">
                        <Package size={14} className="text-primary" /> Poste de Pesage
                    </h4>
                    {result.booking.tripType === 'TRAIN' && (
                        <Badge className="bg-blue-100 text-blue-700 border-none text-[8px] uppercase font-black">
                            {result.booking.freeWeight}kg Inclus
                        </Badge>
                    )}
                </div>
                
                <div className="space-y-3">
                    {/* Liste des bagages déjà enregistrés */}
                    {result.booking.luggages.length > 0 && (
                        <div className="space-y-1.5 mb-4">
                            {result.booking.luggages.map((lug: any) => (
                                <div key={lug.id} className="flex justify-between items-center bg-white p-2 rounded-lg border border-slate-100 text-[9px] sm:text-[11px] font-bold">
                                    <span className="text-slate-600 truncate mr-2 italic">{lug.label}</span>
                                    <span className="text-primary font-black shrink-0">{(lug.total_price || 0).toLocaleString()} F</span>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Interface de calcul dynamique */}
                    {!result.booking.passengers.some((p: any) => p.boarded) && (
                        <div className="p-4 bg-white rounded-2xl border-2 border-dashed border-primary/20 space-y-4">
                            {result.booking.tripType === 'TRAIN' ? (
                                <div className="space-y-4">
                                    <div className="flex flex-col gap-2">
                                        <Label className="text-[9px] font-black uppercase text-slate-400 ml-1">Poids Total sur Balance (KG)</Label>
                                        <Input 
                                            type="number" 
                                            placeholder="0.0" 
                                            value={weightInput} 
                                            onChange={e => setWeightInput(e.target.value)} 
                                            className="h-12 rounded-xl bg-slate-50 border-none font-black text-xl text-center shadow-inner" 
                                        />
                                    </div>
                                    {/* Résumé du calcul Train */}
                                    {weightInput && (
                                        <div className="bg-primary/5 p-3 rounded-xl flex justify-between items-center animate-in zoom-in-95">
                                            <div>
                                                <p className="text-[8px] font-black text-primary uppercase">Excédent calculé</p>
                                                <p className="font-black text-slate-700 text-sm">{Math.max(0, parseFloat(weightInput) - result.booking.freeWeight)} KG</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[8px] font-black text-primary uppercase">Prix à payer</p>
                                                <p className="font-black text-primary text-lg">{currentCalculation.toLocaleString()} F</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="flex flex-col gap-2">
                                        <Label className="text-[9px] font-black uppercase text-slate-400 ml-1">Type d'article / Forfait</Label>
                                        <select 
                                            value={selectedRateId} 
                                            onChange={e => setSelectedRateId(e.target.value)}
                                            className="w-full h-11 rounded-xl bg-slate-50 border-none px-4 text-[10px] font-black uppercase outline-none shadow-inner"
                                        >
                                            <option value="">Sélectionner...</option>
                                            {agencyRates.map(r => (
                                                <option key={r.id} value={r.id}>{r.label} ({r.price} F)</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="flex gap-4">
                                        <div className="flex-1 space-y-1.5">
                                            <Label className="text-[9px] font-black uppercase text-slate-400 ml-1">Quantité</Label>
                                            <Input type="number" value={qtyInput} onChange={e => setQtyInput(e.target.value)} className="h-11 rounded-xl bg-slate-50 border-none font-black text-center" />
                                        </div>
                                        <div className="flex-[2] text-right flex flex-col justify-end">
                                            <p className="text-[8px] font-black text-primary uppercase mb-1">Montant Forfait</p>
                                            <p className="font-black text-primary text-xl leading-none">{currentCalculation.toLocaleString()} F</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <Button 
                                onClick={handleAddExtraLuggage} 
                                disabled={result.booking.tripType !== 'TRAIN' && !selectedRateId}
                                className="w-full h-12 rounded-xl font-black bg-slate-900 text-white uppercase tracking-widest text-[10px] gap-2 shadow-lg active:scale-95 transition-all"
                            >
                                <Calculator size={16} /> Enregistrer & Valider Bagage
                            </Button>
                        </div>
                    )}
                </div>
            </div>

            {/* --- SECTION CAISSE (Mise à jour en temps réel) --- */}
            {!result.valid && (
                <div className="bg-emerald-600 p-5 sm:p-8 rounded-[1.5rem] sm:rounded-[2.5rem] shadow-xl text-white text-center space-y-4 mb-6 relative overflow-hidden">
                    <div className="flex items-center justify-center gap-2 relative z-10">
                        <Wallet size={24} className="opacity-70" />
                        <h3 className="text-base sm:text-xl font-black uppercase italic">Encaisser au Guichet</h3>
                    </div>
                    
                    <div className="bg-white/10 p-3 sm:p-5 rounded-xl space-y-2 border border-white/20 text-[10px] sm:text-xs relative z-10">
                        <div className="flex justify-between font-bold uppercase opacity-80">
                            <span>Billet {result.booking.classLabel} :</span>
                            <span>{result.booking.ticketAmount.toLocaleString()} F</span>
                        </div>
                        <div className="flex justify-between font-bold uppercase">
                            <span>Excédents Bagages :</span>
                            <span className="text-amber-300">+{result.booking.luggageAmount.toLocaleString()} F</span>
                        </div>
                        <div className="h-px bg-white/20 my-1" />
                        <div className="flex justify-between text-base sm:text-lg font-black uppercase tracking-tighter">
                            <span>TOTAL À PAYER :</span>
                            <span className="text-xl sm:text-3xl">{result.booking.totalToPay.toLocaleString()} F</span>
                        </div>
                    </div>

                    {canCollectMoney ? (
                        <Button 
                            onClick={handleProcessPayment}
                            className="w-full h-14 sm:h-16 bg-white text-emerald-700 hover:bg-slate-50 rounded-xl sm:rounded-2xl font-black text-sm sm:text-xl shadow-lg uppercase relative z-10"
                        >
                            CONFIRMER LE PAIEMENT
                        </Button>
                    ) : (
                        <div className="p-3 bg-black/20 rounded-xl text-[9px] font-black uppercase italic">
                            En attente de paiement à la caisse
                        </div>
                    )}
                    
                    {/* Décoration de fond */}
                    <Calculator className="absolute -bottom-4 -right-4 h-24 w-24 text-white/5 rotate-12" />
                </div>
            )}

            {/* EMBARQUEMENT FINAL */}
            {result.valid && (
                <div className="space-y-3">
                    <div className="flex items-center justify-between ml-2">
                        <h3 className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Liste de montée</h3>
                        <Badge className="bg-emerald-500 text-white border-none font-black text-[8px]">TOTAL PAYÉ</Badge>
                    </div>
                    <div className="space-y-2">
                        {result.booking.passengers.map((p: any) => (
                            <div key={p.id} className="flex items-center justify-between p-3 sm:p-5 bg-white border-2 border-slate-100 rounded-xl sm:rounded-2xl">
                                <div className="min-w-0 pr-2">
                                    <p className="font-black text-xs sm:text-sm text-slate-900 uppercase truncate leading-tight">{p.first_name} {p.last_name}</p>
                                    <p className="text-[8px] font-bold text-slate-400 uppercase">Siège {result.booking.seatNumber}</p>
                                </div>
                                {p.boarded ? (
                                    <Badge className="bg-emerald-50 text-emerald-600 border-emerald-100 px-3 py-1 rounded-lg font-black text-[8px] sm:text-[10px] shrink-0">DÉJÀ À BORD</Badge>
                                ) : (
                                    <Button 
                                        disabled={!canBoard}
                                        onClick={() => handleBoardPassenger(p.id)} 
                                        className="h-9 sm:h-10 px-4 sm:px-8 rounded-lg sm:rounded-xl font-black text-[9px] sm:text-[10px] uppercase bg-slate-900 shrink-0"
                                    >
                                        Embarquer
                                    </Button>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}
          </div>
        </div>
      )}

      {/* FOOTER VIDE */}
      {!result && (
        <div className="pt-10 sm:pt-20 text-center opacity-20">
            <Ticket size={60} className="mx-auto mb-4" />
            <p className="text-xs font-black uppercase tracking-[0.4em]">En attente de scan</p>
        </div>
      )}
    </div>
  );
}