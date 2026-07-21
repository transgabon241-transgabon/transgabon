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
  Info
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
  'En attente': 'bg-yellow-50 text-yellow-700 border-yellow-200',
  'Pris en charge': 'bg-blue-50 text-blue-700 border-blue-200',
  'En transit': 'bg-orange-50 text-orange-700 border-orange-200',
  'Arrivé': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'Livré': 'bg-green-50 text-green-700 border-green-200',
  'Retourné': 'bg-red-50 text-red-700 border-red-200',
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
        departureDate: p.created_at.slice(0, 10),
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

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    try {
      const dbStatusMap: Record<string, string> = {
        'Pris en charge': 'EN_ATTENTE_DEPART',
        'En transit': 'EN_COURS_DE_TRANSPORT',
        'Arrivé': 'ARRIVE_A_DESTINATION',
        'Livré': 'LIVRE',
        'Retourné': 'RETOURNE',
      };

      const { error } = await supabase.from('parcels').update({ status: dbStatusMap[newStatus] }).eq('id', id);
      if (error) throw error;
      toast.success(`Statut mis à jour : ${newStatus}`);
      loadData();
    } catch (e) { toast.error('Erreur de mise à jour'); }
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

  if (loading) return <div className="p-8 space-y-4"><Skeleton className="h-12 w-48"/><Skeleton className="h-64 w-full rounded-[2rem]"/></div>;

  return (
    <div className="max-w-6xl mx-auto p-4 text-left space-y-8 animate-in fade-in duration-500">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white p-6 rounded-[2.5rem] border-2 border-slate-100 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-slate-900 rounded-2xl shadow-lg text-primary">
            <Package size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-black italic uppercase tracking-tighter text-slate-900 leading-none">Gestion du Fret</h1>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">Logistique et Messagerie Nationale</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={loadData} className="rounded-xl font-black border-2 h-11 px-6 text-[10px] uppercase tracking-widest">
          <RefreshCw className="h-4 w-4 mr-2" /> Actualiser
        </Button>
      </div>

      {/* Barre de Recherche Premium */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-white p-5 rounded-[2rem] border-2 border-slate-50 shadow-xl shadow-slate-200/50">
        <div className="md:col-span-3 relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300 group-focus-within:text-primary transition-colors" />
          <Input 
            placeholder="Rechercher par N° de suivi, Nom ou Destination..." 
            value={search} 
            onChange={e => { setSearch(e.target.value); setCurrentPage(1); }} 
            className="pl-12 h-14 rounded-2xl border-2 border-slate-100 font-bold text-base shadow-inner" 
          />
        </div>
        <Select value={statusFilter} onValueChange={v => { setStatusFilter(v); setCurrentPage(1); }}>
          <SelectTrigger className="h-14 rounded-2xl border-2 font-black uppercase text-[10px] bg-slate-50">
            <SelectValue placeholder="Filtrer" />
          </SelectTrigger>
          <SelectContent className="rounded-2xl font-bold">
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
          />
        ))}
        {paginatedParcels.length === 0 && (
            <div className="p-20 text-center border-2 border-dashed rounded-[3rem] bg-slate-50/50">
                <Package className="h-12 w-12 mx-auto text-slate-200 mb-2" />
                <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">Aucun colis trouvé</p>
            </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 bg-white p-2 rounded-2xl border-2 w-fit mx-auto shadow-sm">
          <Button variant="ghost" size="icon" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="rounded-xl h-10 w-10 border hover:bg-slate-50"><ChevronLeft size={18} /></Button>
          <span className="text-[10px] font-black uppercase text-slate-400 px-4">Page {currentPage} / {totalPages}</span>
          <Button variant="ghost" size="icon" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)} className="rounded-xl h-10 w-10 border hover:bg-slate-50"><ChevronRight size={18} /></Button>
        </div>
      )}
    </div>
  );
}

