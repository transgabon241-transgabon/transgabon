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
  X
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
        departureCity: p.from.name,
        arrivalCity: p.to.name,
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
      p.receiverName.toLowerCase().includes(s)
    );
  }, [parcels, search]);

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginatedParcels = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  if (loading) return <div className="p-8 space-y-4"><Skeleton className="h-12 w-48"/><Skeleton className="h-64 w-full rounded-[2rem]"/></div>;

  return (
    <div className="max-w-6xl mx-auto p-4 text-left space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white p-5 rounded-3xl border shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-primary rounded-xl text-white shadow-lg shadow-primary/20">
            <Package size={24} />
          </div>
          <h1 className="text-xl font-black italic uppercase tracking-tight">Fret & Logistique</h1>
        </div>
        <Button variant="outline" size="sm" onClick={loadData} className="rounded-xl font-bold border-2 h-10 px-4">
          <RefreshCw className="h-4 w-4 mr-2" /> Actualiser
        </Button>
      </div>

      {/* Filtres */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-white p-4 rounded-3xl border-2 border-slate-50 shadow-sm">
        <div className="md:col-span-3 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input placeholder="Rechercher un numéro de suivi ou un nom..." value={search} onChange={e => setSearch(e.target.value)} className="pl-11 h-11 rounded-2xl border-2 font-medium" />
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

      {/* Liste */}
      <div className="grid gap-3 relative">
        {paginatedParcels.map(p => (
          <ParcelCard 
            key={p.id} 
            parcel={p} 
            tariffs={tariffs} 
            onRefresh={loadData} 
            onUpdateStatus={handleUpdateStatus} 
          />
        ))}
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
      return qty * w * selectedTariff.price; // Quantité x Poids x Prix/kg
    } else {
      return qty * selectedTariff.price; // Quantité x Prix unitaire
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
      toast.success("Tarif et quantité validés");
      onRefresh();
    } catch (e) { toast.error("Erreur de sauvegarde"); }
  };

  const nextStatus = (current: string) => {
    if (current === 'Pris en charge') return 'En transit';
    if (current === 'En transit') return 'Arrivé';
    if (current === 'Arrivé') return 'Livré';
    return null;
  }(p.status);

  const TransportIcon = p.transportType === 'BOAT' ? Ship : p.transportType === 'TRAIN' ? Train : Bus;

  return (
    <div className="bg-white border-2 border-slate-100 rounded-[1.5rem] p-4 hover:border-primary/20 transition-all group relative">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        
        {/* Infos de base */}
        <div className="flex items-center gap-4 flex-1">
          <div className={`h-11 w-11 rounded-xl flex items-center justify-center text-white shadow-md ${p.transportType === 'BOAT' ? 'bg-blue-600' : 'bg-primary'}`}>
             <TransportIcon size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono font-black text-primary text-[11px] uppercase tracking-tighter">{p.trackingNumber}</span>
              <Badge className={`${STATUS_COLORS[p.status]} border-none font-black uppercase text-[7px] h-4`}>{p.status}</Badge>
            </div>
            <p className="text-sm font-black text-slate-800 uppercase italic leading-tight mt-1">{p.description}</p>
          </div>
        </div>

        {/* Itinéraire */}
        <div className="flex items-center gap-3 text-xs font-bold text-slate-400 px-4 md:border-x border-dashed">
           <span>{p.departureCity}</span>
           <ArrowRight size={14} className="text-primary/30" />
           <span>{p.arrivalCity}</span>
        </div>

        {/* Détails Quantité/Poids/Prix */}
        <div className="flex items-center gap-6 px-4">
           <div className="text-right">
              <p className="text-[8px] font-black text-slate-300 uppercase">Quantité</p>
              <p className="text-sm font-black text-slate-700">{p.quantity} {p.quantity > 1 ? 'PCS' : 'PC'}</p>
           </div>
           <div className="text-right">
              <p className="text-[8px] font-black text-slate-300 uppercase">Poids Total</p>
              <p className="text-sm font-black text-slate-700">{p.weightKg} KG</p>
           </div>
           <div className="text-right">
              <p className="text-[8px] font-black text-emerald-300 uppercase">Montant</p>
              <p className="text-base font-black text-emerald-600 tracking-tighter">{p.price.toLocaleString()} F</p>
           </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {p.status === 'En attente' && (
            <div className="relative">
              <Button onClick={() => setPricingMode(true)} size="sm" className="h-9 gap-2 font-black bg-emerald-600 rounded-xl px-4 text-[10px] uppercase">
                <Scale size={14} /> Tarifer
              </Button>

              {pricingMode && (
                <div className="absolute right-0 bottom-full mb-4 bg-white p-5 rounded-[2rem] border-2 border-primary/20 shadow-[0_20px_50px_rgba(0,0,0,0.2)] w-80 z-[100] animate-in fade-in slide-in-from-bottom-4">
                   <div className="flex justify-between items-center mb-4">
                      <h4 className="text-[10px] font-black uppercase text-slate-800 flex items-center gap-2"><Calculator size={14}/> Guichet Pesée</h4>
                      <Button variant="ghost" size="icon" onClick={() => setPricingMode(false)} className="h-6 w-6 rounded-full"><X size={14}/></Button>
                   </div>
                   
                   <div className="space-y-4">
                      <div className="space-y-1.5 text-left">
                        <Label className="text-[9px] font-black text-slate-400 uppercase ml-1">Grille tarifaire appliquée</Label>
                        <Select onValueChange={(v) => setSelectedTariff(tariffs.find(t => t.id === v) || null)}>
                            <SelectTrigger className="h-10 rounded-xl font-bold text-xs bg-slate-50 border-none"><SelectValue placeholder="Choisir un tarif..." /></SelectTrigger>
                            <SelectContent className="rounded-xl font-bold border-none shadow-xl">
                              {tariffs.map(t => <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>)}
                            </SelectContent>
                        </Select>
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-left">
                         <div className="space-y-1.5">
                            <Label className="text-[8px] font-black text-slate-400 uppercase ml-1">Qté</Label>
                            <Input type="number" value={quantity} onChange={e => setQuantity(e.target.value)} className="h-10 rounded-xl font-black text-center bg-slate-50 border-none" />
                         </div>
                         <div className="space-y-1.5">
                            <Label className="text-[8px] font-black text-slate-400 uppercase ml-1">Poids/KG</Label>
                            <Input 
                              type="number" 
                              disabled={selectedTariff && !selectedTariff.is_weight_based}
                              value={weight} 
                              onChange={e => setWeight(e.target.value)} 
                              className={`h-10 rounded-xl font-black text-center bg-slate-50 border-none ${selectedTariff && !selectedTariff.is_weight_based ? 'opacity-30' : ''}`} 
                            />
                         </div>
                         <div className="space-y-1.5">
                            <Label className="text-[8px] font-black text-emerald-600 uppercase ml-1">Total</Label>
                            <div className="h-10 flex items-center justify-center font-black text-emerald-700 bg-emerald-50 rounded-xl border border-emerald-100 text-[10px]">
                              {calculatedPrice.toLocaleString()}
                            </div>
                         </div>
                      </div>
                      <Button onClick={handleFinalize} className="w-full h-11 font-black text-xs rounded-xl shadow-lg mt-2 uppercase tracking-widest bg-primary">
                        Valider {quantity} unité(s)
                      </Button>
                   </div>
                </div>
              )}
            </div>
          )}

          {nextStatus && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => onUpdateStatus(p.id, nextStatus)} 
              className="h-9 font-black border-2 rounded-xl text-[9px] uppercase px-4 hover:bg-primary hover:text-white transition-all"
            >
               Passer à : {nextStatus}
            </Button>
          )}

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9 text-slate-200 hover:text-red-600 rounded-xl opacity-0 group-hover:opacity-100 transition-all">
                <Trash2 size={16} />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="rounded-[2.5rem]">
              <AlertDialogHeader><AlertDialogTitle className="font-black uppercase italic">Supprimer ce colis ?</AlertDialogTitle></AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="rounded-xl font-bold">ANNULER</AlertDialogCancel>
                <AlertDialogAction onClick={() => { supabase.from('parcels').delete().eq('id', p.id).then(()=>onRefresh()) }} className="bg-red-600 rounded-xl font-bold">OUI, SUPPRIMER</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </div>
  );
}

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-0.5 text-left">
      <div className="text-[9px] uppercase font-black text-slate-400 tracking-tighter leading-none">{label}</div>
      <div className="font-bold text-slate-900 text-xs truncate leading-tight">{value || '—'}</div>
    </div>
  );
}