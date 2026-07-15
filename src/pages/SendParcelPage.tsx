"use client"

import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from "@/lib/auth-context";
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Package, ArrowRight, CheckCircle2, Calculator, Info, RefreshCw } from 'lucide-react';
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

type Tariff = {
  id: string;
  label: string;
  price: number;
  is_weight_based: boolean;
};

const PAYMENT_METHODS = [
  { id: 'AGENCE', label: 'Paiement en agence (Cash)' },
  { id: 'AIRTEL_MONEY', label: 'Airtel Money' },
  { id: 'MOOV_MONEY', label: 'Moov Money' },
];

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

  // Tarifs dynamiques de la compagnie
  const [tariffs, setTariffs] = useState<Tariff[]>([]);
  const [selectedTariff, setSelectedTariff] = useState<Tariff | null>(null);

  // Formulaire Colis
  const [senderName, setSenderName] = useState('');
  const [senderPhone, setSenderPhone] = useState('');
  const [receiverName, setReceiverName] = useState('');
  const [receiverPhone, setReceiverPhone] = useState('');
  const [description, setDescription] = useState('');
  const [weightKg, setWeightKg] = useState('1');
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

  // Charger les tarifs dès qu'une compagnie est sélectionnée
  useEffect(() => {
    if (selectedTrip) {
      const fetchTariffs = async () => {
        const { data } = await supabase
          .from('company_parcel_tariffs')
          .select('*')
          .eq('company_id', selectedTrip.companyId);
        if (data) setTariffs(data);
      };
      fetchTariffs();
    }
  }, [selectedTrip]);

  const handleSearchTrips = async () => {
    if (!from || !to || !date) { toast.error('Veuillez remplir tous les champs.'); return; }
    setSearchingTrips(true);
    try {
      const { data: fromCity } = await supabase.from('cities').select('id').eq('name', from).single();
      const { data: toCity } = await supabase.from('cities').select('id').eq('name', to).single();

      if (fromCity && toCity) {
        const { data, error } = await supabase
          .from('trips')
          .select('*, company:companies(name)')
          .eq('from_id', fromCity.id)
          .eq('to_id', toCity.id)
          .eq('departure_date', date);

        if (data && !error) {
          setTrips(data.map(t => ({
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
          })));
        }
      }
    } finally { setSearchingTrips(false); }
  };

  // Calcul du prix estimé
  const estimatedPrice = useMemo(() => {
    if (!selectedTariff) return 0;
    if (selectedTariff.is_weight_based) {
      return (parseFloat(weightKg) || 0) * selectedTariff.price;
    }
    return selectedTariff.price;
  }, [selectedTariff, weightKg]);

  const handleSubmit = async () => {
    if (!selectedTrip || !selectedTariff || !receiverName || !receiverPhone || !description) {
      toast.error('Veuillez remplir tous les champs.');
      return;
    }
    setSubmitting(true);
    try {
      const { data: fromCity } = await supabase.from('cities').select('id').eq('name', selectedTrip.departureCity).single();
      const { data: toCity } = await supabase.from('cities').select('id').eq('name', selectedTrip.arrivalCity).single();

      if (fromCity && toCity) {
        const { data: res, error } = await supabase.rpc('create_parcel_expedition_transaction', {
          p_sender_id: user?.id || null,
          p_sender_name: senderName,
          p_sender_phone: senderPhone,
          p_receiver_name: receiverName,
          p_receiver_phone: receiverPhone,
          p_receiver_city_name: selectedTrip.arrivalCity,
          p_from_city_id: fromCity.id,
          p_to_city_id: toCity.id,
          p_company_id: selectedTrip.companyId,
          p_description: description,
          p_weight: parseFloat(weightKg),
          p_parcel_type: selectedTariff.label,
          p_payment_method: paymentMethod,
          p_price: estimatedPrice // On envoie le prix calculé
        });

        if (error || !res?.success) throw new Error(error?.message || res?.error);

        setResult({ trackingNumber: res.tracking_number, price: estimatedPrice });
        setStep(3);
      }
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors de l\'envoi.');
    } finally { setSubmitting(false); }
  };

  if (isLoading || !user) return null;

  // --- ECRAN DE SUCCÈS ---
  if (step === 3 && result) {
    return (
      <div className="container mx-auto px-4 py-20 text-center max-w-md">
        <div className="h-20 w-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
          <CheckCircle2 className="h-10 w-10 text-emerald-600" />
        </div>
        <h1 className="text-3xl font-black italic mb-2 text-slate-900">Colis Enregistré !</h1>
        <p className="text-muted-foreground font-medium mb-8">Votre numéro de suivi a été généré.</p>
        
        <div className="bg-white border-2 border-primary/10 rounded-3xl p-6 shadow-xl text-left space-y-4 mb-8">
           <div>
             <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Numéro de suivi</Label>
             <p className="text-2xl font-mono font-black text-primary tracking-tighter">{result.trackingNumber}</p>
           </div>
           <div className="pt-4 border-t border-dashed">
             <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Prix estimé</Label>
             <p className="text-xl font-bold text-slate-800">{result.price.toLocaleString()} FCFA</p>
           </div>
        </div>

        <div className="flex flex-col gap-3">
          <Button onClick={() => navigate(`/track?q=${result.trackingNumber}`)} className="h-12 font-black rounded-2xl">Suivre mon colis</Button>
          <Button variant="outline" onClick={() => navigate('/dashboard')} className="h-12 font-bold rounded-2xl">Mes expéditions</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12 max-w-2xl text-left">
      <div className="flex items-center gap-4 mb-10">
        <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center">
          <Package className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tighter italic">Expédition de Colis</h1>
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Étape {step} sur 2</p>
        </div>
      </div>

      {/* --- ÉTAPE 1 : CHOIX DU DÉPART --- */}
      {step === 1 && (
        <div className="space-y-6">
          <div className="bg-card border-2 rounded-3xl p-6 shadow-sm">
            <h2 className="font-black text-sm uppercase mb-4 text-primary">Itinéraire & Date</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black ml-1 uppercase">Départ</Label>
                <Select value={from} onValueChange={setFrom}>
                  <SelectTrigger className="rounded-xl font-bold"><SelectValue placeholder="Ville" /></SelectTrigger>
                  <SelectContent>{GABON_CITIES.map(c => <SelectItem key={c} value={c} className="font-bold">{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black ml-1 uppercase">Arrivée</Label>
                <Select value={to} onValueChange={setTo}>
                  <SelectTrigger className="rounded-xl font-bold"><SelectValue placeholder="Ville" /></SelectTrigger>
                  <SelectContent>{GABON_CITIES.map(c => <SelectItem key={c} value={c} className="font-bold">{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black ml-1 uppercase">Date</Label>
                <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="rounded-xl font-bold" min={new Date().toISOString().split('T')[0]} />
              </div>
            </div>
            <Button onClick={handleSearchTrips} disabled={searchingTrips} className="w-full h-12 font-black rounded-2xl shadow-lg">
              {searchingTrips ? <RefreshCw className="animate-spin h-5 w-5" /> : "RECHERCHER UN DÉPART"}
            </Button>
          </div>

          {trips.length > 0 && (
            <div className="space-y-3">
              <p className="text-[10px] font-black uppercase text-muted-foreground ml-2">Départs disponibles</p>
              {trips.map(t => (
                <button key={t.departureId} onClick={() => { setSelectedTrip(t); setStep(2); }} className="w-full text-left bg-white border-2 border-transparent hover:border-primary p-5 rounded-3xl transition-all shadow-sm group">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="flex items-center gap-2 font-black text-slate-800">
                        {t.departureCity} <ArrowRight className="h-4 w-4 text-primary" /> {t.arrivalCity}
                      </div>
                      <p className="text-xs font-bold text-muted-foreground uppercase mt-1">{t.companyName} • {t.departureTime}</p>
                    </div>
                    <div className="h-10 w-10 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                       <ArrowRight className="h-5 w-5 text-primary" />
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* --- ÉTAPE 2 : FORMULAIRE DÉTAILLÉ --- */}
      {step === 2 && selectedTrip && (
        <div className="space-y-6">
          <div className="bg-primary/5 border-2 border-primary/10 rounded-2xl p-4 flex justify-between items-center">
            <div className="text-sm font-bold text-primary italic">
              {selectedTrip.companyName} • {selectedTrip.departureCity} → {selectedTrip.arrivalCity}
            </div>
            <Button variant="ghost" size="sm" onClick={() => setStep(1)} className="text-[10px] font-black uppercase underline">Changer</Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* EXPEDITEUR */}
            <div className="bg-card border-2 rounded-3xl p-6 space-y-4 shadow-sm">
              <h2 className="font-black text-xs uppercase text-slate-500 border-b pb-2">Expéditeur</h2>
              <div className="space-y-3">
                <div><Label className="text-[10px] font-black uppercase">Nom complet</Label><Input value={senderName} onChange={e => setSenderName(e.target.value)} className="rounded-xl font-bold h-10" /></div>
                <div><Label className="text-[10px] font-black uppercase">Téléphone</Label><Input value={senderPhone} onChange={e => setSenderPhone(e.target.value)} className="rounded-xl font-bold h-10" /></div>
              </div>
            </div>

            {/* DESTINATAIRE */}
            <div className="bg-card border-2 rounded-3xl p-6 space-y-4 shadow-sm">
              <h2 className="font-black text-xs uppercase text-slate-500 border-b pb-2">Destinataire</h2>
              <div className="space-y-3">
                <div><Label className="text-[10px] font-black uppercase">Nom complet</Label><Input value={receiverName} onChange={e => setReceiverName(e.target.value)} className="rounded-xl font-bold h-10" /></div>
                <div><Label className="text-[10px] font-black uppercase">Téléphone</Label><Input value={receiverPhone} onChange={e => setReceiverPhone(e.target.value)} className="rounded-xl font-bold h-10" /></div>
              </div>
            </div>
          </div>

          {/* DÉTAILS COLIS AVEC TARIFS DYNAMIQUES */}
          <div className="bg-card border-2 rounded-3xl p-6 space-y-5 shadow-sm">
            <h2 className="font-black text-xs uppercase text-slate-500 border-b pb-2">Le Colis</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase">Type de contenu</Label>
                <Select onValueChange={(v) => setSelectedTariff(tariffs.find(t => t.id === v) || null)}>
                  <SelectTrigger className="rounded-xl font-bold h-11"><SelectValue placeholder="Choisir un type" /></SelectTrigger>
                  <SelectContent>
                    {tariffs.map(t => (
                      <SelectItem key={t.id} value={t.id} className="font-bold">
                        {t.label} ({t.price} F{t.is_weight_based ? '/kg' : ''})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase">Poids estimé (kg)</Label>
                <Input type="number" step="0.1" value={weightKg} onChange={e => setWeightKg(e.target.value)} className="rounded-xl font-bold h-11" />
              </div>
              <div className="sm:col-span-2">
                <Label className="text-[10px] font-black uppercase">Description précise</Label>
                <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Contenu, fragilité..." className="rounded-xl font-medium" />
              </div>
            </div>

            {/* ESTIMATION DU PRIX */}
            <div className="bg-emerald-50 p-4 rounded-2xl border-2 border-emerald-100 flex items-center justify-between">
               <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm uppercase">
                  <Calculator className="h-5 w-5" /> Estimation
               </div>
               <div className="text-xl font-black text-emerald-700">
                 {estimatedPrice.toLocaleString()} FCFA
               </div>
            </div>
          </div>

          {/* PAIEMENT */}
          <div className="bg-card border-2 rounded-3xl p-6 shadow-sm">
            <h2 className="font-black text-xs uppercase text-slate-500 mb-4">Mode de Paiement</h2>
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger className="rounded-xl font-bold h-12"><SelectValue placeholder="Sélectionnez un mode" /></SelectTrigger>
              <SelectContent>{PAYMENT_METHODS.map(m => <SelectItem key={m.id} value={m.id} className="font-bold">{m.label}</SelectItem>)}</SelectContent>
            </Select>
            <p className="text-[10px] text-muted-foreground italic mt-3 flex items-center gap-1">
              <Info className="h-3 w-3" /> Le montant final sera validé par l'agent lors du dépôt physique du colis.
            </p>
          </div>

          <Button onClick={handleSubmit} disabled={submitting} className="w-full h-14 rounded-3xl font-black text-lg shadow-xl uppercase tracking-tighter">
            {submitting ? <RefreshCw className="animate-spin h-6 w-6" /> : "Confirmer l'expédition"}
          </Button>
        </div>
      )}
    </div>
  );
}