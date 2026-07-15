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
import { Package, ArrowRight, CheckCircle2, Calculator, Info, RefreshCw, ShoppingBag } from 'lucide-react';
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

  // Tarifs dynamiques
  const [tariffs, setTariffs] = useState<Tariff[]>([]);
  const [selectedTariff, setSelectedTariff] = useState<Tariff | null>(null);

  // Formulaire Colis
  const [senderName, setSenderName] = useState('');
  const [senderPhone, setSenderPhone] = useState('');
  const [receiverName, setReceiverName] = useState('');
  const [receiverPhone, setReceiverPhone] = useState('');
  
  // Nouveaux champs pour la précision
  const [parcelTitle, setParcelTitle] = useState(''); // Ex: "2 Sacs de voyage"
  const [description, setDescription] = useState(''); // Détails supp
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

  const estimatedPrice = useMemo(() => {
    if (!selectedTariff) return 0;
    if (selectedTariff.is_weight_based) {
      return (parseFloat(weightKg) || 0) * selectedTariff.price;
    }
    return selectedTariff.price;
  }, [selectedTariff, weightKg]);

  const handleSubmit = async () => {
    if (!selectedTrip || !selectedTariff || !parcelTitle || !receiverName || !receiverPhone) {
      toast.error('Veuillez préciser ce que vous envoyez (ex: 2 sacs).');
      return;
    }
    setSubmitting(true);
    try {
      const { data: fromCity } = await supabase.from('cities').select('id').eq('name', selectedTrip.departureCity).single();
      const { data: toCity } = await supabase.from('cities').select('id').eq('name', selectedTrip.arrivalCity).single();

      if (fromCity && toCity) {
        // La description envoyée en base combine le Titre et les Détails
        const fullDescription = `${parcelTitle}${description ? ' - ' + description : ''}`;

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
          p_description: fullDescription,
          p_weight: parseFloat(weightKg),
          p_parcel_type: selectedTariff.label,
          p_payment_method: paymentMethod,
          p_price: estimatedPrice
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

  if (step === 3 && result) {
    return (
      <div className="container mx-auto px-4 py-20 text-center max-w-md">
        <div className="h-20 w-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
          <CheckCircle2 className="h-10 w-10 text-emerald-600" />
        </div>
        <h1 className="text-3xl font-black italic mb-2 text-slate-900">Demande Enregistrée</h1>
        <p className="text-muted-foreground font-medium mb-8 uppercase text-[10px] tracking-widest">Référence de suivi générée</p>
        
        <div className="bg-white border-2 border-primary/10 rounded-3xl p-6 shadow-xl text-left space-y-4 mb-8">
           <div>
             <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Colis : {parcelTitle}</Label>
             <p className="text-2xl font-mono font-black text-primary tracking-tighter mt-1">{result.trackingNumber}</p>
           </div>
           <div className="pt-4 border-t border-dashed">
             <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Estimation à payer</Label>
             <p className="text-xl font-bold text-slate-800">{result.price.toLocaleString()} FCFA</p>
           </div>
        </div>

        <div className="flex flex-col gap-3">
          <Button onClick={() => navigate(`/track?q=${result.trackingNumber}`)} className="h-12 font-black rounded-2xl">Suivre l'envoi</Button>
          <Button variant="outline" onClick={() => navigate('/dashboard')} className="h-12 font-bold rounded-2xl">Retour au compte</Button>
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
          <h1 className="text-2xl font-black uppercase tracking-tighter italic">Envoyer un colis</h1>
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest italic">Service de fret gabonais</p>
        </div>
      </div>

      {step === 1 && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
          <div className="bg-card border-2 rounded-3xl p-6 shadow-sm">
            <h2 className="font-black text-sm uppercase mb-4 text-primary">1. Itinéraire de transport</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black ml-1 uppercase">Ville Départ</Label>
                <Select value={from} onValueChange={setFrom}>
                  <SelectTrigger className="rounded-xl font-bold"><SelectValue placeholder="Départ" /></SelectTrigger>
                  <SelectContent>{GABON_CITIES.map(c => <SelectItem key={c} value={c} className="font-bold">{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black ml-1 uppercase">Ville Arrivée</Label>
                <Select value={to} onValueChange={setTo}>
                  <SelectTrigger className="rounded-xl font-bold"><SelectValue placeholder="Destination" /></SelectTrigger>
                  <SelectContent>{GABON_CITIES.map(c => <SelectItem key={c} value={c} className="font-bold">{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black ml-1 uppercase">Date</Label>
                <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="rounded-xl font-bold h-10" min={new Date().toISOString().split('T')[0]} />
              </div>
            </div>
            <Button onClick={handleSearchTrips} disabled={searchingTrips} className="w-full h-12 font-black rounded-2xl shadow-lg uppercase text-xs tracking-widest">
              {searchingTrips ? <RefreshCw className="animate-spin h-5 w-5" /> : "Trouver un bus ou train"}
            </Button>
          </div>

          {trips.length > 0 && (
            <div className="space-y-3">
              <p className="text-[10px] font-black uppercase text-muted-foreground ml-2">Départs disponibles pour le fret</p>
              {trips.map(t => (
                <button key={t.departureId} onClick={() => { setSelectedTrip(t); setStep(2); }} className="w-full text-left bg-white border-2 border-transparent hover:border-primary p-5 rounded-3xl transition-all shadow-sm group">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="flex items-center gap-2 font-black text-slate-800">
                        {t.departureCity} <ArrowRight className="h-4 w-4 text-primary" /> {t.arrivalCity}
                      </div>
                      <p className="text-xs font-bold text-muted-foreground uppercase mt-1 italic">{t.companyName} • Départ à {t.departureTime}</p>
                    </div>
                    <ArrowRight className="h-5 w-5 text-primary group-hover:translate-x-1 transition-transform" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {step === 2 && selectedTrip && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
          <div className="bg-primary/5 border-2 border-primary/10 rounded-2xl p-4 flex justify-between items-center">
            <div className="text-xs font-bold text-primary">
              VOYAGE : <span className="uppercase">{selectedTrip.departureCity} → {selectedTrip.arrivalCity}</span> ({selectedTrip.companyName})
            </div>
            <Button variant="ghost" size="sm" onClick={() => setStep(1)} className="text-[10px] font-black uppercase underline decoration-primary">Modifier</Button>
          </div>

          {/* CONTACTS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-card border-2 rounded-3xl p-6 space-y-4">
              <h2 className="font-black text-[10px] uppercase text-slate-400 tracking-widest">Expéditeur</h2>
              <div className="space-y-3">
                <Input value={senderName} onChange={e => setSenderName(e.target.value)} placeholder="Nom complet" className="rounded-xl font-bold h-10" />
                <Input value={senderPhone} onChange={e => setSenderPhone(e.target.value)} placeholder="Téléphone" className="rounded-xl font-bold h-10" />
              </div>
            </div>
            <div className="bg-card border-2 rounded-3xl p-6 space-y-4">
              <h2 className="font-black text-[10px] uppercase text-slate-400 tracking-widest">Destinataire</h2>
              <div className="space-y-3">
                <Input value={receiverName} onChange={e => setReceiverName(e.target.value)} placeholder="Nom du receveur" className="rounded-xl font-bold h-10" />
                <Input value={receiverPhone} onChange={e => setReceiverPhone(e.target.value)} placeholder="Téléphone du receveur" className="rounded-xl font-bold h-10" />
              </div>
            </div>
          </div>

          {/* DÉTAILS DU COLIS - MISE À JOUR ICI */}
          <div className="bg-card border-2 rounded-3xl p-6 space-y-6">
            <h2 className="font-black text-[10px] uppercase text-slate-400 tracking-widest border-b pb-2">Nature de l'envoi</h2>
            
            <div className="space-y-4">
              {/* NOM ET NOMBRE DE COLIS */}
              <div className="space-y-1.5">
                <Label className="text-[11px] font-black uppercase ml-1">Désignation des articles</Label>
                <div className="relative">
                  <ShoppingBag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary" />
                  <Input 
                    value={parcelTitle} 
                    onChange={e => setParcelTitle(e.target.value)} 
                    placeholder="Ex: 2 sacs de voyage, 1 régime de banane..." 
                    className="rounded-xl font-bold h-12 pl-10 border-primary/20 bg-primary/5 focus:bg-white transition-all" 
                  />
                </div>
                <p className="text-[9px] text-muted-foreground ml-1">Précisez le nombre et le type d'objet pour faciliter l'inventaire.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-black uppercase ml-1 text-slate-500">Catégorie de prix</Label>
                  <Select onValueChange={(v) => setSelectedTariff(tariffs.find(t => t.id === v) || null)}>
                    <SelectTrigger className="rounded-xl font-bold h-11"><SelectValue placeholder="Choisir tarif" /></SelectTrigger>
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
                  <Label className="text-[11px] font-black uppercase ml-1 text-slate-500">Poids approximatif (kg)</Label>
                  <Input type="number" step="0.5" value={weightKg} onChange={e => setWeightKg(e.target.value)} className="rounded-xl font-bold h-11" />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[11px] font-black uppercase ml-1 text-slate-500">Instructions particulières (Optionnel)</Label>
                <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Ex: Contenu fragile, tenir au sec..." className="rounded-xl font-medium min-h-[80px]" />
              </div>
            </div>

            {/* ESTIMATION DYNAMIQUE */}
            <div className="bg-emerald-600 rounded-2xl p-4 flex items-center justify-between text-white shadow-lg">
               <div className="flex items-center gap-3">
                  <Calculator className="h-6 w-6 opacity-50" />
                  <span className="font-bold text-xs uppercase tracking-tighter">Estimation tarifaire</span>
               </div>
               <div className="text-2xl font-black">
                 {estimatedPrice.toLocaleString()} <span className="text-xs">FCFA</span>
               </div>
            </div>
          </div>

          {/* PAIEMENT */}
          <div className="bg-card border-2 rounded-3xl p-6 shadow-sm">
            <h2 className="font-black text-[10px] uppercase text-slate-400 mb-4">Mode de règlement</h2>
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger className="rounded-xl font-bold h-12 border-primary/10"><SelectValue placeholder="Comment allez-vous payer ?" /></SelectTrigger>
              <SelectContent>{PAYMENT_METHODS.map(m => <SelectItem key={m.id} value={m.id} className="font-bold">{m.label}</SelectItem>)}</SelectContent>
            </Select>
            <div className="flex items-start gap-2 mt-4 bg-blue-50 p-3 rounded-xl border border-blue-100">
               <Info className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
               <p className="text-[10px] text-blue-800 font-medium leading-relaxed italic">
                 Note : Si vous payez en agence, le montant sera validé par l'agent lors de la pesée réelle du colis au guichet de départ.
               </p>
            </div>
          </div>

          <Button onClick={handleSubmit} disabled={submitting} className="w-full h-16 rounded-3xl font-black text-xl shadow-2xl uppercase tracking-tighter hover:scale-[1.02] transition-transform">
            {submitting ? <RefreshCw className="animate-spin h-6 w-6" /> : "Finaliser l'expédition"}
          </Button>
        </div>
      )}
    </div>
  );
}