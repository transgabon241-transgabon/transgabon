"use client"

import { useEffect, useState, useMemo } from 'react';
import { useAuth } from "@/lib/auth-context";
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { 
  Package, 
  Search, 
  RefreshCw, 
  Trash2, 
  Scale, 
  Calculator, 
  ChevronLeft, 
  ChevronRight, 
  ArrowRight,
  Ship,
  Bus,
  Train,
  X,
  MapPin,
  Phone,
  User,
  CreditCard,
  Lock,
  Wallet
} from 'lucide-react'; 
import { toast } from 'sonner';

type Parcel = {
  id: string;
  trackingNumber: string;
  status: string;
  parcelType: string;
  description: string;
  departureCity: string;
  arrivalCity: string;
  departureDate: string;
  senderName: string;
  senderPhone: string;
  receiverName: string;
  receiverPhone: string;
  price: number;
  weightKg: number;
  quantity: number;
  paymentStatus: string;
  transportType: string;
};

type Tariff = {
  id: string;
  label: string;
  price: number;
  is_weight_based: boolean;
};

const STATUS_COLORS: Record<string, string> = {
  'En attente': 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
  'Pris en charge': 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  'En transit': 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  'Arrivé': 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  'Livré': 'bg-green-500/10 text-green-400 border-green-500/20',
  'Retourné': 'bg-red-500/10 text-red-400 border-red-500/20',
};

