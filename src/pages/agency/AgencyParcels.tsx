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
  MapPin
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
        price: p.price,
        weightKg: p.weight,
        quantity: p.quantity || 1,
        paymentStatus: p.is_paid ? 'Payé' : 'À payer',
        transportType: p.trip?.type || 'BUS'
      })));
    } catch (e: any) {
      toast.error('Erreur de chargement des colis');
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

      const { error } = await supabase
        .from('parcels')
        .update({ status: dbStatusMap[newStatus] })
        .eq('id', id);

      if (error) throw error;
      toast.success(`Statut mis à jour : ${newStatus}`);
      loadData();
    } catch (e) {
      toast.error('Erreur de mise à jour');
    }
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

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginatedParcels = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  if (loading) return <div className="p-8 space-y-4"><Skeleton className="h-12 w-48"/><Skeleton className="h-64 w-full rounded-[2rem]"/></div>;

  return (
    <div className="max-w-6xl mx-auto p-4 text-left space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white p-5 rounded-3xl border shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-primary rounded-xl text-white shadow-lg">
            <Package size={24} />
          </div>
          <h1 className="text-xl font-black italic uppercase tracking-tight">Fret & Logistique</h1>
        </div>
        <Button variant="outline" size="sm" onClick={loadData} className="rounded-xl font-bold border-2 h-10 px-4">
          <RefreshCw className="h-4 w-4 mr-2" /> Actualiser
        </Button>
      </div>

      {/* Filtres & Recherche */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-white p-4 rounded-3xl border-2 border-slate-50 shadow-sm">
        <div className="md:col-span-3 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input placeholder="Rechercher (Tracking, Nom, Ville destination)..." value={search} onChange={e => setSearch(e.target.value)} className="pl-11 h-11 rounded-2xl border-2 font-medium" />
        </div>
        <Select value={statusFilter} onValueChange={v => { setStatusFilter(v); setCurrentPage(1); }}>
          <SelectTrigger className="h-11 rounded-2xl border-2 font-black uppercase text-[10px] bg-slate-50">
            <SelectValue placeholder="Filtrer" />
          </SelectTrigger>
          <SelectContent className="rounded-xl font-bold">
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
      <div className="grid gap-4 relative">
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
        <div className="flex items-center justify-center gap-4 mt-8 bg-white p-2 rounded-2xl border-2 border-slate-50 w-fit mx-auto shadow-sm">
          <Button variant="ghost" size="icon" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="rounded-xl h-9 w-9"><ChevronLeft size={18} /></Button>
          <span className="text-[10px] font-black uppercase text-slate-400">Page {currentPage} / {totalPages}</span>
          <Button variant="ghost" size="icon" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)} className="rounded-xl h-9 w-9"><ChevronRight size={18} /></Button>
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

    if (selectedTariff.is_weight_based) {
      return qty * w * selectedTariff.price; // Logique : Nb Colis * Poids * Prix/kg
    } else {
      return qty * selectedTariff.price; // Logique : Nb Colis * Prix unitaire
    }
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
      toast.success("Pesée et tarification validées");
      onRefresh();
      setPricingMode(false);
    } catch (e) { toast.error("Erreur de sauvegarde"); }
  };

  const getNextStatus = (current: string) => {
    if (current === 'En attente') return 'Pris en charge';
    if (current === 'Pris en charge') return 'En transit';
    if (current === 'En transit') return 'Arrivé';
    if (current === 'Arrivé') return 'Livré';
    return null;
  };

  const nextStatus = getNextStatus(p.status);
  const TransportIcon = p.transportType === 'BOAT' ? Ship : p.transportType === 'TRAIN' ? Train : Bus;

  return (
    <div className="bg-white border-2 border-slate-100 rounded-[2rem] p-5 hover:border-primary/20 transition-all group relative overflow-hidden">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        
        {/* Infos Colis & Transport */}
        <div className="flex items-center gap-5 flex-1">
          <div className={`h-14 w-14 rounded-2xl flex items-center justify-center text-white shadow-lg ${p.transportType === 'BOAT' ? 'bg-blue-600' : p.transportType === 'TRAIN' ? 'bg-slate-900' : 'bg-primary'}`}>
             <TransportIcon size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono font-black text-primary text-xs uppercase tracking-tighter">{p.trackingNumber}</span>
              <Badge className={`${STATUS_COLORS[p.status]} border-none font-black uppercase text-[8px] h-4 px-2`}>{p.status}</Badge>
            </div>
            <p className="text-sm font-black text-slate-800 uppercase italic leading-tight">{p.description}</p>
            <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase">{p.senderName} ➔ {p.receiverName}</p>
          </div>
        </div>

        {/* Itinéraire */}
        <div className="flex items-center gap-4 text-xs font-bold text-slate-500 px-6 md:border-x border-dashed">
           <div className="text-center">
               <p className="text-[7px] text-slate-300 uppercase">Origine</p>
               <span className="uppercase">{p.departureCity}</span>
           </div>
           <ArrowRight size={14} className="text-primary/30" />
           <div className="text-center">
               <p className="text-[7px] text-slate-300 uppercase">Destination</p>
               <span className="uppercase text-slate-900">{p.arrivalCity}</span>
           </div>
        </div>

        {/* Logistique & Prix */}
        <div className="flex items-center gap-8 px-4">
           <div className="text-right">
              <p className="text-[8px] font-black text-slate-300 uppercase">Logistique</p>
              <p className="text-xs font-black text-slate-700">{p.quantity} PCS • {p.weightKg} KG</p>
           </div>
           <div className="text-right">
              <p className="text-[8px] font-black text-emerald-300 uppercase">Montant</p>
              <p className="text-lg font-black text-emerald-600 tracking-tighter">{p.price.toLocaleString()} F</p>
           </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {p.status === 'En attente' && (
            <div className="relative">
              <Button onClick={() => setPricingMode(true)} size="sm" className="h-10 gap-2 font-black bg-emerald-600 hover:bg-emerald-700 rounded-xl px-5 text-[10px] uppercase shadow-lg shadow-emerald-100">
                <Scale size={16} /> Tarifer
              </Button>

              {pricingMode && (
                <div className="absolute right-0 bottom-full mb-4 bg-white p-6 rounded-[2.5rem] border-2 border-primary/20 shadow-[0_25px_60px_rgba(0,0,0,0.25)] w-80 z-[100] animate-in fade-in slide-in-from-bottom-4">
                   <div className="flex justify-between items-center mb-5">
                      <h4 className="text-[10px] font-black uppercase text-slate-800 flex items-center gap-2"><Calculator size={14}/> Guichet Pesée</h4>
                      <Button variant="ghost" size="icon" onClick={() => setPricingMode(false)} className="h-7 w-7 rounded-full"><X size={16}/></Button>
                   </div>
                   
                   <div className="space-y-4">
                      <div className="space-y-1.5 text-left">
                        <Label className="text-[9px] font-black text-slate-400 uppercase ml-1">Type de marchandise / Grille</Label>
                        <Select onValueChange={(v) => setSelectedTariff(tariffs.find(t => t.id === v) || null)}>
                            <SelectTrigger className="h-11 rounded-xl font-bold text-xs bg-slate-50 border-none"><SelectValue placeholder="Choisir tarif..." /></SelectTrigger>
                            <SelectContent className="rounded-xl font-bold border-none shadow-2xl">
                              {tariffs.map(t => <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>)}
                            </SelectContent>
                        </Select>
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-left">
                         <div className="space-y-1.5">
                            <Label className="text-[8px] font-black text-slate-400 uppercase ml-1">Qté</Label>
                            <Input type="number" value={quantity} onChange={e => setQuantity(e.target.value)} className="h-11 rounded-xl font-black text-center bg-slate-50 border-none shadow-inner" />
                         </div>
                         <div className="space-y-1.5">
                            <Label className="text-[8px] font-black text-slate-400 uppercase ml-1">Poids/KG</Label>
                            <Input 
                              type="number" 
                              disabled={selectedTariff && !selectedTariff.is_weight_based}
                              value={weight} 
                              onChange={e => setWeight(e.target.value)} 
                              className={`h-11 rounded-xl font-black text-center bg-slate-50 border-none shadow-inner ${selectedTariff && !selectedTariff.is_weight_based ? 'opacity-30' : ''}`} 
                            />
                         </div>
                         <div className="space-y-1.5">
                            <Label className="text-[8px] font-black text-emerald-600 uppercase ml-1">Total</Label>
                            <div className="h-11 flex items-center justify-center font-black text-emerald-700 bg-emerald-50 rounded-xl border border-emerald-100 text-[11px]">
                              {calculatedPrice.toLocaleString()}
                            </div>
                         </div>
                      </div>
                      <Button onClick={handleFinalize} className="w-full h-12 font-black text-[10px] rounded-xl shadow-lg mt-2 uppercase tracking-widest bg-primary">
                        Confirmer {quantity} unité(s)
                      </Button>
                   </div>
                </div>
              )}
            </div>
          )}

          {nextStatus && !pricingMode && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => onUpdateStatus(p.id, nextStatus)} 
              className="h-10 font-black border-2 rounded-xl text-[9px] uppercase px-5 hover:bg-primary hover:text-white transition-all shadow-sm"
            >
               {nextStatus}
            </Button>
          )}

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon" className="h-10 w-10 text-slate-200 hover:text-red-600 rounded-xl opacity-0 group-hover:opacity-100 transition-all">
                <Trash2 size={18} />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="rounded-[2.5rem] border-none shadow-2xl">
              <AlertDialogHeader><AlertDialogTitle className="font-black uppercase italic text-xl">Supprimer ce colis ?</AlertDialogTitle><AlertDialogDescription className="font-medium">L'annulation d'un envoi est définitive.</AlertDialogDescription></AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="rounded-xl font-bold">ANNULER</AlertDialogCancel>
                <AlertDialogAction onClick={() => { supabase.from('parcels').delete().eq('id', p.id).then(()=>onRefresh()) }} className="bg-red-600 rounded-xl font-bold text-white uppercase">Supprimer</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </div>
  );
}