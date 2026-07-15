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
// AJOUT DE ArrowRight ICI
import { Package, Search, RefreshCw, Trash2, Scale, Check, Calculator, ChevronLeft, ChevronRight, MapPin, User, ArrowRight } from 'lucide-react'; 
import { toast } from 'sonner';

type Parcel = {
  id: string;
  trackingNumber: string;
  status: string;
  parcelType: string;
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
  
  // États pour la pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

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
        .select('*, from:cities!from_id(name), to:cities!to_id(name)')
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
      }));

      setParcels(formatted);
      setCurrentPage(1); 
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
      p.receiverName.toLowerCase().includes(s)
    );
  }, [parcels, search]);

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginatedParcels = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="max-w-4xl mx-auto p-4 text-left">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-black italic text-primary flex items-center gap-2">
            <Package className="h-6 w-6" /> Fret & Logistique
          </h1>
          <p className="text-muted-foreground font-bold text-[10px] uppercase tracking-[0.2em]">Flux marchandises</p>
        </div>
        <Button variant="outline" size="sm" onClick={loadData} className="rounded-xl font-bold border-2 gap-2 h-10 px-4 transition-all active:scale-95">
          <RefreshCw className="h-4 w-4" /> Actualiser
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-6">
        <div className="md:col-span-3 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Rechercher un n° suivi ou un nom..." 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
            className="pl-10 h-11 rounded-2xl border-2 shadow-sm font-medium" 
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-11 rounded-2xl border-2 font-bold bg-white">
            <SelectValue placeholder="Filtrer" />
          </SelectTrigger>
          <SelectContent>
            {STATUSES.map(s => <SelectItem key={s} value={s} className="font-bold">{s === 'all' ? 'Tous les colis' : s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full rounded-3xl" />)}
        </div>
      ) : paginatedParcels.length === 0 ? (
        <div className="bg-card border-2 border-dashed rounded-3xl py-12 text-center text-muted-foreground">
          <p className="font-bold text-xs uppercase tracking-widest">Aucun résultat</p>
        </div>
      ) : (
        <div className="space-y-3">
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

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 mt-8 bg-white p-3 rounded-2xl border-2 border-slate-50 w-fit mx-auto shadow-sm">
          <Button 
            variant="ghost" 
            size="icon" 
            disabled={currentPage === 1} 
            onClick={() => setCurrentPage(p => p - 1)}
            className="rounded-xl h-10 w-10 hover:bg-primary/10 hover:text-primary"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-1">
             <span className="text-xs font-black text-primary">{currentPage}</span>
             <span className="text-[10px] font-bold text-slate-300">/</span>
             <span className="text-xs font-bold text-slate-400">{totalPages}</span>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            disabled={currentPage === totalPages} 
            onClick={() => setCurrentPage(p => p + 1)}
            className="rounded-xl h-10 w-10 hover:bg-primary/10 hover:text-primary"
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>
      )}
    </div>
  );
}

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
      toast.success("Validé !");
      onRefresh();
    } catch (e) {
      toast.error("Erreur");
    }
  };

  const nextStatuses: Record<string, string[]> = {
    'Pris en charge': ['En transit'],
    'En transit': ['Arrivé'],
    'Arrivé': ['Livré'],
  };
  const available = nextStatuses[p.status] || [];

  return (
    <div className="bg-card border-2 rounded-[2rem] p-4 hover:shadow-lg transition-all group border-slate-100">
      <div className="flex flex-col md:flex-row md:items-center gap-4">
        
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <span className="font-mono font-black text-primary text-xs bg-primary/5 px-2 py-0.5 rounded-md">{p.trackingNumber}</span>
            <Badge className={`${STATUS_COLORS[p.status]} border-none font-black uppercase text-[8px] h-5`}>
              {p.status}
            </Badge>
          </div>
          
          <div className="flex items-center gap-2 text-sm font-bold text-slate-800">
            <MapPin className="h-3 w-3 text-slate-400" />
            {p.departureCity} <ArrowRight className="h-3 w-3 text-primary mx-0.5" /> {p.arrivalCity}
          </div>

          <div className="flex items-center gap-4 text-[10px] font-bold text-slate-400 uppercase">
            <span className="flex items-center gap-1"><User className="h-3 w-3" /> {p.senderName}</span>
            <span className="flex items-center gap-1 text-slate-300">→</span>
            <span>{p.receiverName}</span>
          </div>
        </div>

        <div className="flex md:flex-col items-center md:items-end gap-2 px-4 md:border-l border-dashed border-slate-200">
          <div className="text-xs font-black text-slate-900">{p.weightKg} KG</div>
          <div className="text-sm font-black text-emerald-600 tracking-tighter">{p.price.toLocaleString()} F</div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {p.status === 'En attente' && (
            <div className="relative">
              {!pricingMode ? (
                <Button onClick={() => setPricingMode(true)} size="sm" className="h-9 gap-2 font-black bg-emerald-600 rounded-xl px-4 shadow-md shadow-emerald-100">
                  <Scale className="h-4 w-4" /> Tarifer
                </Button>
              ) : (
                <div className="absolute right-0 bottom-full mb-2 bg-white p-4 rounded-[1.5rem] border-2 border-primary/20 shadow-2xl w-64 z-50 animate-in fade-in slide-in-from-bottom-2">
                   <Label className="text-[9px] font-black uppercase text-slate-400">Choix du Tarif</Label>
                   <Select onValueChange={(v) => setSelectedTariff(tariffs.find(t => t.id === v) || null)}>
                      <SelectTrigger className="h-8 font-bold text-xs rounded-lg mt-1 mb-2"><SelectValue placeholder="Tarif..." /></SelectTrigger>
                      <SelectContent className="rounded-xl border-none shadow-xl">
                        {tariffs.map(t => <SelectItem key={t.id} value={t.id} className="text-xs font-bold">{t.label}</SelectItem>)}
                      </SelectContent>
                   </Select>
                   
                   <div className="grid grid-cols-2 gap-2 mb-3">
                     <Input type="number" value={weight} onChange={e => setWeight(e.target.value)} className="h-8 font-black text-xs rounded-lg" placeholder="Poids" />
                     <div className="h-8 flex items-center justify-center font-black text-primary text-[10px] bg-slate-50 rounded-lg">{calculatedPrice} F</div>
                   </div>

                   <div className="flex gap-2">
                     <Button variant="ghost" size="sm" onClick={() => setPricingMode(false)} className="flex-1 h-8 text-[9px] font-bold">Annuler</Button>
                     <Button size="sm" onClick={handleFinalizePricing} className="flex-1 h-8 text-[9px] font-bold bg-primary rounded-lg shadow-lg">VALIDER</Button>
                   </div>
                </div>
              )}
            </div>
          )}

          {available.map(s => (
            <Button key={s} variant="outline" size="sm" onClick={() => onUpdateStatus(p.id, s)} className="h-9 font-bold border-2 rounded-xl text-[10px] px-3 uppercase tracking-tighter hover:bg-primary hover:text-white transition-all">
              {s}
            </Button>
          ))}

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9 text-slate-200 hover:text-red-600 hover:bg-red-50 rounded-xl opacity-0 group-hover:opacity-100 transition-all">
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="rounded-[2.5rem] border-none shadow-2xl">
              <AlertDialogHeader><AlertDialogTitle className="text-xl font-black italic">Supprimer ?</AlertDialogTitle></AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="rounded-xl font-bold">Retour</AlertDialogCancel>
                <AlertDialogAction onClick={() => onDelete(p.id)} className="bg-red-600 rounded-xl font-bold">Supprimer</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </div>
  );
}