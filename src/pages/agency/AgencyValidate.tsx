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
  Hash, Ship, Bus, Train, Plane, ArrowRight, Phone, Wallet, Plus, Scale, Gem, Calculator, Info, Lock,
  Calendar, Clock, MapPin, Car, UserCheck, Trash2
} from 'lucide-react';

export default function AgencyValidate() {
  const { user } = useAuth();
  const [qrInput, setQrInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [boardingId, setBoardingId] = useState<string | null>(null);

  const [agencyRates, setAgencyRates] = useState<any[]>([]);
  const [selectedRateId, setSelectedRateId] = useState("");
  const [weightInput, setWeightInput] = useState("");
  const [qtyInput, setQtyInput] = useState("1");

  const userRole = user?.role;
  const canCollectMoney = ['Administrateur', 'Agent', 'Caissier'].includes(userRole || '');
  const canBoard = ['Administrateur', 'Agent', 'Agent Embarquement'].includes(userRole || '');

  const currentCalculation = useMemo(() => {
    if (!result?.booking) return 0;
    
    if (result.booking.tripType === 'TRAIN' || result.booking.tripType === 'PLANE') {
      const w = parseFloat(weightInput) || 0;
      // On calcule uniquement l'excédent par rapport à la franchise gratuite
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
      const ticketDest = b.arrival_city_name || b.trip.to_city?.name;

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

  // NOUVELLE FONCTION : Supprimer un bagage (pour corriger les erreurs ou bagages déclarés en ligne)
  const handleDeleteLuggage = async (lugId: string) => {
    if (!confirm("Supprimer ce bagage pour refaire la pesée ?")) return;
    setLoading(true);
    try {
      const { error } = await supabase.from('luggages').delete().eq('id', lugId);
      if (error) throw error;
      toast.success("Bagage retiré");
      handleValidate(result.booking.bookingNumber);
    } catch (e) {
      toast.error("Erreur de suppression");
    } finally { setLoading(false); }
  };

  const handleConfirmWeighing = async () => {
    if (!result?.booking) return;
    setLoading(true);
    try {
      const isWeightBased = result.booking.tripType === 'TRAIN' || result.booking.tripType === 'PLANE';
      const label = isWeightBased 
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

      // Si un nouveau montant est dû, on repasse le billet en attente
      if (currentCalculation > 0) {
        await supabase.from('bookings').update({ status: 'ATTENTE' }).eq('id', result.booking.id);
        toast.warning("Excédent enregistré : Nouveau paiement requis");
      } else {
        toast.success("Bagage validé");
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
      toast.success("Embarquement validé");
      handleValidate(result.booking.bookingNumber);
    } finally { setBoardingId(null); }
  };

  return (
    <div className="max-w-2xl mx-auto p-2 sm:p-4 pb-20 space-y-4 bg-background min-h-screen text-foreground">
      
      <header className="flex items-center gap-3 bg-slate-900 p-4 rounded-[1.5rem] border-2 border-slate-800 shadow-xl text-left">
        <div className="p-2 bg-emerald-600 rounded-xl text-white shrink-0"><UserCheck size={20} /></div>
        <div className="min-w-0">
          <h1 className="text-lg font-black italic tracking-tighter uppercase leading-none text-white">Poste d'Embarquement</h1>
          <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest mt-1 italic">Vérification Billets & Bagages</p>
        </div>
      </header>

      <div className="bg-slate-900 border-2 border-slate-800 rounded-[1.2rem] p-2 shadow-lg flex gap-2">
        <Input 
          value={qrInput} onChange={e => setQrInput(e.target.value)} 
          placeholder="SCANNEZ LE BILLET..." 
          className="h-12 rounded-xl border-none bg-slate-950 text-white font-black uppercase text-xs px-4"
        />
        <Button onClick={() => handleValidate()} disabled={loading} className="h-12 w-12 rounded-xl bg-primary">
          {loading ? <RefreshCw className="animate-spin" size={18} /> : <Search size={18} />}
        </Button>
      </div>

      {result && result.booking && (
        <div className="space-y-4 text-left">
          
          <div className={`border-2 rounded-[1.5rem] p-4 bg-slate-900 shadow-2xl ${result.valid ? 'border-emerald-500' : 'border-amber-500'}`}>
            
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-dashed border-slate-800">
              <div className="flex items-center gap-3 min-w-0">
                {result.valid ? <CheckCircle className="text-emerald-600 h-10 w-10 shrink-0" /> : <AlertCircle className="text-amber-600 h-10 w-10 shrink-0" />}
                <div className="min-w-0">
                  <h2 className="text-sm font-black uppercase tracking-tighter leading-none text-white truncate">{result.message}</h2>
                  <p className="text-[10px] font-black text-slate-500 mt-1 uppercase truncate">{result.booking.passengerName}</p>
                </div>
              </div>
              <Badge className="bg-slate-800 text-white text-[8px] font-black px-2 py-1 rounded-lg uppercase">{result.booking.classLabel}</Badge>
            </div>

            {/* LISTE DES BAGAGES ENREGISTRÉS (DÉCLARÉS EN LIGNE OU PESÉS) */}
            <div className="mb-6 space-y-2">
                <h3 className="text-[9px] font-black uppercase text-slate-500 tracking-widest px-1">Bagages Enregistrés</h3>
                {result.booking.luggages.length > 0 ? (
                    <div className="space-y-2">
                        {result.booking.luggages.map((lug: any) => (
                            <div key={lug.id} className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex justify-between items-center group">
                                <div className="text-left">
                                    <p className="text-[10px] font-black text-white uppercase">{lug.label}</p>
                                    <p className="text-[9px] font-bold text-primary italic">{Number(lug.total_price).toLocaleString()} F</p>
                                </div>
                                <Button 
                                    variant="ghost" size="icon" 
                                    onClick={() => handleDeleteLuggage(lug.id)}
                                    className="h-8 w-8 text-slate-600 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                                >
                                    <Trash2 size={14} />
                                </Button>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="bg-slate-950/50 p-4 rounded-xl border border-dashed border-slate-800 text-center">
                        <p className="text-[9px] font-bold text-slate-600 uppercase italic">Aucun bagage enregistré</p>
                    </div>
                )}
            </div>

            {/* CONSOLE DE PESÉE OFFICELLE */}
            <div className="bg-slate-950 p-4 rounded-2xl border-2 border-slate-800 mb-6 shadow-inner">
                <div className="flex items-center justify-between mb-4">
                    <h4 className="text-[9px] font-black uppercase text-slate-400 flex items-center gap-2">
                        <Scale size={14} className="text-primary" /> Poste de Pesage
                    </h4>
                    {(result.booking.tripType === 'TRAIN' || result.booking.tripType === 'PLANE') && (
                        <Badge className="bg-primary/10 text-primary border-none text-[8px] font-black">Franchise {result.booking.freeWeight}kg</Badge>
                    )}
                </div>

                <div className="space-y-4">
                    {(result.booking.tripType === 'TRAIN' || result.booking.tripType === 'PLANE') ? (
                        <div className="relative">
                            <Input 
                                type="number" placeholder="0.0" 
                                value={weightInput} onChange={e => setWeightInput(e.target.value)} 
                                className="h-14 rounded-xl border-none bg-slate-900 text-white font-black text-3xl text-center shadow-inner" 
                            />
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 font-black text-slate-700 text-xs">KG</span>
                        </div>
                    ) : (
                        <div className="flex gap-2">
                             <select 
                                value={selectedRateId} onChange={e => setSelectedRateId(e.target.value)}
                                className="flex-1 h-11 rounded-xl bg-slate-900 border-none px-4 text-[10px] font-black uppercase text-white outline-none"
                            >
                                <option value="">Choisir Tarif...</option>
                                {agencyRates.map(r => <option key={r.id} value={r.id}>{r.label} ({r.price} F)</option>)}
                            </select>
                            <Input type="number" value={qtyInput} onChange={e => setQtyInput(e.target.value)} className="w-16 h-11 rounded-xl border-none bg-slate-900 text-white font-black text-center" />
                        </div>
                    )}

                    <Button 
                        onClick={handleConfirmWeighing} 
                        className="w-full h-12 rounded-xl font-black bg-emerald-600 text-white uppercase text-xs gap-2 active:scale-95"
                    >
                        <Plus size={18} /> {currentCalculation > 0 ? `Ajouter (+${currentCalculation} F)` : 'Confirmer le poids'}
                    </Button>
                </div>
            </div>

            {/* PAIEMENT SI NÉCESSAIRE */}
            {!result.valid && (
                <div className="bg-slate-800 p-4 rounded-2xl border border-slate-700 mb-6 text-left">
                    <div className="flex justify-between items-center mb-3">
                        <Label className="text-[10px] font-black uppercase text-slate-400">Total à percevoir</Label>
                        <span className="text-2xl font-black text-emerald-500">{result.booking.totalToPay.toLocaleString()} F</span>
                    </div>
                    {canCollectMoney && (
                        <Button onClick={handleProcessPayment} className="w-full h-12 bg-emerald-600 text-white font-black uppercase text-xs rounded-xl">
                            Encaisser & Valider le Billet
                        </Button>
                    )}
                </div>
            )}

            {/* EMBARQUEMENT */}
            {result.valid && (
                <div className="space-y-3">
                    <div className="flex items-center justify-between ml-1">
                        <h3 className="text-[9px] font-black uppercase text-slate-500 tracking-widest">Passager à embarquer</h3>
                        <Badge className="bg-emerald-500/10 text-emerald-500 border-none text-[7px] font-black uppercase">Prêt pour départ</Badge>
                    </div>
                    {result.booking.passengers.map((p: any) => (
                        <div key={p.id} className="flex items-center justify-between p-3 bg-slate-950 border-2 border-slate-800 rounded-xl">
                            <div className="text-left">
                                <p className="font-black text-xs text-white uppercase">{p.first_name} {p.last_name}</p>
                                <p className="text-[8px] font-bold text-slate-500 uppercase italic">Siège {result.booking.seatNumber}</p>
                            </div>
                            {p.boarded ? (
                                <Badge className="bg-emerald-500/10 text-emerald-400 border-none px-3 h-8 rounded-lg font-black text-[8px]">EMBARQUÉ</Badge>
                            ) : (
                                <Button 
                                    disabled={!canBoard}
                                    onClick={() => handleBoardPassenger(p.id)} 
                                    className="h-10 px-6 rounded-lg font-black text-[9px] uppercase bg-emerald-600 text-white"
                                >
                                    Valider
                                </Button>
                            )}
                        </div>
                    ))}
                </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}