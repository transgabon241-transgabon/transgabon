"use client"

import { useEffect, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from "@/lib/auth-context";
import { supabase } from '@/lib/supabase'; // <-- Utilise votre SDK Supabase de production
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { Smartphone, Building2 } from 'lucide-react';

type TripDetails = {
  id: string;
  price: number;
  companyName: string;
  vehicleNumber: string;
};

const PAYMENT_METHODS = [
  { value: 'airtel_money', label: 'Airtel Money', icon: Smartphone, color: 'text-red-500' },
  { value: 'moov_money', label: 'Moov Money', icon: Smartphone, color: 'text-blue-500' },
  { value: 'agency', label: 'Paiement en agence', icon: Building2, color: 'text-orange-500' },
] as const;

export default function BookingConfirmPage() {
  const { departureId } = useParams();
  const [params] = useSearchParams();
  const seat = params.get('seat') || '';
  const navigate = useNavigate();
  const { user, isLoading, loginWithRedirect } = useAuth();

  const [trip, setTrip] = useState<TripDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');

  // S'assure que l'utilisateur est connecté pour finaliser sa commande
  useEffect(() => {
    if (!isLoading && !user) {
      loginWithRedirect({ initialView: 'signin' });
    }
  }, [isLoading, user, loginWithRedirect]);

  // Pré-remplit les informations avec les coordonnées de l'utilisateur connecté
  useEffect(() => {
    if (user) {
      setName(`${user.firstName || ''} ${user.lastName || ''}`.trim());
      setPhone(user.phone || '');
    }
  }, [user]);

  // Chargement des détails réels du trajet depuis Supabase
  useEffect(() => {
    if (!departureId) return;
    setLoading(true);

    const loadTripDetails = async () => {
      try {
        const { data, error } = await supabase
          .from('trips')
          .select('*, company:companies(name)')
          .eq('id', departureId)
          .single();

        if (data && !error) {
          setTrip({
            id: data.id,
            price: data.price,
            companyName: (data.company as any)?.name || 'Compagnie',
            vehicleNumber: data.vehicle_number,
          });
        }
      } catch (err) {
        console.error("Erreur lors du chargement des détails du trajet :", err);
      } finally {
        setLoading(false);
      }
    };

    loadTripDetails();
  }, [departureId]);

  const handleSubmit = async () => {
    if (!name.trim() || !phone.trim() || !paymentMethod || !departureId || !seat) {
      toast.error('Veuillez remplir tous les champs obligatoires.');
      return;
    }

    setSubmitting(true);

    try {
      // 1. Découpe du nom complet saisi pour remplir Prénom et Nom
      const nameParts = name.trim().split(/\s+/);
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '—';

      // 2. Mappage des énumérations de l'UI vers les valeurs attendues par la base SQL
      let mappedMethod: 'AIRTEL_MONEY' | 'MOOV_MONEY' | 'AGENCE' = 'AGENCE';
      if (paymentMethod === 'airtel_money') mappedMethod = 'AIRTEL_MONEY';
      else if (paymentMethod === 'moov_money') mappedMethod = 'MOOV_MONEY';

      // 3. Appel de la fonction transactionnelle sécurisée (RPC) sur Supabase
      const { data, error } = await supabase.rpc('create_booking_transaction', {
        p_trip_id: departureId,
        p_user_id: user?.id || null,
        p_contact_phone: phone,
        p_contact_email: user?.email || null,
        p_passenger_first_name: firstName,
        p_passenger_last_name: lastName,
        p_seat_number: seat,
        p_payment_method: mappedMethod,
        p_total_amount: trip ? trip.price : 0,
      });

      if (error || !data?.success) {
        toast.error(error?.message || data?.error || 'Erreur lors de la réservation');
        setSubmitting(false);
        return;
      }

      toast.success('Réservation créée avec succès !');
      // Redirige vers la page du billet avec l'identifiant réel du billet généré
      navigate(`/ticket/${data.booking_id}`);
    } catch (err: any) {
      toast.error('Une erreur réseau est survenue.');
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading || !user) return null;

  return (
    <div className="container mx-auto px-4 py-8 max-w-lg">
      <h1 className="text-2xl font-bold mb-2">Confirmer la réservation</h1>
      <p className="text-muted-foreground mb-6">Siège sélectionné : <strong>{seat}</strong></p>

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      ) : (
        <div className="space-y-5">
          {trip && (
            <div className="rounded-xl border border-border bg-muted/20 p-4 text-sm text-left">
              <p className="font-semibold text-primary">{trip.companyName} · {trip.vehicleNumber}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Montant à régler : <strong>{trip.price.toLocaleString()} FCFA</strong></p>
            </div>
          )}

          <div className="text-left space-y-1.5">
            <Label htmlFor="nameInput">Nom complet du passager</Label>
            <Input id="nameInput" value={name} onChange={e => setName(e.target.value)} placeholder="Nom et prénom" className="mt-1" />
          </div>
          
          <div className="text-left space-y-1.5">
            <Label htmlFor="phoneInput">Numéro de téléphone</Label>
            <Input id="phoneInput" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+241 XX XX XX XX" className="mt-1" />
          </div>

          <div className="text-left">
            <Label className="mb-3 block">Mode de paiement</Label>
            <div className="grid gap-3">
              {PAYMENT_METHODS.map(pm => (
                <button
                  key={pm.value}
                  type="button"
                  onClick={() => setPaymentMethod(pm.value)}
                  className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-left ${
                    paymentMethod === pm.value
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-border hover:border-primary/40'
                  }`}
                >
                  <pm.icon className="h-5 w-5" />
                  <span className="font-medium">{pm.label}</span>
                </button>
              ))}
            </div>
          </div>

          <Button
            className="w-full"
            size="lg"
            onClick={handleSubmit}
            disabled={submitting || !name || !phone || !paymentMethod || !trip}
          >
            {submitting ? 'Réservation en cours…' : 'Confirmer la réservation'}
          </Button>
        </div>
      )}
    </div>
  );
}