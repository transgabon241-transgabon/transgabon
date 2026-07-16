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
  Check, 
  Calculator, 
  ChevronLeft, 
  ChevronRight, 
  MapPin, 
  User, 
  ArrowRight,
  Ship,
  Bus,
  Train,
  Info
} from 'lucide-react'; 
import { toast } from 'sonner';

type Parcel = {
  id: string;
  trackingNumber: string;
  status: string;
  parcelType: string;
  description: string; // Désignation précise
  departureCity: string;
  arrivalCity: string;
  departureDate: string;
  senderName: string;
  senderPhone: string;
  receiverName: string;
  receiverPhone: string;
  price: number;
  weightKg: number;
  paymentStatus: string;
  transportType: string; // BOAT, BUS, TRAIN
};

type Tariff = {
  id: string;
  label: string;
  price: number;
  is_weight_based: boolean;
};

const STATUSES = ['all', 'En attente', 'Pris en charge', 'En transit', 'Arrivé', 'Livré', 'Retourné'];
const STATUS_COLORS: Record<string, string> = {
  'En attente': 'bg-yellow-100 text-yellow-800 border-yellow-200',
  'Pris en charge': 'bg-blue-100 text-blue-800 border-blue-200',
  'En transit': 'bg-orange-100 text-orange-800 border-orange-200',
  'Arrivé': 'bg-emerald-100 text-emerald-800 border-emerald-200',
  'Livré': 'bg-green-100 text-green-800 border-green-200',
  'Retourné': 'bg-red-100 text-red-800 border-red-200',
};

export default function AgencyParcels() {
  const { user } = useAuth();
  const [parcels, setParcels] = useState<Parcel[]>([]);
  const [tariffs, setTariffs] = useState<Tariff[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

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
        .select('*, from:cities!from_id(name), to:cities!to_id(name), trip:trips(type)')
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

      const formatted: Parcel[] = (data || []).map(p => ({
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
        departureCity: p.from.name,
        arrivalCity: p.to.name,
        departureDate: p.created_at.slice(0, 10),
        senderName: p.sender_name,
        senderPhone: p.sender_phone,
        receiverName: p.receiver_name,
        receiverPhone: p.receiver_phone,
        price: p.price,
        weightKg: p.weight,
        paymentStatus: p.is_paid ? 'Payé' : 'À payer',
        transportType: p.trip?.type || 'BUS'
      }));

      setParcels(formatted);
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
        'En attente': 'COLIS_ENREGISTRE',
        'Pris en charge': 'EN_ATTENTE_DEPART',
        'En transit': 'EN_COURS_DE_TRANSPORT',
        'Arrivé': 'ARRIVE_A_DESTINATION',
        'Livré': 'LIVRE',
        'Retourné': 'RETOURNE',
      };
      await supabase.from('parcels').update({ status: dbStatusMap[newStatus] }).eq('id', id);
      toast.success('Statut mis à jour');
      loadData();
    } catch (e) {
      toast.error('Échec');
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('parcels').delete().eq('id', id);
    if (!error) {
      setParcels(prev => prev.filter(p => p.id !== id));
      toast.success('Supprimé');
    }
  };

  const filtered = useMemo(() => {
    const s = search.toLowerCase();
    return parcels.filter(p => 
      p.trackingNumber.toLowerCase().includes(s) || 
      p.senderName.toLowerCase().includes(s) || 
      p.receiverName.toLowerCase().includes(s) ||
      p.description.toLowerCase().includes(s)
    );
  }, [parcels, search]);

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginatedParcels = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="max-w-6xl mx-auto p-4 text-left space-y-8">
      {/* HEADER PROFESSIONNEL */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-[2rem] border shadow-sm">
        <div>
          <h1 className="text-3xl font-black italic text-primary flex items-center gap-3 tracking-tighter">
            <Package className="h-8 w-8" /> Fret & Logistique
          </h1>
          <p className="text-muted-foreground font-bold text-[10px] uppercase tracking-widest mt-1">Gestion des envois de marchandises</p>
        </div>
        <Button variant="outline" size="sm" onClick={loadData} className="rounded-xl font-black border-2 gap-2 h-11 px-6 shadow-sm">
          <RefreshCw className="h-4 w-4" /> ACTUALISER
        </Button>
      </div>

      {/* RECHERCHE ET FILTRES */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-white p-6 rounded-[2rem] border-2 border-slate-50 shadow-sm">
        <div className="md:col-span-3 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
          <Input 
            placeholder="N° de suivi, Nom ou Description..." 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
            className="pl-12 h-12 rounded-2xl border-2 shadow-inner font-medium" 
          />
        </div>
        <Select value={statusFilter} onValueChange={v => { setStatusFilter(v); setCurrentPage(1); }}>
          <SelectTrigger className="h-12 rounded-2xl border-2 font-black bg-slate-50 uppercase text-[10px]">
            <SelectValue placeholder="Tous les statuts" />
          </SelectTrigger>
          <SelectContent className="rounded-xl font-bold">
            {STATUSES.map(s => <SelectItem key={s} value={s}>{s === 'all' ? 'TOUS LES STATUTS' : s.toUpperCase()}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="grid gap-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-32 w-full rounded-3xl" />)}
        </div>
      ) : paginatedParcels.length === 0 ? (
        <div className="bg-white border-2 border-dashed rounded-[3rem] py-20 text-center text-slate-300 italic">
          Aucun colis correspondant à votre recherche
        </div>
      ) : (
        <div className="grid gap-4">
          {paginatedParcels.map(p => (
            <ParcelCard 
              key={p.id} 
              parcel={p} 
              tariffs={tariffs} 
              onUpdateStatus={handleUpdateStatus} 
              onDelete={handleDelete} 
              onRefresh={loadData}
            />
          ))}
        </div>
      )}

      {/* PAGINATION */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 mt-8 bg-white p-3 rounded-2xl border-2 border-slate-50 w-fit mx-auto shadow-sm">
          <Button variant="ghost" size="icon" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="rounded-xl h-10 w-10"><ChevronLeft className="h-5 w-5" /></Button>
          <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Page {currentPage} / {totalPages}</span>
          <Button variant="ghost" size="icon" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)} className="rounded-xl h-10 w-10"><ChevronRight className="h-5 w-5" /></Button>
        </div>
      )}
    </div>
  );
}

