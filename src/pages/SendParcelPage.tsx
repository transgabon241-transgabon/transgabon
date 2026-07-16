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
import { Badge } from '@/components/ui/badge'; // <--- AJOUTE CETTE LIGNE
import { 
  Package, 
  ArrowRight, 
  CheckCircle2, 
  Calculator, 
  Info, 
  RefreshCw, 
  ShoppingBag,
  Ship,
  Bus,
  Train,
  Hash,
  MapPin,
  User
} from 'lucide-react';
import { toast } from 'sonner';

type Trip = {
  departureId: string;
  companyId: string;
  companyName: string;
  transportType: string;
  transportTypeCode: string; // BUS, TRAIN, BOAT
  vehicleNumber: string;
  registration: string; // NOUVEAU
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
  { id: 'AGENCE', label: 'Paiement en agence (Espèces)' },
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
  const [parcelTitle, setParcelTitle] = useState('');
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

  // Charger les tarifs de l'agence sélectionnée
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
    if (!from || !to || !date) { toast.error('Veuillez remplir l\'itinéraire.'); return; }
    setSearchingTrips(true);
    try {
      const { data: fromCity } = await supabase.from('cities').select('id').eq('name', from).single();
      const { data: toCity } = await supabase.from('cities').select('id').eq('name', to).single();

      if (fromCity && toCity) {
        // MISE À JOUR QUERY : Jointure avec vehicles pour la registration
        const { data, error } = await supabase
          .from('trips')
          .select('*, company:companies(name), vehicle:vehicles(registration)')
          .eq('from_id', fromCity.id)
          .eq('to_id', toCity.id)
          .eq('departure_date', date);

        if (data && !error) {
          setTrips(data.map(t => ({
            departureId: t.id,
            companyId: t.company_id,
            companyName: t.company?.name || 'Opérateur',
            transportType: t.type === 'BOAT' ? 'Bateau' : t.type === 'TRAIN' ? 'Train' : 'Bus',
            transportTypeCode: t.type,
            vehicleNumber: t.vehicle_number,
            registration: t.vehicle?.registration || '—', // RÉCUPÉRATION IMMATRICULATION
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
    return selectedTariff.is_weight_based ? (parseFloat(weightKg) || 0) * selectedTariff.price : selectedTariff.price;
  }, [selectedTariff, weightKg]);

  const handleSubmit = async () => {
    if (!selectedTrip || !selectedTariff || !parcelTitle || !receiverName || !receiverPhone) {
      toast.error('Veuillez compléter les informations du colis.');
      return;
    }
    setSubmitting(true);
    try {
      const { data: fromCity } = await supabase.from('cities').select('id').eq('name', selectedTrip.departureCity).single();
      const { data: toCity } = await supabase.from('cities').select('id').eq('name', selectedTrip.arrivalCity).single();

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
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors de l\'envoi.');
    } finally { setSubmitting(false); }
  };

  if (isLoading || !user) return null;

  // --- ECRAN DE SUCCÈS (REÇU PRO) ---
  if (step === 3 && result) {
    return (
      <div className="container mx-auto px-4 py-20 text-center max-w-md animate-in fade-in zoom-in-95 duration-500">
        <div className="h-20 w-20 bg-emerald-500 text-white rounded-full flex items-center justify-center mx-auto mb-8 shadow-xl shadow-emerald-100">
          <CheckCircle2 size={40} />
        </div>
        <h1 className="text-3xl font-black italic mb-2">Expédition Validée</h1>
        <p className="text-muted-foreground font-bold text-[10px] uppercase tracking-[0.3em] mb-10">Bordereau de suivi généré</p>
        
        <div className="bg-white border-2 border-slate-100 rounded-[2.5rem] p-8 shadow-2xl text-left space-y-6 relative overflow-hidden">
           <div className="absolute top-0 right-0 p-4 opacity-5">
              <Package size={80} />
           </div>
           <div>
             <Label className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Numéro de suivi (Tracking)</Label>
             <p className="text-3xl font-mono font-black text-primary tracking-tighter mt-1">{result.trackingNumber}</p>
           </div>
           <div className="pt-6 border-t border-dashed border-slate-200">
             <div className="flex justify-between items-end">
                <div>
                   <Label className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Estimation à régler</Label>
                   <p className="text-2xl font-black text-slate-900 leading-none">{result.price.toLocaleString()} F</p>
                </div>
                <Badge className="bg-emerald-100 text-emerald-700 font-black text-[9px] uppercase border-none">En attente dépôt</Badge>
             </div>
           </div>
        </div>

        <div className="flex flex-col gap-3 mt-10">
          <Button onClick={() => navigate(`/track?q=${result.trackingNumber}`)} className="h-14 font-black rounded-2xl shadow-lg">SUIVRE MON COLIS</Button>
          <Button variant="ghost" onClick={() => navigate('/dashboard')} className="h-12 font-bold text-slate-400 uppercase text-[10px] tracking-widest">Retourner à mon compte</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12 max-w-2xl text-left space-y-10">
      
      <header className="flex items-center gap-4 bg-white p-5 rounded-3xl border-2 border-slate-50 shadow-sm w-full">
        <div className="p-3 bg-primary rounded-2xl shadow-lg shadow-primary/20 text-white">
          <Package size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-black italic tracking-tighter text-slate-900 uppercase leading-none">Service de Fret</h1>
          <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mt-1">Étape {step} sur 2 • Gabon Mobilité</p>
        </div>
      </header>

      {/* --- ÉTAPE 1 : RECHERCHE --- */}
      {step === 1 && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="bg-white border-2 border-primary/5 rounded-[2.5rem] p-8 shadow-xl shadow-slate-100/50">
            <h2 className="font-black text-xs uppercase mb-6 flex items-center gap-2 text-primary">
               <MapPin size={16}/> Itinéraire de l'envoi
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
              <div className="space-y-1.5 text-left">
                <Label className="text-[10px] font-black uppercase ml-1">Ville Départ</Label>
                <Select value={from} onValueChange={setFrom}>
                  <SelectTrigger className="h-12 rounded-xl font-bold bg-slate-50 border-none"><SelectValue placeholder="Ville" /></SelectTrigger>
                  <SelectContent>{GABON_CITIES.map(c => <SelectItem key={c} value={c} className="font-bold">{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 text-left">
                <Label className="text-[10px] font-black uppercase ml-1">Ville Arrivée</Label>
                <Select value={to} onValueChange={setTo}>
                  <SelectTrigger className="h-12 rounded-xl font-bold bg-slate-50 border-none"><SelectValue placeholder="Ville" /></SelectTrigger>
                  <SelectContent>{GABON_CITIES.map(c => <SelectItem key={c} value={c} className="font-bold">{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 text-left">
                <Label className="text-[10px] font-black uppercase ml-1">Date</Label>
                <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="h-12 rounded-xl bg-slate-50 border-none font-bold" min={new Date().toISOString().split('T')[0]} />
              </div>
            </div>
            <Button onClick={handleSearchTrips} disabled={searchingTrips} className="w-full h-14 font-black rounded-2xl shadow-xl shadow-primary/20 uppercase tracking-widest text-xs">
              {searchingTrips ? <RefreshCw className="animate-spin h-5 w-5" /> : "Trouver un bus ou navire"}
            </Button>
          </div>

          {trips.length > 0 && (
            <div className="space-y-4">
              <p className="text-[10px] font-black uppercase text-slate-400 ml-4 tracking-[0.2em]">Départs éligibles au fret</p>
              {trips.map(t => (
                <button key={t.departureId} onClick={() => { setSelectedTrip(t); setStep(2); }} className="w-full text-left bg-white border-2 border-slate-100 hover:border-primary p-6 rounded-[2rem] transition-all group flex justify-between items-center shadow-sm hover:shadow-xl">
                  <div className="flex items-center gap-5">
                    <div className={`h-12 w-12 rounded-2xl flex items-center justify-center text-white shadow-md ${t.transportTypeCode === 'BOAT' ? 'bg-blue-600' : 'bg-primary'}`}>
                       {t.transportTypeCode === 'BOAT' ? <Ship size={24}/> : <Bus size={24}/>}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 font-black text-slate-800 uppercase tracking-tighter">
                        {t.departureCity} <ArrowRight size={14} className="text-primary" /> {t.arrivalCity}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase">{t.companyName} • {t.departureTime}</span>
                        <span className="flex items-center gap-1 text-[9px] font-black text-primary bg-primary/5 px-2 py-0.5 rounded uppercase">
                           <Hash size={10} /> {t.registration}
                        </span>
                      </div>
                    </div>
                  </div>
                  <ArrowRight size={20} className="text-slate-200 group-hover:text-primary transition-colors" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* --- ÉTAPE 2 : FORMULAIRE --- */}
      {step === 2 && selectedTrip && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="bg-slate-900 border-none rounded-2xl p-5 flex justify-between items-center text-white shadow-xl">
            <div className="flex items-center gap-3">
               <div className="h-10 w-10 bg-white/10 rounded-xl flex items-center justify-center">
                  {selectedTrip.transportTypeCode === 'BOAT' ? <Ship size={20}/> : <Bus size={20}/>}
               </div>
               <div>
                  <p className="text-[10px] font-black uppercase text-primary tracking-widest leading-none">Voyage sélectionné</p>
                  <p className="font-bold text-sm mt-1">{selectedTrip.departureCity} ➔ {selectedTrip.arrivalCity} • {selectedTrip.registration}</p>
               </div>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setStep(1)} className="text-[9px] font-black uppercase underline text-primary hover:text-white hover:bg-white/10 transition-all">Modifier</Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-card border-2 rounded-[2rem] p-6 space-y-4">
              <h2 className="font-black text-[10px] uppercase text-slate-400 tracking-widest flex items-center gap-2"><User size={12}/> Expéditeur</h2>
              <div className="space-y-3">
                <Input value={senderName} onChange={e => setSenderName(e.target.value)} placeholder="Nom complet" className="h-11 rounded-xl bg-slate-50 border-none font-bold" />
                <Input value={senderPhone} onChange={e => setSenderPhone(e.target.value)} placeholder="Téléphone (+241)" className="h-11 rounded-xl bg-slate-50 border-none font-bold" />
              </div>
            </div>
            <div className="bg-card border-2 rounded-[2rem] p-6 space-y-4">
              <h2 className="font-black text-[10px] uppercase text-slate-400 tracking-widest flex items-center gap-2"><User size={12}/> Destinataire</h2>
              <div className="space-y-3">
                <Input value={receiverName} onChange={e => setReceiverName(e.target.value)} placeholder="Nom du receveur" className="h-11 rounded-xl bg-slate-50 border-none font-bold" />
                <Input value={receiverPhone} onChange={e => setReceiverPhone(e.target.value)} placeholder="Téléphone du receveur" className="h-11 rounded-xl bg-slate-50 border-none font-bold" />
              </div>
            </div>
          </div>

          <div className="bg-white border-2 border-slate-100 rounded-[2.5rem] p-8 space-y-6 shadow-xl shadow-slate-100/50">
            <h2 className="font-black text-[10px] uppercase text-slate-400 tracking-widest border-b pb-3">Nature de la marchandise</h2>
            
            <div className="space-y-5">
              <div className="space-y-1.5">
                <Label className="text-[11px] font-black uppercase ml-1 text-slate-600">Désignation (Qu'envoyez-vous ?)</Label>
                <div className="relative">
                  <ShoppingBag className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-primary" />
                  <Input 
                    value={parcelTitle} 
                    onChange={e => setParcelTitle(e.target.value)} 
                    placeholder="Ex: 2 sacs de riz, 1 moteur hors-bord, 1 glacière..." 
                    className="h-14 rounded-2xl font-bold pl-12 border-2 border-slate-100 focus:border-primary transition-all" 
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-black uppercase ml-1 text-slate-600">Catégorie tarifaire</Label>
                  <Select onValueChange={(v) => setSelectedTariff(tariffs.find(t => t.id === v) || null)}>
                    <SelectTrigger className="h-12 rounded-xl font-bold border-2 border-slate-100"><SelectValue placeholder="Choisir tarif" /></SelectTrigger>
                    <SelectContent className="rounded-xl border-none shadow-2xl">
                      {tariffs.map(t => (
                        <SelectItem key={t.id} value={t.id} className="font-bold">
                          {t.label} ({t.price.toLocaleString()} F{t.is_weight_based ? '/kg' : ''})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-black uppercase ml-1 text-slate-600">Poids (kg) — Facultatif</Label>
                  <Input type="number" step="0.5" value={weightKg} onChange={e => setWeightKg(e.target.value)} className="h-12 rounded-xl font-bold border-2 border-slate-100" />
                </div>
              </div>

              <div className="space-y-1.5 text-left">
                <Label className="text-[11px] font-black uppercase ml-1 text-slate-600">Détails supplémentaires (Optionnel)</Label>
                <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Instructions, fragilité, etc." className="rounded-xl font-medium min-h-[80px] border-2 border-slate-100" />
              </div>
            </div>

            <div className="bg-emerald-600 rounded-2xl p-5 flex items-center justify-between text-white shadow-xl shadow-emerald-100">
               <div className="flex items-center gap-3">
                  <Calculator size={28} className="opacity-40" />
                  <span className="font-black text-xs uppercase tracking-widest">Estimation de l'envoi</span>
               </div>
               <div className="text-3xl font-black tracking-tighter">
                 {estimatedPrice.toLocaleString()} <span className="text-[10px] opacity-80 uppercase">FCFA</span>
               </div>
            </div>
          </div>

          <div className="bg-card border-2 rounded-[2rem] p-6 shadow-sm">
            <h2 className="font-black text-[10px] uppercase text-slate-400 mb-4 tracking-widest">Règlement</h2>
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger className="h-12 rounded-xl font-black bg-slate-50 border-none px-5"><SelectValue placeholder="Choisir mode de paiement" /></SelectTrigger>
              <SelectContent className="rounded-xl border-none shadow-2xl">
                {PAYMENT_METHODS.map(m => <SelectItem key={m.id} value={m.id} className="font-bold">{m.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <Button onClick={handleSubmit} disabled={submitting} className="w-full h-16 rounded-[2rem] font-black text-xl shadow-2xl shadow-primary/20 uppercase tracking-widest hover:scale-[1.01] active:scale-95 transition-all">
            {submitting ? <RefreshCw className="animate-spin h-6 w-6" /> : "VALIDER L'EXPÉDITION"}
          </Button>
        </div>
      )}
    </div>
  );
}