export default function AgencyParcels() {
  const { user } = useAuth();
  const [parcels, setParcels] = useState<Parcel[]>([]);
  const [tariffs, setTariffs] = useState<Tariff[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  const userRole = user?.role;
  const canCollectMoney = ['Administrateur', 'Agent', 'Caissier'].includes(userRole || '');

  const loadData = async () => {
    if (!user?.companyId) return;
    setLoading(true);
    try {
      const { data: tariffData } = await supabase
        .from('company_parcel_tariffs')
        .select('*')
        .eq('company_id', user.companyId);
      
      if (tariffData) setTariffs(tariffData);

      let query = supabase
        .from('parcels')
        .select('*, from:cities!from_id(name), to:cities!to_id(name), trip:trips!trip_id(type)')
        .eq('company_id', user.companyId);

      if (statusFilter !== 'all') {
        const dbStatusMap: Record<string, string> = {
          'En attente': 'COLIS_ENREGISTRE',
          'Pris en charge': 'EN_ATTENTE_DEPART',
          'En transit': 'EN_COURS_DE_TRANSPORT',
          'Arrivé': 'ARRIVE_A_DESTINATION',
          'Livré': 'LIVRE',
          'Retourné': 'RETOURNE',
        };
        query = query.eq('status', dbStatusMap[statusFilter]);
      }

      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) throw error;

      setParcels((data || []).map(p => ({
        id: p.id,
        trackingNumber: p.tracking_number,
        status: {
          COLIS_ENREGISTRE: 'En attente',
          EN_ATTENTE_DEPART: 'Pris en charge',
          EN_COURS_DE_TRANSPORT: 'En transit',
          ARRIVE_A_DESTINATION: 'Arrivé',
          LIVRE: 'Livré',
          RETOURNE: 'Retourné'
        }[p.status as string] || p.status,
        parcelType: p.parcel_type || 'Colis',
        description: p.description || 'Sans description',
        departureCity: p.from?.name || '—',
        arrivalCity: p.to?.name || '—',
        departureDate: p.created_at ? p.created_at.slice(0, 10) : '',
        senderName: p.sender_name,
        senderPhone: p.sender_phone,
        receiverName: p.receiver_name,
        receiverPhone: p.receiver_phone,
        price: p.price || 0,
        weightKg: p.weight || 0,
        quantity: p.quantity || 1,
        paymentStatus: p.is_paid ? 'Payé' : 'À payer',
        transportType: p.trip?.type || 'BUS'
      })));
    } catch (e: any) {
      toast.error('Erreur de chargement');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [user, statusFilter]);

  const handleUpdateStatus = async (id: string, newStatusDisplay: string) => {
    try {
      const dbStatusMap: Record<string, string> = {
        'Pris en charge': 'EN_ATTENTE_DEPART',
        'En transit': 'EN_COURS_DE_TRANSPORT',
        'Arrivé': 'ARRIVE_A_DESTINATION',
        'Livré': 'LIVRE',
        'Retourné': 'RETOURNE',
      };

      const { error } = await supabase.from('parcels').update({ status: dbStatusMap[newStatusDisplay] }).eq('id', id);
      if (error) throw error;
      toast.success(`Statut mis à jour : ${newStatusDisplay}`);
      loadData();
    } catch (e) { toast.error('Erreur de mise à jour'); }
  };

  const handleCollectPayment = async (id: string) => {
    try {
      const { error } = await supabase.from('parcels').update({ is_paid: true }).eq('id', id);
      if (error) throw error;
      toast.success("Paiement encaissé avec succès !");
      loadData();
    } catch (e) { toast.error("Erreur d'encaissement"); }
  };

  const filtered = useMemo(() => {
    const s = search.toLowerCase();
    return parcels.filter(p => 
      p.trackingNumber.toLowerCase().includes(s) || 
      p.senderName.toLowerCase().includes(s) || 
      p.receiverName.toLowerCase().includes(s) ||
      p.arrivalCity.toLowerCase().includes(s)
    );
  }, [parcels, search]);

  const paginatedParcels = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const totalPages = Math.ceil(filtered.length / itemsPerPage);

  if (loading && parcels.length === 0) return (
    <div className="p-8 space-y-4 bg-background min-h-screen">
      <Skeleton className="h-12 w-48 bg-card"/>
      <Skeleton className="h-64 w-full rounded-[2rem] bg-card"/>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto p-4 text-left space-y-8 animate-in fade-in duration-500 bg-background text-foreground pb-20">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-card p-6 rounded-[2rem] border-2 border-border shadow-2xl">
        <div className="flex items-center gap-4 text-left">
          <div className="p-3 bg-slate-950 rounded-2xl shadow-lg text-primary border border-slate-800">
            <Package size={28} />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-black italic uppercase tracking-tighter text-white leading-none">Gestion du Fret</h1>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Logistique et Messagerie Nationale</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={loadData} className="rounded-xl font-black border-slate-700 bg-slate-950 h-11 px-6 text-[10px] uppercase tracking-widest hover:bg-slate-800 text-slate-300 transition-all">
          <RefreshCw className="h-4 w-4 mr-2" /> Actualiser
        </Button>
      </div>

      {/* Barre de Recherche SOMBRE */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-card p-5 rounded-[2rem] border border-border shadow-2xl">
        <div className="md:col-span-3 relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500 group-focus-within:text-primary transition-colors" />
          <Input 
            placeholder="Référence, Nom ou Destination..." 
            value={search} 
            onChange={e => { setSearch(e.target.value); setCurrentPage(1); }} 
            className="pl-12 h-14 rounded-2xl border-none bg-slate-950 font-bold text-base shadow-inner text-white placeholder:text-slate-600" 
          />
        </div>
        <Select value={statusFilter} onValueChange={v => { setStatusFilter(v); setCurrentPage(1); }}>
          <SelectTrigger className="h-14 rounded-2xl border-none font-black uppercase text-[10px] bg-slate-950 text-slate-300">
            <SelectValue placeholder="Filtrer" />
          </SelectTrigger>
          <SelectContent className="rounded-xl font-bold bg-slate-900 border-border text-slate-200">
            <SelectItem value="all">TOUS LES COLIS</SelectItem>
            <SelectItem value="En attente">EN ATTENTE</SelectItem>
            <SelectItem value="Pris en charge">PRIS EN CHARGE</SelectItem>
            <SelectItem value="En transit">EN TRANSIT</SelectItem>
            <SelectItem value="Arrivé">ARRIVÉ</SelectItem>
            <SelectItem value="Livré">LIVRÉ</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Liste des colis */}
      <div className="space-y-4">
        {paginatedParcels.map(p => (
          <ParcelCard 
            key={p.id} 
            parcel={p} 
            tariffs={tariffs} 
            onRefresh={loadData} 
            onUpdateStatus={handleUpdateStatus} 
            onCollectPayment={handleCollectPayment}
            canCollectMoney={canCollectMoney}
          />
        ))}
        {paginatedParcels.length === 0 && (
          <div className="py-20 text-center border-2 border-dashed border-border rounded-[3rem] bg-card/40 text-slate-600">
            <Package size={48} className="mx-auto mb-4 opacity-20" />
            <p className="font-black uppercase text-xs tracking-widest italic">Aucun colis à afficher</p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 mt-8 bg-card p-2 rounded-2xl border border-border w-fit mx-auto shadow-2xl">
          <Button variant="ghost" size="icon" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="rounded-xl h-10 w-10 border border-slate-800 bg-slate-950 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"><ChevronLeft size={18} /></Button>
          <span className="text-[10px] font-black uppercase text-slate-500 px-4">Page {currentPage} / {totalPages}</span>
          <Button variant="ghost" size="icon" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)} className="rounded-xl h-10 w-10 border border-slate-800 bg-slate-950 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"><ChevronRight size={18} /></Button>
        </div>
      )}
    </div>
  );
}