/**
 * CARTE DU COLIS
 */
function ParcelCard({ parcel: p, tariffs, onUpdateStatus, onDelete, onRefresh }: any) {
  const [pricingMode, setPricingMode] = useState(false);
  const [selectedTariff, setSelectedTariff] = useState<Tariff | null>(null);
  const [weight, setWeight] = useState(p.weightKg.toString());

  const calculatedPrice = useMemo(() => {
    if (!selectedTariff) return 0;
    return selectedTariff.is_weight_based ? (parseFloat(weight) || 0) * selectedTariff.price : selectedTariff.price;
  }, [selectedTariff, weight]);

  const handleFinalizePricing = async () => {
    if (!selectedTariff) return;
    try {
      await supabase.from('parcels').update({ price: calculatedPrice, weight: parseFloat(weight) || 0, status: 'EN_ATTENTE_DEPART' }).eq('id', p.id);
      toast.success("Tarif validé !");
      onRefresh();
    } catch (e) {
      toast.error("Erreur");
    }
  };

  const nextStatuses: Record<string, string[]> = {
    'Pris en charge': ['En transit', 'Retourné'],
    'En transit': ['Arrivé', 'Retourné'],
    'Arrivé': ['Livré', 'Retourné'],
  };
  const available = nextStatuses[p.status] || [];

  const TransportIcon = p.transportType === 'BOAT' ? Ship : p.transportType === 'TRAIN' ? Train : Bus;

  return (
    <div className="bg-white border-2 border-slate-100 rounded-[2.5rem] p-6 hover:shadow-xl transition-all group relative overflow-hidden">
      <div className="flex flex-col lg:flex-row lg:items-center gap-6">
        
        {/* Colonne 1 : Identité & Transport */}
        <div className="flex-1 space-y-4">
          <div className="flex items-center gap-3">
             <div className={`h-12 w-12 rounded-2xl flex items-center justify-center text-white shadow-lg ${p.transportType === 'BOAT' ? 'bg-blue-600' : 'bg-primary'}`}>
                <TransportIcon size={24} />
             </div>
             <div>
                <span className="font-mono font-black text-primary text-sm uppercase tracking-tighter">{p.trackingNumber}</span>
                <div className="flex gap-2 mt-0.5">
                   <Badge className={`${STATUS_COLORS[p.status]} border-none font-black uppercase text-[8px] h-5`}>{p.status}</Badge>
                   <Badge variant="outline" className="text-[8px] font-black uppercase tracking-widest border-slate-200">{p.parcelType}</Badge>
                </div>
             </div>
          </div>
          
          <div className="space-y-1">
             <p className="text-lg font-black text-slate-900 leading-tight uppercase italic">{p.description}</p>
             <div className="flex items-center gap-2 text-sm font-bold text-slate-500">
               <MapPin className="h-3 w-3" /> {p.departureCity} <ArrowRight className="h-3 w-3 text-primary mx-1" /> {p.arrivalCity}
             </div>
          </div>

          <div className="flex flex-wrap gap-x-6 gap-y-2 text-[10px] font-black uppercase text-slate-400 tracking-wider">
             <span className="flex items-center gap-1.5"><User className="h-3 w-3" /> Exp: {p.senderName}</span>
             <span className="flex items-center gap-1.5"><User className="h-3 w-3" /> Dest: {p.receiverName}</span>
          </div>
        </div>

        {/* Colonne 2 : Chiffres */}
        <div className="flex items-center justify-between lg:flex-col lg:items-end lg:justify-center lg:px-8 lg:border-l-2 border-dashed border-slate-100 gap-4">
           <div className="text-center lg:text-right">
              <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Poids Réel</p>
              <p className="text-xl font-black text-slate-900 leading-none mt-1">{p.weightKg} KG</p>
           </div>
           <div className="text-center lg:text-right">
              <p className="text-[9px] font-black text-emerald-300 uppercase tracking-widest">Prix Total</p>
              <p className="text-2xl font-black text-emerald-600 leading-none mt-1 tracking-tighter">{p.price.toLocaleString()} F</p>
           </div>
        </div>

        {/* Colonne 3 : Actions Guichet */}
        <div className="flex items-center gap-3 shrink-0 pt-4 lg:pt-0 border-t lg:border-none border-slate-50">
          {p.status === 'En attente' && (
            <div className="relative">
              {!pricingMode ? (
                <Button onClick={() => setPricingMode(true)} className="h-11 gap-2 font-black bg-emerald-600 rounded-2xl px-6 shadow-lg shadow-emerald-100 uppercase text-xs">
                  <Scale className="h-4 w-4" /> Tarifer & Peser
                </Button>
              ) : (
                <div className="absolute right-0 bottom-full mb-4 bg-white p-5 rounded-[2rem] border-2 border-primary/20 shadow-2xl w-72 z-50 animate-in fade-in slide-in-from-bottom-4">
                   <div className="flex items-center gap-2 mb-4">
                      <Calculator className="h-4 w-4 text-primary" />
                      <h4 className="text-xs font-black uppercase text-slate-800">Calculateur de fret</h4>
                   </div>
                   
                   <div className="space-y-4">
                      <div className="space-y-1.5">
                        <Label className="text-[9px] font-black text-slate-400 uppercase ml-1">Choisir la catégorie</Label>
                        <Select onValueChange={(v) => setSelectedTariff(tariffs.find(t => t.id === v) || null)}>
                            <SelectTrigger className="h-9 rounded-xl font-bold text-xs bg-slate-50"><SelectValue placeholder="Catégorie..." /></SelectTrigger>
                            <SelectContent className="rounded-xl font-bold">{tariffs.map(t => <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                         <div className="space-y-1.5">
                            <Label className="text-[9px] font-black text-slate-400 uppercase ml-1">Poids (KG)</Label>
                            <Input type="number" value={weight} onChange={e => setWeight(e.target.value)} className="h-9 rounded-xl font-black text-center" />
                         </div>
                         <div className="space-y-1.5">
                            <Label className="text-[9px] font-black text-slate-400 uppercase ml-1">Total (F)</Label>
                            <div className="h-9 flex items-center justify-center font-black text-primary bg-primary/5 rounded-xl border border-primary/10">{calculatedPrice.toLocaleString()}</div>
                         </div>
                      </div>

                      <div className="flex gap-2 pt-2">
                        <Button variant="ghost" size="sm" onClick={() => setPricingMode(false)} className="flex-1 font-bold text-[10px] rounded-lg">ANNULER</Button>
                        <Button size="sm" onClick={handleFinalizePricing} className="flex-1 font-black text-[10px] rounded-lg shadow-md">VALIDER</Button>
                      </div>
                   </div>
                </div>
              )}
            </div>
          )}

          <div className="flex gap-2">
            {available.map(s => (
              <Button key={s} variant="outline" size="sm" onClick={() => onUpdateStatus(p.id, s)} className="h-10 font-black border-2 rounded-xl text-[9px] uppercase tracking-widest px-4 transition-all active:scale-95">
                MARQUER {s}
              </Button>
            ))}
          </div>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon" className="h-10 w-10 text-slate-200 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover:opacity-100">
                <Trash2 className="h-5 w-5" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="rounded-[2.5rem] border-none shadow-2xl">
              <AlertDialogHeader><AlertDialogTitle className="font-black italic uppercase">Supprimer l'envoi ?</AlertDialogTitle><AlertDialogDescription>Référence: {p.trackingNumber}</AlertDialogDescription></AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="rounded-xl font-bold">RETOUR</AlertDialogCancel>
                <AlertDialogAction onClick={() => onDelete(p.id)} className="bg-red-600 rounded-xl font-bold">SUPPRIMER</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </div>
  );
}