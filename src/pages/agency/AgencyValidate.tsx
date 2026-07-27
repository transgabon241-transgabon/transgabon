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
  Calendar, Clock, MapPin, Car, UserCheck, Baby, User // AJOUT DE Baby et User
} from 'lucide-react';

export default function AgencyValidate() {
  const { user } = useAuth();
  const [qrInput, setQrInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [boardingId, setBoardingId] = useState<string | null>(null);

  // États pour l'ajout uniquement
  const [agencyRates, setAgencyRates] = useState<any[]>([]);
  const [selectedRateId, setSelectedRateId] = useState("");
  const [weightInput, setWeightInput] = useState("");
  const [qtyInput, setQtyInput] = useState("1");

  const userRole = user?.role;
  const canCollectMoney = ['Administrateur', 'Agent', 'Caissier', 'Chef d\'agence'].includes(userRole || '');
  const canBoard = ['Administrateur', 'Agent', 'Agent Embarquement', 'Chef d\'agence'].includes(userRole || '');
  const canSeeBoardingButton = ['Administrateur', 'Chef d\'agence', 'Agent Embarquement'].includes(userRole || '');

  // CALCUL DE L'EXCÉDENT EN TEMPS RÉEL
  const currentCalculation = useMemo(() => {
    if (!result?.booking) return 0;
    if (result.booking.tripType === 'TRAIN' || result.booking.tripType === 'PLANE') {
      const w = parseFloat(weightInput) || 0;
      return Math.max(0, w - result.booking.freeWeight) * result.booking.excessPrice;
    } else {
      const rate = agencyRates.find(r => r.id === selectedRateId);
      return rate ? rate.price * (parseInt(qtyInput) || 1) : 0;
    }
  }, [weightInput, selectedRateId, qtyInput, result, agencyRates]);

  const handleValidate = async (forcedRef?: string) => {
    const targetRef = forcedRef || qrInput.trim();
    if (!targetRef) return;
    setLoading(true);
    setResult(null);

    try {
      let ref = targetRef.toUpperCase();
      const { data: b, error } = await supabase
        .from('bookings')
        .select(`*, trip:trips (*, from_city:cities!from_id (name), to_city:cities!to_id (name), company:companies (*), vehicle:vehicles (name, registration)), passengers (*), luggages (*)`)
        .eq('reference', ref).maybeSingle();

      if (error) throw error;
      if (!b) { 
        setResult({ valid: false, message: 'BILLET INTROUVABLE' }); 
        return; 
      }

      if (b.trip.company_id !== user?.companyId) {
        toast.error("ACCÈS REFUSÉ : Ce billet appartient à une autre compagnie.");
        setResult({ valid: false, message: 'ACCÈS INTERDIT (HORS RÉSEAU)' });
        setLoading(false);
        return;
      }

      const { data: rates } = await supabase.from('company_luggage_settings').select('*').eq('company_id', b.trip.company_id);
      if (rates) setAgencyRates(rates);

      const luggageTotal = (b.luggages || []).reduce((sum: number, l: any) => sum + (Number(l.total_price) || 0), 0);
      const classMapping: any = { 'VIP': 'SALON VIP', 'BUSINESS': 'BUSINESS', 'ECO': 'ÉCONOMIQUE', '1ERE_CLASSE': '1ÈRE CLASSE', '2EME_CLASSE': '2ÈME CLASSE' };

      setResult({
        valid: b.status === 'PAYE',
        message: b.status === 'PAYE' ? 'ACCÈS VALIDE' : 'PAIEMENT REQUIS',
        booking: {
          ...b,
          id: b.id,
          bookingNumber: b.reference,
          passengerName: `${b.passengers[0]?.first_name || ''} ${b.passengers[0]?.last_name || ''}`,
          passengerPhone: b.contact_phone || b.passengers[0]?.phone || '—',
          isChild: b.is_child, // RÉCUPÉRATION DE L'OPTION ENFANT
          departureCity: b.trip.from_city?.name,
          arrivalCity: b.arrival_city_name || b.trip.to_city?.name,
          departureDate: b.trip.departure_date,
          departureTime: b.trip.departure_time,
          vehicleName: b.trip.vehicle?.name || 'Standard',
          classLabel: classMapping[b.class_type] || b.class_type,
          ticketAmount: Number(b.total_amount) || 0,
          luggageAmount: luggageTotal,
          totalToPay: Number(b.total_amount) + luggageTotal,
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

  const handleAddLuggage = async () => {
    if (!result?.booking) return;
    try {
      const isWeight = result.booking.tripType === 'TRAIN' || result.booking.tripType === 'PLANE';
      const label = isWeight ? `Pesée (${weightInput}kg)` : agencyRates.find(r => r.id === selectedRateId)?.label;
      
      const { error } = await supabase.from('luggages').insert([{
        booking_id: result.booking.id,
        passenger_id: result.booking.passengers[0]?.id,
        label,
        quantity: parseInt(qtyInput) || 1,
        total_price: currentCalculation
      }]);
      if (error) throw error;
      
      if (currentCalculation > 0) {
        await supabase.from('bookings').update({ status: 'ATTENTE' }).eq('id', result.booking.id);
        toast.warning("Excédent ajouté : Règlement requis");
      } else {
        toast.success("Bagage validé");
      }

      setWeightInput(""); setSelectedRateId("");
      handleValidate(result.booking.bookingNumber);
    } catch (e) { toast.error("Erreur d'ajout"); }
  };

  const handleProcessPayment = async () => {
    try {
      await supabase.from('bookings').update({ status: 'PAYE' }).eq('id', result.booking.id);
      toast.success("Paiement validé");
      handleValidate(result.booking.bookingNumber);
    } catch (e) { toast.error("Erreur caisse"); }
  };

  const handleBoardPassenger = async (passengerId: string) => {
    setBoardingId(passengerId);
    try {
      await supabase.from('passengers').update({ boarded: true }).eq('id', passengerId);
      toast.success("Embarquement validé");
      handleValidate(result.booking.bookingNumber);
    } finally { setBoardingId(null); }
  };

  const TransportIcon = result?.booking?.tripType === 'PLANE' ? Plane : result?.booking?.tripType === 'TRAIN' ? Train : Bus;

  return (
    <div className="max-w-2xl mx-auto p-2 sm:p-4 pb-20 space-y-4 bg-background min-h-screen text-foreground">
      
      <header className="flex items-center gap-3 bg-slate-900 p-4 rounded-[1.5rem] border-2 border-slate-800 shadow-xl text-left">
        <div className="p-2 bg-emerald-600 rounded-xl text-white shrink-0"><UserCheck size={20} /></div>
        <div className="min-w-0">
          <h1 className="text-lg font-black italic uppercase leading-none text-white">Boarding Pass Control</h1>
          <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest mt-1 italic">Vérification Billets & Manifeste</p>
        </div>
      </header>

      <div className="bg-slate-900 border-2 border-slate-800 rounded-[1.2rem] p-2 flex gap-2">
        <Input 
          value={qrInput} onChange={e => setQrInput(e.target.value)} 
          placeholder="RÉFÉRENCE OU SCAN..." 
          className="h-12 rounded-xl border-none bg-slate-950 text-white font-black uppercase text-xs px-4 shadow-inner"
        />
        <Button onClick={() => handleValidate()} disabled={loading} className="h-12 w-12 rounded-xl bg-primary">
          {loading ? <RefreshCw className="animate-spin" size={18} /> : <Search size={18} />}
        </Button>
      </div>

      {result && result.booking && (
        <div className="space-y-4 animate-in slide-in-from-bottom-4 duration-500 text-left">
          <div className={`border-2 rounded-[2.5rem] p-5 bg-slate-900 shadow-2xl relative overflow-hidden ${result.valid ? 'border-emerald-500' : 'border-amber-500'}`}>
            
            {/* EN-TÊTE DU BILLET */}
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-dashed border-slate-800">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-2xl ${result.valid ? 'bg-emerald-500/20 text-emerald-500' : 'bg-amber-500/20 text-amber-500'}`}>
                   {result.valid ? <CheckCircle size={28} /> : <AlertCircle size={28} />}
                </div>
                <div>
                  <h2 className="text-lg font-black uppercase tracking-tighter text-white leading-none">{result.message}</h2>
                  <p className="text-xs font-bold text-primary mt-1 flex items-center gap-2">
                    <Hash size={12}/> {result.booking.bookingNumber}
                  </p>
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <Badge className="bg-slate-950 border border-slate-800 text-white h-8 px-4 font-black uppercase text-[10px] tracking-widest">
                    {result.booking.classLabel}
                </Badge>
                {/* ALERTE TARIF ENFANT */}
                {result.booking.isChild && (
                    <Badge className="bg-blue-600 text-white border-none font-black animate-pulse px-3 py-1 text-[8px] uppercase tracking-widest">
                        Tarif Enfant
                    </Badge>
                )}
              </div>
            </div>

            {/* DÉTAILS VOYAGE */}
            <div className="bg-slate-950/50 p-5 rounded-[2rem] border border-slate-800 mb-6">
                <div className="flex items-center justify-between gap-4 mb-6">
                   <div className="text-left flex-1 min-w-0">
                      <Label className="text-[9px] font-black uppercase text-slate-500 mb-1 block">Origine</Label>
                      <p className="text-base font-black text-white uppercase truncate">{result.booking.departureCity}</p>
                   </div>
                   <div className="flex flex-col items-center px-4">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-primary" />
                        <div className="h-px w-10 border-t-2 border-dashed border-slate-800" />
                        <TransportIcon size={20} className="text-primary mx-1" />
                        <div className="h-px w-10 border-t-2 border-dashed border-slate-800" />
                        <ArrowRight size={18} className="text-primary" />
                      </div>
                   </div>
                   <div className="text-right flex-1 min-w-0">
                      <Label className="text-[9px] font-black uppercase text-slate-500 mb-1 block">Destination</Label>
                      <p className="text-base font-black text-white uppercase truncate">{result.booking.arrivalCity}</p>
                   </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-4 border-t border-slate-800/50">
                    <div className="space-y-1">
                        <span className="flex items-center gap-1.5 text-[8px] font-black text-slate-500 uppercase"><Calendar size={10} className="text-primary"/> Date</span>
                        <p className="text-[11px] font-black text-white">{new Date(result.booking.departureDate).toLocaleDateString('fr-FR', {day:'2-digit', month:'short'})}</p>
                    </div>
                    <div className="space-y-1">
                        <span className="flex items-center gap-1.5 text-[8px] font-black text-slate-500 uppercase"><Clock size={10} className="text-primary"/> Départ</span>
                        <p className="text-[11px] font-black text-white">{result.booking.departureTime}</p>
                    </div>
                    <div className="space-y-1">
                        <span className="flex items-center gap-1.5 text-[8px] font-black text-slate-500 uppercase"><Car size={10} className="text-primary"/> Appareil</span>
                        <p className="text-[10px] font-black text-white truncate uppercase">{result.booking.vehicleName}</p>
                    </div>
                    <div className="bg-primary/10 rounded-xl p-2 text-center border border-primary/20">
                        <span className="text-[8px] font-black uppercase text-primary block mb-0.5">Siège</span>
                        <p className="text-base font-black text-primary leading-none">{result.booking.seatNumber}</p>
                    </div>
                </div>
            </div>

            {/* PASSAGER INFO - MISE À JOUR AVEC Baby/User Icon */}
            <div className={`p-4 rounded-2xl mb-6 border flex items-center justify-between ${result.booking.isChild ? 'bg-blue-500/10 border-blue-500/20' : 'bg-slate-800/30 border-slate-700/50'}`}>
                <div className="flex items-center gap-3">
                   <div className={`h-10 w-10 rounded-full flex items-center justify-center border ${result.booking.isChild ? 'bg-blue-600 text-white border-blue-400' : 'bg-slate-900 text-slate-400 border-slate-700'}`}>
                      {result.booking.isChild ? <Baby size={20} /> : <User size={20} />}
                   </div>
                   <div>
                      <Label className="text-[8px] font-black uppercase text-slate-500">
                        {result.booking.isChild ? "Passager Enfant (-12 ans)" : "Nom du passager"}
                      </Label>
                      <p className="text-sm font-black text-white uppercase">{result.booking.passengerName}</p>
                   </div>
                </div>
                <div className="text-right">
                   <Label className="text-[8px] font-black uppercase text-slate-500">Contact</Label>
                   <p className="text-[10px] font-bold text-primary flex items-center justify-end gap-1"><Phone size={10}/> {result.booking.passengerPhone}</p>
                </div>
            </div>

            {/* SECTION BAGAGES */}
            <div className="space-y-2 mb-6 text-left">
                <Label className="text-[9px] font-black uppercase text-slate-500 ml-1 tracking-[0.2em]">Bagages Enregistrés</Label>
                {result.booking.luggages.length > 0 ? (
                    <div className="grid grid-cols-1 gap-2">
                        {result.booking.luggages.map((lug: any) => (
                            <div key={lug.id} className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex justify-between items-center">
                                <div className="text-left">
                                    <p className="text-[10px] font-black text-white uppercase">{lug.label} (x{lug.quantity})</p>
                                    <p className="text-[9px] font-bold text-primary italic">Inclus : {Number(lug.total_price).toLocaleString()} F</p>
                                </div>
                                <Package size={14} className="text-slate-600"/>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="p-4 rounded-2xl border-2 border-dashed border-slate-800 text-center opacity-40">
                         <p className="text-[9px] font-black uppercase tracking-widest italic text-center">Aucun bagage déclaré</p>
                    </div>
                )}
            </div>

            {/* POSTE DE PESAGE */}
            <div className="bg-slate-950 p-4 rounded-[2rem] border-2 border-slate-800 mb-6 shadow-inner">
                <div className="flex justify-between items-center mb-4">
                    <h4 className="text-[9px] font-black uppercase text-slate-400 flex items-center gap-2"><Scale size={14} className="text-primary"/> Poste de Pesage</h4>
                    <Badge variant="outline" className="text-[7px] border-emerald-500/30 text-emerald-500 uppercase">{result.booking.freeWeight}kg Inclus</Badge>
                </div>
                <div className="space-y-4">
                    <div className="flex gap-2">
                         <select value={selectedRateId} onChange={e => setSelectedRateId(e.target.value)} className="flex-1 h-12 rounded-xl bg-slate-900 border-none px-4 text-[10px] font-black uppercase text-white outline-none">
                            <option value="">Pesée Libre (Standard)</option>
                            {agencyRates.map(r => <option key={r.id} value={r.id}>{r.label} ({r.price} F{r.is_weight_based ? '/kg' : ''})</option>)}
                        </select>
                        <div className="relative w-24">
                            <Input type="number" placeholder="0" value={weightInput} onChange={e => setWeightInput(e.target.value)} className="h-12 rounded-xl border-none bg-slate-900 text-white font-black text-center" />
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[7px] font-black text-slate-600">KG</span>
                        </div>
                    </div>
                    <Button onClick={handleAddLuggage} className="w-full h-14 rounded-2xl font-black bg-emerald-600 text-white uppercase text-[10px] tracking-widest gap-2 active:scale-95 transition-all shadow-xl">
                        <Plus size={18} /> {currentCalculation > 0 ? `Enregistrer Excédent (+${currentCalculation.toLocaleString()} F)` : 'Confirmer Poids'}
                    </Button>
                </div>
            </div>

            {/* SECTION CAISSE */}
            {!result.valid && (
                <div className="bg-slate-800 p-5 rounded-[2rem] border border-slate-700 mb-6 shadow-2xl">
                    <div className="space-y-2 mb-4">
                        <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase"><span>Billet :</span><span>{result.booking.ticketAmount.toLocaleString()} F</span></div>
                        <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase"><span>Frais Bagages :</span><span className="text-primary">{result.booking.luggageAmount.toLocaleString()} F</span></div>
                        <div className="h-px bg-slate-700 my-2" />
                        <div className="flex justify-between items-center"><Label className="text-[10px] font-black uppercase text-white tracking-widest">Total Global dû</Label><span className="text-3xl font-black text-emerald-500 tracking-tighter">{result.booking.totalToPay.toLocaleString()} F</span></div>
                    </div>
                    {canCollectMoney ? (
                        <Button onClick={handleProcessPayment} className="w-full h-14 bg-emerald-600 text-white font-black uppercase text-[10px] tracking-widest rounded-2xl active:scale-95 gap-3 border-none">
                            <Wallet size={18}/> Encaisser et Valider
                        </Button>
                    ) : (
                        <div className="p-3 bg-amber-500/10 rounded-xl border border-amber-500/20 flex items-center gap-2">
                            <Info size={16} className="text-amber-500" /><p className="text-[9px] font-bold text-amber-500 uppercase italic">Paiement requis au guichet</p>
                        </div>
                    )}
                </div>
            )}

            {/* MANIFESTE EMBARQUEMENT */}
            {result.valid && (
                <div className="space-y-3">
                    <h3 className="text-[10px] font-black uppercase text-slate-500 ml-1 tracking-[0.3em]">Manifeste Passager</h3>
                    {result.booking.passengers.map((p: any) => (
                        <div key={p.id} className="flex items-center justify-between p-4 bg-slate-950 border border-slate-800 rounded-2xl group hover:border-primary transition-colors">
                            <div className="text-left">
                                <p className="font-black text-sm text-white uppercase leading-none">{p.first_name} {p.last_name}</p>
                                <p className="text-[10px] font-bold text-slate-500 uppercase mt-1">Siège {result.booking.seatNumber}</p>
                            </div>
                            {p.boarded ? (
                                <div className="flex items-center gap-2 bg-emerald-500/10 text-emerald-500 px-4 py-2 rounded-xl border border-emerald-500/20">
                                    <CheckCircle size={14}/>
                                    <span className="font-black text-[9px] uppercase">Embarqué</span>
                                </div>
                            ) : (
                                canSeeBoardingButton && (
                                    <Button 
                                        onClick={() => handleBoardPassenger(p.id)} 
                                        className="h-11 px-8 rounded-xl font-black bg-emerald-600 text-white shadow-lg active:scale-95 transition-all text-[10px] uppercase tracking-widest border-none"
                                    >
                                        Embarquer
                                    </Button>
                                )
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