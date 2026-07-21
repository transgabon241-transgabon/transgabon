"use client"

import { useEffect, useState, useMemo } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from "@/lib/auth-context";
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { 
  Smartphone, Building2, Check, CreditCard, Ship, 
  Gem, RefreshCw, Train, Bus, MapPin, Package, Plus, Trash2, Scale, Calculator 
} from 'lucide-react';

const PAYMENT_METHODS = [
  { value: 'airtel_money', label: 'Airtel Money', icon: Smartphone },
  { value: 'moov_money', label: 'Moov Money', icon: Smartphone },
  { value: 'agence', label: 'Paiement en agence', icon: Building2 }, 
] as const;

type TripDetails = {
  id: string;
  companyId: string;
  companyName: string;
  type: string;
  registration: string;
  freeWeight: number;
  excessPrice: number;
};

type DeclaredLuggage = {
  id: string;
  label: string;
  weight: number;
};

export default function BookingConfirmPage() {
  const { departureId } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { user, isLoading, loginWithRedirect } = useAuth();

  const seat = params.get('seat') || '';
  const selectedClass = params.get('class') || 'STANDARD';
  const ticketPrice = Number(params.get('price')) || 0;
  const destinationName = params.get('to') || '';
  
  const [trip, setTrip] = useState<TripDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');

  const [luggages, setLuggages] = useState<DeclaredLuggage[]>([]);
  const [tempLabel, setTempLabel] = useState("");
  const [tempWeight, setTempWeight] = useState("");

  useEffect(() => {
    if (!isLoading && !user) loginWithRedirect({ initialView: 'signin' });
  }, [isLoading, user]);

  useEffect(() => {
    if (user) {
      setName(`${user.firstName || ''} ${user.lastName || ''}`.trim());
      setPhone(user.phone || '');
    }
  }, [user]);

  useEffect(() => {
    if (!departureId) return;
    const loadDetails = async () => {
      try {
        const { data: d } = await supabase
          .from('trips')
          .select('*, company:companies(*), vehicle:vehicles(registration)')
          .eq('id', departureId)
          .single();

        if (d) {
          setTrip({
            id: d.id,
            companyId: d.company_id,
            companyName: d.company?.name || 'Compagnie',
            registration: d.vehicle?.registration || '—',
            type: d.type,
            freeWeight: d.company.default_free_weight_limit || 30,
            excessPrice: d.company.default_excess_weight_price || 500
          });
        }
      } finally { setLoading(false); }
    };
    loadDetails();
  }, [departureId]);

  // FONCTION CORRIGÉE : addLuggage au lieu de addStop
  const addLuggage = () => {
    if (!tempLabel || !tempWeight) return toast.error("Précisez l'objet et son poids");
    const newLuggage: DeclaredLuggage = {
      id: Math.random().toString(36).substr(2, 9),
      label: tempLabel,
      weight: parseFloat(tempWeight)
    };
    setLuggages([...luggages, newLuggage]);
    setTempLabel("");
    setTempWeight("");
  };

  const removeLuggage = (id: string) => {
    setLuggages(luggages.filter(l => l.id !== id));
  };

  const totalWeight = useMemo(() => luggages.reduce((sum, l) => sum + l.weight, 0), [luggages]);
  
  const luggageTotal = useMemo(() => {
    if (!trip) return 0;
    const excess = Math.max(0, totalWeight - trip.freeWeight);
    return excess * trip.excessPrice;
  }, [totalWeight, trip]);

  const finalTotal = ticketPrice + luggageTotal;

  const handleSubmit = async () => {
    if (!name || !phone || !paymentMethod) return toast.error('Informations incomplètes');
    setSubmitting(true);

    try {
      const nameParts = name.trim().split(/\s+/);
      const firstName = nameParts[0];
      const lastName = nameParts.slice(1).join(' ') || '—';

      const { data: res, error } = await supabase.rpc('create_booking_transaction', {
        p_trip_id: departureId,
        p_user_id: user?.id,
        p_contact_phone: phone,
        p_contact_email: user?.email,
        p_passenger_first_name: firstName,
        p_passenger_last_name: lastName,
        p_seat_number: seat,
        p_payment_method: paymentMethod.toUpperCase(),
        p_total_amount: ticketPrice,
        p_arrival_city_name: destinationName,
        p_class_type: selectedClass
      });

      if (error || !res?.success) throw new Error(error?.message || res?.error);

      if (luggages.length > 0) {
        const luggageEntries = luggages.map(l => ({
          booking_id: res.booking_id,
          label: l.label,
          quantity: 1,
          total_price: 0 
        }));
        if (luggageTotal > 0) {
            luggageEntries.push({
                booking_id: res.booking_id,
                label: `Excédent estimé (${totalWeight}kg)`,
                quantity: 1,
                total_price: luggageTotal
            });
        }
        await supabase.from('luggages').insert(luggageEntries);
      }

      toast.success('Réservation effectuée !');
      navigate(`/ticket/${res.booking_id}`);
    } catch (err: any) { toast.error(err.message); } 
    finally { setSubmitting(false); }
  };

  const TransportIcon = trip?.type === 'TRAIN' ? Train : trip?.type === 'BOAT' ? Ship : Bus;

  if (loading) return <div className="max-w-lg mx-auto p-10"><Skeleton className="h-64 w-full rounded-[2.5rem]" /></div>;

  return (
    <div className="container mx-auto px-4 py-10 max-w-lg text-left space-y-8 animate-in fade-in duration-500">
      
      <h1 className="text-3xl font-black italic uppercase tracking-tighter text-slate-900 leading-none">Finaliser ma place</h1>

      {/* RECAP BILLET */}
      <div className="bg-white border-2 border-slate-100 rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden">
          <div className="flex justify-between items-start mb-6">
            <div>
              <p className="text-[10px] font-black text-primary uppercase mb-1 tracking-widest">{trip?.companyName}</p>
              <div className="flex items-center gap-2">
                <TransportIcon size={18} className="text-slate-400" />
                <p className="font-bold text-slate-800 italic uppercase text-sm">{trip?.registration}</p>
              </div>
            </div>
            <Badge className="bg-slate-900 text-white font-black px-4 py-1.5 rounded-full text-[10px]">SIÈGE {seat}</Badge>
          </div>
          <div className="space-y-3 p-4 bg-slate-50 rounded-3xl border border-slate-100">
            <div className="flex items-center gap-3">
                <MapPin size={16} className="text-primary" />
                <p className="font-black text-sm text-slate-700 uppercase">{destinationName}</p>
            </div>
            <div className="flex items-center gap-3 border-t border-slate-200 pt-3">
                <Check size={16} className="text-primary" />
                <p className="font-black text-[11px] text-slate-500 uppercase tracking-tighter">{selectedClass.replace('_', ' ')}</p>
            </div>
          </div>
      </div>

      {/* SECTION BAGAGES (Saisie libre) */}
      <div className="bg-white border-2 border-slate-100 rounded-[2.5rem] p-8 shadow-xl space-y-6">
        <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary"><Package size={20} /></div>
            <div>
                <h3 className="font-black text-sm text-slate-900 uppercase tracking-tighter">Déclaration de Bagages</h3>
                <p className="text-[9px] font-bold text-slate-400 uppercase">Saisissez vos colis pour la pesée</p>
            </div>
        </div>

        <div className="space-y-3 p-4 bg-slate-50 rounded-3xl border border-slate-100">
            <div className="grid grid-cols-1 gap-3">
                <Input 
                    placeholder="Déclarez vos bagages ici (ex: Glacière, Sac...)" 
                    value={tempLabel}
                    onChange={(e) => setTempLabel(e.target.value)}
                    className="h-11 bg-white border-none shadow-sm rounded-xl font-bold text-xs"
                />
                <div className="flex gap-2">
                    <div className="relative flex-1">
                        <Input 
                            type="number" 
                            placeholder="Poids estimé" 
                            value={tempWeight}
                            onChange={(e) => setTempWeight(e.target.value)}
                            className="h-11 bg-white border-none shadow-sm rounded-xl font-black text-center"
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-300">KG</span>
                    </div>
                    {/* APPEL À LA FONCTION addLuggage ICI */}
                    <Button onClick={addLuggage} type="button" className="h-11 px-6 rounded-xl bg-slate-900 text-white font-black text-[10px] uppercase">
                        <Plus size={16} className="mr-2" /> Ajouter
                    </Button>
                </div>
            </div>
        </div>

        <div className="space-y-2">
            {luggages.map((lug) => (
                <div key={lug.id} className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-2xl animate-in fade-in slide-in-from-right-2">
                    <div className="flex items-center gap-3 text-left">
                        <Scale size={14} className="text-primary" />
                        <span className="text-xs font-bold text-slate-700 uppercase">{lug.label}</span>
                    </div>
                    <div className="flex items-center gap-4">
                        <span className="font-black text-sm text-slate-400">{lug.weight} KG</span>
                        <button onClick={() => removeLuggage(lug.id)} className="text-red-300 hover:text-red-500 transition-colors">
                            <Trash2 size={16} />
                        </button>
                    </div>
                </div>
            ))}
            {luggages.length > 0 && (
                <div className="pt-4 px-2 flex justify-between items-center border-t border-dashed">
                    <p className="text-[10px] font-black text-slate-400 uppercase">Poids Total Déclaré :</p>
                    <p className="font-black text-slate-900">{totalWeight} KG</p>
                </div>
            )}
        </div>
      </div>

      {/* TOTAL ET PAIEMENT */}
      <div className="space-y-6">
        <div className="bg-slate-900 p-8 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden">
            <Calculator className="absolute -right-4 -bottom-4 h-24 w-24 opacity-10" />
            <div className="space-y-2 relative z-10 text-left">
                <div className="flex justify-between text-[10px] font-bold uppercase opacity-60"><span>Billet</span><span>{ticketPrice.toLocaleString()} F</span></div>
                {luggageTotal > 0 && (
                    <div className="flex justify-between text-[10px] font-bold uppercase text-primary animate-pulse">
                        <span>Excédent ({totalWeight}kg)</span>
                        <span>+{luggageTotal.toLocaleString()} F</span>
                    </div>
                )}
                <div className="h-px bg-white/10 my-4 border-t border-dashed" />
                <div className="flex justify-between items-center">
                    <p className="text-xs font-black uppercase text-primary">Total à régler</p>
                    <p className="text-4xl font-black tracking-tighter">{finalTotal.toLocaleString()} <span className="text-sm">F</span></p>
                </div>
                <p className="text-[8px] font-bold text-slate-400 mt-4 uppercase italic">* {trip?.freeWeight}kg inclus gratuitement.</p>
            </div>
        </div>

        <div className="grid gap-3">
          {PAYMENT_METHODS.map(pm => (
            <button
              key={pm.value}
              onClick={() => setPaymentMethod(pm.value)}
              className={`flex items-center justify-between p-5 rounded-2xl border-2 transition-all ${
                paymentMethod === pm.value ? 'border-primary bg-primary/5 shadow-inner' : 'border-slate-100 bg-white'
              }`}
            >
              <div className="flex items-center gap-4 text-left">
                <div className={`h-11 w-11 rounded-xl flex items-center justify-center ${paymentMethod === pm.value ? 'bg-primary text-white shadow-lg' : 'bg-slate-50 text-slate-400'}`}><pm.icon size={22} /></div>
                <span className="font-black uppercase text-[11px] text-slate-700 tracking-tight">{pm.label}</span>
              </div>
              {paymentMethod === pm.value && <div className="h-6 w-6 bg-primary rounded-full flex items-center justify-center text-white shadow-sm"><Check size={14} strokeWidth={4} /></div>}
            </button>
          ))}
        </div>

        <Button
          className="w-full h-20 rounded-[2rem] font-black text-2xl shadow-2xl shadow-primary/20 uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all mt-4"
          onClick={handleSubmit}
          disabled={submitting || !paymentMethod}
        >
          {submitting ? <RefreshCw className="animate-spin mr-3" /> : <CreditCard className="mr-3 h-7 w-7" />}
          {submitting ? 'TRAITEMENT...' : 'VALIDER MA RÉSERVATION'}
        </Button>
      </div>
    </div>
  );
}