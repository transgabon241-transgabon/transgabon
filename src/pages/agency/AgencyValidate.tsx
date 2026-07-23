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
  Calendar, Clock, MapPin, Car
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
          classLabel: b.class_type,
          vehicleName: b.trip.vehicle?.name || 'Inconnu',
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
    if (result.booking.tripType === 'TRAIN' && !weightInput) return toast.error("Saisir le poids balance");

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
        toast.warning("Dette enregistrée : Client envoyé en caisse");
      } else {
        toast.success("Poids conforme validé");
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
      toast.success("Paiement encaissé !");
      handleValidate(result.booking.bookingNumber);
    } catch (e) { toast.error("Erreur caisse"); }
    finally { setLoading(false); }
  };

  const handleBoardPassenger = async (passengerId: string) => {
    setBoardingId(passengerId);
    try {
      const { error } = await supabase.from('passengers').update({ boarded: true }).eq('id', passengerId);
      if (error) throw error;
      toast.success("Passager embarqué");
      handleValidate(result.booking.bookingNumber);
    } finally { setBoardingId(null); }
  };

  return (
    <div className="max-w-2xl mx-auto p-2 sm:p-4 pb-20 space-y-4 animate-in fade-in duration-500">
      
      <header className="flex items-center gap-3 bg-white p-4 rounded-[1.5rem] border-2 border-slate-100 shadow-sm w-full text-left text-slate-900">
        <div className="p-2 bg-emerald-600 rounded-xl text-white shrink-0"><Scale size={20} /></div>
        <div className="min-w-0">
          <h1 className="text-lg font-black italic tracking-tighter uppercase leading-none">Contrôle Embarquement</h1>
          <p className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest mt-1 italic">Vérification des accès passagers</p>
        </div>
      </header>

      <div className="bg-white border-2 border-slate-100 rounded-[1.2rem] p-2 shadow-lg flex gap-2">
        <Input 
          value={qrInput} onChange={e => setQrInput(e.target.value)} 
          placeholder="RÉFÉRENCE OU SCAN..." 
          className="h-12 rounded-xl border-none bg-slate-50 font-black uppercase text-xs px-4"
          onKeyDown={e => e.key === 'Enter' && handleValidate()} 
        />
        <Button onClick={() => handleValidate()} disabled={loading} className="h-12 w-12 shrink-0 rounded-xl bg-primary">
          {loading ? <RefreshCw className="animate-spin" size={18} /> : <Search size={18} />}
        </Button>
      </div>

      {result && result.booking && (
        <div className="space-y-4 animate-in slide-in-from-bottom-4 duration-500 text-left">
          
          <div className={`border-2 rounded-[1.5rem] p-4 bg-white shadow-xl ${result.valid ? 'border-emerald-500' : 'border-amber-500'}`}>
            
            {/* STATUT ACCÈS */}
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-dashed">
              <div className="flex items-center gap-3">
                {result.valid ? <CheckCircle className="text-emerald-600 h-10 w-10 shrink-0" /> : <AlertCircle className="text-amber-600 h-10 w-10 shrink-0" />}
                <div>
                  <h2 className="text-base font-black uppercase tracking-tighter text-slate-900 leading-none">{result.message}</h2>
                  <p className="text-[10px] font-black text-slate-400 mt-1">REF: {result.booking.bookingNumber}</p>
                </div>
              </div>
              <Badge className="bg-slate-900 text-white font-black px-3 py-1 rounded-lg text-[9px] uppercase tracking-wider">{result.booking.classLabel}</Badge>
            </div>

            {/* --- CARTE RÉCAPITULATIVE DU VOYAGE (AMÉLIORATION LECTURE) --- */}
            <div className="grid grid-cols-1 gap-3 mb-6">
                {/* Bloc Trajet */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex-1">
                            <Label className="text-[8px] font-black uppercase text-slate-400 mb-1 block">Départ</Label>
                            <p className="text-sm font-black text-slate-900 uppercase">{result.booking.departureCity}</p>
                        </div>
                        <ArrowRight size={16} className="text-primary shrink-0" />
                        <div className="flex-1 text-right">
                            <Label className="text-[8px] font-black uppercase text-slate-400 mb-1 block">Destination</Label>
                            <p className="text-sm font-black text-slate-900 uppercase truncate">{result.booking.arrivalCity}</p>
                        </div>
                    </div>
                    {result.booking.isEscale && (
                        <div className="mt-2 pt-2 border-t border-slate-200 flex items-center gap-2">
                             <Info size={12} className="text-amber-500" />
                             <p className="text-[9px] font-bold text-slate-500 uppercase italic">Attention : Le véhicule continue jusqu'à {result.booking.terminusName}</p>
                        </div>
                    )}
                </div>

                {/* Grille Infos Techniques */}
                <div className="grid grid-cols-2 gap-3">
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex items-center gap-3">
                        <Calendar size={16} className="text-primary shrink-0" />
                        <div>
                            <Label className="text-[8px] font-black text-slate-400 uppercase">Date</Label>
                            <p className="text-[11px] font-black text-slate-700">{new Date(result.booking.departureDate).toLocaleDateString('fr-FR', {day: '2-digit', month: 'short'})}</p>
                        </div>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex items-center gap-3">
                        <Clock size={16} className="text-primary shrink-0" />
                        <div>
                            <Label className="text-[8px] font-black text-slate-400 uppercase">Heure</Label>
                            <p className="text-[11px] font-black text-slate-700">{result.booking.departureTime}</p>
                        </div>
                    </div>
                    <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 flex items-center gap-3 shadow-lg">
                        <Hash size={18} className="text-primary shrink-0" />
                        <div>
                            <Label className="text-[8px] font-black text-primary/60 uppercase">Siège</Label>
                            <p className="text-base font-black text-white leading-none">{result.booking.seatNumber}</p>
                        </div>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex items-center gap-3">
                        <Car size={16} className="text-primary shrink-0" />
                        <div className="min-w-0">
                            <Label className="text-[8px] font-black text-slate-400 uppercase">Appareil</Label>
                            <p className="text-[10px] font-black text-slate-700 uppercase truncate">{result.booking.vehicleName}</p>
                        </div>
                    </div>
                </div>

                {/* Bloc Passager */}
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="h-8 w-8 bg-white rounded-full flex items-center justify-center text-slate-400 border"><Ticket size={14}/></div>
                        <div>
                            <Label className="text-[8px] font-black text-slate-400 uppercase">Passager</Label>
                            <p className="text-xs font-black text-slate-900 uppercase truncate">{result.booking.passengerName}</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <Label className="text-[8px] font-black text-slate-400 uppercase">Contact</Label>
                        <p className="text-[10px] font-bold text-slate-600">{result.booking.passengerPhone}</p>
                    </div>
                </div>
            </div>

            {/* --- CONSOLE DE PESÉE --- */}
            <div className="bg-slate-900 p-4 rounded-2xl border-2 border-slate-800 mb-4">
                <div className="flex items-center justify-between mb-4">
                    <h4 className="text-[9px] font-black uppercase text-white/50 flex items-center gap-2">
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
                                    className="h-14 rounded-xl border-none bg-white/5 text-white font-black text-3xl text-center shadow-inner" 
                                />
                                <span className="absolute right-4 top-1/2 -translate-y-1/2 font-black text-white/10 text-xs tracking-widest">KG</span>
                            </div>
                            {weightInput && (
                                <div className="bg-white/5 p-3 rounded-xl flex justify-between items-center animate-in zoom-in-95">
                                    <div className="text-left">
                                        <p className="text-[7px] font-black uppercase text-white/40">Excédent</p>
                                        <p className="font-black text-white text-xs">{Math.max(0, parseFloat(weightInput) - result.booking.freeWeight).toFixed(1)} KG</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[7px] font-black uppercase text-primary">Taxe Supplémentaire</p>
                                        <p className="font-black text-primary text-sm">{currentCalculation.toLocaleString()} F</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-2">
                             <select 
                                value={selectedRateId} 
                                onChange={e => setSelectedRateId(e.target.value)}
                                className="w-full h-11 rounded-xl bg-white/5 border-none px-4 text-[10px] font-black uppercase text-white outline-none"
                            >
                                <option value="" className="text-black">Ajouter un article...</option>
                                {agencyRates.map(r => <option key={r.id} value={r.id} className="text-black">{r.label} ({r.price} F)</option>)}
                            </select>
                            <div className="flex gap-2">
                                <Input type="number" value={qtyInput} onChange={e => setQtyInput(e.target.value)} className="w-16 h-11 rounded-xl border-none bg-white/5 text-white font-black text-center shadow-inner" />
                                <div className="flex-1 flex items-center justify-end px-4 bg-primary rounded-xl">
                                    <p className="font-black text-black text-xs">{currentCalculation.toLocaleString()} F</p>
                                </div>
                            </div>
                        </div>
                    )}

                    <Button 
                        onClick={handleConfirmWeighing} 
                        className="w-full min-h-[3rem] h-auto py-2 px-2 rounded-xl font-black bg-primary text-black hover:bg-primary/90 uppercase text-[10px] sm:text-xs gap-2 shadow-lg active:scale-95 transition-all flex items-center justify-center text-center leading-tight whitespace-normal break-words"
                    >
                        <CheckCircle size={18} className="shrink-0" /> 
                        <span>Confirmer le poids officiel</span>
                    </Button>
                </div>
            </div>

            {/* SECTION CAISSE */}
            {!result.valid && (
                <div className="bg-emerald-600 p-4 rounded-2xl shadow-xl text-white mb-4">
                    <div className="flex items-center gap-2 mb-3">
                        <Wallet size={16} className="opacity-70" />
                        <h3 className="text-[10px] font-black uppercase italic">Action Requise</h3>
                    </div>
                    
                    <div className="bg-white/10 p-3 rounded-xl space-y-2 border border-white/20 text-[10px]">
                        <div className="flex justify-between font-bold uppercase">
                            <span>Prix Billet :</span>
                            <span>{result.booking.ticketAmount.toLocaleString()} F</span>
                        </div>
                        {result.booking.luggageAmount > 0 && (
                            <div className="flex justify-between font-bold uppercase">
                                <span>Bagages (Pesé) :</span>
                                <span className="text-amber-300">+{result.booking.luggageAmount.toLocaleString()} F</span>
                            </div>
                        )}
                        <div className="h-px bg-white/20 my-1" />
                        <div className="flex justify-between text-base font-black tracking-tighter">
                            <span>TOTAL À PAYER :</span>
                            <span>{result.booking.totalToPay.toLocaleString()} F</span>
                        </div>
                    </div>

                    {canCollectMoney ? (
                        <Button 
                            onClick={handleProcessPayment} 
                            className="w-full min-h-[3rem] h-auto py-2 px-4 bg-white text-emerald-700 hover:bg-slate-50 rounded-xl font-black text-[11px] sm:text-xs uppercase mt-4 shadow-lg flex items-center justify-center text-center leading-tight whitespace-normal break-words"
                        >
                            Encaisser le montant dû
                        </Button>
                    ) : (
                        <div className="mt-3 flex items-center gap-2 justify-center text-[8px] font-black uppercase bg-black/20 p-2 rounded-lg italic">
                            <Info size={12}/> Envoyer en caisse avant de monter
                        </div>
                    )}
                </div>
            )}

            {/* EMBARQUEMENT FINAL */}
            {result.valid && (
                <div className="space-y-3">
                    <div className="flex items-center justify-between ml-2">
                        <h3 className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Liste d'appel</h3>
                        <Badge className="bg-emerald-500 text-white border-none font-black text-[7px]">RÉGLÉ ✅</Badge>
                    </div>
                    <div className="space-y-2">
                        {result.booking.passengers.map((p: any) => (
                            <div key={p.id} className="flex items-center justify-between p-3 bg-white border-2 border-slate-100 rounded-xl transition-all">
                                <div className="min-w-0 pr-2">
                                    <p className="font-black text-xs text-slate-900 uppercase truncate leading-none">{p.first_name} {p.last_name}</p>
                                    <p className="text-[8px] font-bold text-slate-400 uppercase mt-1">Siège {result.booking.seatNumber}</p>
                                </div>
                                {p.boarded ? (
                                    <Badge className="bg-emerald-50 text-emerald-600 border-none px-3 py-1 rounded-lg font-black text-[8px]">À BORD</Badge>
                                ) : (
                                    <Button 
                                        disabled={!canBoard}
                                        onClick={() => handleBoardPassenger(p.id)} 
                                        className="h-9 px-4 rounded-lg font-black text-[9px] uppercase bg-slate-900 text-white"
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

      {!result && (
        <div className="pt-20 text-center opacity-20">
            <Ticket size={60} className="mx-auto mb-4 text-slate-900" />
            <p className="text-xs font-black uppercase tracking-[0.4em] text-slate-900">Scan Requis</p>
        </div>
      )}
    </div>
  );
}