function ParcelCard({ parcel: p, tariffs, onRefresh, onUpdateStatus, onCollectPayment, canCollectMoney }: any) {
  const [pricingMode, setPricingMode] = useState(false);
  const [selectedTariff, setSelectedTariff] = useState<Tariff | null>(null);
  const [weight, setWeight] = useState(p.weightKg.toString());
  const [quantity, setQuantity] = useState(p.quantity.toString());

  const calculatedPrice = useMemo(() => {
    if (!selectedTariff) return 0;
    const qty = parseInt(quantity) || 1;
    const w = parseFloat(weight) || 0;
    return selectedTariff.is_weight_based ? qty * w * selectedTariff.price : qty * selectedTariff.price;
  }, [selectedTariff, weight, quantity]);

  const handleFinalize = async () => {
    if (!selectedTariff) return;
    try {
      await supabase.from('parcels').update({ 
        price: calculatedPrice, 
        weight: parseFloat(weight) || 0,
        quantity: parseInt(quantity) || 1,
        status: 'COLIS_ENREGISTRE' 
      }).eq('id', p.id);
      toast.success("Tarification validée");
      onRefresh();
      setPricingMode(false);
    } catch (e) { toast.error("Erreur"); }
  };

  const getNextStatus = (current: string) => {
    if (current === 'En attente') return 'Pris en charge';
    if (current === 'Pris en charge') return 'En transit';
    if (current === 'En transit') return 'Arrivé';
    if (current === 'Arrivé') return 'Livré';
    return null;
  };

  const nextStatus = getNextStatus(p.status);
  const isPaid = p.paymentStatus === 'Payé';
  const isPriced = p.price > 0;
  const isBlocked = !isPaid && p.status === 'En attente';

  const TransportIcon = p.transportType === 'BOAT' ? Ship : p.transportType === 'TRAIN' ? Train : Bus;

  return (
    <div className={`bg-card border-2 border-border rounded-[2.5rem] p-6 hover:shadow-2xl transition-all group relative ${pricingMode ? 'z-50 ring-4 ring-primary/10 border-primary/20' : 'z-0'}`}>
      <div className="flex flex-col space-y-6">
        
        {/* LIGNE 1 */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-4 text-left min-w-0">
            <div className={`h-14 w-14 rounded-2xl shrink-0 flex items-center justify-center text-white shadow-lg ${p.transportType === 'BOAT' ? 'bg-blue-600' : p.transportType === 'TRAIN' ? 'bg-slate-950 border border-slate-800' : 'bg-primary'}`}>
               <TransportIcon size={24} />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1.5">
                <span className="font-mono font-black text-primary text-xs uppercase tracking-tighter bg-primary/5 px-2 py-0.5 rounded border border-primary/20">{p.trackingNumber}</span>
                <Badge variant="outline" className={`${STATUS_COLORS[p.status]} border font-black uppercase text-[8px] h-5 px-2`}>{p.status}</Badge>
                <Badge variant="outline" className={`border font-black uppercase text-[8px] h-5 px-2 ${isPaid ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                    {p.paymentStatus}
                </Badge>
              </div>
              <p className="text-base font-black text-white uppercase italic leading-none truncate">{p.description}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 w-full md:w-auto shrink-0">
             {nextStatus && !pricingMode && (
                <div className="flex flex-col items-end w-full">
                    {isBlocked && isPriced && (
                        <span className="text-[8px] font-black text-red-400 uppercase flex items-center gap-1 mb-1 animate-pulse">
                            <Lock size={10} /> Paiement Requis
                        </span>
                    )}
                    <Button 
                        onClick={() => onUpdateStatus(p.id, nextStatus)} 
                        disabled={isBlocked}
                        size="sm" 
                        className={`w-full md:w-auto h-10 rounded-xl font-black text-[9px] uppercase tracking-widest px-5 border-none ${isBlocked ? 'bg-slate-800 text-slate-600' : 'bg-slate-100 text-slate-900 hover:bg-white'}`}
                    >
                        Statut : {nextStatus}
                    </Button>
                </div>
             )}
          </div>
        </div>

        {/* LIGNE 2 : CONTACTS ET ITINÉRAIRE SOMBRE */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-5 border-y border-dashed border-slate-800 text-left">
           <div className="space-y-1">
              <p className="text-[10px] font-black uppercase text-slate-500 flex items-center gap-2 tracking-widest"><User size={12} className="text-primary"/> Expéditeur</p>
              <div className="text-sm font-black text-slate-200 uppercase truncate">{p.senderName}</div>
              <div className="flex items-center gap-2 text-xs font-bold text-primary"><Phone size={12} /> {p.senderPhone}</div>
           </div>

           <div className="space-y-1">
              <p className="text-[10px] font-black uppercase text-slate-500 flex items-center gap-2 tracking-widest"><User size={12} className="text-emerald-500"/> Destinataire</p>
              <div className="text-sm font-black text-slate-200 uppercase truncate">{p.receiverName}</div>
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-500"><Phone size={12} /> {p.receiverPhone}</div>
           </div>

           <div className="space-y-1">
              <p className="text-[10px] font-black uppercase text-slate-500 flex items-center gap-2 tracking-widest"><MapPin size={12} className="text-blue-400"/> Trajet</p>
              <div className="flex items-center gap-3 font-black text-xs uppercase text-slate-300 min-w-0">
                 <span className="truncate">{p.departureCity}</span>
                 <ArrowRight size={14} className="text-slate-600 shrink-0" />
                 <span className="text-primary truncate">{p.arrivalCity}</span>
              </div>
           </div>
        </div>

        {/* LIGNE 3 : LOGISTIQUE ET ACTIONS */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-left">
           <div className="flex gap-8 w-full md:w-auto">
              <div className="space-y-1">
                 <Label className="text-[9px] font-black uppercase text-slate-500 tracking-widest leading-none">Colisage</Label>
                 <p className="font-black text-white text-sm leading-none">{p.quantity} PCS • {(p.weightKg || 0).toLocaleString()} KG</p>
              </div>
              <div className="space-y-1">
                 <Label className="text-[9px] font-black uppercase text-slate-500 tracking-widest leading-none">Montant</Label>
                 <p className={`font-black text-xl tracking-tighter leading-none ${isPaid ? 'text-emerald-400' : 'text-amber-500 animate-pulse'}`}>
                    {(p.price || 0).toLocaleString()} F
                 </p>
              </div>
           </div>

           <div className="flex items-center gap-3 w-full md:w-auto justify-end relative">
              {p.status === 'En attente' && !isPaid && (
                <>
                  <Button onClick={() => setPricingMode(true)} className="h-11 px-8 rounded-2xl font-black bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg gap-2 uppercase text-[10px] tracking-widest border-none active:scale-95">
                    <Scale size={16} /> Tarifer
                  </Button>

                  {pricingMode && (
                    <div className="absolute right-0 bottom-full mb-6 bg-slate-900 p-6 md:p-8 rounded-[2rem] border-2 border-border shadow-[0_40px_100px_rgba(0,0,0,0.8)] w-80 animate-in fade-in slide-in-from-bottom-6 duration-300 text-left">
                       <div className="flex justify-between items-center mb-6">
                          <h4 className="text-[11px] font-black uppercase text-white flex items-center gap-2 italic"><Calculator size={16} className="text-primary"/> Guichet Pesée</h4>
                          <Button variant="ghost" size="icon" onClick={() => setPricingMode(false)} className="h-8 w-8 rounded-full text-slate-500 hover:bg-slate-800 hover:text-white"><X size={18}/></Button>
                       </div>
                       
                       <div className="space-y-5">
                          <div className="space-y-2 text-left">
                            <Label className="text-[10px] font-black uppercase text-slate-500 ml-1">Type de Fret</Label>
                            <Select onValueChange={(v) => setSelectedTariff(tariffs.find(t => t.id === v) || null)}>
                                <SelectTrigger className="h-12 rounded-xl border-none bg-slate-950 font-bold text-white shadow-inner"><SelectValue placeholder="Choisir tarif..." /></SelectTrigger>
                                <SelectContent className="rounded-xl shadow-2xl bg-slate-900 border-border text-white">
                                  {tariffs.map(t => <SelectItem key={t.id} value={t.id} className="font-bold focus:bg-primary/20">{t.label}</SelectItem>)}
                                </SelectContent>
                            </Select>
                          </div>

                          <div className="grid grid-cols-3 gap-2">
                             <div className="space-y-1.5 text-left">
                                <Label className="text-[9px] font-black text-slate-500 uppercase ml-1">Qté</Label>
                                <Input type="number" value={quantity} onChange={e => setQuantity(e.target.value)} className="h-11 rounded-lg bg-slate-950 border-none font-black text-center text-white" />
                             </div>
                             <div className="space-y-1.5 text-left">
                                <Label className="text-[9px] font-black text-slate-500 uppercase ml-1">KG</Label>
                                <Input 
                                  type="number" 
                                  disabled={selectedTariff && !selectedTariff.is_weight_based}
                                  value={weight} onChange={e => setWeight(e.target.value)} 
                                  className={`h-11 rounded-lg bg-slate-950 border-none font-black text-center text-white ${selectedTariff && !selectedTariff.is_weight_based ? 'opacity-20' : ''}`} 
                                />
                             </div>
                             <div className="space-y-1.5 text-left">
                                <Label className="text-[9px] font-black text-primary uppercase ml-1">Prix</Label>
                                <div className="h-11 flex items-center justify-center font-black text-primary bg-primary/10 rounded-lg border border-primary/20 text-xs">
                                  {(calculatedPrice || 0).toLocaleString()}
                                </div>
                             </div>
                          </div>
                          <Button onClick={handleFinalize} className="w-full h-14 rounded-xl font-black text-[11px] uppercase tracking-widest shadow-xl bg-primary text-white border-none active:scale-95 transition-all">
                            Valider le prix
                          </Button>
                       </div>
                    </div>
                  )}
                </>
              )}

              {/* BOUTON ENCAISSER SOMBRE */}
              {!isPaid && isPriced && canCollectMoney && (
                <Button 
                    onClick={() => onCollectPayment(p.id)}
                    className="h-11 px-8 rounded-2xl font-black bg-slate-100 text-slate-900 hover:bg-white shadow-lg gap-3 uppercase text-[10px] tracking-widest border-none transition-all active:scale-95"
                >
                    <Wallet size={16} className="text-primary" /> Encaisser Cash
                </Button>
              )}
           </div>
        </div>
      </div>
    </div>
  );
}