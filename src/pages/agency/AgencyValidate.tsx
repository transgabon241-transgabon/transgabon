"use client"

import { useState, useEffect } from 'react'; // Ajout de useEffect
import { supabase } from '@/lib/supabase';
import { useAuth } from "@/lib/auth-context";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  CheckCircle, 
  XCircle, 
  Search, 
  CreditCard, 
  RefreshCw, 
  Users, 
  UserCheck, 
  AlertCircle,
  Package,
  Plus,
  Trash2
} from 'lucide-react';
import { toast } from 'sonner';

const BUS_LUGGAGE_RATES = [
  { label: 'Sac de voyage / Valise', price: 1000 },
  { label: 'Grand Sac (Ballot / Mbinda)', price: 2000 },
  { label: 'Sac de vivres (Riz/Manioc)', price: 1500 },
  { label: 'Carton / Caisse', price: 2500 },
  { label: 'Électroménager (TV, etc)', price: 3000 },
];

type PassengerData = {
  id: string;
  firstName: string;
  lastName: string;
  boarded: boolean;
};

// Type pour afficher les bagages enregistrés
type LuggageData = {
  id: string;
  label: string;
  quantity: number;
  total_price: number;
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
    luggageRule: string; 
    freeWeight: number;
    excessPrice: number;
    // AJOUT : Liste des bagages déjà en base
    luggages: LuggageData[]; 
  };
};

