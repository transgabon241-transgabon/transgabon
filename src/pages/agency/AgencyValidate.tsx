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
  CheckCircle, Search, CreditCard, RefreshCw, Users, UserCheck, 
  AlertCircle, Package, Lock, Ticket, Hash, Ship, Bus, Train, 
  MapPin, Gem, ArrowRight, Phone, Wallet, Calendar, Plus, Scale
} from 'lucide-react';

export default function AgencyValidate() {
  const { user } = useAuth();
  const [qrInput, setQrInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [boardingId, setBoardingId] = useState<string | null>(null);

  // États pour l'ajout de bagages en agence
  const [agencyRates, setAgencyRates] = useState<any[]>([]);
  const [selectedRateId, setSelectedRateId] = useState("");
  const [weightInput, setWeightInput] = useState("");
  const [qtyInput, setQtyInput] = useState("1");

  const userRole = user?.role;
  const canCollectMoney = ['Administrateur', 'Agent', 'Caissier'].includes(userRole || '');
  const canBoard = ['Administrateur', 'Agent', 'Agent Embarquement'].includes(userRole || '');

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

      // Charger les tarifs bagages de cette agence précise
      const { data: rates } = await supabase
        .from('company_luggage_settings')
        .select('*')
        .eq('company_id', b.trip.company_id);
      if (rates) setAgencyRates(rates);

      const terminusName = b.trip.to_city?.name;
      const ticketDest = b.arrival_city_name;
      const isEscale = ticketDest && ticketDest.toLowerCase() !== terminusName.toLowerCase();

      const classMapping: Record<string, string> = {
        'VIP': 'SALON VIP', 'BUSINESS': 'BUSINESS', '1ERE_CLASSE': '1ÈRE CLASSE',
        '2EME_CLASSE': '2ÈME CLASSE', 'ECO': 'ÉCONOMIQUE', 'STANDARD': 'STANDARD'
      };

      const luggageTotal = (b.luggages || []).reduce((sum: number, l: any) => sum + (Number(l.total_price) || 0), 0);

      setResult({
        valid: b.status === 'PAYE',
        message: b.status === 'PAYE' ? 'ACCÈS AUTORISÉ' : 'PAIEMENT REQUIS',
        booking: {
          id: b.id,
          bookingNumber: b.reference,
          passengerName: `${b.passengers[0]?.first_name || ''} ${b.passengers[0]?.last_name || ''}`,
          passengerPhone: b.contact_phone || '—',
          departureCity: b.trip.from_city?.name,
          arrivalCity: ticketDest || terminusName, 
          terminusTrain: terminusName,
          isEscale: !!isEscale,
          classLabel: classMapping[b.class_type] || 'STANDARD',
          classCode: b.class_type,
          registration: b.trip.vehicle?.registration || 'NON ASSIGNÉ',
          ticketAmount: Number(b.total_amount) || 0,
          luggageAmount: luggageTotal,
          totalToPay: Number(b.total_amount) + luggageTotal,
          passengers: b.passengers || [],
          luggages: b.luggages || [],
          tripType: b.trip.type,
          seatNumber: b.passengers[0]?.seat_number || '—',
          // Infos pour calcul poids train
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

  // FONCTION : AJOUTER UN BAGAGE EN AGENCE
  const handleAddExtraLuggage = async () => {
    if (!result?.booking) return;
    setLoading(true);

    try {
      let label = "";
      let price = 0;
      let qty = parseInt(qtyInput) || 1;

      // Logique pour Train (Poids)
      if (result.booking.tripType === 'TRAIN') {
        const w = parseFloat(weightInput) || 0;
        const excess = Math.max(0, w - result.booking.freeWeight);
        label = `Excédent Poids (${w}kg)`;
        price = excess * result.booking.excessPrice;
        qty = 1;
      } 
      // Logique pour Bus (Forfait)
      else {
        const rate = agencyRates.find(r => r.id === selectedRateId);
        if (!rate) { toast.error("Sélectionnez un type d'article"); return; }
        label = rate.label;
        price = rate.price * qty;
      }

      const { error } = await supabase.from('luggages').insert([{
        booking_id: result.booking.id,
        passenger_id: result.booking.passengers[0]?.id,
        label: label,
        quantity: qty,
        total_price: price
      }]);

      if (error) throw error;

      toast.success("Supplément bagage ajouté");
      setWeightInput("");
      handleValidate(result.booking.bookingNumber); // Rafraîchir
    } catch (e) {
      toast.error("Erreur lors de l'ajout");
    } finally {
      setLoading(false);
    }
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
      toast.success("Embarqué");
      handleValidate(result.booking.bookingNumber);
    } finally { setBoardingId(null); }
  };

  const TransportIcon = result?.booking?.tripType === 'TRAIN' ? Train : result?.booking?.tripType === 'BOAT' ? Ship : Bus;

  return (
    <div className="max-w-2xl mx-auto p-4 pb-20 space-y-6 animate-in fade-in duration-500">
      
      {/* HEADER */}
      <header className="flex items-center gap-4 bg-white p-6 rounded-[2rem] border-2 border-slate-100 shadow-sm w-full text-left">
        <div className="p-3 bg-slate-900 rounded-2xl shadow-lg text-white"><Ticket size={24} /></div>
        <div>
          <h1 className="text-2xl font-black italic tracking-tighter text-slate-900 uppercase leading-none">Guichet Contrôle</h1>
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1 italic">Vérification & Bagages</p>
        </div>
      </header>

      {/* ZONE DE RECHERCHE */}
      <div className="bg-white border-2 border-slate-100 rounded-[2rem] p-4 shadow-xl flex gap-2">
        <Input 
          value={qrInput} onChange={e => setQrInput(e.target.value)} 
          placeholder="RÉFÉRENCE OU SCAN QR..." 
          className="h-14 rounded-2xl border-none bg-slate-50 font-black uppercase tracking-widest px-6 shadow-inner focus-visible:ring-primary"
          onKeyDown={e => e.key === 'Enter' && handleValidate()} 
        />
        <Button onClick={() => handleValidate()} disabled={loading} className="h-14 w-14 rounded-2xl bg-primary shadow-lg">
          {loading ? <RefreshCw className="animate-spin" /> : <Search />}
        </Button>
      </div>

      {result && result.booking && (
        <div className="space-y-4 animate-in slide-in-from-bottom-4 duration-500 text-left">
          <div className={`border-4 rounded-[3rem] p-8 shadow-2xl bg-white ${result.valid ? 'border-emerald-500' : 'border-amber-500'}`}>
            
            {/* ENTÊTE STATUT */}
            <div className="flex items-center justify-between mb-8 pb-6 border-b border-dashed border-slate-100">
              <div className="flex items-center gap-4">
                {result.valid ? <CheckCircle size={40} className="text-emerald-600" /> : <AlertCircle size={40} className="text-amber-600" />}
                <div>
                  <h2 className="text-2xl font-black uppercase tracking-tighter block leading-none text-slate-900">{result.message}</h2>
                  <Badge variant="outline" className="mt-2 border-primary/20 text-primary font-black text-[10px] uppercase">
                    {result.booking.classLabel}
                  </Badge>
                </div>
              </div>
              {(result.booking.classCode === 'VIP' || result.booking.classCode === '1ERE_CLASSE') && (
                <div className="p-3 bg-amber-100 rounded-2xl text-amber-600 animate-pulse shadow-lg"><Gem size={28} /></div>
              )}
            </div>

            {/* TRAJET */}
            <div className={`rounded-[2rem] p-6 mb-8 relative overflow-hidden shadow-xl text-white ${result.booking.isEscale ? 'bg-amber-600' : 'bg-slate-900'}`}>
                <div className="flex justify-between items-center relative z-10">
                    <div className="text-left space-y-1">
                        <Label className="text-[10px] font-black uppercase text-white/60">Départ</Label>
                        <p className="text-lg font-black uppercase leading-none">{result.booking.departureCity}</p>
                    </div>
                    <div className="flex-1 px-6 flex flex-col items-center">
                        <ArrowRight size={18} className="text-white" />
                        {result.booking.isEscale && <span className="text-[8px] font-black uppercase mt-1">Escale</span>}
                    </div>
                    <div className="text-right space-y-1">
                        <Label className="text-[10px] font-black uppercase text-white/60">Arrivée</Label>
                        <p className="text-lg font-black uppercase leading-none">{result.booking.arrivalCity}</p>
                        {result.booking.isEscale && <p className="text-[8px] font-bold opacity-50 italic uppercase">Terminus: {result.booking.terminusTrain}</p>}
                    </div>
                </div>
            </div>

            {/* INFO VOYAGEUR */}
            <div className="grid grid-cols-2 gap-4 mb-8">
               <div className="bg-slate-50 p-5 rounded-[1.5rem] border border-slate-100 flex items-center gap-4">
                  <div className="h-10 w-10 bg-white rounded-xl flex items-center justify-center text-primary shadow-sm border"><Phone size={18} /></div>
                  <div>
                     <Label className="text-[9px] font-black uppercase text-slate-900 opacity-70 tracking-widest">Contact</Label>
                     <p className="font-black text-slate-900 text-xs">{result.booking.passengerPhone}</p>
                  </div>
               </div>
               <div className="bg-slate-900 p-5 rounded-[1.5rem] flex items-center gap-4 shadow-xl">
                  <div className="h-10 w-10 bg-primary/20 rounded-xl flex items-center justify-center text-primary shadow-sm"><Hash size={18} /></div>
                  <div>
                     <Label className="text-[9px] font-black uppercase text-primary/60 tracking-widest">Siège</Label>
                     <p className="font-black text-white text-lg leading-none">{result.booking.seatNumber}</p>
                  </div>
               </div>
            </div>

            {/* --- SECTION AJOUT DE BAGAGES EN AGENCE --- */}
            <div className="bg-slate-50 p-6 rounded-[2rem] border-2 border-slate-100 mb-8">
                <h4 className="text-[10px] font-black uppercase text-slate-900 opacity-60 mb-4 flex items-center gap-2 tracking-widest">
                    <Package size={14} className="text-primary" /> Enregistrement Bagages Agence
                </h4>
                
                {/* Liste des bagages déjà présents */}
                <div className="space-y-2 mb-6">
                    {result.booking.luggages.map((lug: any) => (
                        <div key={lug.id} className="flex justify-between items-center bg-white p-3 rounded-xl border border-slate-100 text-[11px] font-bold">
                            <span className="text-slate-600">{lug.label} (x{lug.quantity})</span>
                            <span className="text-primary font-black">{(lug.total_price || 0).toLocaleString()} F</span>
                        </div>
                    ))}
                </div>

                {/* Formulaire d'ajout rapide (Uniquement si pas encore à bord) */}
                {!result.booking.passengers.some((p: any) => p.boarded) && (
                    <div className="p-4 bg-white rounded-2xl border border-dashed border-primary/30 space-y-4">
                        {result.booking.tripType === 'TRAIN' ? (
                            <div className="space-y-3">
                                <Label className="text-[9px] font-black uppercase text-slate-400 ml-1">Excédent Poids (KG)</Label>
                                <div className="flex gap-2">
                                    <Input type="number" placeholder="Poids total..." value={weightInput} onChange={e => setWeightInput(e.target.value)} className="h-11 rounded-xl bg-slate-50 border-none font-black shadow-inner" />
                                    <Button onClick={handleAddExtraLuggage} className="h-11 px-6 rounded-xl font-black bg-primary">AJOUTER</Button>
                                </div>
                                <p className="text-[8px] font-bold text-slate-400 uppercase italic">Franchise : {result.booking.freeWeight}kg inclus</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                <Label className="text-[9px] font-black uppercase text-slate-400 ml-1">Ajouter un article</Label>
                                <div className="flex gap-2">
                                    <select 
                                        value={selectedRateId} 
                                        onChange={e => setSelectedRateId(e.target.value)}
                                        className="flex-1 h-11 rounded-xl bg-slate-50 border-none px-4 text-[10px] font-black uppercase outline-none shadow-inner"
                                    >
                                        <option value="">Choisir article...</option>
                                        {agencyRates.map(r => (
                                            <option key={r.id} value={r.id}>{r.label} ({r.price} F)</option>
                                        ))}
                                    </select>
                                    <Input type="number" value={qtyInput} onChange={e => setQtyInput(e.target.value)} className="w-16 h-11 rounded-xl bg-slate-50 border-none font-black text-center shadow-inner" />
                                    <Button onClick={handleAddExtraLuggage} className="h-11 w-11 rounded-xl bg-primary flex items-center justify-center p-0"><Plus size={20}/></Button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* --- SECTION ENCAISSEMENT --- */}
            {!result.valid && (
                <div className="bg-emerald-600 p-8 rounded-[2.5rem] shadow-2xl text-white text-center space-y-6 mb-8">
                    <div className="flex flex-col items-center gap-2">
                        <Wallet size={40} className="opacity-50" />
                        <h3 className="text-xl font-black uppercase italic">Paiement au Guichet</h3>
                    </div>
                    
                    <div className="bg-white/10 p-5 rounded-2xl space-y-2 border border-white/20">
                        <div className="flex justify-between text-xs font-bold uppercase">
                            <span>Billet {result.booking.classLabel} :</span>
                            <span>{result.booking.ticketAmount.toLocaleString()} F</span>
                        </div>
                        <div className="flex justify-between text-xs font-bold uppercase">
                            <span>Suppléments Bagages :</span>
                            <span>{result.booking.luggageAmount.toLocaleString()} F</span>
                        </div>
                        <div className="h-px bg-white/20 my-2" />
                        <div className="flex justify-between text-lg font-black uppercase tracking-tighter">
                            <span>Total à Encaisser :</span>
                            <span className="text-2xl">{result.booking.totalToPay.toLocaleString()} F</span>
                        </div>
                    </div>

                    {canCollectMoney ? (
                        <Button 
                            onClick={handleProcessPayment}
                            className="w-full h-16 bg-white text-emerald-700 hover:bg-slate-50 rounded-2xl font-black text-xl shadow-xl uppercase tracking-widest"
                        >
                            ENCAISSER {result.booking.totalToPay.toLocaleString()} F
                        </Button>
                    ) : (
                        <p className="text-xs font-black uppercase bg-black/20 p-3 rounded-xl italic">Accès Caissier Uniquement</p>
                    )}
                </div>
            )}

            {/* --- LISTE D'EMBARQUEMENT --- */}
            {result.valid && (
                <div className="space-y-4">
                    <h3 className="text-[10px] font-black uppercase text-slate-900 opacity-60 tracking-widest flex items-center gap-2 ml-4">
                        <Users size={16} /> Liste de montée
                    </h3>
                    <div className="space-y-2">
                        {result.booking.passengers.map((p: any) => (
                            <div key={p.id} className="flex items-center justify-between p-5 bg-white border-2 border-slate-100 rounded-2xl hover:border-primary transition-all">
                                <div>
                                    <p className="font-black text-sm text-slate-900 uppercase tracking-tight">{p.first_name} {p.last_name}</p>
                                    <p className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">VÉRIFIÉ ✅</p>
                                </div>
                                {p.boarded ? (
                                    <Badge className="bg-emerald-50 text-emerald-600 border-emerald-100 px-4 py-1.5 rounded-xl font-black text-[10px]">À BORD</Badge>
                                ) : (
                                    <Button 
                                        disabled={!canBoard}
                                        onClick={() => handleBoardPassenger(p.id)} 
                                        className="h-10 px-8 rounded-xl font-black text-[10px] uppercase bg-slate-900 hover:bg-primary transition-all"
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

      {/* FOOTER */}
      {!result && (
        <div className="pt-20 text-center opacity-20">
            <Ticket size={80} className="mx-auto mb-4" />
            <p className="text-sm font-black uppercase tracking-[0.5em]">Attente de scan</p>
        </div>
      )}
    </div>
  );
}

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1 text-left">
      <div className="text-[10px] uppercase font-black text-slate-900 opacity-70 tracking-widest leading-none">{label}</div>
      <div className="font-black text-slate-900 text-sm truncate uppercase tracking-tight">{value || '—'}</div>
    </div>
  );
}