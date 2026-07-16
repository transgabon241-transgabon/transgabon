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
  Plus,
  Lock,
  Calculator,
  Ticket,
  ChevronLeft,
  ChevronRight
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
    paymentStatus: string;
    rawStatus: string;
    passengers: PassengerData[];
    tripType: string;
    freeWeight: number;
    excessPrice: number;
    luggages: LuggageData[];
    companyId: string;
  };
};

export default function AgencyValidate() {
  const { user } = useAuth();
  
  const [qrInput, setQrInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [boardingId, setBoardingId] = useState<string | null>(null);

  // Pagination pour les passagers
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 4;

  // États bagages
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
        .select(`*, trip:trips(*, from:cities!from_id(name), to:cities!to_id(name), company:companies(*)), passengers(*), luggages(*)`)
        .eq('reference', ref)
        .single();

      if (error || !b) {
        setResult({ valid: false, message: 'Billet introuvable.' });
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
          arrivalCity: b.trip.to.name,
          paymentStatus: b.status === 'PAYE' ? 'Payé' : 'Non payé',
          rawStatus: b.status,
          passengers: b.passengers.map((p: any) => ({ ...p, firstName: p.first_name, lastName: p.last_name })),
          tripType: b.trip.type,
          freeWeight: b.trip.company.default_free_weight_limit || 30,
          excessPrice: b.trip.company.default_excess_weight_price || 500,
          luggages: b.luggages || [],
          companyId: b.trip.company_id
        }
      });
      setCurrentPage(1);
    } catch (e) {
      toast.error('Erreur serveur.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveLuggage = async () => {
    if (!result?.booking) return;
    if (result.booking.passengers.some(p => p.boarded)) {
      toast.error("Interdit : Passager déjà à bord.");
      return;
    }

    setLoading(true);
    try {
      let payload: any = {
        booking_id: result.booking.id,
        passenger_id: result.booking.passengers[0].id,
      };

      if (result.booking.tripType === 'TRAIN') {
        const w = parseFloat(weightInput);
        const excess = Math.max(0, w - result.booking.freeWeight);
        payload = { ...payload, label: `Poids: ${w}kg`, total_price: excess * result.booking.excessPrice, quantity: 1 };
      } else {
        if (!selectedBusItem) return;
        const qty = parseInt(qtyInput);
        payload = { ...payload, label: selectedBusItem.label, quantity: qty, total_price: selectedBusItem.price * qty };
      }

      await supabase.from('luggages').insert([payload]);
      handleValidate(result.booking.bookingNumber);
      setWeightInput('');
    } finally {
      setLoading(false);
    }
  };

  const handleBoardPassenger = async (passengerId: string) => {
    setBoardingId(passengerId);
    try {
      await supabase.from('passengers').update({ boarded: true }).eq('id', passengerId);
      handleValidate(result?.booking?.bookingNumber);
      toast.success("Passager à bord");
    } finally {
      setBoardingId(null);
    }
  };

  // Logique pagination passagers
  const paginatedPassengers = useMemo(() => {
    if (!result?.booking) return [];
    const start = (currentPage - 1) * itemsPerPage;
    return result.booking.passengers.slice(start, start + itemsPerPage);
  }, [result, currentPage]);

  const totalPages = Math.ceil((result?.booking?.passengers.length || 0) / itemsPerPage);

  const luggageTotal = result?.booking?.luggages?.reduce((sum, l) => sum + Number(l.total_price || 0), 0) || 0;

  return (
    <div className="max-w-2xl mx-auto p-4 pb-20 text-left space-y-6">
      
      <header className="flex items-center gap-4 bg-white p-5 rounded-3xl border-2 border-slate-50 shadow-sm w-full">
        <div className="p-2.5 bg-primary rounded-xl shadow-lg shadow-primary/10">
          <Ticket className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-black italic tracking-tight text-slate-900 uppercase leading-none">Guichet de Contrôle</h1>
          <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mt-1">Validation & Départs</p>
        </div>
      </header>

      <div className="bg-card border-2 border-primary/10 rounded-3xl p-5 shadow-sm">
        <div className="flex gap-2">
          <Input 
            value={qrInput} 
            onChange={e => setQrInput(e.target.value)} 
            placeholder="Numéro de billet..." 
            className="h-12 rounded-xl border-2 font-bold px-5"
            onKeyDown={e => e.key === 'Enter' && handleValidate()} 
          />
          <Button onClick={() => handleValidate()} disabled={loading} className="h-12 w-12 rounded-xl shadow-lg">
            {loading ? <RefreshCw className="animate-spin h-5 w-5" /> : <Search className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {result && result.booking && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
          
          <div className={`border-2 rounded-[2rem] p-6 shadow-xl transition-all ${result.valid ? 'border-emerald-500 bg-emerald-50/10' : 'border-amber-500 bg-amber-50/10'}`}>
            
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-dashed border-slate-200">
              <div className="flex items-center gap-3">
                {result.valid ? <CheckCircle className="h-8 w-8 text-emerald-600" /> : <AlertCircle className="h-8 w-8 text-amber-600" />}
                <span className="text-lg font-black uppercase tracking-tighter">{result.message}</span>
              </div>
              <Badge className={`rounded-full px-3 py-0.5 font-black text-[9px] uppercase border-2 ${result.valid ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-amber-100 text-amber-700 border-amber-200'}`}>
                {result.booking.rawStatus}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm mb-6">
              <InfoField label="Voyageur" value={result.booking.passengerName} />
              <InfoField label="Référence" value={result.booking.bookingNumber} />
              <InfoField label="Trajet" value={`${result.booking.departureCity} → ${result.booking.arrivalCity}`} />
              <InfoField label="Sièges" value={result.booking.seatNumber} />
            </div>

            {/* SECTION BAGAGES - COMPACTE */}
            <div className="bg-white/60 p-5 rounded-3xl border-2 border-primary/5 shadow-inner mb-6">
               <h3 className="text-[10px] font-black uppercase mb-3 flex items-center gap-2 text-slate-400">
                 <Package className="h-3.5 w-3.5 text-primary" /> Enregistrement Bagages
               </h3>
               
               {result.booking.luggages.length > 0 && (
                 <div className="space-y-1.5 mb-4">
                    {result.booking.luggages.map(lug => (
                      <div key={lug.id} className="flex justify-between items-center bg-white p-2.5 rounded-xl border border-slate-50 text-[11px] font-bold shadow-xs">
                         <span className="text-slate-600">{lug.quantity}x {lug.label}</span>
                         <span className="text-primary font-black">{lug.total_price.toLocaleString()} F</span>
                      </div>
                    ))}
                    <div className="flex justify-between p-2.5 bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase">
                      <span>Total Suppléments</span>
                      <span>{luggageTotal.toLocaleString()} FCFA</span>
                    </div>
                 </div>
               )}

               {!result.booking.passengers.some(p => p.boarded) ? (
                 <div className="space-y-3">
                    {result.booking.tripType === 'TRAIN' ? (
                      <div className="flex gap-2">
                        <Input type="number" placeholder="Poids KG" value={weightInput} onChange={e => setWeightInput(e.target.value)} className="h-10 rounded-lg border-2" />
                        <Button onClick={handleSaveLuggage} className="h-10 px-4 font-black uppercase text-[10px]">Calculer</Button>
                      </div>
                    ) : (
                      <div className="flex flex-col sm:flex-row gap-2">
                        <select 
                          className="flex-1 h-10 rounded-lg border-2 bg-white px-3 text-xs font-bold"
                          onChange={(e) => setSelectedBusItem(JSON.parse(e.target.value))}
                        >
                          {agencyRates.map((item, i) => (
                            <option key={i} value={JSON.stringify(item)}>{item.label} ({item.price} F)</option>
                          ))}
                        </select>
                        <div className="flex gap-2">
                          <Input type="number" value={qtyInput} onChange={e => setQtyInput(e.target.value)} className="w-16 h-10 rounded-lg border-2 font-black text-center" />
                          <Button onClick={handleSaveLuggage} className="flex-1 h-10 font-black uppercase text-[10px]">Ajouter</Button>
                        </div>
                      </div>
                    )}
                 </div>
               ) : (
                 <p className="text-[10px] text-slate-400 italic font-bold flex items-center gap-1.5"><Lock className="h-3 w-3" /> Passager à bord, bagages verrouillés.</p>
               )}
            </div>

            {/* SECTION EMBARQUEMENT - AVEC PAGINATION */}
            <div className="pt-6 border-t-2 border-dashed border-slate-100">
               <h3 className="text-[10px] font-black uppercase mb-4 flex items-center gap-2 text-slate-400">
                 <Users className="h-3.5 w-3.5 text-primary" /> Passagers ({result.booking.passengers.length})
               </h3>
               
               {!result.valid ? (
                 <div className="bg-amber-100/50 p-4 rounded-2xl border-2 border-amber-200 text-amber-800 text-[11px] font-bold text-center uppercase tracking-tighter">
                   Embarquement refusé : Paiement requis à la caisse.
                 </div>
               ) : (
                 <div className="space-y-2">
                    {paginatedPassengers.map(p => (
                      <div key={p.id} className="flex items-center justify-between bg-white border border-slate-100 p-3 rounded-2xl shadow-xs group">
                        <div>
                          <p className="font-bold text-xs text-slate-800">{p.firstName} {p.lastName}</p>
                          <Badge variant="outline" className="h-4 font-black text-[8px] uppercase tracking-tighter border-primary/20 text-primary">Siège {p.seatNumber || "—"}</Badge>
                        </div>
                        {p.boarded ? (
                          <span className="text-emerald-600 font-black text-[9px] uppercase flex items-center gap-1 px-3 py-1 bg-emerald-50 rounded-lg">À Bord</span>
                        ) : (
                          <Button 
                            onClick={() => handleBoardPassenger(p.id)} 
                            disabled={boardingId === p.id || !canBoardPassengers} 
                            className="h-8 px-4 font-black uppercase text-[9px] rounded-lg"
                          >
                             {boardingId === p.id ? <RefreshCw className="animate-spin h-3 w-3"/> : "Valider"}
                          </Button>
                        )}
                      </div>
                    ))}

                    {/* Pagination Controls */}
                    {totalPages > 1 && (
                      <div className="flex items-center justify-center gap-3 pt-4">
                        <Button variant="ghost" size="icon" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="h-7 w-7 rounded-lg"><ChevronLeft size={14}/></Button>
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{currentPage} / {totalPages}</span>
                        <Button variant="ghost" size="icon" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)} className="h-7 w-7 rounded-lg"><ChevronRight size={14}/></Button>
                      </div>
                    )}
                 </div>
               )}
            </div>
          </div>

          {/* SECTION CAISSE */}
          {!result.valid && canCollectMoney && (
            <div className="bg-emerald-600 p-6 rounded-[2rem] shadow-xl text-white flex items-center justify-between gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest opacity-80">Caisse</p>
                <h4 className="text-sm font-black uppercase italic">Encaisser le billet</h4>
              </div>
              <Button 
                onClick={() => supabase.from('bookings').update({status:'PAYE'}).eq('id', result.booking?.id).then(()=>handleValidate(result.booking?.bookingNumber))} 
                className="bg-white text-emerald-700 hover:bg-slate-50 font-black text-xs h-10 px-6 rounded-xl shadow-lg"
              >
                VALIDER CASH
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
    <div className="space-y-0.5">
      <div className="text-[9px] uppercase font-black text-slate-400 tracking-tighter leading-none">{label}</div>
      <div className="font-bold text-slate-900 text-xs truncate leading-tight">{value || '—'}</div>
    </div>
  );
}