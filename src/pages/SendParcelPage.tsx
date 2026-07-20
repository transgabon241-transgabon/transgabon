"use client"

import { useEffect, useState, useMemo, useCallback } from 'react'; // Ajout de useCallback
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
  Hash,
  MapPin,
  User
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
  const [cities, setCities] = useState<City[]>([]);
  const [fromId, setFromId] = useState('');
  const [toId, setToId] = useState('');
  const [date, setDate] = useState('');
  const [trips, setTrips] = useState<Trip[]>([]);
  const [searchingTrips, setSearchingTrips] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);

  const [tariffs, setTariffs] = useState<Tariff[]>([]);
  const [selectedTariffId, setSelectedTariffId] = useState<string>(""); // On stocke l'ID uniquement

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

  // Charger les villes
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

  // Charger les tarifs (Dépend uniquement de l'ID de la compagnie pour éviter les boucles)
  const currentCompanyId = selectedTrip?.companyId;
  useEffect(() => {
    if (currentCompanyId) {
      const fetchTariffs = async () => {
        const { data } = await supabase
          .from('company_parcel_tariffs')
          .select('*')
          .eq('company_id', currentCompanyId);
        if (data) setTariffs(data);
      };
      fetchTariffs();
    }
  }, [currentCompanyId]);

  // On récupère l'objet tarif sélectionné via son ID de manière stable
  const selectedTariff = useMemo(() => 
    tariffs.find(t => t.id === selectedTariffId) || null
  , [selectedTariffId, tariffs]);

  const estimatedPrice = useMemo(() => {
    if (!selectedTariff) return 0;
    const w = parseFloat(weightKg) || 0;
    return selectedTariff.is_weight_based ? w * selectedTariff.price : selectedTariff.price;
  }, [selectedTariff, weightKg]);

  const handleSearchTrips = async () => {
    if (!fromId || !toId || !date) { toast.error('Itinéraire incomplet'); return; }
    setSearchingTrips(true);
    try {
      const { data, error } = await supabase
        .from('trips')
        .select('*, company:companies(name), vehicle:vehicles(registration)')
        .eq('from_id', fromId).eq('to_id', toId).eq('departure_date', date);

      if (error) throw error;
      if (data) {
        const cFrom = cities.find(c => c.id === fromId)?.name || '';
        const cTo = cities.find(c => c.id === toId)?.name || '';
        setTrips(data.map(t => ({
          departureId: t.id,
          companyId: t.company_id,
          companyName: t.company?.name || 'Compagnie',
          transportType: t.type === 'BOAT' ? 'Bateau' : 'Bus',
          transportTypeCode: t.type,
          vehicleNumber: t.vehicle_number,
          registration: t.vehicle?.registration || '—',
          departureTime: t.departure_time,
          arrivalTime: t.arrival_time,
          departureCity: cFrom,
          arrivalCity: cTo,
          departureDate: date,
          price: t.price
        })));
      }
    } finally { setSearchingTrips(false); }
  };

  const handleSubmit = async () => {
    if (!selectedTrip || !selectedTariff || !parcelTitle || !receiverName || !receiverPhone) {
      toast.error('Informations manquantes'); return;
    }
    setSubmitting(true);
    try {
      const fullDesc = `${parcelTitle}${description ? ' - ' + description : ''}`;
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
        p_description: fullDesc,
        p_weight: parseFloat(weightKg),
        p_parcel_type: selectedTariff.label,
        p_payment_method: paymentMethod,
        p_price: estimatedPrice
      });
      if (error || !res?.success) throw new Error(error?.message || res?.error);
      setResult({ trackingNumber: res.tracking_number, price: estimatedPrice });
      setStep(3);
    } catch (err: any) { toast.error(err.message); } finally { setSubmitting(false); }
  };

  // --- RENDU ---
  if (isLoading || !user) return null;

  if (step === 3 && result) {
    return (
        <div className="container mx-auto px-4 py-10 max-w-2xl animate-in fade-in zoom-in-95 duration-500 print:p-0">
          <div className="text-center mb-8 print:hidden">
            <div className="h-16 w-16 bg-emerald-500 text-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-xl shadow-emerald-100">
              <CheckCircle2 size={32} />
            </div>
            <h1 className="text-3xl font-black italic">Expédition Validée</h1>
            <p className="text-muted-foreground font-bold text-[10px] uppercase tracking-widest">Votre colis est enregistré</p>
          </div>
  
          <div className="bg-white border-2 border-slate-100 rounded-[2.5rem] shadow-2xl overflow-hidden relative print:border-none print:shadow-none">
            <div className="bg-slate-900 p-6 text-white flex justify-between items-center">
              <div className="flex items-center gap-3">
                 <Package className="text-primary" size={24} />
                 <span className="font-black italic text-lg uppercase tracking-tighter">Bordereau de Fret</span>
              </div>
              <p className="text-xs font-bold">{new Date().toLocaleDateString('fr-FR')}</p>
            </div>
  
            <div className="p-8 space-y-8">
              <div className="flex justify-between items-start gap-4">
                <div className="space-y-1">
                  <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Tracking</Label>
                  <p className="text-4xl font-mono font-black text-primary tracking-tighter">{result.trackingNumber}</p>
                </div>
                <div className="h-20 w-20 bg-slate-50 border-2 border-slate-100 rounded-2xl flex items-center justify-center">
                   <div className="grid grid-cols-3 gap-1 opacity-20">
                      {[...Array(9)].map((_, i) => <div key={i} className="h-2 w-2 bg-black rounded-sm" />)}
                   </div>
                </div>
              </div>
  
              <div className="bg-slate-50 rounded-3xl p-5 flex items-center justify-between border border-slate-100 text-sm">
                 <div className="text-left font-bold">{selectedTrip.departureCity}</div>
                 <div className="px-4 text-primary font-black uppercase text-[10px]">{selectedTrip.registration}</div>
                 <div className="text-right font-bold">{selectedTrip.arrivalCity}</div>
              </div>
  
              <div className="grid grid-cols-2 gap-8 py-4 border-y border-dashed border-slate-200">
                 <div>
                    <Label className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Expéditeur</Label>
                    <p className="font-bold text-sm">{senderName}</p>
                 </div>
                 <div>
                    <Label className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Destinataire</Label>
                    <p className="font-bold text-sm">{receiverName}</p>
                 </div>
              </div>
  
              <div className="flex justify-between items-center bg-primary/5 p-6 rounded-3xl border border-primary/10">
                 <div>
                    <Label className="text-[9px] font-black uppercase text-primary tracking-widest">Total à régler</Label>
                    <p className="text-3xl font-black text-primary tracking-tighter">{result.price.toLocaleString()} F</p>
                 </div>
                 <Badge className="bg-white text-emerald-600 font-black uppercase text-[10px]">Enregistré</Badge>
              </div>
            </div>
          </div>
  
          <div className="flex flex-col gap-3 mt-10 print:hidden">
            <Button onClick={() => window.print()} variant="outline" className="h-14 font-black rounded-2xl border-2">IMPRIMER</Button>
            <Button onClick={() => navigate('/dashboard')} className="h-14 font-black rounded-2xl shadow-lg">MENU PRINCIPAL</Button>
          </div>
        </div>
      );
  }

  return (
    <div className="container mx-auto px-4 py-12 max-w-2xl text-left space-y-10">
      
      <header className="flex items-center gap-4 bg-white p-5 rounded-3xl border-2 border-slate-50 shadow-sm w-full">
        <div className="p-3 bg-primary rounded-2xl text-white"><Package size={24} /></div>
        <div>
          <h1 className="text-2xl font-black italic text-slate-900 uppercase">Service de Fret</h1>
          <p className="text-[9px] font-bold text-muted-foreground uppercase">Étape {step} sur 2</p>
        </div>
      </header>

      {step === 1 && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="bg-white border-2 border-primary/5 rounded-[2.5rem] p-8 shadow-xl shadow-slate-100/50">
            <h2 className="font-black text-xs uppercase mb-6 flex items-center gap-2 text-primary">
               <MapPin size={16}/> Itinéraire
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8 text-left">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase ml-1">Départ</Label>
                <Select value={fromId} onValueChange={setFromId}>
                  <SelectTrigger className="h-12 rounded-xl font-bold bg-slate-50 border-none"><SelectValue placeholder="Ville" /></SelectTrigger>
                  <SelectContent>{cities.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase ml-1">Arrivée</Label>
                <Select value={toId} onValueChange={setToId}>
                  <SelectTrigger className="h-12 rounded-xl font-bold bg-slate-50 border-none"><SelectValue placeholder="Ville" /></SelectTrigger>
                  <SelectContent>{cities.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase ml-1">Date</Label>
                <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="h-12 rounded-xl bg-slate-50 border-none font-bold" min={new Date().toISOString().split('T')[0]} />
              </div>
            </div>
            <Button onClick={handleSearchTrips} disabled={searchingTrips} className="w-full h-14 font-black rounded-2xl shadow-xl">
              {searchingTrips ? <RefreshCw className="animate-spin h-5 w-5" /> : "Trouver un bus"}
            </Button>
          </div>

          <div className="space-y-4">
            {trips.map(t => (
              <button key={t.departureId} onClick={() => { setSelectedTrip(t); setStep(2); }} className="w-full text-left bg-white border-2 border-slate-100 hover:border-primary p-6 rounded-[2rem] transition-all flex justify-between items-center shadow-sm">
                <div className="flex items-center gap-5">
                   <div className="h-10 w-10 bg-primary rounded-xl flex items-center justify-center text-white">
                      {t.transportTypeCode === 'BOAT' ? <Ship size={20}/> : <Bus size={20}/>}
                   </div>
                   <div>
                      <div className="font-black text-slate-800 uppercase text-sm">{t.departureCity} <ArrowRight className="inline mx-2" size={14} /> {t.arrivalCity}</div>
                      <div className="text-[10px] font-bold text-muted-foreground uppercase">{t.companyName} • {t.registration}</div>
                   </div>
                </div>
                <ArrowRight size={20} className="text-slate-200" />
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 2 && selectedTrip && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="bg-slate-900 border-none rounded-2xl p-5 flex justify-between items-center text-white">
             <div>
                <p className="text-[10px] font-black uppercase text-primary">Trajet</p>
                <p className="font-bold text-sm">{selectedTrip.departureCity} ➔ {selectedTrip.arrivalCity}</p>
             </div>
             <Button variant="ghost" size="sm" onClick={() => setStep(1)} className="text-[9px] font-black uppercase underline text-primary">Modifier</Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
            <div className="bg-card border-2 rounded-[2rem] p-6 space-y-4">
              <h2 className="font-black text-[10px] uppercase text-slate-400 tracking-widest">Expéditeur</h2>
              <div className="space-y-3">
                <Input value={senderName} onChange={e => setSenderName(e.target.value)} placeholder="Nom" className="h-11 rounded-xl bg-slate-50 border-none font-bold" />
                <Input value={senderPhone} onChange={e => setSenderPhone(e.target.value)} placeholder="Tél" className="h-11 rounded-xl bg-slate-50 border-none font-bold" />
              </div>
            </div>
            <div className="bg-card border-2 rounded-[2rem] p-6 space-y-4 text-left">
              <h2 className="font-black text-[10px] uppercase text-slate-400 tracking-widest">Destinataire</h2>
              <div className="space-y-3">
                <Input value={receiverName} onChange={e => setReceiverName(e.target.value)} placeholder="Nom" className="h-11 rounded-xl bg-slate-50 border-none font-bold" />
                <Input value={receiverPhone} onChange={e => setReceiverPhone(e.target.value)} placeholder="Tél" className="h-11 rounded-xl bg-slate-50 border-none font-bold" />
              </div>
            </div>
          </div>

          <div className="bg-white border-2 border-slate-100 rounded-[2.5rem] p-8 space-y-6 shadow-xl text-left">
            <div className="space-y-5">
              <div className="space-y-1.5">
                <Label className="text-[11px] font-black uppercase ml-1">Contenu du colis</Label>
                <div className="relative">
                  <ShoppingBag className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-primary" />
                  <Input value={parcelTitle} onChange={e => setParcelTitle(e.target.value)} placeholder="Ex: 2 sacs de riz..." className="h-14 rounded-2xl font-bold pl-12 border-2 border-slate-100" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-black uppercase ml-1">Catégorie tarifaire</Label>
                  <Select 
                    value={selectedTariffId} 
                    onValueChange={setSelectedTariffId} // Mise à jour stable de l'ID
                  >
                    <SelectTrigger className="h-12 rounded-xl font-bold border-2 border-slate-100 text-left">
                        <SelectValue placeholder="Choisir tarif" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-none shadow-2xl">
                      {tariffs.map(t => (
                        <SelectItem key={t.id} value={t.id} className="font-bold">
                          {t.label} ({t.price.toLocaleString()} F{t.is_weight_based ? '/kg' : ''})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5 text-left">
                  <Label className="text-[11px] font-black uppercase ml-1">Poids (kg)</Label>
                  <Input type="number" step="0.5" value={weightKg} onChange={e => setWeightKg(e.target.value)} className="h-12 rounded-xl font-bold border-2 border-slate-100" />
                </div>
              </div>
              <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Détails (Optionnel)" className="rounded-xl font-medium border-2" />
            </div>

            <div className="bg-emerald-600 rounded-2xl p-5 flex items-center justify-between text-white shadow-xl shadow-emerald-100">
               <Calculator size={28} className="opacity-40" />
               <div className="text-3xl font-black tracking-tighter">
                 {estimatedPrice.toLocaleString()} <span className="text-[10px] uppercase">FCFA</span>
               </div>
            </div>
          </div>

          <div className="bg-card border-2 rounded-[2rem] p-6 shadow-sm text-left">
            <h2 className="font-black text-[10px] uppercase text-slate-400 mb-4 tracking-widest">Paiement</h2>
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger className="h-12 rounded-xl font-black bg-slate-50 border-none px-5"><SelectValue placeholder="Mode de paiement" /></SelectTrigger>
              <SelectContent className="rounded-xl">{PAYMENT_METHODS.map(m => <SelectItem key={m.id} value={m.id}>{m.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>

          <Button onClick={handleSubmit} disabled={submitting} className="w-full h-16 rounded-[2rem] font-black text-xl shadow-2xl shadow-primary/20 uppercase tracking-widest">
            {submitting ? <RefreshCw className="animate-spin h-6 w-6" /> : "VALIDER L'EXPÉDITION"}
          </Button>
        </div>
      )}
    </div>
  );
} 