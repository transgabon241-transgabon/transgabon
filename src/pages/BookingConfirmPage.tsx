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
  Crown, Gem, RefreshCw, Train, Bus, MapPin, Package, Plus, Minus, Calculator, Scale 
} from 'lucide-react';

type TripDetails = {
  id: string;
  companyId: string;
  companyName: string;
  type: string;
  registration: string;
  freeWeight: number;
  excessPrice: number;
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

  // États Bagages
  const [availableLuggageTypes, setAvailableLuggageTypes] = useState<any[]>([]);
  const [selectedLuggages, setSelectedLuggages] = useState<Record<string, number>>({});
  const [estimatedWeight, setEstimatedWeight] = useState("0"); // Pour le train

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

          const { data: luggageRates } = await supabase
            .from('company_luggage_settings')
            .select('*')
            .eq('company_id', d.company_id);
          if (luggageRates) setAvailableLuggageTypes(luggageRates);
        }
      } finally { setLoading(false); }
    };
    loadDetails();
  }, [departureId]);

  // CALCULS FINANCIERS
  const luggageTotal = useMemo(() => {
    // 1. Calcul par articles (Bus/Bateau)
    const itemsTotal = availableLuggageTypes.reduce((sum, type) => {
      const qty = selectedLuggages[type.id] || 0;
      return sum + (type.price * qty);
    }, 0);

    // 2. Calcul par poids (Train)
    let weightTotal = 0;
    if (trip?.type === 'TRAIN') {
        const weight = parseFloat(estimatedWeight) || 0;
        const excess = Math.max(0, weight - (trip.freeWeight || 30));
        weightTotal = excess * (trip.excessPrice || 500);
    }

    return itemsTotal + weightTotal;
  }, [selectedLuggages, availableLuggageTypes, estimatedWeight, trip]);

  const finalTotal = ticketPrice + luggageTotal;

  const updateLuggageQty = (id: string, delta: number) => {
    setSelectedLuggages(prev => ({
      ...prev,
      [id]: Math.max(0, (prev[id] || 0) + delta)
    }));
  };

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

      // Enregistrement des bagages
      const luggageEntries: any[] = [];
      
      // Ajout des articles
      Object.entries(selectedLuggages).filter(([_, qty]) => qty > 0).forEach(([typeId, qty]) => {
        const type = availableLuggageTypes.find(t => t.id === typeId);
        luggageEntries.push({
          booking_id: res.booking_id,
          label: type.label,
          quantity: qty,
          total_price: type.price * qty
        });
      });

      // Ajout du poids (si excédent train)
      if (trip?.type === 'TRAIN' && parseFloat(estimatedWeight) > trip.freeWeight) {
        luggageEntries.push({
            booking_id: res.booking_id,
            label: `Excédent Poids (${estimatedWeight}kg)`,
            quantity: 1,
            total_price: luggageTotal // Dans ce cas le total luggage vient du poids
        });
      }

      if (luggageEntries.length > 0) {
        await supabase.from('luggages').insert(luggageEntries);
      }

      toast.success('Réservation validée !');
      navigate(`/ticket/${res.booking_id}`);
    } catch (err: any) { toast.error(err.message); } 
    finally { setSubmitting(false); }
  };

  const TransportIcon = trip?.type === 'TRAIN' ? Train : trip?.type === 'BOAT' ? Ship : Bus;

  if (loading) return <div className="max-w-lg mx-auto p-10"><Skeleton className="h-64 w-full rounded-[2.5rem]" /></div>;

  return (
    <div className="container mx-auto px-4 py-10 max-w-lg text-left space-y-8 animate-in fade-in duration-500">
      
      <div className="space-y-1">
        <h1 className="text-3xl font-black italic uppercase tracking-tighter text-slate-900">Finaliser</h1>
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none">Récapitulatif & Paiement</p>
      </div>

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
                {selectedClass.includes('VIP') ? <Gem size={16} className="text-amber-500" /> : <Check size={16} className="text-primary" />}
                <p className="font-black text-[11px] text-slate-500 uppercase tracking-tighter">{selectedClass.replace('_', ' ')}</p>
            </div>
          </div>
      </div>

      {/* --- SECTION BAGAGES DYNAMIQUE --- */}
      <div className="bg-white border-2 border-slate-100 rounded-[2.5rem] p-8 shadow-xl">
        <div className="flex items-center gap-3 mb-6">
            <div className="h-10 w-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                <Package size={20} />
            </div>
            <div>
                <h3 className="font-black text-sm text-slate-900 uppercase tracking-tighter">Mes Bagages</h3>
                <p className="text-[9px] font-bold text-slate-400 uppercase">Déclarez vos suppléments</p>
            </div>
        </div>

        {trip?.type === 'TRAIN' ? (
            /* INTERFACE POIDS POUR LE TRAIN */
            <div className="space-y-6">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-center">
                    <Label className="text-[10px] font-black uppercase text-slate-400 mb-2 block">Estimation du poids total</Label>
                    <div className="flex items-center justify-center gap-3">
                        <Scale className="text-primary" size={24} />
                        <Input 
                            type="number" 
                            value={estimatedWeight} 
                            onChange={(e) => setEstimatedWeight(e.target.value)}
                            className="w-24 h-12 text-center font-black text-xl border-none bg-white shadow-inner rounded-xl"
                        />
                        <span className="font-black text-slate-400">KG</span>
                    </div>
                </div>
                <div className="px-2 space-y-1">
                    <p className="text-[9px] font-bold text-slate-400 uppercase">Franchise : {trip.freeWeight}kg Gratuits</p>
                    <p className="text-[9px] font-bold text-primary uppercase">Supplément : {trip.excessPrice} F / kg sup.</p>
                </div>
            </div>
        ) : (
            /* INTERFACE ARTICLES POUR LE BUS */
            <div className="space-y-4">
                {availableLuggageTypes.length > 0 ? (
                    availableLuggageTypes.map((type) => (
                        <div key={type.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                            <div>
                                <p className="font-black text-xs text-slate-700 uppercase">{type.label}</p>
                                <p className="text-[10px] font-bold text-primary">{type.price.toLocaleString()} F / unité</p>
                            </div>
                            <div className="flex items-center gap-3">
                                <button onClick={() => updateLuggageQty(type.id, -1)} className="h-8 w-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center"><Minus size={14} /></button>
                                <span className="font-black text-sm w-4 text-center">{selectedLuggages[type.id] || 0}</span>
                                <button onClick={() => updateLuggageQty(type.id, 1)} className="h-8 w-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center"><Plus size={14} /></button>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="text-center py-4 space-y-2">
                        <p className="text-[10px] text-slate-400 font-bold uppercase italic">Aucun tarif pré-défini</p>
                        <p className="text-[9px] text-slate-400">Vous pourrez régler vos bagages directement au guichet lors du pesage.</p>
                    </div>
                )}
            </div>
        )}
      </div>

      {/* TOTAL ET PAIEMENT */}
      <div className="space-y-6">
        <div className="bg-slate-900 p-8 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden">
            <Calculator className="absolute -right-4 -bottom-4 h-24 w-24 opacity-10" />
            <div className="space-y-2 relative z-10">
                <div className="flex justify-between text-[10px] font-bold uppercase opacity-60">
                    <span>Billet ({selectedClass.replace('_',' ')}) :</span>
                    <span>{ticketPrice.toLocaleString()} F</span>
                </div>
                <div className="flex justify-between text-[10px] font-bold uppercase opacity-60">
                    <span>Suppléments Bagages :</span>
                    <span>{luggageTotal.toLocaleString()} F</span>
                </div>
                <div className="h-px bg-white/10 my-4 border-t border-dashed" />
                <div className="flex justify-between items-center">
                    <p className="text-xs font-black uppercase text-primary tracking-widest">Total à régler</p>
                    <p className="text-4xl font-black tracking-tighter text-white">{finalTotal.toLocaleString()} <span className="text-sm">F</span></p>
                </div>
            </div>
        </div>

        {/* MÉTHODES PAIEMENT */}
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
                <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${paymentMethod === pm.value ? 'bg-primary text-white shadow-lg' : 'bg-slate-50 text-slate-400'}`}>
                   <pm.icon size={20} />
                </div>
                <span className="font-black uppercase text-xs text-slate-700 tracking-tight">{pm.label}</span>
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
          {submitting ? 'TRAITEMENT...' : 'VALIDER MA PLACE'}
        </Button>
      </div>
    </div>
  );
}