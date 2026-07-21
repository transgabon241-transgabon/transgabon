"use client"

import { useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from "@/lib/auth-context";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  CheckCircle, 
  Search, 
  CreditCard, 
  RefreshCw, 
  Users, 
  UserCheck, 
  AlertCircle,
  Package,
  Lock,
  Ticket,
  ChevronLeft,
  ChevronRight,
  Hash,
  Ship,
  Bus,
  Train,
  MapPin,
  Gem
} from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';

/**
 * TYPES DE DONNÉES
 */
type PassengerData = {
  id: string;
  firstName: string;
  lastName: string;
  boarded: boolean;
  seatNumber: string | null;
};

type LuggageData = {
  id: string;
  label: string;
  quantity: number;
  total_price: number;
};

type AgencyLuggageType = {
  label: string;
  price: number;
};

type Result = {
  valid: boolean; 
  message: string;
  booking?: {
    id: string;
    bookingNumber: string;
    passengerName: string;
    passengerPhone: string;
    seatNumber: string;
    departureCity: string;
    arrivalCity: string;
    classLabel: string;
    classCode: string;
    paymentStatus: string;
    rawStatus: string;
    passengers: PassengerData[];
    tripType: string;
    registration: string;
    freeWeight: number;
    excessPrice: number;
    luggages: LuggageData[];
    companyId: string;
    amount: number;
  };
};

