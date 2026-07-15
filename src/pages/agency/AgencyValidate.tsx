"use client"

import { useState } from 'react';
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
  Lock
} from 'lucide-react';
import { toast } from 'sonner';

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

// Type pour les réglages dynamiques de l'agence
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

  // États pour les bagages dynamiques
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

      // 1. Récupérer le billet et les infos compagnie
      const { data: b, error } = await supabase
        .from('bookings')
        .select(`
          *, 
          trip:trips(*, from:cities!from_id(name), to:cities!to_id(name), company:companies(*)), 
          passengers(*), 
          luggages(*)
        `)
        .eq('reference', ref)
        .single();

      if (error || !b) {
        setResult({ valid: false, message: 'Billet introuvable.' });
        return;
      }

      // 2. Charger les tarifs de bagages personnalisés de cette agence
      const { data: rates } = await supabase
        .from('company_luggage_settings')
        .select('label, price')
        .eq('company_id', b.trip.company_id);

      if (rates && rates.length > 0) {
        setAgencyRates(rates);
        setSelectedBusItem(rates[0]);
      }

      setResult({
        valid: b.status === 'PAYE',
        message: b.status === 'PAYE' ? 'Billet prêt' : 'Paiement en attente',
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
          // Utilise les réglages de la compagnie ou des valeurs par défaut
          freeWeight: b.trip.company.default_free_weight_limit || 30,
          excessPrice: b.trip.company.default_excess_weight_price || 500,
          luggages: b.luggages || [],
          companyId: b.trip.company_id
        }
      });
    } catch (e) {
      toast.error('Erreur.');
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

      const { error } = await supabase.from('luggages').insert([payload]);
      if (error) throw error;
      toast.success("Bagage ajouté");
      handleValidate(result.booking.bookingNumber);
      setWeightInput('');
    } catch (e) {
      toast.error("Erreur.");
    } finally {
      setLoading(false);
    }
  };

  const handleBoardPassenger = async (passengerId: string) => {
    if (result?.booking?.rawStatus !== 'PAYE') {
      toast.error("Paiement requis avant l'embarquement.");
      return;
    }
    setBoardingId(passengerId);
    try {
      await supabase.from('passengers').update({ boarded: true }).eq('id', passengerId);
      handleValidate(result?.booking?.bookingNumber);
      toast.success("Embarqué !");
    } finally {
      setBoardingId(null);
    }
  };

  const isAnyPassengerBoarded = result?.booking?.passengers.some(p => p.boarded) || false;
  const luggageTotal = result?.booking?.luggages?.reduce((sum, l) => sum + Number(l.total_price || 0), 0) || 0;

  return (
    <div className="max-w-xl text-foreground text-left mx-auto p-4 pb-20">
      <h1 className="text-2xl font-black mb-8 italic text-primary">Contrôle & Bagages</h1>

      <div className="bg-card border-2 border-primary/10 rounded-3xl p-6 mb-6">
        <div className="flex gap-2">
          <Input value={qrInput} onChange={e => setQrInput(e.target.value)} placeholder="Référence..." className="h-12 rounded-xl font-bold" />
          <Button onClick={() => handleValidate()} disabled={loading} className="h-12 px-6 rounded-xl">
            {loading ? <RefreshCw className="animate-spin" /> : <Search />}
          </Button>
        </div>
      </div>

      {result && result.booking && (
        <div className="space-y-6">
          <div className={`border-2 rounded-3xl p-6 ${result.valid ? 'border-emerald-500 bg-emerald-50/30' : 'border-amber-500 bg-amber-50/30'}`}>
            <div className="flex items-center gap-3 mb-6">
              {result.valid ? <CheckCircle className="h-8 w-8 text-emerald-600" /> : <AlertCircle className="h-8 w-8 text-amber-600" />}
              <span className="text-xl font-black">{result.message}</span>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm border-t border-dashed pt-4 mb-6">
              <InfoField label="Passager" value={result.booking.passengerName} />
              <InfoField label="N° Billet" value={result.booking.bookingNumber} />
            </div>

            {/* LISTE DES BAGAGES DÉJÀ PRÉSENTS */}
            {result.booking.luggages.length > 0 && (
              <div className="mb-6 space-y-2">
                <p className="text-[10px] font-black uppercase text-muted-foreground ml-1">Bagages enregistrés</p>
                {result.booking.luggages.map((lug) => (
                  <div key={lug.id} className="flex justify-between items-center bg-white/50 p-3 rounded-xl border border-primary/5 text-sm">
                    <span className="font-bold">{lug.quantity}x {lug.label}</span>
                    <span className="font-black text-primary">{lug.total_price.toLocaleString()} F</span>
                  </div>
                ))}
                <div className="flex justify-between p-2 bg-primary text-white rounded-lg font-black text-xs">
                  <span>TOTAL À PAYER (BAGAGES)</span>
                  <span>{luggageTotal.toLocaleString()} FCFA</span>
                </div>
              </div>
            )}

            {/* SECTION AJOUT BAGAGES */}
            <div className="p-4 bg-white/40 rounded-2xl border-2 border-primary/5 relative">
              <h3 className="text-xs font-black uppercase mb-3 flex items-center gap-2">
                <Package className="h-4 w-4 text-primary" /> Nouveau Bagage
              </h3>
              
              {isAnyPassengerBoarded ? (
                <div className="bg-slate-100 p-4 rounded-xl border border-slate-200 flex items-center gap-3 text-slate-500 italic text-xs font-bold">
                  <Lock className="h-4 w-4" /> Passager déjà à bord. Ajout impossible.
                </div>
              ) : (
                result.booking.tripType === 'TRAIN' ? (
                  <div className="flex gap-2">
                    <Input type="number" placeholder="Poids (kg)" value={weightInput} onChange={e => setWeightInput(e.target.value)} className="bg-white" />
                    <Button onClick={handleSaveLuggage} className="font-bold">Valider</Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {agencyRates.length > 0 ? (
                      <>
                        <select 
                          className="w-full h-11 rounded-xl border bg-white px-3 text-sm font-bold" 
                          onChange={(e) => setSelectedBusItem(JSON.parse(e.target.value))}
                        >
                          {agencyRates.map((item, i) => (
                            <option key={i} value={JSON.stringify(item)}>{item.label} ({item.price} F)</option>
                          ))}
                        </select>
                        <div className="flex gap-2">
                          <Input type="number" value={qtyInput} onChange={e => setQtyInput(e.target.value)} className="w-20 font-bold bg-white" />
                          <Button onClick={handleSaveLuggage} className="flex-1 font-black text-xs">AJOUTER</Button>
                        </div>
                      </>
                    ) : (
                      <p className="text-[10px] text-red-500 font-bold uppercase text-center py-2 italic">Aucun tarif bagage configuré par l'agence.</p>
                    )}
                  </div>
                )
              )}
            </div>

            {/* EMBARQUEMENT */}
            <div className="mt-8 pt-6 border-t border-dashed">
               <h3 className="font-black text-sm mb-4 uppercase">Embarquement</h3>
               {!result.valid ? (
                 <div className="bg-amber-100 p-4 rounded-xl text-amber-800 text-xs font-bold flex items-center gap-2">
                   <AlertCircle className="h-4 w-4" /> Paiement requis pour embarquer.
                 </div>
               ) : (
                 <div className="space-y-2">
                    {result.booking.passengers.map(p => (
                      <div key={p.id} className="flex items-center justify-between bg-white p-3 rounded-2xl border border-emerald-100 shadow-sm">
                        <span className="font-bold text-sm">{p.firstName} {p.lastName}</span>
                        {p.boarded ? (
                          <span className="text-emerald-600 font-black text-[10px] uppercase flex items-center gap-1"><CheckCircle className="h-3.5 w-3.5"/> À BORD</span>
                        ) : (
                          <Button size="sm" onClick={() => handleBoardPassenger(p.id)} disabled={boardingId === p.id || !canBoardPassengers} className="h-8 font-black">
                             {boardingId === p.id ? <RefreshCw className="animate-spin h-3 w-3"/> : "VALIDER"}
                          </Button>
                        )}
                      </div>
                    ))}
                 </div>
               )}
            </div>
          </div>

          {!result.valid && canCollectMoney && (
            <Button onClick={() => handleCollectPayment()} className="w-full h-12 bg-emerald-600 text-white font-black rounded-2xl gap-2">
              <CreditCard className="h-5 w-5" /> Valider Paiement Cash
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-0.5">
      <div className="text-[10px] uppercase font-black text-muted-foreground">{label}</div>
      <div className="font-bold text-slate-800 truncate">{value || '—'}</div>
    </div>
  );
}