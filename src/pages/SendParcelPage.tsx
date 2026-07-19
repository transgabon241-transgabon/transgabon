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
import { Badge } from '@/components/ui/badge'; 
import { 
  Package, 
  ArrowRight, 
  CheckCircle2, 
  Calculator, 
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

type City = {
  id: string;
  name: string;
};

type Trip = {
  departureId: string;
  companyId: string;
  companyName: string;
  transportType: string;
  transportTypeCode: string;
  vehicleNumber: string;
  registration: string;
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

export default function SendParcelPage() {
  const { user, isLoading, loginWithRedirect } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [cities, setCities] = useState<City[]>([]); // Villes dynamiques
  const [fromId, setFromId] = useState(''); // On stocke l'ID
  const [toId, setToId] = useState('');     // On stocke l'ID
  const [date, setDate] = useState('');
  const [trips, setTrips] = useState<Trip[]>([]);
  const [searchingTrips, setSearchingTrips] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);

  const [tariffs, setTariffs] = useState<Tariff[]>([]);
  const [selectedTariff, setSelectedTariff] = useState<Tariff | null>(null);

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

  // 1. Charger les villes au montage du composant
  useEffect(() => {
    const fetchCities = async () => {
      const { data, error } = await supabase
        .from('cities')
        .select('id, name')
        .order('name', { ascending: true });
      
      if (data) setCities(data);
      if (error) toast.error("Erreur lors du chargement des villes");
    };
    fetchCities();
  }, []);

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

  // 2. Recherche simplifiée (plus besoin de chercher les IDs, on les a déjà)
  const handleSearchTrips = async () => {
    if (!fromId || !toId || !date) { toast.error('Veuillez remplir l\'itinéraire.'); return; }
    setSearchingTrips(true);
    try {
      const { data, error } = await supabase
        .from('trips')
        .select('*, company:companies(name), vehicle:vehicles(registration)')
        .eq('from_id', fromId)
        .eq('to_id', toId)
        .eq('departure_date', date);

      if (error) throw error;

      if (data) {
        // On récupère les noms des villes pour l'affichage
        const cityNameFrom = cities.find(c => c.id === fromId)?.name || '';
        const cityNameTo = cities.find(c => c.id === toId)?.name || '';

        setTrips(data.map(t => ({
          departureId: t.id,
          companyId: t.company_id,
          companyName: t.company?.name || 'Opérateur',
          transportType: t.type === 'BOAT' ? 'Bateau' : t.type === 'TRAIN' ? 'Train' : 'Bus',
          transportTypeCode: t.type,
          vehicleNumber: t.vehicle_number,
          registration: t.vehicle?.registration || '—',
          departureTime: t.departure_time,
          arrivalTime: t.arrival_time,
          departureCity: cityNameFrom,
          arrivalCity: cityNameTo,
          departureDate: date,
          price: t.price
        })));

        if (data.length === 0) toast.info("Aucun départ trouvé pour cette date.");
      }
    } catch (err) {
      toast.error("Erreur lors de la recherche des départs.");
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
      const fullDescription = `${parcelTitle}${description ? ' - ' + description : ''}`;

      const { data: res, error } = await supabase.rpc('create_parcel_expedition_transaction', {
        p_sender_id: user?.id || null,
        p_sender_name: senderName,
        p_sender_phone: senderPhone,
        p_receiver_name: receiverName,
        p_receiver_phone: receiverPhone,
        p_receiver_city_name: selectedTrip.arrivalCity,
        p_from_city_id: fromId,
        p_to_city_id: toId,
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

  // --- ECRAN DE SUCCÈS ENRICHI (BORDEREAU PRO) ---
  if (step === 3 && result) {
    return (
      <div className="container mx-auto px-4 py-10 max-w-2xl animate-in fade-in zoom-in-95 duration-500 print:p-0">
        <div className="text-center mb-8 print:hidden">
          <div className="h-16 w-16 bg-emerald-500 text-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-xl shadow-emerald-100">
            <CheckCircle2 size={32} />
          </div>
          <h1 className="text-3xl font-black italic">Expédition Validée</h1>
          <p className="text-muted-foreground font-bold text-[10px] uppercase tracking-widest">Votre colis est enregistré dans notre système</p>
        </div>

        {/* --- CARTE BORDEREAU STYLE TICKET --- */}
        <div className="bg-white border-2 border-slate-100 rounded-[2.5rem] shadow-2xl overflow-hidden relative print:border-none print:shadow-none">
          
          {/* Header du Bordereau */}
          <div className="bg-slate-900 p-6 text-white flex justify-between items-center">
            <div className="flex items-center gap-3">
               <Package className="text-primary" size={24} />
               <span className="font-black italic text-lg uppercase tracking-tighter">Bordereau de Fret</span>
            </div>
            <div className="text-right">
               <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Date d'émission</p>
               <p className="text-xs font-bold">{new Date().toLocaleDateString('fr-FR')}</p>
            </div>
          </div>

          <div className="p-8 space-y-8">
            {/* Numéro de suivi & QR Code */}
            <div className="flex justify-between items-start gap-4">
              <div className="space-y-1">
                <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Code de suivi unique</Label>
                <p className="text-4xl font-mono font-black text-primary tracking-tighter">{result.trackingNumber}</p>
                <Badge className="bg-emerald-100 text-emerald-700 font-black text-[9px] uppercase border-none px-3 py-1 mt-2">Prêt pour dépôt</Badge>
              </div>
              {/* Simulation de QR Code / Barcode */}
              <div className="h-24 w-24 bg-slate-50 border-2 border-slate-100 rounded-2xl flex flex-col items-center justify-center p-2 text-center group hover:bg-slate-100 transition-colors">
                 <div className="grid grid-cols-4 gap-1 opacity-20">
                    {[...Array(16)].map((_, i) => <div key={i} className="h-2 w-2 bg-black rounded-sm" />)}
                 </div>
                 <span className="text-[7px] font-black uppercase mt-2 text-slate-400">Scan Agence</span>
              </div>
            </div>

            {/* Trajet & Transport */}
            <div className="bg-slate-50 rounded-3xl p-5 flex items-center justify-between border border-slate-100">
               <div className="text-left">
                  <p className="text-[8px] font-black text-slate-400 uppercase">Départ</p>
                  <p className="font-bold text-sm text-slate-900">{selectedTrip.departureCity}</p>
               </div>
               <div className="flex flex-col items-center gap-1 flex-1 px-4">
                  <div className="h-[1px] w-full bg-slate-200 relative">
                     <div className="absolute -top-2 left-1/2 -translate-x-1/2 bg-white px-2 text-primary">
                        {selectedTrip.transportTypeCode === 'BOAT' ? <Ship size={14}/> : <Bus size={14}/>}
                     </div>
                  </div>
                  <span className="text-[8px] font-black text-primary uppercase">{selectedTrip.registration}</span>
               </div>
               <div className="text-right">
                  <p className="text-[8px] font-black text-slate-400 uppercase">Arrivée</p>
                  <p className="font-bold text-sm text-slate-900">{selectedTrip.arrivalCity}</p>
               </div>
            </div>

            {/* Détails Colis */}
            <div className="grid grid-cols-2 gap-8 py-4 border-y border-dashed border-slate-200">
               <div className="space-y-4">
                  <div>
                    <Label className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Expéditeur</Label>
                    <p className="font-bold text-sm text-slate-900">{senderName}</p>
                    <p className="text-xs text-slate-500">{senderPhone}</p>
                  </div>
                  <div>
                    <Label className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Contenu déclaré</Label>
                    <p className="font-bold text-sm text-slate-900 leading-snug">{parcelTitle}</p>
                  </div>
               </div>
               <div className="space-y-4">
                  <div>
                    <Label className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Destinataire</Label>
                    <p className="font-bold text-sm text-slate-900">{receiverName}</p>
                    <p className="text-xs text-slate-500">{receiverPhone}</p>
                  </div>
                  <div className="flex gap-4">
                    <div>
                      <Label className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Poids</Label>
                      <p className="font-bold text-sm text-slate-900">{weightKg} KG</p>
                    </div>
                    <div>
                      <Label className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Type</Label>
                      <p className="font-bold text-[10px] text-slate-900 uppercase truncate">{selectedTariff.label}</p>
                    </div>
                  </div>
               </div>
            </div>

            {/* Section Prix (Pied de ticket) */}
            <div className="flex justify-between items-center bg-primary/5 p-6 rounded-3xl border border-primary/10">
               <div>
                  <Label className="text-[9px] font-black uppercase text-primary tracking-widest leading-none">Total à régler au dépôt</Label>
                  <p className="text-3xl font-black text-primary tracking-tighter mt-1">{result.price.toLocaleString()} F</p>
                  <p className="text-[9px] font-bold text-slate-400 italic">Payable par {paymentMethod.replace('_', ' ')}</p>
               </div>
               <div className="text-right flex flex-col items-end gap-2">
                  <div className="flex items-center gap-1.5 bg-white px-3 py-1 rounded-full border shadow-sm">
                    <div className="h-2 w-2 bg-emerald-500 rounded-full animate-pulse" />
                    <span className="text-[10px] font-black text-emerald-600 uppercase">Status : Enregistré</span>
                  </div>
                  <p className="text-[8px] text-slate-400 font-medium">Bordereau officiel TransGabon Connect</p>
               </div>
            </div>
          </div>

          {/* Ligne de découpe visuelle */}
          <div className="relative h-4 flex items-center print:hidden">
             <div className="absolute left-0 -ml-2 h-4 w-4 bg-slate-50 rounded-full border-r border-slate-100" />
             <div className="w-full border-t-2 border-dashed border-slate-100 mx-2" />
             <div className="absolute right-0 -mr-2 h-4 w-4 bg-slate-50 rounded-full border-l border-slate-100" />
          </div>

          <div className="p-6 bg-slate-50/50 flex justify-center print:hidden">
             <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Veuillez présenter ce code à l'agence pour le dépôt</p>
          </div>
        </div>

        {/* --- ACTIONS --- */}
        <div className="flex flex-col gap-3 mt-10 print:hidden">
          <div className="grid grid-cols-2 gap-3">
             <Button onClick={() => window.print()} variant="outline" className="h-14 font-black rounded-2xl border-2 gap-2">
                <RefreshCw size={18} className="rotate-45" /> IMPRIMER / PDF
             </Button>
             <Button onClick={() => navigate(`/track?q=${result.trackingNumber}`)} className="h-14 font-black rounded-2xl shadow-lg">
                SUIVRE MON COLIS
             </Button>
          </div>
          <Button variant="ghost" onClick={() => navigate('/dashboard')} className="h-12 font-bold text-slate-400 uppercase text-[10px] tracking-widest">
            Retourner au menu principal
          </Button>
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

      {step === 1 && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="bg-white border-2 border-primary/5 rounded-[2.5rem] p-8 shadow-xl shadow-slate-100/50">
            <h2 className="font-black text-xs uppercase mb-6 flex items-center gap-2 text-primary">
               <MapPin size={16}/> Itinéraire de l'envoi
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
              <div className="space-y-1.5 text-left">
                <Label className="text-[10px] font-black uppercase ml-1">Ville Départ</Label>
                <Select value={fromId} onValueChange={setFromId}>
                  <SelectTrigger className="h-12 rounded-xl font-bold bg-slate-50 border-none">
                    <SelectValue placeholder="Ville" />
                  </SelectTrigger>
                  <SelectContent>
                    {cities.map(c => <SelectItem key={c.id} value={c.id} className="font-bold">{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 text-left">
                <Label className="text-[10px] font-black uppercase ml-1">Ville Arrivée</Label>
                <Select value={toId} onValueChange={setToId}>
                  <SelectTrigger className="h-12 rounded-xl font-bold bg-slate-50 border-none">
                    <SelectValue placeholder="Ville" />
                  </SelectTrigger>
                  <SelectContent>
                    {cities.map(c => <SelectItem key={c.id} value={c.id} className="font-bold">{c.name}</SelectItem>)}
                  </SelectContent>
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