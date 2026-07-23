"use client"

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from "@/lib/auth-context";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { 
  CheckCircle, Search, RefreshCw, AlertCircle, Package, Ticket, 
  Hash, Ship, Bus, Train, ArrowRight, Phone, Wallet, Plus, Scale, Gem
} from 'lucide-react';

export default function AgencyValidate() {
  const { user } = useAuth();
  const [qrInput, setQrInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const [agencyRates, setAgencyRates] = useState<any[]>([]);
  const [selectedRateId, setSelectedRateId] = useState("");
  const [weightInput, setWeightInput] = useState("");
  const [qtyInput, setQtyInput] = useState("1");
  const [boardingId, setBoardingId] = useState<string | null>(null);

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

      const { data: rates } = await supabase
        .from('company_luggage_settings')
        .select('*')
        .eq('company_id', b.trip.company_id);
      if (rates) setAgencyRates(rates);

      const terminusName = b.trip.to_city?.name;
      const ticketDest = b.arrival_city_name;
      const isEscale = ticketDest && ticketDest.toLowerCase() !== terminusName.toLowerCase();

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
          arrivalCity: ticketDest || terminusName, 
          terminusTrain: terminusName,
          isEscale: !!isEscale,
          classLabel: classMapping[b.class_type] || 'STANDARD',
          classCode: b.class_type,
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
    if (!result?.booking) return;
    setLoading(true);
    try {
      let label = "";
      let price = 0;
      let qty = parseInt(qtyInput) || 1;

      if (result.booking.tripType === 'TRAIN') {
        const w = parseFloat(weightInput) || 0;
        const excess = Math.max(0, w - result.booking.freeWeight);
        label = `Excédent (${w}kg)`;
        price = excess * result.booking.excessPrice;
        qty = 1;
      } else {
        const rate = agencyRates.find(r => r.id === selectedRateId);
        if (!rate) { toast.error("Choisir un article"); return; }
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
      toast.success("Bagage ajouté");
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
      toast.success("Embarqué");
      handleValidate(result.booking.bookingNumber);
    } finally { setBoardingId(null); }
  };

  return (
    <div className="max-w-2xl mx-auto p-2 sm:p-4 pb-20 space-y-4 sm:space-y-6 animate-in fade-in duration-500 overflow-x-hidden">
      
      {/* HEADER : Plus compact sur mobile */}
      <header className="flex items-center gap-3 bg-white p-4 sm:p-6 rounded-[1.5rem] sm:rounded-[2rem] border-2 border-slate-100 shadow-sm w-full text-left">
        <div className="p-2 sm:p-3 bg-slate-900 rounded-xl sm:rounded-2xl text-white shrink-0"><Ticket size={20} className="sm:w-6 sm:h-6" /></div>
        <div className="min-w-0">
          <h1 className="text-lg sm:text-2xl font-black italic tracking-tighter text-slate-900 uppercase leading-none truncate">Guichet Contrôle</h1>
          <p className="text-[8px] sm:text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1 italic">Vérification & Bagages</p>
        </div>
      </header>

      {/* ZONE DE RECHERCHE */}
      <div className="bg-white border-2 border-slate-100 rounded-[1.2rem] sm:rounded-[2rem] p-2 shadow-lg flex gap-2">
        <Input 
          value={qrInput} onChange={e => setQrInput(e.target.value)} 
          placeholder="RÉFÉRENCE OU SCAN..." 
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

            {/* TRAJET : Responsive Box */}
            <div className={`rounded-[1.2rem] sm:rounded-[2rem] p-4 sm:p-6 mb-6 relative overflow-hidden shadow-lg text-white ${result.booking.isEscale ? 'bg-amber-600' : 'bg-slate-900'}`}>
                <div className="flex justify-between items-center relative z-10 gap-2">
                    <div className="flex-1 min-w-0">
                        <Label className="text-[8px] sm:text-[10px] font-black uppercase text-white/60">Départ</Label>
                        <p className="text-xs sm:text-lg font-black uppercase truncate">{result.booking.departureCity}</p>
                    </div>
                    <div className="shrink-0 px-2 flex flex-col items-center">
                        <ArrowRight size={14} className="text-white" />
                        {result.booking.isEscale && <span className="text-[7px] font-black uppercase">Escale</span>}
                    </div>
                    <div className="flex-1 min-w-0 text-right">
                        <Label className="text-[8px] sm:text-[10px] font-black uppercase text-white/60">Arrivée</Label>
                        <p className="text-xs sm:text-lg font-black uppercase truncate">{result.booking.arrivalCity}</p>
                    </div>
                </div>
            </div>

            {/* INFO CONTACT ET SIEGE */}
            <div className="grid grid-cols-2 gap-2 sm:gap-4 mb-6">
               <div className="bg-slate-50 p-2 sm:p-4 rounded-xl sm:rounded-[1.5rem] border border-slate-100 flex items-center gap-2 sm:gap-4">
                  <Phone size={14} className="text-primary shrink-0" />
                  <div className="min-w-0">
                     <p className="text-[7px] sm:text-[9px] font-black uppercase text-slate-400">Contact</p>
                     <p className="font-black text-slate-900 text-[10px] sm:text-xs truncate">{result.booking.passengerPhone}</p>
                  </div>
               </div>
               <div className="bg-slate-900 p-2 sm:p-4 rounded-xl sm:rounded-[1.5rem] flex items-center gap-2 sm:gap-4 shadow-md">
                  <Hash size={14} className="text-primary shrink-0" />
                  <div className="min-w-0">
                     <p className="text-[7px] sm:text-[9px] font-black uppercase text-primary/60">Siège</p>
                     <p className="font-black text-white text-xs sm:text-lg leading-none truncate">{result.booking.seatNumber}</p>
                  </div>
               </div>
            </div>

            {/* BAGAGES : Correction de la grille d'ajout */}
            <div className="bg-slate-50 p-4 sm:p-6 rounded-[1.2rem] sm:rounded-[2rem] border-2 border-slate-100 mb-6">
                <h4 className="text-[9px] sm:text-[10px] font-black uppercase text-slate-900 opacity-60 mb-3 flex items-center gap-2 tracking-widest">
                    <Package size={14} className="text-primary" /> Enregistrement Bagages
                </h4>
                
                <div className="space-y-1.5 mb-4">
                    {result.booking.luggages.map((lug: any) => (
                        <div key={lug.id} className="flex justify-between items-center bg-white p-2 rounded-lg border border-slate-100 text-[9px] sm:text-[11px] font-bold">
                            <span className="text-slate-600 truncate mr-2">{lug.label} (x{lug.quantity})</span>
                            <span className="text-primary font-black shrink-0">{(lug.total_price || 0).toLocaleString()} F</span>
                        </div>
                    ))}
                </div>

                {!result.booking.passengers.some((p: any) => p.boarded) && (
                    <div className="p-3 bg-white rounded-xl border border-dashed border-primary/30 space-y-3">
                        {result.booking.tripType === 'TRAIN' ? (
                            <div className="flex flex-col gap-2">
                                <Input type="number" placeholder="Poids total (KG)..." value={weightInput} onChange={e => setWeightInput(e.target.value)} className="h-10 rounded-lg bg-slate-50 border-none font-black text-xs" />
                                <Button onClick={handleAddExtraLuggage} className="h-10 w-full rounded-lg font-black text-[10px] bg-primary">AJOUTER EXCÉDENT</Button>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-2">
                                <select 
                                    value={selectedRateId} 
                                    onChange={e => setSelectedRateId(e.target.value)}
                                    className="w-full h-10 rounded-lg bg-slate-50 border-none px-3 text-[10px] font-black uppercase outline-none"
                                >
                                    <option value="">Choisir article...</option>
                                    {agencyRates.map(r => (
                                        <option key={r.id} value={r.id}>{r.label} ({r.price} F)</option>
                                    ))}
                                </select>
                                <div className="flex gap-2">
                                    <Input type="number" value={qtyInput} onChange={e => setQtyInput(e.target.value)} className="flex-1 h-10 rounded-lg bg-slate-50 border-none font-black text-center text-xs" />
                                    <Button onClick={handleAddExtraLuggage} className="h-10 w-12 rounded-lg bg-primary shrink-0"><Plus size={18}/></Button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* ENCAISSEMENT : Plus compact */}
            {!result.valid && (
                <div className="bg-emerald-600 p-5 sm:p-8 rounded-[1.5rem] sm:rounded-[2.5rem] shadow-xl text-white text-center space-y-4 mb-6">
                    <div className="flex items-center justify-center gap-2">
                        <Wallet size={24} className="opacity-70" />
                        <h3 className="text-base sm:text-xl font-black uppercase italic">Encaisser Guichet</h3>
                    </div>
                    
                    <div className="bg-white/10 p-3 sm:p-5 rounded-xl space-y-2 border border-white/20 text-[10px] sm:text-xs">
                        <div className="flex justify-between font-bold uppercase">
                            <span>Billet :</span>
                            <span>{result.booking.ticketAmount.toLocaleString()} F</span>
                        </div>
                        <div className="flex justify-between font-bold uppercase">
                            <span>Bagages :</span>
                            <span>{result.booking.luggageAmount.toLocaleString()} F</span>
                        </div>
                        <div className="h-px bg-white/20 my-1" />
                        <div className="flex justify-between text-base sm:text-lg font-black uppercase tracking-tighter">
                            <span>TOTAL :</span>
                            <span className="text-xl sm:text-2xl">{result.booking.totalToPay.toLocaleString()} F</span>
                        </div>
                    </div>

                    {canCollectMoney ? (
                        <Button 
                            onClick={handleProcessPayment}
                            className="w-full h-12 sm:h-16 bg-white text-emerald-700 hover:bg-slate-50 rounded-xl sm:rounded-2xl font-black text-sm sm:text-xl shadow-lg uppercase"
                        >
                            ENCAISSER {result.booking.totalToPay.toLocaleString()} F
                        </Button>
                    ) : (
                        <p className="text-[9px] font-black uppercase bg-black/20 p-2 rounded-lg italic">Accès Caissier Uniquement</p>
                    )}
                </div>
            )}

            {/* EMBARQUEMENT */}
            {result.valid && (
                <div className="space-y-3">
                    <h3 className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-2">Passagers à bord</h3>
                    <div className="space-y-2">
                        {result.booking.passengers.map((p: any) => (
                            <div key={p.id} className="flex items-center justify-between p-3 sm:p-5 bg-white border-2 border-slate-100 rounded-xl sm:rounded-2xl">
                                <div className="min-w-0 pr-2">
                                    <p className="font-black text-xs sm:text-sm text-slate-900 uppercase truncate leading-tight">{p.first_name} {p.last_name}</p>
                                    <p className="text-[8px] font-bold text-emerald-500 uppercase">Valide ✅</p>
                                </div>
                                {p.boarded ? (
                                    <Badge className="bg-emerald-50 text-emerald-600 border-emerald-100 px-3 py-1 rounded-lg font-black text-[8px] sm:text-[10px] shrink-0">À BORD</Badge>
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

      {/* FOOTER */}
      {!result && (
        <div className="pt-10 sm:pt-20 text-center opacity-20">
            <Ticket size={60} className="mx-auto mb-4" />
            <p className="text-xs font-black uppercase tracking-[0.4em]">Attente de scan</p>
        </div>
      )}
    </div>
  );
}