export default function AgencyValidate() {
  const { user } = useAuth();
  const [qrInput, setQrInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [boardingId, setBoardingId] = useState<string | null>(null);

  const [weightInput, setWeightInput] = useState<string>('');
  const [selectedBusItem, setSelectedBusItem] = useState(BUS_LUGGAGE_RATES[0]);
  const [qtyInput, setQtyInput] = useState('1');

  const userRole = user?.role?.toUpperCase();
  const canCollectMoney = ['CAISSIER', 'AGENT', 'ADMINISTRATEUR', 'ADMIN'].includes(userRole || '');
  const isAgencyStaff = ['AGENT', 'AGENCE_EMBARQUEMENT', 'CAISSIER', 'SERVICE_COLIS', 'ADMIN'].includes(userRole || '');

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

      // Récupération du billet + gares + passagers + BAGAGES
      const { data: b, error } = await supabase
        .from('bookings')
        .select(`
          *, 
          trip:trips(*, from:cities!from_id(name), to:cities!to_id(name)), 
          passengers(*),
          luggages(*)
        `)
        .eq('reference', ref)
        .single();

      if (error || !b) {
        setResult({ valid: false, message: 'Billet introuvable.' });
        return;
      }

      const lead = b.passengers[0];
      const passengerName = lead ? `${lead.first_name} ${lead.last_name}` : 'Anonyme';
      
      setResult({
        valid: b.status === 'PAYE',
        message: b.status === 'PAYE' ? 'Billet validé !' : 'Attention : Paiement requis.',
        booking: {
          id: b.id,
          bookingNumber: b.reference,
          passengerName,
          passengerPhone: b.contact_phone,
          seatNumber: b.passengers.map((p: any) => p.seat_number).filter(Boolean).join(', ') || '—',
          departureCity: b.trip.from.name,
          arrivalCity: b.trip.to.name,
          paymentStatus: b.status === 'PAYE' ? 'Payé' : 'Non payé',
          rawStatus: b.status,
          passengers: b.passengers.map((p: any) => ({ ...p, firstName: p.first_name, lastName: p.last_name })),
          tripType: b.trip.type,
          luggageRule: b.trip.luggage_rule_type || 'PER_ITEM',
          freeWeight: b.trip.free_weight_limit || 30,
          excessPrice: b.trip.excess_weight_price || 500,
          luggages: b.luggages || [], // On charge les bagages existants
        }
      });
    } catch (e) {
      toast.error('Erreur de chargement.');
    } finally {
      setLoading(false);
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
        const w = parseFloat(weightInput);
        if (isNaN(w)) return;
        const excess = Math.max(0, w - result.booking.freeWeight);
        payload = { ...payload, label: `Poids: ${w}kg`, weight: w, is_excess_weight: excess > 0, total_price: excess * result.booking.excessPrice, quantity: 1 };
      } else {
        const qty = parseInt(qtyInput);
        payload = { ...payload, label: selectedBusItem.label, quantity: qty, price_per_unit: selectedBusItem.price, total_price: selectedBusItem.price * qty };
      }

      const { error } = await supabase.from('luggages').insert([payload]);
      if (error) throw error;

      toast.success("Bagage enregistré !");
      
      // RECHARGEMENT DU BILLET POUR METTRE À JOUR LA LISTE
      handleValidate(result.booking.bookingNumber);
      
      setWeightInput('');
      setQtyInput('1');
    } catch (e) {
      toast.error("Erreur enregistrement.");
    } finally {
      setLoading(false);
    }
  };

  // Calcul du total global (Billet + tous les bagages)
  const luggageTotal = result?.booking?.luggages.reduce((sum, l) => sum + l.total_price, 0) || 0;

  return (
    <div className="max-w-xl text-foreground text-left mx-auto p-4 pb-20">
      <h1 className="text-2xl font-black mb-1 italic text-primary">Contrôle & Bagages</h1>
      <p className="text-muted-foreground mb-8 text-[10px] uppercase font-bold tracking-[0.2em]">Service National de Transport</p>

      {/* RECHERCHE */}
      <div className="bg-card border-2 border-primary/10 rounded-3xl p-6 mb-6 shadow-sm">
        <div className="flex gap-2">
          <Input 
            value={qrInput} 
            onChange={e => setQrInput(e.target.value)} 
            placeholder="Référence billet..." 
            className="h-12 rounded-xl font-bold"
            onKeyDown={e => e.key === 'Enter' && handleValidate()} 
          />
          <Button onClick={() => handleValidate()} disabled={loading} className="h-12 w-14 rounded-xl">
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
              <InfoField label="Trajet" value={`${result.booking.departureCity} → ${result.booking.arrivalCity}`} />
              <InfoField label="Paiement" value={result.booking.paymentStatus} />
            </div>

            {/* LISTE DES BAGAGES ENREGISTRÉS */}
            {result.booking.luggages.length > 0 && (
              <div className="mb-6 space-y-2">
                <p className="text-[10px] font-black uppercase text-muted-foreground ml-1">Bagages enregistrés</p>
                {result.booking.luggages.map((lug) => (
                  <div key={lug.id} className="flex justify-between items-center bg-white/50 p-3 rounded-xl border border-primary/5 text-sm">
                    <span className="font-bold">{lug.quantity}x {lug.label}</span>
                    <span className="font-black text-primary">{lug.total_price.toLocaleString()} F</span>
                  </div>
                ))}
                <div className="flex justify-between p-2 bg-primary text-white rounded-lg font-black text-xs uppercase">
                  <span>Total Bagages</span>
                  <span>{lugageTotal.toLocaleString()} FCFA</span>
                </div>
              </div>
            )}

            {/* FORMULAIRE AJOUT */}
            <div className="p-4 bg-white rounded-2xl border-2 border-primary/5">
              <h3 className="text-xs font-black uppercase mb-3 flex items-center gap-2">
                <Package className="h-4 w-4" /> Nouveau Bagage
              </h3>
              {result.booking.tripType === 'TRAIN' ? (
                <div className="flex gap-2">
                  <Input type="number" placeholder="Poids en kg" value={weightInput} onChange={e => setWeightInput(e.target.value)} />
                  <Button onClick={handleSaveLuggage} className="font-bold">Valider</Button>
                </div>
              ) : (
                <div className="space-y-3">
                   <select 
                     className="w-full h-11 rounded-xl border-2 bg-muted/20 px-3 text-sm font-bold"
                     onChange={(e) => setSelectedBusItem(JSON.parse(e.target.value))}
                   >
                     {BUS_LUGGAGE_RATES.map((item, i) => (
                       <option key={i} value={JSON.stringify(item)}>{item.label} • {item.price}F</option>
                     ))}
                   </select>
                   <div className="flex gap-2">
                     <Input type="number" value={qtyInput} onChange={e => setQtyInput(e.target.value)} className="w-20 font-bold" />
                     <Button onClick={handleSaveLuggage} className="flex-1 font-black uppercase text-xs tracking-widest">Enregistrer</Button>
                   </div>
                </div>
              )}
            </div>
          </div>
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