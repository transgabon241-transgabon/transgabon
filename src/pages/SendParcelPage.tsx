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
  User,
  Printer,
  Phone,
  FileText,
  Calendar,
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';

type City = { id: string; name: string; };

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
  isEscale: boolean;
};

type Tariff = {
  id: string;
  label: string;
  price: number;
  is_weight_based: boolean;
};

const PAYMENT_METHODS = [
  { id: 'AGENCE', label: 'Paiement en agence (Espèces)' },
  //{ id: 'AIRTEL_MONEY', label: 'Airtel Money' },
  //{ id: 'MOOV_MONEY', label: 'Moov Money' },
];

export default function SendParcelPage() {
  const { user, isLoading, loginWithRedirect } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [cities, setCities] = useState<City[]>([]);
  const [fromId, setFromId] = useState('');
  const [toId, setToId] = useState('');
  const [date, setDate] = useState('');
  const [trips, setTrips] = useState<Trip[]>([]);
  const [searchingTrips, setSearchingTrips] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);

  const [tariffs, setTariffs] = useState<Tariff[]>([]);
  const [selectedTariffId, setSelectedTariffId] = useState<string>("");
  const [tariffsLoading, setTariffsLoading] = useState(false);

  const [senderName, setSenderName] = useState('');
  const [senderPhone, setSenderPhone] = useState('');
  const [receiverName, setReceiverName] = useState('');
  const [receiverPhone, setReceiverPhone] = useState('');
  const [parcelTitle, setParcelTitle] = useState('');
  const [description, setDescription] = useState('');
  const [weightKg, setWeightKg] = useState('1');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ trackingNumber: string; price: number; method: string } | null>(null);

   Charger les villes
  useEffect(() => {
    const fetchCities = async () => {
      const { data } = await supabase.from('cities').select('id, name').order('name');
      if (data) setCities(data);
    };
    fetchCities();
  }, []);

  // Sync info expéditeur
  useEffect(() => {
    if (user) {
      setSenderName(`${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email);
      setSenderPhone(user.phone || '');
    }
  }, [user]);

  // Redirection Auth
  useEffect(() => {
    if (!isLoading && !user) loginWithRedirect({ initialView: 'signin' });
  }, [isLoading, user, loginWithRedirect]);

  // Charger les tarifs
  useEffect(() => {
    if (selectedTrip?.companyId) {
      const fetchTariffs = async () => {
        setTariffsLoading(true);
        setSelectedTariffId(""); 
        const { data } = await supabase
          .from('company_parcel_tariffs')
          .select('*')
          .eq('company_id', selectedTrip.companyId);
        if (data) setTariffs(data);
        setTariffsLoading(false);
      };
      fetchTariffs();
    }
  }, [selectedTrip?.companyId]);

  const selectedTariff = useMemo(() => {
    if (!selectedTariffId) return null;
    return tariffs.find(t => t.id === selectedTariffId) || null;
  }, [selectedTariffId, tariffs]);

  const estimatedPrice = useMemo(() => {
    if (!selectedTariff || !selectedTrip) return 0;
    const w = parseFloat(weightKg) || 0;
    return selectedTariff.is_weight_based ? w * selectedTariff.price : selectedTariff.price;
  }, [selectedTariff, weightKg, selectedTrip]);

  const handleSearchTrips = async () => {
    if (!fromId || !toId || !date) { toast.error('Itinéraire incomplet'); return; }
    setSearchingTrips(true);
    try {
      const { data, error } = await supabase
        .from('trips')
        .select(`*, company:companies(name), vehicle:vehicles(registration), trip_stops(*)`)
        .eq('from_id', fromId)
        .eq('departure_date', date);

      if (error) throw error;
      if (data) {
        const cFrom = cities.find(c => c.id === fromId)?.name || '';
        const cTo = cities.find(c => c.id === toId)?.name || '';
        const res: Trip[] = [];
        data.forEach(t => {
            if (t.to_id === toId) {
                res.push({
                    departureId: t.id, companyId: t.company_id, companyName: t.company?.name || 'Compagnie',
                    transportType: t.type === 'BOAT' ? 'Bateau' : t.type === 'TRAIN' ? 'Train' : 'Bus',
                    transportTypeCode: t.type, vehicleNumber: t.vehicle_number, registration: t.vehicle?.registration || '—',
                    departureTime: t.departure_time, arrivalTime: t.arrival_time, departureCity: cFrom, arrivalCity: cTo,
                    departureDate: date, price: t.price, isEscale: false
                });
            } else {
                const escale = t.trip_stops?.find((s: any) => s.city_id === toId);
                if (escale) {
                    res.push({
                        departureId: t.id, companyId: t.company_id, companyName: t.company?.name || 'Compagnie',
                        transportType: t.type === 'BOAT' ? 'Bateau' : t.type === 'TRAIN' ? 'Train' : 'Bus',
                        transportTypeCode: t.type, vehicleNumber: t.vehicle_number, registration: t.vehicle?.registration || '—',
                        departureTime: t.departure_time, arrivalTime: escale.arrival_time, departureCity: cFrom, arrivalCity: cTo,
                        departureDate: date, price: escale.price_from_start || t.price, isEscale: true
                    });
                }
            }
        });
        setTrips(res);
      }
    } finally { setSearchingTrips(false); }
  };

  const handleSubmit = async () => {
    if (!selectedTrip || !selectedTariff || !parcelTitle || !receiverName || !receiverPhone) {
      toast.error('Champs manquants'); return;
    }
    setSubmitting(true);
    try {
      const { data: res, error } = await supabase.rpc('create_parcel_expedition_transaction', {
        p_sender_id: user?.id || null, p_sender_name: senderName, p_sender_phone: senderPhone,
        p_receiver_name: receiverName, p_receiver_phone: receiverPhone, p_receiver_city_name: selectedTrip.arrivalCity,
        p_from_city_id: fromId, p_to_city_id: toId, p_company_id: selectedTrip.companyId, 
        p_description: `${parcelTitle} ${description}`, p_weight: parseFloat(weightKg), 
        p_parcel_type: selectedTariff.label, p_payment_method: paymentMethod, p_price: estimatedPrice
      });
      if (error || !res?.success) throw new Error(error?.message || res?.error);
      setResult({ trackingNumber: res.tracking_number, price: estimatedPrice, method: paymentMethod });
      setStep(3);
    } catch (err: any) { toast.error(err.message); } finally { setSubmitting(false); }
  };

  if (isLoading || !user) return null;

  // --- RENDU ÉTAPE 3 : BORDEREAU DE FRET PROFESSIONNEL ---
  if (step === 3 && result && selectedTrip) {
    const isPaid = result.method !== 'AGENCE';

    return (
        <div className="container mx-auto px-4 py-10 max-w-2xl animate-in fade-in zoom-in-95 text-left print:p-0">
          <div className="text-center mb-10 print:hidden">
            <div className="h-20 w-20 bg-emerald-500 text-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-xl">
              <CheckCircle2 size={40} />
            </div>
            <h1 className="text-3xl font-black italic uppercase text-slate-900 tracking-tighter leading-none">Expédition Enregistrée</h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">Bordereau de suivi généré avec succès</p>
          </div>
  
          {/* --- BORDEREAU OFFICIEL --- */}
          <div className="bg-white border-2 border-slate-100 rounded-[2.5rem] shadow-2xl overflow-hidden relative print:shadow-none print:border-slate-900">
            
            {/* Header du bordereau */}
            <div className="bg-slate-900 p-8 text-white flex justify-between items-center print:[print-color-adjust:exact]">
              <div className="flex items-center gap-4">
                 <div className="p-3 bg-primary rounded-2xl">
                    <Package size={24} className="text-white" />
                 </div>
                 <div className="flex flex-col">
                    <span className="font-black italic text-xl uppercase tracking-tighter">Bordereau de Fret</span>
                    <span className="text-[8px] font-bold text-primary uppercase tracking-[0.3em]">Gabon Mobilité Connect</span>
                 </div>
              </div>
              <div className="text-right">
                <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Date d'émission</p>
                <p className="text-xs font-black">{new Date().toLocaleDateString('fr-FR')}</p>
              </div>
            </div>
  
            <div className="p-8 space-y-10">
              {/* Tracking & QR */}
              <div className="flex justify-between items-start gap-4">
                <div className="space-y-1">
                  <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Numéro de suivi unique</Label>
                  <p className="text-5xl font-mono font-black text-primary tracking-tighter">{result.trackingNumber}</p>
                  <div className="pt-2">
                    <Badge className={`border-none font-black text-[9px] uppercase px-3 py-1 ${isPaid ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                        {isPaid ? 'Règlement Confirmé' : 'À régler au dépôt (Cash)'}
                    </Badge>
                  </div>
                </div>
                {/* QR Code de simulation */}
                <div className="h-28 w-28 bg-slate-50 border-2 border-slate-100 rounded-3xl flex flex-col items-center justify-center p-3 shadow-inner">
                   <div className="grid grid-cols-4 gap-1 opacity-20">
                      {[...Array(16)].map((_, i) => <div key={i} className="h-2 w-2 bg-black rounded-sm" />)}
                   </div>
                   <span className="text-[7px] font-black text-slate-400 uppercase mt-2">Scan Agence</span>
                </div>
              </div>
  
              {/* Itinéraire visuel */}
              <div className="bg-slate-50 rounded-[2rem] p-6 flex items-center justify-between border border-slate-100">
                 <div className="text-left flex-1">
                    <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Point de Départ</p>
                    <p className="font-black text-base text-slate-900 uppercase">{selectedTrip.departureCity}</p>
                 </div>
                 <div className="flex flex-col items-center gap-1 px-6">
                    <div className="flex items-center gap-2 w-full">
                        <div className="h-2 w-2 rounded-full bg-primary" />
                        <div className="h-px w-20 border-t-2 border-dashed border-slate-200" />
                        <ArrowRight size={18} className="text-primary" />
                    </div>
                    <span className="text-[9px] font-black text-primary uppercase tracking-tighter">{selectedTrip.registration}</span>
                 </div>
                 <div className="text-right flex-1">
                    <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Destination</p>
                    <p className="font-black text-base text-slate-900 uppercase">{selectedTrip.arrivalCity}</p>
                 </div>
              </div>

              {/* Détails Contacts */}
              <div className="grid grid-cols-2 gap-10 py-6 border-y border-dashed border-slate-200">
                 <div className="space-y-4">
                    <div>
                        <Label className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Expéditeur</Label>
                        <p className="font-black text-sm text-slate-900 uppercase">{senderName}</p>
                        <p className="flex items-center gap-1.5 text-xs font-bold text-primary mt-1"><Phone size={12}/> {senderPhone}</p>
                    </div>
                    <div>
                        <Label className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Transporteur</Label>
                        <p className="font-black text-sm text-slate-900 uppercase">{selectedTrip.companyName}</p>
                    </div>
                 </div>
                 <div className="space-y-4 text-right md:text-left">
                    <div>
                        <Label className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Destinataire</Label>
                        <p className="font-black text-sm text-slate-900 uppercase">{receiverName}</p>
                        <p className="flex items-center justify-end md:justify-start gap-1.5 text-xs font-bold text-primary mt-1"><Phone size={12}/> {receiverPhone}</p>
                    </div>
                    <div>
                        <Label className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Type de Fret</Label>
                        <p className="font-black text-sm text-slate-900 uppercase">{selectedTariff?.label}</p>
                    </div>
                 </div>
              </div>
  
              {/* Montant Final */}
              <div className="flex justify-between items-center bg-primary/5 p-8 rounded-[2rem] border-2 border-primary/10">
                 <div>
                    <Label className="text-[9px] font-black uppercase text-primary tracking-[0.2em] leading-none">Estimation Totale</Label>
                    <p className="text-4xl font-black text-primary tracking-tighter mt-1">{result.price.toLocaleString()} <span className="text-base">FCFA</span></p>
                    <p className="text-[9px] font-bold text-slate-400 mt-2 uppercase italic flex items-center gap-1.5">
                       <AlertCircle size={10} /> Sous réserve de vérification du poids en agence
                    </p>
                 </div>
                 <div className="text-right">
                    <div className="inline-flex items-center gap-2 bg-white px-4 py-2 rounded-xl shadow-sm border border-slate-100">
                        <div className={`h-2.5 w-2.5 rounded-full ${isPaid ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`} />
                        <span className="text-[10px] font-black text-slate-700 uppercase">{isPaid ? 'RÈGLÉ' : 'EN ATTENTE'}</span>
                    </div>
                 </div>
              </div>
            </div>

            {/* Pied de bordereau */}
            <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-center print:hidden">
                 <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest text-center">
                    Veuillez présenter ce bordereau à l'agence pour le dépôt de la marchandise.
                 </p>
            </div>
          </div>
  
          <div className="flex flex-col gap-3 mt-10 print:hidden">
            <div className="grid grid-cols-2 gap-4">
                <Button onClick={() => window.print()} variant="outline" className="h-16 font-black rounded-[1.5rem] border-2 gap-3 hover:bg-slate-900 hover:text-white transition-all">
                    <Printer size={20} /> IMPRIMER / PDF
                </Button>
                <Button onClick={() => navigate('/dashboard')} className="h-16 font-black rounded-[1.5rem] shadow-xl shadow-primary/20 uppercase tracking-widest">
                    RETOUR ESPACE CLIENT
                </Button>
            </div>
          </div>
        </div>
      );
  }

  // --- RENDU ÉTAPE 1 & 2 (Identiques mais labels corrigés) ---
  return (
    <div className="container mx-auto px-4 py-12 max-w-2xl text-left space-y-10">
      
      <header className="flex items-center gap-4 bg-white p-5 rounded-3xl border-2 border-slate-50 shadow-sm w-full">
        <div className="p-3 bg-primary rounded-2xl text-white shadow-lg"><Package size={24} /></div>
        <div>
          <h1 className="text-2xl font-black italic text-slate-900 uppercase tracking-tighter leading-none">Service de Fret</h1>
          <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mt-1">Gabon Mobilité • Étape {step}/2</p>
        </div>
      </header>

      {step === 1 && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
          <div className="bg-white border-2 border-primary/5 rounded-[2.5rem] p-8 shadow-xl shadow-slate-100/50">
            <h2 className="font-black text-xs uppercase mb-6 flex items-center gap-2 text-primary tracking-widest"><MapPin size={16}/> Itinéraire de l'envoi</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
              <div className="space-y-1.5 text-left">
                <Label className="text-[10px] font-black uppercase text-slate-900 opacity-70 ml-1">Départ</Label>
                <Select value={fromId} onValueChange={setFromId}>
                  <SelectTrigger className="h-12 rounded-xl bg-slate-50 border-none font-bold"><SelectValue placeholder="Ville" /></SelectTrigger>
                  <SelectContent>{cities.map(c => <SelectItem key={c.id} value={c.id} className="font-bold">{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 text-left">
                <Label className="text-[10px] font-black uppercase text-slate-900 opacity-70 ml-1">Arrivée</Label>
                <Select value={toId} onValueChange={setToId}>
                  <SelectTrigger className="h-12 rounded-xl bg-slate-50 border-none font-bold"><SelectValue placeholder="Ville" /></SelectTrigger>
                  <SelectContent>{cities.map(c => <SelectItem key={c.id} value={c.id} className="font-bold">{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 text-left">
                <Label className="text-[10px] font-black uppercase text-slate-900 opacity-70 ml-1">Date</Label>
                <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="h-12 rounded-xl bg-slate-50 border-none font-bold text-sm" min={new Date().toISOString().split('T')[0]} />
              </div>
            </div>
            <Button onClick={handleSearchTrips} disabled={searchingTrips} className="w-full h-14 font-black rounded-2xl shadow-xl uppercase tracking-widest text-xs">
              {searchingTrips ? <RefreshCw className="animate-spin h-5 w-5" /> : "Rechercher départs"}
            </Button>
          </div>

          <div className="space-y-4">
            {trips.map(t => (
              <button key={`${t.departureId}-${t.isEscale}`} onClick={() => { setSelectedTrip(t); setStep(2); }} className="w-full text-left bg-white border-2 border-slate-100 hover:border-primary p-6 rounded-[2rem] transition-all flex justify-between items-center shadow-sm hover:shadow-xl group">
                <div className="flex items-center gap-5">
                   <div className={`h-12 w-12 rounded-2xl flex items-center justify-center text-white shadow-md ${t.transportTypeCode === 'BOAT' ? 'bg-blue-600' : 'bg-primary'}`}>
                      {t.transportTypeCode === 'BOAT' ? <Ship size={24}/> : t.transportTypeCode === 'TRAIN' ? <Train size={24}/> : <Bus size={24}/>}
                   </div>
                   <div>
                      <div className="font-black text-slate-800 uppercase text-sm flex items-center gap-2">
                        {t.departureCity} <ArrowRight size={14} className="text-primary opacity-30" /> {t.arrivalCity}
                        {t.isEscale && <Badge className="bg-amber-50 text-amber-700 border-none text-[7px] uppercase h-4 px-1.5">Escale</Badge>}
                      </div>
                      <div className="text-[10px] font-bold text-muted-foreground uppercase mt-0.5">{t.companyName} • {t.departureTime} ➔ {t.arrivalTime}</div>
                   </div>
                </div>
                <ArrowRight size={20} className="text-slate-200 group-hover:text-primary transition-colors" />
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 2 && selectedTrip && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="bg-slate-900 border-none rounded-2xl p-5 flex justify-between items-center text-white shadow-xl">
             <div className="flex items-center gap-3 text-left">
                <div className="h-10 w-10 bg-white/10 rounded-xl flex items-center justify-center text-primary">
                    {selectedTrip.transportTypeCode === 'BOAT' ? <Ship size={20}/> : <Bus size={20}/>}
                </div>
                <div>
                    <p className="text-[10px] font-black uppercase text-primary tracking-widest leading-none">Voyage choisi</p>
                    <p className="font-bold text-sm mt-1 uppercase">{selectedTrip.departureCity} ➔ {selectedTrip.arrivalCity}</p>
                </div>
             </div>
             <Button variant="ghost" size="sm" onClick={() => { setStep(1); setSelectedTariffId(""); }} className="text-[9px] font-black uppercase underline text-primary">Modifier</Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
            <div className="bg-card border-2 rounded-[2rem] p-6 space-y-4">
              <h2 className="font-black text-[10px] uppercase text-slate-900 opacity-60 tracking-widest flex items-center gap-2"><User size={12}/> Expéditeur</h2>
              <div className="space-y-3">
                <Input value={senderName} onChange={e => setSenderName(e.target.value)} placeholder="Nom" className="h-11 rounded-xl bg-slate-50 border-none font-bold shadow-inner" />
                <Input value={senderPhone} onChange={e => setSenderPhone(e.target.value)} placeholder="Téléphone" className="h-11 rounded-xl bg-slate-50 border-none font-bold shadow-inner" />
              </div>
            </div>
            <div className="bg-card border-2 rounded-[2rem] p-6 space-y-4 text-left">
              <h2 className="font-black text-[10px] uppercase text-slate-900 opacity-60 tracking-widest flex items-center gap-2"><User size={12}/> Destinataire</h2>
              <div className="space-y-3">
                <Input value={receiverName} onChange={e => setReceiverName(e.target.value)} placeholder="Nom" className="h-11 rounded-xl bg-slate-50 border-none font-bold shadow-inner" />
                <Input value={receiverPhone} onChange={e => setReceiverPhone(e.target.value)} placeholder="Téléphone" className="h-11 rounded-xl bg-slate-50 border-none font-bold shadow-inner" />
              </div>
            </div>
          </div>

          <div className="bg-white border-2 border-slate-100 rounded-[2.5rem] p-8 space-y-6 shadow-xl text-left">
            <div className="space-y-5">
              <div className="space-y-1.5 text-left">
                <Label className="text-[10px] font-black uppercase text-slate-900 opacity-70 ml-1">Nature du colis</Label>
                <div className="relative">
                  <ShoppingBag className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-primary" />
                  <Input value={parcelTitle} onChange={e => setParcelTitle(e.target.value)} placeholder="Ex: 2 cartons de poisson..." className="h-14 rounded-2xl font-black pl-12 border-2 border-slate-100 shadow-inner" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5 text-left">
                  <Label className="text-[10px] font-black uppercase text-slate-900 opacity-70 ml-1">Type de fret agence</Label>
                  <Select value={selectedTariffId} onValueChange={setSelectedTariffId}>
                    <SelectTrigger className="h-12 rounded-xl font-bold border-2 border-slate-100">
                        <SelectValue placeholder="Choisir tarif" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl shadow-2xl">
                      {tariffs.map(t => (
                        <SelectItem key={t.id} value={t.id.toString()} className="font-bold">
                          {t.label} ({t.price.toLocaleString()} F{t.is_weight_based ? '/kg' : ''})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5 text-left">
                  <Label className="text-[10px] font-black uppercase text-slate-900 opacity-70 ml-1">Poids Estimé (kg)</Label>
                  <Input type="number" step="0.5" value={weightKg} onChange={e => setWeightKg(e.target.value)} className="h-12 rounded-xl font-black border-2 border-slate-100 shadow-inner" disabled={selectedTariffId !== "" && !selectedTariff?.is_weight_based} />
                </div>
              </div>
              <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Précisions supplémentaires..." className="rounded-xl font-medium border-2 min-h-[100px]" />
            </div>

            <div className="bg-emerald-600 rounded-3xl p-6 flex items-center justify-between text-white shadow-xl shadow-emerald-100">
               <Calculator size={32} className="opacity-30" />
               <div className="text-right">
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-80 leading-none mb-1">Total estimé à régler</p>
                  <div className="text-4xl font-black tracking-tighter">
                    {estimatedPrice.toLocaleString()} <span className="text-xs uppercase">FCFA</span>
                  </div>
               </div>
            </div>
          </div>

          <div className="bg-card border-2 rounded-[2rem] p-6 shadow-sm text-left">
            <h2 className="font-black text-[10px] uppercase text-slate-900 opacity-60 mb-4 tracking-widest">Règlement</h2>
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger className="h-12 rounded-xl font-black bg-slate-50 border-none px-5"><SelectValue placeholder="Mode de paiement souhaité" /></SelectTrigger>
              <SelectContent className="rounded-xl shadow-xl z-[200]">{PAYMENT_METHODS.map(m => <SelectItem key={m.id} value={m.id} className="font-bold">{m.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>

          <Button onClick={handleSubmit} disabled={submitting} className="w-full h-16 rounded-[2rem] font-black text-xl shadow-2xl shadow-primary/20 uppercase tracking-widest active:scale-95 transition-all">
            {submitting ? <RefreshCw className="animate-spin h-6 w-6" /> : "VALIDER L'EXPÉDITION"}
          </Button>
        </div>
      )}
    </div>
  );
}