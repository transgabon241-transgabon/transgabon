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
import { Smartphone, Building2, Check, CreditCard, Ship, Crown, Gem } from 'lucide-react';

type TripDetails = {
  id: string;
  price: number;
  vipPrice: number;
  businessPrice: number;
  companyName: string;
  vehicleNumber: string;
  type: string; // BUS, TRAIN, BOAT
};

const PAYMENT_METHODS = [
  { value: 'airtel_money', label: 'Airtel Money', icon: Smartphone, color: 'text-red-500' },
  { value: 'moov_money', label: 'Moov Money', icon: Smartphone, color: 'text-blue-500' },
  { value: 'agency', label: 'Paiement en agence', icon: Building2, color: 'text-orange-500' },
] as const;

export default function BookingConfirmPage() {
  const { departureId } = useParams();
  const [params] = useSearchParams();
  
  // Récupération des infos de l'URL
  const seat = params.get('seat') || '';
  const shipClass = params.get('class') || 'ECO'; // Par défaut ECO pour les bus/trains
  
  const navigate = useNavigate();
  const { user, isLoading, loginWithRedirect } = useAuth();

  const [trip, setTrip] = useState<TripDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');

  useEffect(() => {
    if (!isLoading && !user) loginWithRedirect({ initialView: 'signin' });
  }, [isLoading, user, loginWithRedirect]);

  useEffect(() => {
    if (user) {
      setName(`${user.firstName || ''} ${user.lastName || ''}`.trim());
      setPhone(user.phone || '');
    }
  }, [user]);

  useEffect(() => {
    if (!departureId) return;
    setLoading(true);

    const loadTripDetails = async () => {
      try {
        const { data: d, error } = await supabase
          .from('trips')
          .select('*, company:companies(name)')
          .eq('id', departureId)
          .single();

        if (d && !error) {
          setTrip({
            id: d.id,
            price: d.price,
            vipPrice: d.class_vip_price || d.price * 2,
            businessPrice: d.class_business_price || d.price * 1.5,
            companyName: d.company?.name || 'Compagnie',
            vehicleNumber: d.vehicle_number,
            type: d.type
          });
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadTripDetails();
  }, [departureId]);

  // CALCUL DU PRIX FINAL SELON LA CLASSE
  const finalPrice = useMemo(() => {
    if (!trip) return 0;
    if (trip.type === 'BOAT') {
      if (shipClass === 'VIP') return trip.vipPrice;
      if (shipClass === 'BUSINESS') return trip.businessPrice;
    }
    return trip.price;
  }, [trip, shipClass]);

  const handleSubmit = async () => {
    if (!name.trim() || !phone.trim() || !paymentMethod || !departureId || !seat) {
      toast.error('Veuillez remplir tous les champs.');
      return;
    }

    setSubmitting(true);

    try {
      const nameParts = name.trim().split(/\s+/);
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '—';

      let mappedMethod: 'AIRTEL_MONEY' | 'MOOV_MONEY' | 'AGENCE' = 'AGENCE';
      if (paymentMethod === 'airtel_money') mappedMethod = 'AIRTEL_MONEY';
      else if (paymentMethod === 'moov_money') mappedMethod = 'MOOV_MONEY';

      // Appel RPC Supabase (On envoie le finalPrice calculé)
      const { data, error } = await supabase.rpc('create_booking_transaction', {
        p_trip_id: departureId,
        p_user_id: user?.id || null,
        p_contact_phone: phone,
        p_contact_email: user?.email || null,
        p_passenger_first_name: firstName,
        p_passenger_last_name: lastName,
        p_seat_number: seat,
        p_payment_method: mappedMethod,
        p_total_amount: finalPrice,
      });

      if (error || !data?.success) throw new Error(error?.message || data?.error);

      toast.success('Réservation confirmée !');
      navigate(`/ticket/${data.booking_id}`);
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors de la réservation');
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading || !user) return null;

  return (
    <div className="container mx-auto px-4 py-8 max-w-lg text-left">
      <h1 className="text-3xl font-black italic mb-2 tracking-tight">Finaliser ma place</h1>
      <p className="text-muted-foreground mb-8 text-sm uppercase font-bold tracking-widest">Étape finale · Confirmation</p>

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-32 w-full rounded-[2rem]" />
          <Skeleton className="h-12 w-full rounded-xl" />
          <Skeleton className="h-12 w-full rounded-xl" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* RÉCAPITULATIF DU VOYAGE */}
          {trip && (
            <div className="bg-white border-2 border-primary/10 rounded-[2rem] p-6 shadow-xl shadow-primary/5 relative overflow-hidden">
               <div className="flex justify-between items-start mb-4">
                  <div>
                    <p className="font-black text-primary uppercase text-[10px] tracking-widest mb-1">{trip.companyName}</p>
                    <p className="font-bold text-slate-800 italic">Voyage n° {trip.vehicleNumber}</p>
                  </div>
                  <Badge className="bg-slate-900 text-white border-none font-black px-3 py-1 rounded-full uppercase text-[10px]">
                    Siège {seat}
                  </Badge>
               </div>

               <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-100 mb-4">
                  <div className="h-10 w-10 bg-white rounded-xl shadow-sm flex items-center justify-center text-primary font-bold">
                    {trip.type === 'BOAT' ? <Ship size={20} /> : <Check size={20} />}
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase">Confort sélectionné</p>
                    <p className="font-black text-sm text-slate-700">{trip.type === 'BOAT' ? shipClass : 'Classe Unique'}</p>
                  </div>
               </div>

               <div className="flex justify-between items-end pt-4 border-t border-dashed">
                  <p className="text-xs font-bold text-slate-400 uppercase">Total à payer</p>
                  <p className="text-3xl font-black text-primary tracking-tighter">{finalPrice.toLocaleString()} <span className="text-xs">FCFA</span></p>
               </div>
            </div>
          )}

          {/* FORMULAIRE PASSAGER */}
          <div className="space-y-4 bg-slate-50/50 p-6 rounded-[2rem] border-2 border-white">
            <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase text-slate-500 ml-1">Nom du voyageur</Label>
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="Prénom et Nom" className="h-12 rounded-xl border-2 border-slate-100 bg-white font-bold" />
            </div>
            
            <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase text-slate-500 ml-1">Téléphone de contact</Label>
                <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+241" className="h-12 rounded-xl border-2 border-slate-100 bg-white font-bold" />
            </div>
          </div>

          {/* MODES DE PAIEMENT */}
          <div className="space-y-3">
            <Label className="text-[10px] font-black uppercase text-slate-400 ml-2 tracking-widest">Choisir un mode de paiement</Label>
            <div className="grid gap-3">
              {PAYMENT_METHODS.map(pm => (
                <button
                  key={pm.value}
                  type="button"
                  onClick={() => setPaymentMethod(pm.value)}
                  className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all group ${
                    paymentMethod === pm.value
                      ? 'border-primary bg-primary/5 shadow-inner'
                      : 'border-slate-100 bg-white hover:border-primary/20'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${paymentMethod === pm.value ? 'bg-primary text-white' : 'bg-slate-50 text-slate-400'}`}>
                       <pm.icon size={20} />
                    </div>
                    <span className={`font-bold ${paymentMethod === pm.value ? 'text-primary' : 'text-slate-600'}`}>{pm.label}</span>
                  </div>
                  {paymentMethod === pm.value && <div className="h-5 w-5 bg-primary rounded-full flex items-center justify-center text-white"><Check size={12} strokeWidth={4} /></div>}
                </button>
              ))}
            </div>
          </div>

          <Button
            className="w-full h-16 rounded-[1.5rem] font-black text-xl shadow-2xl shadow-primary/20 uppercase tracking-tighter hover:scale-[1.02] transition-transform mt-4"
            onClick={handleSubmit}
            disabled={submitting || !name || !phone || !paymentMethod || !trip}
          >
            {submitting ? <RefreshCw className="animate-spin mr-2" /> : <CreditCard className="mr-2 h-6 w-6" />}
            {submitting ? 'RÉSERVATION...' : 'CONFIRMER ET PAYER'}
          </Button>

          <p className="text-[9px] text-center text-muted-foreground font-medium px-8">
            En confirmant, vous acceptez les conditions de transport de la compagnie et la politique de confidentialité de Gabon Mobilité.
          </p>
        </div>
      )}
    </div>
  );
}