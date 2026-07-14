"use client"

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from "@/lib/auth-context";
import { supabase } from '@/lib/supabase'; // <-- Utilise votre SDK Supabase de production
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Package, ArrowRight, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

type Trip = {
  departureId: string;
  companyId: string;
  companyName: string;
  transportType: string;
  vehicleNumber: string;
  departureTime: string;
  arrivalTime: string;
  departureCity: string;
  arrivalCity: string;
  departureDate: string;
  price: number;
};

const PARCEL_TYPES = ['Enveloppe', 'Petit Colis', 'Colis Moyen', 'Gros Colis', 'Fret'];
const PAYMENT_METHODS = ['Airtel Money', 'Moov Money', 'En agence'];

// Liste statique des villes d'origine pour l'embarquement
const GABON_CITIES = [
  "Libreville", "Port-Gentil", "Franceville", "Oyem", "Moanda", 
  "Lambaréné", "Mouila", "Tchibanga", "Makokou", "Booué", "Ndjolé", "Lastoursville"
];

export default function SendParcelPage() {
  const { user, isLoading, loginWithRedirect } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [date, setDate] = useState('');
  const [trips, setTrips] = useState<Trip[]>([]);
  const [searchingTrips, setSearchingTrips] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);

  // Formulaire Colis
  const [senderName, setSenderName] = useState('');
  const [senderPhone, setSenderPhone] = useState('');
  const [receiverName, setReceiverName] = useState('');
  const [receiverPhone, setReceiverPhone] = useState('');
  const [receiverCity, setReceiverCity] = useState('');
  const [description, setDescription] = useState('');
  const [weightKg, setWeightKg] = useState('1');
  const [parcelType, setParcelType] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ trackingNumber: string; price: number } | null>(null);

  useEffect(() => {
    if (!isLoading && !user) loginWithRedirect({ initialView: 'signin' });
  }, [isLoading, user, loginWithRedirect]);

  useEffect(() => {
    if (user) {
      setSenderName(`${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email);
      setSenderPhone(user.phone || '');
    }
  }, [user]);

  // Recherche des trajets de fret réels de Supabase
  const handleSearchTrips = async () => {
    if (!from || !to || !date) { toast.error('Veuillez remplir tous les champs.'); return; }
    setSearchingTrips(true);
    try {
      // 1. Récupération des IDs réels de la gare de départ et d'arrivée dans Supabase
      const { data: fromCity } = await supabase.from('cities').select('id').eq('name', from).single();
      const { data: toCity } = await supabase.from('cities').select('id').eq('name', to).single();

      if (fromCity && toCity) {
        // 2. Recherche en base
        const { data, error } = await supabase
          .from('trips')
          .select('*, company:companies(name)')
          .eq('from_id', fromCity.id)
          .eq('to_id', toCity.id)
          .eq('departure_date', date);

        if (data && !error) {
          const formatted: Trip[] = data.map(t => ({
            departureId: t.id,
            companyId: t.company_id,
            companyName: (t.company as any)?.name || 'Opérateur',
            transportType: t.type === 'TRAIN' ? 'Train' : 'Bus',
            vehicleNumber: t.vehicle_number,
            departureTime: t.departure_time,
            arrivalTime: t.arrival_time,
            departureCity: from,
            arrivalCity: to,
            departureDate: date,
            price: t.price
          }));
          setTrips(formatted);
          if (formatted.length === 0) toast.info('Aucun départ trouvé à cette date.');
        } else {
          setTrips([]);
        }
      } else {
        setTrips([]);
      }
    } catch { 
      toast.error('Erreur lors de la recherche des trajets.'); 
    } finally { 
      setSearchingTrips(false); 
    }
  };

  const handleSelectTrip = (t: Trip) => {
    setSelectedTrip(t);
    setReceiverCity(to);
    setStep(2);
  };

  // Enregistrement final de la logistique du fret de colis
  const handleSubmit = async () => {
    if (!selectedTrip || !senderName || !senderPhone || !receiverName || !receiverPhone || !receiverCity || !description || !weightKg || !parcelType || !paymentMethod) {
      toast.error('Veuillez remplir tous les champs obligatoires.');
      return;
    }
    setSubmitting(true);
    try {
      // 1. Récupération des IDs de ville de la base pour enregistrement
      const { data: fromCity } = await supabase.from('cities').select('id').eq('name', selectedTrip.departureCity).single();
      const { data: toCity } = await supabase.from('cities').select('id').eq('name', selectedTrip.arrivalCity).single();

      if (fromCity && toCity) {
        // 2. Appel de la fonction d'expédition et de calcul tarifaire SQL (RPC) de Supabase
        const { data: res, error } = await supabase.rpc('create_parcel_expedition_transaction', {
          p_sender_id: user?.id || null,
          p_sender_name: senderName,
          p_sender_phone: senderPhone,
          p_receiver_name: receiverName,
          p_receiver_phone: receiverPhone,
          p_receiver_city_name: receiverCity,
          p_from_city_id: fromCity.id,
          p_to_city_id: toCity.id,
          p_company_id: selectedTrip.companyId,
          p_description: description,
          p_weight: parseFloat(weightKg),
          p_parcel_type: parcelType,
          p_payment_method: paymentMethod,
        });

        if (error || !res?.success) {
          toast.error(error?.message || res?.error || "Erreur de création.");
          setSubmitting(false);
          return;
        }

        setResult({ trackingNumber: res.tracking_number, price: res.price });
        setStep(3);
      }
    } catch (err: any) {
      toast.error('Une erreur réseau est survenue.');
    } finally { 
      setSubmitting(false); 
    }
  };

  if (isLoading || !user) return null;

  // Success screen
  if (step === 3 && result) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <div className="max-w-md mx-auto">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-6">
            <CheckCircle2 className="h-8 w-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Colis enregistré !</h1>
          <p className="text-muted-foreground mb-6">Votre demande d&apos;envoi a été enregistrée avec succès.</p>
          <div className="border rounded-xl bg-card p-6 mb-6 text-left space-y-3">
            <div>
              <p className="text-xs text-muted-foreground">Numéro de suivi</p>
              <p className="font-mono font-bold text-lg text-primary">{result.trackingNumber}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Montant à payer</p>
              <p className="font-bold text-lg">{result.price.toLocaleString()} FCFA</p>
            </div>
          </div>
          <div className="flex gap-3 justify-center">
            <Button variant="outline" onClick={() => navigate(`/track?q=${result.trackingNumber}`)}>Suivre le colis</Button>
            <Button onClick={() => navigate('/dashboard')}>Mes envois</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Package className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Envoyer un colis</h1>
            <p className="text-sm text-muted-foreground">Étape {step}/2</p>
          </div>
        </div>

        {step === 1 && (
          <div className="space-y-6">
            <div className="border rounded-xl bg-card p-6">
              <h2 className="font-semibold mb-4">Choisir un départ</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                <div>
                  <Label>Ville départ</Label>
                  <Select value={from} onValueChange={setFrom}>
                    <SelectTrigger><SelectValue placeholder="Départ" /></SelectTrigger>
                    <SelectContent>{GABON_CITIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Ville arrivée</Label>
                  <Select value={to} onValueChange={setTo}>
                    <SelectTrigger><SelectValue placeholder="Arrivée" /></SelectTrigger>
                    <SelectContent>{GABON_CITIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Date</Label>
                  <Input type="date" value={date} onChange={e => setDate(e.target.value)} min={new Date().toISOString().split('T')[0]} />
                </div>
              </div>
              <Button onClick={handleSearchTrips} disabled={searchingTrips} className="w-full">{searchingTrips ? 'Recherche...' : 'Rechercher des départs'}</Button>
            </div>

            {trips.length > 0 && (
              <div className="space-y-3 text-left">
                <h3 className="font-semibold text-sm text-muted-foreground">Sélectionnez un départ pour votre colis</h3>
                {trips.map(t => (
                  <button key={t.departureId} onClick={() => handleSelectTrip(t)} className="w-full text-left border rounded-xl bg-card p-4 hover:border-primary transition-colors">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2 font-semibold">
                          {t.departureCity} <ArrowRight className="h-4 w-4" /> {t.arrivalCity}
                        </div>
                        <p className="text-sm text-muted-foreground">{t.companyName} • {t.departureTime} — {t.arrivalTime}</p>
                      </div>
                      <p className="text-sm text-muted-foreground">{new Date(t.departureDate + 'T00:00:00').toLocaleDateString('fr-FR')}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {step === 2 && selectedTrip && (
          <div className="space-y-6 text-left">
            <div className="border rounded-xl bg-muted/30 p-4 text-sm">
              <span className="font-medium">{selectedTrip.departureCity} → {selectedTrip.arrivalCity}</span>
              <span className="text-muted-foreground"> • {selectedTrip.companyName} • {new Date(selectedTrip.departureDate + 'T00:00:00').toLocaleDateString('fr-FR')} à {selectedTrip.departureTime}</span>
              <button onClick={() => setStep(1)} className="ml-3 text-primary text-xs underline">Changer</button>
            </div>

            <div className="border rounded-xl bg-card p-6 space-y-4">
              <h2 className="font-semibold">Informations de l&apos;expéditeur</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div><Label>Nom complet</Label><Input value={senderName} onChange={e => setSenderName(e.target.value)} /></div>
                <div><Label>Téléphone</Label><Input value={senderPhone} onChange={e => setSenderPhone(e.target.value)} /></div>
              </div>
            </div>

            <div className="border rounded-xl bg-card p-6 space-y-4">
              <h2 className="font-semibold">Informations du destinataire</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div><Label>Nom complet</Label><Input value={receiverName} onChange={e => setReceiverName(e.target.value)} /></div>
                <div><Label>Téléphone</Label><Input value={receiverPhone} onChange={e => setReceiverPhone(e.target.value)} /></div>
                <div className="sm:col-span-2"><Label>Ville de destination</Label><Input value={receiverCity} onChange={e => setReceiverCity(e.target.value)} /></div>
              </div>
            </div>

            <div className="border rounded-xl bg-card p-6 space-y-4">
              <h2 className="font-semibold">Détails du colis</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>Type de colis</Label>
                  <Select value={parcelType} onValueChange={setParcelType}>
                    <SelectTrigger><SelectValue placeholder="Sélectionnez" /></SelectTrigger>
                    <SelectContent>{PARCEL_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Poids (kg)</Label><Input type="number" step="0.1" min="0.1" value={weightKg} onChange={e => setWeightKg(e.target.value)} /></div>
                <div className="sm:col-span-2"><Label>Description du contenu</Label><Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Décrivez le contenu du colis..." /></div>
              </div>
            </div>

            <div className="border rounded-xl bg-card p-6 space-y-4">
              <h2 className="font-semibold">Paiement</h2>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger><SelectValue placeholder="Mode de paiement" /></SelectTrigger>
                <SelectContent>{PAYMENT_METHODS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
              </Select>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep(1)}>Retour</Button>
              <Button onClick={handleSubmit} disabled={submitting} className="flex-1">{submitting ? 'Envoi en cours...' : 'Confirmer l\'envoi'}</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}