export default function AgencyValidate() {
  const { user } = useAuth();
  
  const [qrInput, setQrInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [boardingId, setBoardingId] = useState<string | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 4;

  const [agencyRates, setAgencyRates] = useState<AgencyLuggageType[]>([]);
  const [weightInput, setWeightInput] = useState<string>('');
  const [selectedBusItem, setSelectedBusItem] = useState<AgencyLuggageType | null>(null);
  const [qtyInput, setQtyInput] = useState('1');

  const userRole = user?.role?.toUpperCase();
  const canCollectMoney = ['CAISSIER', 'AGENT', 'ADMINISTRATEUR', 'ADMIN'].includes(userRole || '');
  const canBoardPassengers = ['AGENCE_EMBARQUEMENT', 'AGENT', 'ADMINISTRATEUR', 'ADMIN'].includes(userRole || '');

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
        .select(`*, trip:trips(*, from:cities!from_id(name), to:cities!to_id(name), company:companies(*), vehicle:vehicles(registration)), passengers(*), luggages(*)`)
        .eq('reference', ref)
        .single();

      if (error || !b) {
        setResult({ valid: false, message: 'Billet introuvable.' });
        setLoading(false);
        return;
      }

      const { data: rates } = await supabase
        .from('company_luggage_settings')
        .select('label, price')
        .eq('company_id', b.trip.company_id);

      if (rates) {
        setAgencyRates(rates);
        if (rates.length > 0) setSelectedBusItem(rates[0]);
      }

      const classMapping: Record<string, string> = {
        'VIP': 'Salon VIP',
        'BUSINESS': 'Business',
        '1ERE_CLASSE': '1ère Classe',
        '2EME_CLASSE': '2ème Classe',
        'ECO': 'Économique',
        'STANDARD': 'Standard'
      };

      setResult({
        valid: b.status === 'PAYE',
        message: b.status === 'PAYE' ? 'Billet Validé' : 'Paiement Requis',
        booking: {
          id: b.id,
          bookingNumber: b.reference,
          passengerName: `${b.passengers[0]?.first_name} ${b.passengers[0]?.last_name}`,
          passengerPhone: b.contact_phone,
          seatNumber: b.passengers.map((p: any) => p.seat_number).filter(Boolean).join(', ') || '—',
          departureCity: b.trip.from.name,
          arrivalCity: b.arrival_city_name || b.trip.to.name,
          classLabel: classMapping[b.class_type] || 'Standard',
          classCode: b.class_type,
          paymentStatus: b.status === 'PAYE' ? 'Payé' : 'Non payé',
          rawStatus: b.status,
          passengers: b.passengers.map((p: any) => ({ ...p, firstName: p.first_name, lastName: p.last_name })),
          tripType: b.trip.type,
          registration: b.trip.vehicle?.registration || '—',
          freeWeight: b.trip.company.default_free_weight_limit || 30,
          excessPrice: b.trip.company.default_excess_weight_price || 500,
          luggages: b.luggages || [],
          companyId: b.trip.company_id,
          amount: b.total_amount
        }
      });
      setCurrentPage(1);
    } catch (e) {
      toast.error('Erreur serveur.');
    } finally {
      setLoading(false);
    }
  };

  const handleBoardPassenger = async (passengerId: string) => {
    if (!result?.valid) {
      toast.error("Paiement requis avant l'embarquement.");
      return;
    }
    setBoardingId(passengerId);
    try {
      const { error } = await supabase.from('passengers').update({ boarded: true }).eq('id', passengerId);
      if (error) throw error;
      toast.success("Embarqué !");
      handleValidate(result?.booking?.bookingNumber);
    } catch (e) {
      toast.error("Erreur technique.");
    } finally {
      setBoardingId(null);
    }
  };

  const handleSaveLuggage = async () => {
    if (!result?.booking) return;
    setLoading(true);
    try {
      let payload: any = {
        booking_id: result.booking.id,
        passenger_id: result.booking.passengers[0].id,
      };

      if (result.booking.tripType === 'TRAIN') {
        const w = parseFloat(weightInput) || 0;
        const excess = Math.max(0, w - result.booking.freeWeight);
        payload = { ...payload, label: `Poids: ${w}kg`, total_price: excess * result.booking.excessPrice, quantity: 1 };
      } else {
        if (!selectedBusItem) return;
        const qty = parseInt(qtyInput) || 1;
        payload = { ...payload, label: selectedBusItem.label, quantity: qty, total_price: selectedBusItem.price * qty };
      }

      await supabase.from('luggages').insert([payload]);
      handleValidate(result.booking.bookingNumber);
      setWeightInput('');
    } finally {
      setLoading(false);
    }
  };

  const paginatedPassengers = useMemo(() => {
    if (!result?.booking) return [];
    const start = (currentPage - 1) * itemsPerPage;
    return result.booking.passengers.slice(start, start + itemsPerPage);
  }, [result, currentPage]);

  const luggageTotal = result?.booking?.luggages?.reduce((sum, l) => sum + Number(l.total_price || 0), 0) || 0;
  const TransportIcon = result?.booking?.tripType === 'BOAT' ? Ship : result?.booking?.tripType === 'TRAIN' ? Train : Bus;

  return (
    <div className="max-w-2xl mx-auto p-4 pb-20 text-left space-y-6 animate-in fade-in duration-500">
      
      <header className="flex items-center gap-4 bg-white p-6 rounded-[2rem] border-2 border-slate-100 shadow-sm w-full">
        <div className="p-3 bg-slate-900 rounded-2xl shadow-lg text-white">
          <Ticket size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-black italic tracking-tighter text-slate-900 uppercase leading-none">Guichet Contrôle</h1>
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1 italic">Validation & Embarquement</p>
        </div>
      </header>

      <div className="bg-white border-2 border-slate-100 rounded-[2rem] p-4 shadow-xl shadow-slate-100/50 flex gap-2">
        <Input 
          value={qrInput} 
          onChange={e => setQrInput(e.target.value)} 
          placeholder="RÉFÉRENCE OU SCAN QR..." 
          className="h-14 rounded-2xl border-none bg-slate-50 font-black uppercase tracking-widest px-6 shadow-inner"
          onKeyDown={e => e.key === 'Enter' && handleValidate()} 
        />
        <Button onClick={() => handleValidate()} disabled={loading} className="h-14 w-14 rounded-2xl shadow-lg bg-primary">
          {loading ? <RefreshCw className="animate-spin h-6 w-6 text-white" /> : <Search className="h-6 w-6 text-white" />}
        </Button>
      </div>

      {result && result.booking && (
        <div className="space-y-4 animate-in slide-in-from-bottom-4 duration-500">
          <div className={`border-4 rounded-[2.5rem] p-8 shadow-2xl transition-all ${result.valid ? 'border-emerald-500 bg-emerald-50/5' : 'border-amber-500 bg-amber-50/5'}`}>
            
            <div className="flex items-center justify-between mb-8 pb-6 border-b border-dashed border-slate-200">
              <div className="flex items-center gap-4">
                {result.valid ? <CheckCircle size={40} className="text-emerald-600" /> : <AlertCircle size={40} className="text-amber-600" />}
                <div>
                    <span className="text-2xl font-black uppercase tracking-tighter block leading-none text-slate-900">{result.message}</span>
                    <Badge variant="outline" className="mt-2 border-primary/20 text-primary font-black text-[10px] uppercase px-3">{result.booking.classLabel}</Badge>
                </div>
              </div>
              {(result.booking.classCode === 'VIP' || result.booking.classCode === '1ERE_CLASSE') && (
                <div className="p-3 bg-amber-100 rounded-2xl text-amber-600 shadow-lg shadow-amber-100 animate-pulse">
                    <Gem size={28} />
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-y-8 gap-x-6 mb-8 bg-white p-6 rounded-3xl border border-slate-100 shadow-inner">
              <InfoField label="Nom du Voyageur" value={result.booking.passengerName} />
              <InfoField label="Destination Finale" value={result.booking.arrivalCity} />
              <InfoField label="N° de Billet" value={result.booking.bookingNumber} />
              <InfoField label="Siège(s)" value={result.booking.seatNumber} />
              
              <div className="col-span-2 flex items-center gap-3 pt-4 border-t border-dashed">
                 <div className="h-10 w-10 rounded-xl bg-slate-900 flex items-center justify-center text-primary shadow-md">
                    <TransportIcon size={20} />
                 </div>
                 <div className="flex flex-col">
                    <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest leading-none">Matériel / Immatriculation</span>
                    <span className="font-mono text-sm font-black text-slate-900 uppercase mt-1">
                       {result.booking.registration}
                    </span>
                 </div>
              </div>
            </div>

            {/* SECTION BAGAGES */}
            <div className="bg-slate-900 p-6 rounded-[2rem] shadow-xl mb-8 text-white relative overflow-hidden">
               <Package className="absolute -right-4 -top-4 h-24 w-24 opacity-10 rotate-12" />
               <h3 className="text-[10px] font-black uppercase mb-4 flex items-center gap-2 text-primary tracking-widest">
                 <Package size={14} /> Suppléments Bagages
               </h3>
               
               {result.booking.luggages.length > 0 && (
                 <div className="space-y-2 mb-6">
                    {result.booking.luggages.map(lug => (
                      <div key={lug.id} className="flex justify-between items-center bg-white/5 p-3 rounded-xl border border-white/10 text-xs font-bold backdrop-blur-sm">
                         <span className="text-slate-300">{lug.quantity}x {lug.label}</span>
                         <span className="text-primary font-black">{(lug.total_price || 0).toLocaleString()} F</span>
                      </div>
                    ))}
                    <div className="flex justify-between p-4 bg-primary/10 rounded-xl border border-primary/20 font-black text-xs uppercase text-primary">
                      <span>Total Suppléments</span>
                      <span>{(luggageTotal || 0).toLocaleString()} FCFA</span>
                    </div>
                 </div>
               )}

               {!result.booking.passengers.some(p => p.boarded) ? (
                 <div className="space-y-4">
                    {result.booking.tripType === 'TRAIN' ? (
                      <div className="flex gap-2">
                        <Input type="number" placeholder="POIDS KG" value={weightInput} onChange={e => setWeightInput(e.target.value)} className="h-12 rounded-xl bg-white/10 border-none text-white font-black" />
                        <Button onClick={handleSaveLuggage} className="h-12 px-6 font-black uppercase text-[10px] bg-primary">PESER</Button>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-3">
                        <div className="flex gap-2">
                            <select className="flex-1 h-12 rounded-xl bg-white/10 border-none px-4 text-xs font-black uppercase text-white outline-none" onChange={(e) => setSelectedBusItem(JSON.parse(e.target.value))}>
                            {agencyRates.map((item, i) => (
                                <option key={i} value={JSON.stringify(item)} className="bg-slate-900 text-white">{item.label} ({(item.price || 0)} F)</option>
                            ))}
                            </select>
                            <Input type="number" value={qtyInput} onChange={e => setQtyInput(e.target.value)} className="w-20 h-12 rounded-xl bg-white/10 border-none text-white font-black text-center" />
                        </div>
                        <Button onClick={handleSaveLuggage} className="w-full h-12 font-black uppercase text-[10px] bg-primary tracking-widest shadow-lg">Enregistrer supplément</Button>
                      </div>
                    )}
                 </div>
               ) : (
                 <p className="text-[10px] text-emerald-400 italic font-black flex items-center gap-2 justify-center py-2"><Lock size={14} /> Passager à bord : Bagages clôturés.</p>
               )}
            </div>

            {/* SECTION EMBARQUEMENT */}
            <div className="space-y-4">
               <h3 className="text-[10px] font-black uppercase flex items-center gap-2 text-slate-400 tracking-widest ml-4">
                 <Users size={14} /> Liste d'embarquement
               </h3>
               
               {!result.valid ? (
                 <div className="bg-amber-100/50 p-8 rounded-[2.5rem] border-2 border-amber-200 flex flex-col items-center gap-4 text-amber-900 text-center animate-pulse">
                   <div className="p-4 bg-amber-200 rounded-full shadow-lg shadow-amber-100"><CreditCard size={32} /></div>
                   <div>
                       <p className="text-sm font-black uppercase tracking-tighter">Paiement Non Réglé</p>
                       <p className="text-[10px] font-bold opacity-70 mt-1 uppercase">L'embarquement est strictement interdit.</p>
                   </div>
                 </div>
               ) : (
                 <div className="space-y-3">
                    {paginatedPassengers.map(p => (
                      <div key={p.id} className="flex items-center justify-between bg-white border-2 border-slate-50 p-5 rounded-3xl shadow-sm group hover:border-primary/30 transition-all">
                        <div>
                          <p className="font-black text-sm text-slate-900 uppercase tracking-tight">{p.firstName} {p.lastName}</p>
                          <p className="text-[10px] font-black text-primary mt-1">Siège {p.seatNumber || "—"}</p>
                        </div>
                        {p.boarded ? (
                          <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100">
                             <CheckCircle size={14} />
                             <span className="text-[10px] font-black uppercase">À BORD</span>
                          </div>
                        ) : (
                          <Button 
                            onClick={() => handleBoardPassenger(p.id)} 
                            disabled={boardingId === p.id || !canBoardPassengers} 
                            className="h-11 px-6 font-black uppercase text-[10px] rounded-xl shadow-md bg-slate-900 hover:bg-black"
                          >
                             {boardingId === p.id ? <RefreshCw className="animate-spin h-4 w-4"/> : "Embarquer"}
                          </Button>
                        )}
                      </div>
                    ))}
                 </div>
               )}
            </div>
          </div>

          {/* ACTION CAISSE RAPIDE */}
          {!result.valid && canCollectMoney && (
            <div className="bg-emerald-600 p-8 rounded-[2.5rem] shadow-2xl text-white flex items-center justify-between gap-6 animate-in slide-in-from-bottom-2">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest opacity-80 leading-none">Caisse Guichet</p>
                <h4 className="text-2xl font-black uppercase italic mt-1 tracking-tighter">{(result.booking?.amount || 0).toLocaleString()} F</h4>
              </div>
              <Button 
                onClick={() => supabase.from('bookings').update({status:'PAYE'}).eq('id', result.booking?.id).then(()=>handleValidate(result.booking?.bookingNumber))} 
                className="bg-white text-emerald-700 hover:bg-slate-50 font-black text-xs h-14 px-10 rounded-2xl shadow-xl uppercase tracking-widest"
              >
                Valider Cash
              </Button>
            </div>
          )}
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