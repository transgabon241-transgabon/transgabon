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
  CheckCircle, Search, RefreshCw, AlertCircle, Package, Ticket, 
  Hash, Ship, Bus, Train, ArrowRight, Phone, Wallet, Plus, Scale, Gem, Calculator, Info, Lock,
  Calendar, Clock, MapPin, Car, UserCheck
} from 'lucide-react';

export default function AgencyValidate() {
  const { user } = useAuth();
  const [qrInput, setQrInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [boardingId, setBoardingId] = useState<string | null>(null);

  // États pour la console de pesée
  const [agencyRates, setAgencyRates] = useState<any[]>([]);
  const [selectedRateId, setSelectedRateId] = useState("");
  const [weightInput, setWeightInput] = useState("");
  const [qtyInput, setQtyInput] = useState("1");

  const userRole = user?.role;
  const canCollectMoney = ['Administrateur', 'Agent', 'Caissier'].includes(userRole || '');
  const canBoard = ['Administrateur', 'Agent', 'Agent Embarquement'].includes(userRole || '');

  // CALCULATEUR DYNAMIQUE
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
            vehicle:vehicles (name, registration)
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

      const { data: rates } = await supabase.from('company_luggage_settings').select('*').eq('company_id', b.trip.company_id);
      if (rates) setAgencyRates(rates);

      const luggageTotal = (b.luggages || []).reduce((sum: number, l: any) => sum + (Number(l.total_price) || 0), 0);
      
      const terminusName = b.trip.to_city?.name;
      const ticketDest = b.arrival_city_name || terminusName;
      const isEscale = ticketDest.toLowerCase() !== terminusName.toLowerCase();

      const classMapping: Record<string, string> = {
        'VIP': 'SALON VIP', 'BUSINESS': 'BUSINESS', '1ERE_CLASSE': '1ÈRE CL.',
        '2EME_CLASSE': '2ÈME CL.', 'ECO': 'ÉCO', 'STANDARD': 'STD'
      };

      setResult({
        valid: b.status === 'PAYE',
        message: b.status === 'PAYE' ? 'ACCÈS VALIDE' : 'PAIEMENT REQUIS',
        booking: {
          id: b.id,
          bookingNumber: b.reference,
          passengerName: `${b.passengers[0]?.first_name || ''} ${b.passengers[0]?.last_name || ''}`,
          passengerPhone: b.contact_phone || '—',
          departureCity: b.trip.from_city?.name,
          arrivalCity: ticketDest,
          terminusName: terminusName,
          isEscale: isEscale,
          departureDate: b.trip.departure_date,
          departureTime: b.trip.departure_time,
          classLabel: classMapping[b.class_type] || b.class_type,
          vehicleName: b.trip.vehicle?.name || 'Bus',
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

  const handleConfirmWeighing = async () => {
    if (!result?.booking) return;
    setLoading(true);
    try {
      const label = result.booking.tripType === 'TRAIN' 
        ? `Pesée Officielle (${weightInput}kg)` 
        : agencyRates.find(r => r.id === selectedRateId)?.label || "Article Agence";

      const { error: lugError } = await supabase.from('luggages').insert([{
        booking_id: result.booking.id,
        passenger_id: result.booking.passengers[0]?.id,
        label: label,
        quantity: parseInt(qtyInput) || 1,
        total_price: currentCalculation
      }]);

      if (lugError) throw lugError;

      if (currentCalculation > 0) {
        await supabase.from('bookings').update({ status: 'ATTENTE' }).eq('id', result.booking.id);
        toast.warning("Excédent enregistré : Paiement requis en caisse");
      } else {
        toast.success("Bagage conforme");
      }

      setWeightInput("");
      handleValidate(result.booking.bookingNumber);
    } catch (e) {
      toast.error("Erreur système");
    } finally { setLoading(false); }
  };

  const handleProcessPayment = async () => {
    if (!result?.booking) return;
    setLoading(true);
    try {
      const { error } = await supabase.from('bookings').update({ status: 'PAYE' }).eq('id', result.booking.id);
      if (error) throw error;
      toast.success("Paiement encaissé ! Autorisez maintenant l'embarquement.");
      handleValidate(result.booking.bookingNumber);
    } catch (e) { toast.error("Erreur caisse"); }
    finally { setLoading(false); }
  };

  const handleBoardPassenger = async (passengerId: string) => {
    setBoardingId(passengerId);
    try {
      const { error } = await supabase.from('passengers').update({ boarded: true }).eq('id', passengerId);
      if (error) throw error;
      toast.success("Embarquement validé : Passager ajouté au manifeste");
      handleValidate(result.booking.bookingNumber);
    } finally { setBoardingId(null); }
  };

  return (
    <div className="max-w-2xl mx-auto p-2 sm:p-4 pb-20 space-y-4 animate-in fade-in duration-500 bg-background">
      
      {/* HEADER SOMBRE */}
      <header className="flex items-center gap-3 bg-slate-900 p-4 rounded-[1.5rem] border-2 border-slate-800 shadow-xl w-full text-left">
        <div className="p-2 bg-emerald-600 rounded-xl text-white shrink-0"><UserCheck size={20} /></div>
        <div className="min-w-0 text-left">
          <h1 className="text-lg font-black italic tracking-tighter uppercase leading-none text-white">Gestion Embarquement</h1>
          <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest mt-1 italic">Vérification & Manifeste</p>
        </div>
      </header>

      {/* RECHERCHE SOMBRE */}
      <div className="bg-slate-900 border-2 border-slate-800 rounded-[1.2rem] p-2 shadow-lg flex gap-2">
        <Input 
          value={qrInput} onChange={e => setQrInput(e.target.value)} 
          placeholder="SCAN OU RÉFÉRENCE..." 
          className="h-12 rounded-xl border-none bg-slate-950 text-white font-black uppercase text-xs px-4 shadow-inner"
          onKeyDown={e => e.key === 'Enter' && handleValidate()} 
        />
        <Button onClick={() => handleValidate()} disabled={loading} className="h-12 w-12 shrink-0 rounded-xl bg-primary text-white hover:bg-primary/90">
          {loading ? <RefreshCw className="animate-spin" size={18} /> : <Search size={18} />}
        </Button>
      </div>

      {result && result.booking && (
        <div className="space-y-4 animate-in slide-in-from-bottom-4 duration-500 text-left">
          
          <div className={`border-2 rounded-[1.5rem] p-4 bg-slate-900 shadow-2xl ${result.valid ? 'border-emerald-500/50' : 'border-amber-500/50 shadow-amber-500/10'}`}>
            
            {/* STATUT / PASSAGER */}
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-dashed border-slate-800">
              <div className="flex items-center gap-3 min-w-0">
                {result.valid ? <CheckCircle className="text-emerald-500 h-10 w-10 shrink-0" /> : <AlertCircle className="text-amber-500 h-10 w-10 shrink-0" />}
                <div className="min-w-0 text-left">
                  <h2 className="text-sm font-black uppercase tracking-tighter leading-none text-white truncate">{result.message}</h2>
                  <p className="text-[10px] font-black text-slate-500 mt-1 uppercase truncate">{result.booking.passengerName}</p>
                </div>
              </div>
              <Badge className="bg-slate-800 text-white text-[8px] font-black px-2 py-1 rounded-lg uppercase shrink-0 border border-slate-700">{result.booking.classLabel}</Badge>
            </div>

            {/* RÉCAPITULATIF VOYAGE DÉTAILLÉ SOMBRE */}
            <div className="space-y-3 mb-6">
                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex-1 text-left">
                            <Label className="text-[8px] font-black uppercase text-slate-500 mb-1 block">Départ</Label>
                            <p className="text-sm font-black text-white uppercase truncate">{result.booking.departureCity}</p>
                        </div>
                        <ArrowRight size={16} className="text-primary shrink-0" />
                        <div className="flex-1 text-right">
                            <Label className="text-[8px] font-black uppercase text-slate-500 mb-1 block">Destination</Label>
                            <p className="text-sm font-black text-white uppercase truncate">{result.booking.arrivalCity}</p>
                        </div>
                    </div>
                    {result.booking.isEscale && (
                        <div className="mt-2 pt-2 border-t border-slate-800 flex items-center gap-2">
                             <Info size={12} className="text-amber-500" />
                             <p className="text-[8px] font-bold text-slate-500 uppercase italic">Escale (Terminus : {result.booking.terminusName})</p>
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-2 gap-2">
                    <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center gap-3">
                        <Hash size={18} className="text-primary shrink-0" />
                        <div className="text-left">
                            <Label className="text-[8px] font-black text-slate-500 uppercase">Siège</Label>
                            <p className="text-base font-black text-white leading-none">{result.booking.seatNumber}</p>
                        </div>
                    </div>
                    <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center gap-3 text-left">
                        <Clock size={18} className="text-primary shrink-0" />
                        <div>
                            <Label className="text-[8px] font-black text-slate-500 uppercase">Départ</Label>
                            <p className="text-[11px] font-black text-slate-200 uppercase">{result.booking.departureTime}</p>
                        </div>
                    </div>
                    <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center gap-3 text-left">
                        <Car size={18} className="text-primary shrink-0" />
                        <div className="min-w-0">
                            <Label className="text-[8px] font-black text-slate-500 uppercase">Appareil</Label>
                            <p className="text-[10px] font-black text-slate-200 uppercase truncate">{result.booking.vehicleName}</p>
                        </div>
                    </div>
                    <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center gap-3 text-left">
                        <Calendar size={18} className="text-primary shrink-0" />
                        <div>
                            <Label className="text-[8px] font-black text-slate-500 uppercase">Date</Label>
                            <p className="text-[10px] font-black text-slate-200 uppercase">{new Date(result.booking.departureDate).toLocaleDateString('fr-FR', {day:'2-digit', month:'short'})}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* CONSOLE DE PESÉE SOMBRE */}
            <div className="bg-slate-950 p-4 rounded-2xl border-2 border-slate-800 mb-6 shadow-inner">
                <div className="flex items-center justify-between mb-4">
                    <h4 className="text-[9px] font-black uppercase text-slate-500 flex items-center gap-2">
                        <Scale size={14} className="text-primary" /> Pesée Officielle (Balance)
                    </h4>
                    {result.booking.tripType === 'TRAIN' && (
                        <Badge className="bg-primary/20 text-primary border-none text-[8px] font-black uppercase">Franchise {result.booking.freeWeight}kg</Badge>
                    )}
                </div>

                <div className="space-y-4">
                    {result.booking.tripType === 'TRAIN' ? (
                        <div className="space-y-3">
                            <div className="relative">
                                <Input 
                                    type="number" 
                                    placeholder="0.0" 
                                    value={weightInput} 
                                    onChange={e => setWeightInput(e.target.value)} 
                                    className="h-14 rounded-xl border-none bg-slate-900 text-white font-black text-3xl text-center shadow-inner" 
                                />
                                <span className="absolute right-4 top-1/2 -translate-y-1/2 font-black text-slate-700 text-xs tracking-widest">KG</span>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-2">
                             <select 
                                value={selectedRateId} 
                                onChange={e => setSelectedRateId(e.target.value)}
                                className="w-full h-11 rounded-xl bg-slate-900 border-none px-4 text-[10px] font-black uppercase text-white outline-none shadow-inner"
                            >
                                <option value="" className="text-slate-500">Ajouter Bagage...</option>
                                {agencyRates.map(r => <option key={r.id} value={r.id} className="text-black">{r.label} ({r.price} F)</option>)}
                            </select>
                            <div className="flex gap-2">
                                <Input type="number" value={qtyInput} onChange={e => setQtyInput(e.target.value)} className="w-16 h-11 rounded-xl border-none bg-slate-900 text-white font-black text-center shadow-inner" />
                                <div className="flex-1 flex items-center justify-end px-4 bg-primary/10 rounded-xl">
                                    <p className="font-black text-primary text-xs">{currentCalculation.toLocaleString()} F</p>
                                </div>
                            </div>
                        </div>
                    )}

                    <Button 
                        onClick={handleConfirmWeighing} 
                        className="w-full min-h-[3rem] h-auto py-2 px-2 rounded-xl font-black bg-emerald-600 text-white hover:bg-emerald-500 uppercase text-[10px] sm:text-xs gap-2 shadow-lg active:scale-95 transition-all flex items-center justify-center text-center leading-tight whitespace-normal break-words"
                    >
                        <CheckCircle size={18} className="shrink-0" /> 
                        <span>Confirmer & Valider Pesée</span>
                    </Button>
                </div>
            </div>

            {/* SECTION CAISSE SOMBRE */}
            {!result.valid && (
                <div className="bg-slate-800 p-4 rounded-2xl shadow-xl text-white mb-6 border border-slate-700">
                    <div className="flex items-center gap-2 mb-3">
                        <Wallet size={16} className="text-emerald-500" />
                        <h3 className="text-[10px] font-black uppercase italic text-slate-400">Paiement au Guichet</h3>
                    </div>
                    
                    <div className="bg-slate-950 p-3 rounded-xl space-y-2 border border-slate-800 text-[10px]">
                        <div className="flex justify-between font-bold uppercase text-slate-500">
                            <span>Prix Billet :</span>
                            <span>{result.booking.ticketAmount.toLocaleString()} F</span>
                        </div>
                        {result.booking.luggageAmount > 0 && (
                            <div className="flex justify-between font-bold uppercase text-slate-500">
                                <span>Excédents (Pesés) :</span>
                                <span className="text-amber-500">+{result.booking.luggageAmount.toLocaleString()} F</span>
                            </div>
                        )}
                        <div className="h-px bg-slate-800 my-1" />
                        <div className="flex justify-between text-base font-black tracking-tighter text-white">
                            <span>TOTAL À PAYER :</span>
                            <span className="text-xl text-emerald-500">{result.booking.totalToPay.toLocaleString()} F</span>
                        </div>
                    </div>

                    {canCollectMoney ? (
                        <Button 
                            onClick={handleProcessPayment} 
                            className="w-full min-h-[3rem] h-auto py-2 px-4 bg-emerald-600 text-white hover:bg-emerald-500 rounded-xl font-black text-[11px] sm:text-xs uppercase mt-4 shadow-lg flex items-center justify-center text-center leading-tight whitespace-normal break-words border-none"
                        >
                            Encaisser le montant dû
                        </Button>
                    ) : (
                        <div className="mt-3 flex items-center gap-2 justify-center text-[8px] font-black uppercase bg-amber-500/10 text-amber-500 p-2 rounded-lg italic border border-amber-500/20">
                            <Info size={12}/> Envoyer le passager à la caisse
                        </div>
                    )}
                </div>
            )}

            {/* EMBARQUEMENT (MANIFESTE TERRAIN) SOMBRE */}
            {result.valid && (
                <div className="space-y-3 animate-in fade-in duration-500">
                    <div className="flex items-center justify-between ml-2">
                        <h3 className="text-[9px] font-black uppercase text-slate-500 tracking-widest">Manifeste d'embarquement</h3>
                        <Badge className="bg-emerald-500/10 text-emerald-500 border-none font-black text-[7px]">SOLDE RÉGLÉ ✅</Badge>
                    </div>
                    <div className="space-y-2">
                        {result.booking.passengers.map((p: any) => (
                            <div key={p.id} className="flex items-center justify-between p-3 bg-slate-950 border-2 border-slate-800 rounded-xl transition-all">
                                <div className="min-w-0 pr-2 text-left">
                                    <p className="font-black text-xs text-white uppercase truncate leading-none">{p.first_name} {p.last_name}</p>
                                    <p className="text-[8px] font-bold text-slate-500 uppercase mt-1 italic">Vérifier l'identité</p>
                                </div>
                                {p.boarded ? (
                                    <Badge className="bg-emerald-500/10 text-emerald-500 border-none px-3 py-1 rounded-lg font-black text-[8px]">EMBARQUÉ</Badge>
                                ) : (
                                    <Button 
                                        disabled={!canBoard}
                                        onClick={() => handleBoardPassenger(p.id)} 
                                        className="h-10 px-6 rounded-lg font-black text-[9px] uppercase bg-emerald-600 text-white shadow-lg active:scale-95 transition-all border-none"
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

      {/* FOOTER VIDE SOMBRE */}
      {!result && (
        <div className="pt-20 text-center opacity-10">
            <Ticket size={60} className="mx-auto mb-4 text-white" />
            <p className="text-xs font-black uppercase tracking-[0.4em] text-white">Scan Requis pour Embarquer</p>
        </div>
      )}
    </div>
  );
}