function ParcelCard({ parcel: p, tariffs, onRefresh, onUpdateStatus }: any) {
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
        status: 'EN_ATTENTE_DEPART' 
      }).eq('id', p.id);
      toast.success("Tarification validée");
      onRefresh();
      setPricingMode(false);
    } catch (e) { toast.error("Erreur"); }
  };

  const nextStatus = (current: string) => {
    if (current === 'En attente') return 'Pris en charge';
    if (current === 'Pris en charge') return 'En transit';
    if (current === 'En transit') return 'Arrivé';
    if (current === 'Arrivé') return 'Livré';
    return null;
  }(p.status);

  const TransportIcon = p.transportType === 'BOAT' ? Ship : p.transportType === 'TRAIN' ? Train : Bus;

  return (
    // Note: On retire 'overflow-hidden' pour que le menu 'Tarifer' ne soit pas coupé
    // On ajoute un z-index plus élevé quand le mode tarification est ouvert
    <div className={`bg-white border-2 border-slate-100 rounded-[2.5rem] p-6 hover:shadow-xl transition-all group relative ${pricingMode ? 'z-50 ring-4 ring-primary/10 border-primary/20' : 'z-0'}`}>
      <div className="flex flex-col space-y-6">
        
        {/* LIGNE 1 : INFOS DE BASE ET STATUT */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-4">
            <div className={`h-14 w-14 rounded-[1.25rem] flex items-center justify-center text-white shadow-lg ${p.transportType === 'BOAT' ? 'bg-blue-600' : p.transportType === 'TRAIN' ? 'bg-slate-900' : 'bg-primary'}`}>
               <TransportIcon size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="font-mono font-black text-primary text-sm uppercase tracking-tighter">{p.trackingNumber}</span>
                <Badge className={`${STATUS_COLORS[p.status]} border-2 font-black uppercase text-[8px] h-5 px-2`}>{p.status}</Badge>
              </div>
              <p className="text-base font-black text-slate-900 uppercase italic leading-none">{p.description}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
             {nextStatus && !pricingMode && (
                <Button onClick={() => onUpdateStatus(p.id, nextStatus)} size="sm" className="h-10 rounded-xl font-black text-[9px] uppercase tracking-widest bg-slate-900 hover:bg-black px-5">
                   Passer à : {nextStatus}
                </Button>
             )}
             <AlertDialog>
                <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-10 w-10 text-slate-200 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all">
                        <Trash2 size={18} />
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="rounded-[2.5rem]">
                    <AlertDialogHeader><AlertDialogTitle className="font-black italic uppercase">Supprimer ce colis ?</AlertDialogTitle></AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="rounded-xl font-bold">ANNULER</AlertDialogCancel>
                        <AlertDialogAction onClick={() => supabase.from('parcels').delete().eq('id', p.id).then(()=>onRefresh())} className="bg-red-600 rounded-xl font-bold uppercase">SUPPRIMER</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
             </AlertDialog>
          </div>
        </div>

        {/* LIGNE 2 : CONTACTS ET ITINÉRAIRE (LA PARTIE ENRICHIE) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-5 border-y border-dashed border-slate-100">
           <div className="space-y-3">
              <p className="text-[10px] font-black uppercase text-slate-900 opacity-60 flex items-center gap-2">
                 <User size={12} className="text-primary"/> Expéditeur
              </p>
              <div className="text-sm font-black text-slate-800 uppercase tracking-tight">{p.senderName}</div>
              <div className="flex items-center gap-2 text-xs font-bold text-primary">
                 <Phone size={12} /> {p.senderPhone}
              </div>
           </div>

           <div className="space-y-3">
              <p className="text-[10px] font-black uppercase text-slate-900 opacity-60 flex items-center gap-2">
                 <User size={12} className="text-emerald-500"/> Destinataire
              </p>
              <div className="text-sm font-black text-slate-800 uppercase tracking-tight">{p.receiverName}</div>
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-600">
                 <Phone size={12} /> {p.receiverPhone}
              </div>
           </div>

           <div className="space-y-3">
              <p className="text-[10px] font-black uppercase text-slate-900 opacity-60 flex items-center gap-2">
                 <MapPin size={12} className="text-blue-500"/> Acheminement
              </p>
              <div className="flex items-center gap-3 font-black text-xs uppercase text-slate-700">
                 <span className="bg-slate-100 px-2 py-1 rounded-lg">{p.departureCity}</span>
                 <ArrowRight size={14} className="text-slate-300" />
                 <span className="bg-primary/10 text-primary px-2 py-1 rounded-lg">{p.arrivalCity}</span>
              </div>
              <p className="text-[9px] font-bold text-slate-400 uppercase italic">Prévu le : {p.departureDate}</p>
           </div>
        </div>

        {/* LIGNE 3 : LOGISTIQUE ET TARIFER */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
           <div className="flex gap-8">
              <div className="space-y-1">
                 <Label className="text-[9px] font-black uppercase text-slate-900 opacity-60 tracking-widest">Colisage</Label>
                 <p className="font-black text-slate-900 text-sm">{p.quantity} PCS / {(p.weightKg || 0).toLocaleString()} KG</p>
              </div>
              <div className="space-y-1">
                 <Label className="text-[9px] font-black uppercase text-slate-900 opacity-60 tracking-widest">Montant Fret</Label>
                 <p className="font-black text-emerald-600 text-xl tracking-tighter">{(p.price || 0).toLocaleString()} F</p>
              </div>
           </div>

           <div className="relative">
              {p.status === 'En attente' && (
                <>
                  <Button onClick={() => setPricingMode(true)} className="h-11 px-8 rounded-2xl font-black bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-100 gap-2 uppercase text-[10px] tracking-widest">
                    <Scale size={16} /> Établir la pesée
                  </Button>

                  {pricingMode && (
                    <div className="absolute right-0 bottom-full mb-6 bg-white p-8 rounded-[2.5rem] border-2 border-primary/20 shadow-[0_25px_80px_rgba(0,0,0,0.3)] w-80 animate-in fade-in slide-in-from-bottom-6 duration-300">
                       <div className="flex justify-between items-center mb-6">
                          <h4 className="text-[11px] font-black uppercase text-slate-900 flex items-center gap-2 italic"><Calculator size={16} className="text-primary"/> Guichet de Pesée</h4>
                          <Button variant="ghost" size="icon" onClick={() => setPricingMode(false)} className="h-8 w-8 rounded-full hover:bg-slate-50"><X size={18}/></Button>
                       </div>
                       
                       <div className="space-y-6">
                          <div className="space-y-2 text-left">
                            <Label className="text-[10px] font-black uppercase text-slate-900 opacity-70 ml-2">Type d'article</Label>
                            <Select onValueChange={(v) => setSelectedTariff(tariffs.find(t => t.id === v) || null)}>
                                <SelectTrigger className="h-12 rounded-xl border-none bg-slate-50 font-bold shadow-inner"><SelectValue placeholder="Choisir tarif..." /></SelectTrigger>
                                <SelectContent className="rounded-2xl shadow-2xl">
                                  {tariffs.map(t => <SelectItem key={t.id} value={t.id} className="font-bold">{t.label}</SelectItem>)}
                                </SelectContent>
                            </Select>
                          </div>

                          <div className="grid grid-cols-3 gap-3 text-left">
                             <div className="space-y-2">
                                <Label className="text-[9px] font-black text-slate-900 opacity-70 ml-1">Qté</Label>
                                <Input type="number" value={quantity} onChange={e => setQuantity(e.target.value)} className="h-12 rounded-xl bg-slate-50 border-none font-black text-center shadow-inner" />
                             </div>
                             <div className="space-y-2">
                                <Label className="text-[9px] font-black text-slate-900 opacity-70 ml-1">Poids/KG</Label>
                                <Input 
                                  type="number" 
                                  disabled={selectedTariff && !selectedTariff.is_weight_based}
                                  value={weight} 
                                  onChange={e => setWeight(e.target.value)} 
                                  className={`h-12 rounded-xl bg-slate-50 border-none font-black text-center shadow-inner ${selectedTariff && !selectedTariff.is_weight_based ? 'opacity-30' : ''}`} 
                                />
                             </div>
                             <div className="space-y-2">
                                <Label className="text-[9px] font-black text-emerald-600 uppercase ml-1">Total</Label>
                                <div className="h-12 flex items-center justify-center font-black text-emerald-700 bg-emerald-50 rounded-xl border border-emerald-100 text-xs">
                                  {calculatedPrice.toLocaleString()}
                                </div>
                             </div>
                          </div>
                          <Button onClick={handleFinalize} className="w-full h-14 rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl bg-primary text-white transition-all active:scale-95">
                            Valider le fret
                          </Button>
                       </div>
                    </div>
                  )}
                </>
              )}
           </div>
        </div>
      </div>
    </div>
  );
}