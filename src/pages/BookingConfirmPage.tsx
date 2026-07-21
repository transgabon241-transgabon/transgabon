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
import { Smartphone, Building2, Check, CreditCard, Ship, Crown, Gem, RefreshCw, Train, Bus, MapPin } from 'lucide-react';

type TripDetails = {
  id: string;
  companyName: string;
  vehicleNumber: string;
  registration: string;
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
  const navigate = useNavigate();
  const { user, isLoading, loginWithRedirect } = useAuth();

  // RÉCUPÉRATION DES INFOS DEPUIS L'URL (calculées en amont)
  const seat = params.get('seat') || '';
  const selectedClass = params.get('class') || 'STANDARD';
  const finalPrice = Number(params.get('price')) || 0;
  const destinationName = params.get('to') || '';
  
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
          .select('*, company:companies(name), vehicle:vehicles(registration)')
          .eq('id', departureId)
          .single();

        if (d && !error) {
          setTrip({
            id: d.id,
            companyName: d.company?.name || 'Compagnie',
            vehicleNumber: d.vehicle_number,
            registration: d.vehicle?.registration || '—',
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

  // Formattage lisible de la classe
  const classLabel = useMemo(() => {
    const labels: Record<string, string> = {
      'VIP': 'Salon VIP',
      'BUSINESS': 'Classe Business',
      '1ERE_CLASSE': '1ère Classe',
      '2EME_CLASSE': '2ème Classe',
      'ECO': 'Classe Économique',
      'STANDARD': 'Classe Standard'
    };
    return labels[selectedClass] || selectedClass;
  }, [selectedClass]);

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

      // Appel RPC Supabase (On envoie le finalPrice reçu de l'URL)
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
        p_arrival_city_name: destinationName, 
        p_class_type: selectedClass           
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

  const TransportIcon = trip?.type === 'BOAT' ? Ship : trip?.type === 'TRAIN' ? Train : Bus;

  if (isLoading || !user) return null;

  return (
    <div className="container mx-auto px-4 py-8 max-w-lg text-left">
      <h1 className="text-3xl font-black italic mb-2 tracking-tight uppercase">Confirmation</h1>
      <p className="text-muted-foreground mb-8 text-[10px] uppercase font-bold tracking-[0.2em]">Dernière étape avant votre voyage</p>

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-48 w-full rounded-[2.5rem]" />
          <Skeleton className="h-32 w-full rounded-[2.5rem]" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* RÉCAPITULATIF DU VOYAGE AMÉLIORÉ */}
          {trip && (
            <div className="bg-white border-2 border-primary/10 rounded-[2.5rem] p-8 shadow-2xl shadow-primary/5 relative overflow-hidden">
               <div className="flex justify-between items-start mb-6">
                  <div>
                    <p className="font-black text-primary uppercase text-[10px] tracking-widest mb-1">{trip.companyName}</p>
                    <div className="flex items-center gap-2">
                        <TransportIcon size={18} className="text-slate-400" />
                        <p className="font-bold text-slate-800 italic uppercase text-sm">{trip.registration}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge className="bg-slate-900 text-white border-none font-black px-4 py-1.5 rounded-full uppercase text-[10px]">
                        Siège {seat}
                    </Badge>
                  </div>
               </div>

               <div className="space-y-3 mb-6">
                  <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <MapPin size={18} className="text-primary" />
                    <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter leading-none">Destination finale</p>
                        <p className="font-black text-slate-700 uppercase">{destinationName}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-4 bg-primary/5 rounded-2xl border border-primary/10">
                    {selectedClass.includes('VIP') || selectedClass.includes('1ERE') ? <Gem size={18} className="text-primary" /> : <Check size={18} className="text-primary" />}
                    <div>
                        <p className="text-[9px] font-black text-primary/60 uppercase tracking-tighter leading-none">Confort choisi</p>
                        <p className="font-black text-primary uppercase text-sm">{classLabel}</p>
                    </div>
                  </div>
               </div>

               <div className="flex justify-between items-center pt-6 border-t border-dashed border-slate-200">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Montant Total</p>
                  <p className="text-4xl font-black text-primary tracking-tighter">{finalPrice.toLocaleString()} <span className="text-xs">F</span></p>
               </div>
            </div>
          )}

          {/* FORMULAIRE PASSAGER */}
          <div className="space-y-4 bg-slate-50/50 p-6 rounded-[2.5rem] border-2 border-white">
            <h3 className="text-[10px] font-black uppercase text-slate-400 ml-2 tracking-widest">Identité du voyageur</h3>
            <div className="space-y-3">
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="Prénom et Nom" className="h-12 rounded-xl border-2 border-slate-100 bg-white font-bold" />
                <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="Téléphone (+241)" className="h-12 rounded-xl border-2 border-slate-100 bg-white font-bold" />
            </div>
          </div>

          {/* MODES DE PAIEMENT */}
          <div className="space-y-3">
            <Label className="text-[10px] font-black uppercase text-slate-400 ml-2 tracking-widest">Moyen de paiement</Label>
            <div className="grid gap-3">
              {PAYMENT_METHODS.map(pm => (
                <button
                  key={pm.value}
                  type="button"
                  onClick={() => setPaymentMethod(pm.value)}
                  className={`flex items-center justify-between p-5 rounded-2xl border-2 transition-all ${
                    paymentMethod === pm.value
                      ? 'border-primary bg-primary/5 shadow-inner'
                      : 'border-slate-100 bg-white hover:border-primary/20'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`h-11 w-11 rounded-xl flex items-center justify-center ${paymentMethod === pm.value ? 'bg-primary text-white shadow-lg shadow-primary/30' : 'bg-slate-50 text-slate-400'}`}>
                       <pm.icon size={22} />
                    </div>
                    <span className={`font-black uppercase text-xs tracking-tight ${paymentMethod === pm.value ? 'text-primary' : 'text-slate-600'}`}>{pm.label}</span>
                  </div>
                  {paymentMethod === pm.value && <Check className="text-primary" size={20} strokeWidth={4} />}
                </button>
              ))}
            </div>
          </div>

          <Button
            className="w-full h-20 rounded-[2rem] font-black text-2xl shadow-2xl shadow-primary/20 uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all mt-4"
            onClick={handleSubmit}
            disabled={submitting || !name || !phone || !paymentMethod || !trip}
          >
            {submitting ? <RefreshCw className="animate-spin mr-3" /> : <CreditCard className="mr-3 h-7 w-7" />}
            {submitting ? 'TRAITEMENT...' : 'PAYER MAINTENANT'}
          </Button>

          <p className="text-[9px] text-center text-muted-foreground font-bold px-10 uppercase tracking-tighter opacity-60">
            Paiement sécurisé par cryptage SSL. En validant, vous recevrez votre billet avec QR Code par email et dans votre historique.
          </p>
        </div>
      )}
    </div>
  );
}