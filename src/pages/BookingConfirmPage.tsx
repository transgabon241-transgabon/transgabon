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
  Gem, RefreshCw, Train, Bus, MapPin, Package, Plus, Trash2, Scale, Calculator, Info 
} from 'lucide-react';

const PAYMENT_METHODS = [
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

  if (loading) return <div className="max-w-lg mx-auto p-10"><Skeleton className="h-64 w-full rounded-[2.5rem] bg-slate-900" /></div>;

  return (
    <div className="container mx-auto px-4 py-10 max-w-lg text-left space-y-8 animate-in fade-in duration-500 text-foreground">
      
      <h1 className="text-3xl font-black italic uppercase tracking-tighter text-white leading-none">Finaliser ma place</h1>

      {/* RECAP BILLET SOMBRE */}
      <div className="bg-card border-2 border-border rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden">
          <div className="flex justify-between items-start mb-6">
            <div>
              <p className="text-[10px] font-black text-primary uppercase mb-1 tracking-widest">{trip?.companyName}</p>
              <div className="flex items-center gap-2">
                <TransportIcon size={18} className="text-slate-500" />
                <p className="font-bold text-slate-200 italic uppercase text-sm">{trip?.registration}</p>
              </div>
            </div>
            <Badge className="bg-primary text-white font-black px-4 py-1.5 rounded-full text-[10px] border-none shadow-lg">SIÈGE {seat}</Badge>
          </div>
          <div className="space-y-3 p-4 bg-slate-950 rounded-3xl border border-border shadow-inner">
            <div className="flex items-center gap-3">
                <MapPin size={16} className="text-primary" />
                <p className="font-black text-sm text-slate-100 uppercase">{destinationName}</p>
            </div>
            <div className="flex items-center gap-3 border-t border-slate-800 pt-3">
                <Check size={16} className="text-primary" />
                <p className="font-black text-[11px] text-slate-400 uppercase tracking-tighter">{selectedClass.replace('_', ' ')}</p>
            </div>
          </div>
      </div>

      {/* SECTION BAGAGES SOMBRE */}
      <div className="bg-card border-2 border-border rounded-[2.5rem] p-8 shadow-xl space-y-6">
        <div className="flex items-center gap-3 text-left">
            <div className="h-10 w-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary"><Package size={20} /></div>
            <div>
                <h3 className="font-black text-sm text-white uppercase tracking-tighter leading-none">Déclaration Bagages</h3>
                <p className="text-[9px] font-bold text-slate-500 uppercase mt-1">Saisissez vos colis pour la pesée</p>
            </div>
        </div>

        <div className="space-y-3 p-4 bg-slate-950 rounded-3xl border border-border">
            <div className="grid grid-cols-1 gap-3">
                <Input 
                    placeholder="Objet (ex: Glacière, Sac...)" 
                    value={tempLabel}
                    onChange={(e) => setTempLabel(e.target.value)}
                    className="h-11 bg-slate-900 border-none shadow-inner rounded-xl font-bold text-xs text-white"
                />
                <div className="flex gap-2">
                    <div className="relative flex-1">
                        <Input 
                            type="number" 
                            placeholder="Poids" 
                            value={tempWeight}
                            onChange={(e) => setTempWeight(e.target.value)}
                            className="h-11 bg-slate-900 border-none shadow-inner rounded-xl font-black text-center text-white"
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-600">KG</span>
                    </div>
                    <Button onClick={addLuggage} type="button" className="h-11 px-6 rounded-xl bg-primary text-white font-black text-[10px] uppercase shadow-lg shadow-primary/20">
                        <Plus size={16} className="mr-2" /> Ajouter
                    </Button>
                </div>
            </div>
        </div>

        <div className="space-y-2">
            {luggages.map((lug) => (
                <div key={lug.id} className="flex items-center justify-between p-3 bg-slate-900/50 border border-border rounded-2xl animate-in fade-in slide-in-from-right-2">
                    <div className="flex items-center gap-3 text-left">
                        <Scale size={14} className="text-primary" />
                        <span className="text-xs font-bold text-slate-200 uppercase">{lug.label}</span>
                    </div>
                    <div className="flex items-center gap-4">
                        <span className="font-black text-sm text-slate-500">{lug.weight} KG</span>
                        <button onClick={() => removeLuggage(lug.id)} className="text-red-400 hover:text-red-300 transition-colors">
                            <Trash2 size={16} />
                        </button>
                    </div>
                </div>
            ))}
            {luggages.length > 0 && (
                <div className="pt-4 px-2 flex justify-between items-center border-t border-dashed border-border">
                    <p className="text-[10px] font-black text-slate-500 uppercase">Poids Total Déclaré :</p>
                    <p className="font-black text-white">{totalWeight} KG</p>
                </div>
            )}
        </div>
      </div>

      {/* TOTAL ET PAIEMENT SOMBRE */}
      <div className="space-y-6">
        <div className="bg-slate-900 border border-border p-8 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden">
            <Calculator className="absolute -right-4 -bottom-4 h-24 w-24 opacity-5 text-primary" />
            <div className="space-y-2 relative z-10 text-left">
                <div className="flex justify-between text-[10px] font-bold uppercase opacity-60"><span>Billet</span><span className="text-slate-200">{ticketPrice.toLocaleString()} F</span></div>
                {luggageTotal > 0 && (
                    <div className="flex justify-between text-[10px] font-bold uppercase text-primary">
                        <span>Excédent ({totalWeight}kg)</span>
                        <span className="animate-pulse">+{luggageTotal.toLocaleString()} F</span>
                    </div>
                )}
                <div className="h-px bg-white/10 my-4 border-t border-dashed border-border" />
                <div className="flex justify-between items-center">
                    <p className="text-xs font-black uppercase text-primary tracking-widest">Total à régler</p>
                    <p className="text-4xl font-black tracking-tighter text-white">{finalTotal.toLocaleString()} <span className="text-sm">F</span></p>
                </div>
                <div className="flex items-center gap-2 mt-4">
                    <Info size={10} className="text-slate-500" />
                    <p className="text-[8px] font-bold text-slate-500 uppercase italic leading-none">* {trip?.freeWeight}kg inclus sans supplément.</p>
                </div>
            </div>
        </div>

        <div className="grid gap-3">
          {PAYMENT_METHODS.map(pm => (
            <button
              key={pm.value}
              onClick={() => setPaymentMethod(pm.value)}
              className={`flex items-center justify-between p-5 rounded-2xl border-2 transition-all group ${
                paymentMethod === pm.value 
                  ? 'border-primary bg-primary/10 shadow-lg' 
                  : 'border-border bg-slate-900/50 hover:bg-slate-900 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center gap-4 text-left">
                <div className={`h-11 w-11 rounded-xl flex items-center justify-center transition-all ${paymentMethod === pm.value ? 'bg-primary text-white' : 'bg-slate-950 text-slate-500'}`}><pm.icon size={22} /></div>
                <span className={`font-black uppercase text-[11px] tracking-tight ${paymentMethod === pm.value ? 'text-white' : 'text-slate-300'}`}>{pm.label}</span>
              </div>
              {paymentMethod === pm.value && (
                <div className="h-6 w-6 bg-primary rounded-full flex items-center justify-center text-white shadow-sm border-2 border-slate-900">
                    <Check size={14} strokeWidth={4} />
                </div>
              )}
            </button>
          ))}
        </div>

        <Button
          className="w-full h-20 rounded-[2rem] font-black text-2xl shadow-[0_20px_50px_rgba(0,0,0,0.4)] shadow-primary/20 uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all mt-4 bg-primary text-white border-none"
          onClick={handleSubmit}
          disabled={submitting || !paymentMethod}
        >
          {submitting ? <RefreshCw className="animate-spin mr-3" /> : <CheckCircle size={28} className="mr-3" />}
          {submitting ? 'VALIDATION...' : 'RÉSERVER MAINTENANT'}
        </Button>
      </div>

      <p className="text-center text-[8px] font-black uppercase tracking-[0.4em] text-slate-600 pb-10">
        TransGabon Connect • Billetterie & Fret
      </p>
    </div>
  );
}

function CheckCircle(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}