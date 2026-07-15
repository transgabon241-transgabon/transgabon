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
import { Package, Search, RefreshCw, Trash2, Scale, Check, Calculator } from 'lucide-react';
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

  
  const loadData = async () => {
    if (!user?.companyId) return;
    setLoading(true);
    try {
      
      const { data: tariffData } = await supabase
        .from('company_parcel_tariffs')
        .select('*')
        .eq('company_id', user.companyId);
      
      if (tariffData) setTariffs(tariffData);

      // 2. Charger les colis
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

      const { error } = await supabase
        .from('parcels')
        .update({ status: dbStatusMap[newStatus] })
        .eq('id', id);

      if (error) throw error;
      toast.success('Statut mis à jour');
      loadData();
    } catch (e: any) {
      toast.error('Échec de la mise à jour');
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

  return (
    <div className="max-w-6xl mx-auto p-4 text-left">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black italic text-primary flex items-center gap-3">
            <Package className="h-8 w-8" /> Fret & Logistique
          </h1>
          <p className="text-muted-foreground font-bold text-xs uppercase tracking-widest">Gestion des envois de marchandises</p>
        </div>
        <Button variant="outline" onClick={loadData} className="rounded-xl font-bold border-2 gap-2">
          <RefreshCw className="h-4 w-4" /> Actualiser
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="md:col-span-3 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Rechercher un colis ou un nom..." 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
            className="pl-10 h-12 rounded-2xl border-2 focus:ring-primary shadow-sm font-medium" 
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-12 rounded-2xl border-2 font-bold bg-white">
            <SelectValue placeholder="Filtrer" />
          </SelectTrigger>
          <SelectContent>
            {STATUSES.map(s => <SelectItem key={s} value={s} className="font-bold">{s === 'all' ? 'Tous les colis' : s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-32 w-full rounded-3xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-card border-2 border-dashed rounded-3xl py-20 text-center text-muted-foreground">
          <Package className="h-12 w-12 mx-auto mb-4 opacity-20" />
          <p className="font-bold">Aucun colis à afficher</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filtered.map(p => (
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
    </div>
  );
}

function ParcelCard({ parcel: p, tariffs, onUpdateStatus, onDelete, onRefresh }: any) {
  const [pricingMode, setPricingMode] = useState(false);
  const [selectedTariff, setSelectedTariff] = useState<Tariff | null>(null);
  const [weight, setWeight] = useState(p.weightKg.toString());

  // Calcul dynamique du prix affiché
  const calculatedPrice = useMemo(() => {
    if (!selectedTariff) return 0;
    if (selectedTariff.is_weight_based) {
      return (parseFloat(weight) || 0) * selectedTariff.price;
    }
    return selectedTariff.price;
  }, [selectedTariff, weight]);

  const handleFinalizePricing = async () => {
    if (!selectedTariff) return;
    try {
      const { error } = await supabase
        .from('parcels')
        .update({
          price: calculatedPrice,
          weight: parseFloat(weight) || 0,
          status: 'EN_ATTENTE_DEPART' // On le passe directement en pris en charge
        })
        .eq('id', p.id);

      if (error) throw error;
      toast.success("Prix et poids validés !");
      onRefresh();
    } catch (e) {
      toast.error("Erreur lors de la validation");
    }
  };

  const nextStatuses: Record<string, string[]> = {
    'Pris en charge': ['En transit', 'Retourné'],
    'En transit': ['Arrivé', 'Retourné'],
    'Arrivé': ['Livré', 'Retourné'],
  };
  const available = nextStatuses[p.status] || [];

  return (
    <div className="bg-card border-2 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all">
      <div className="flex flex-col lg:flex-row gap-6">
        
        {/* Infos Colis */}
        <div className="flex-1 space-y-3">
          <div className="flex items-center gap-3">
            <span className="font-mono font-black text-primary bg-primary/5 px-3 py-1 rounded-lg">{p.trackingNumber}</span>
            <Badge className={`${STATUS_COLORS[p.status]} border font-black uppercase text-[10px] px-2.5`}>
              {p.status}
            </Badge>
          </div>
          
          <div className="text-sm font-bold text-slate-800">
            {p.departureCity} <span className="text-primary mx-1">→</span> {p.arrivalCity}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-xs font-medium text-muted-foreground uppercase">
            <p><span className="text-slate-400">Exp:</span> {p.senderName} ({p.senderPhone})</p>
            <p><span className="text-slate-400">Dest:</span> {p.receiverName} ({p.receiverPhone})</p>
          </div>

          <div className="pt-2 flex items-center gap-4 text-xs font-black uppercase tracking-tighter">
             <div className="bg-slate-100 px-3 py-1.5 rounded-full flex items-center gap-1.5 text-slate-600">
                <Scale className="h-3.5 w-3.5" /> {p.weightKg} KG
             </div>
             <div className="bg-emerald-100 px-3 py-1.5 rounded-full flex items-center gap-1.5 text-emerald-700">
                <Calculator className="h-3.5 w-3.5" /> {p.price.toLocaleString()} FCFA
             </div>
             <div className="text-primary italic">{p.paymentStatus}</div>
          </div>
        </div>

        {/* Actions de Guichet */}
        <div className="flex items-center gap-3 lg:border-l lg:pl-6 shrink-0">
          
          {/* SI LE COLIS EST NOUVEAU (EN ATTENTE) : GUICHET DE TARIFICATION */}
          {p.status === 'En attente' && (
            <div className="w-full sm:w-auto">
              {!pricingMode ? (
                <Button onClick={() => setPricingMode(true)} className="w-full gap-2 font-black bg-emerald-600 hover:bg-emerald-700">
                  <Scale className="h-4 w-4" /> Tarifer & Peser
                </Button>
              ) : (
                <div className="bg-slate-50 p-4 rounded-2xl border-2 border-primary/20 space-y-3 w-64 animate-in zoom-in-95 duration-200">
                   <Label className="text-[10px] font-black uppercase">Sélectionner un tarif</Label>
                   <Select onValueChange={(v) => setSelectedTariff(tariffs.find(t => t.id === v) || null)}>
                      <SelectTrigger className="bg-white h-9 font-bold text-xs"><SelectValue placeholder="Choisir..." /></SelectTrigger>
                      <SelectContent>
                        {tariffs.map(t => <SelectItem key={t.id} value={t.id} className="text-xs font-bold">{t.label} ({t.price}F)</SelectItem>)}
                      </SelectContent>
                   </Select>
                   
                   <div className="flex gap-2">
                     <div className="flex-1">
                        <Label className="text-[10px] font-black uppercase">Poids (kg)</Label>
                        <Input type="number" value={weight} onChange={e => setWeight(e.target.value)} className="h-9 bg-white font-bold" />
                     </div>
                     <div className="flex-1">
                        <Label className="text-[10px] font-black uppercase">Total</Label>
                        <div className="h-9 flex items-center justify-center font-black text-primary text-xs bg-white border rounded-md">
                          {calculatedPrice} F
                        </div>
                     </div>
                   </div>

                   <div className="flex gap-2 pt-1">
                     <Button variant="ghost" size="sm" onClick={() => setPricingMode(false)} className="flex-1 text-[10px] font-bold">Annuler</Button>
                     <Button size="sm" onClick={handleFinalizePricing} className="flex-1 text-[10px] font-bold bg-primary shadow-lg"><Check className="h-3 w-3 mr-1"/> Valider</Button>
                   </div>
                </div>
              )}
            </div>
          )}

          {/* BOUTONS DE TRANSIT CLASSIQUES */}
          {available.map(s => (
            <Button key={s} variant="outline" size="sm" onClick={() => onUpdateStatus(p.id, s)} className="font-bold border-2 rounded-xl text-xs hover:bg-primary/5 transition-all">
              Marquer : {s}
            </Button>
          ))}

          {/* SUPPRESSION */}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon" className="text-red-300 hover:text-red-600 hover:bg-red-50 rounded-xl">
                <Trash2 className="h-5 w-5" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="rounded-3xl">
              <AlertDialogHeader><AlertDialogTitle>Supprimer le colis ?</AlertDialogTitle></AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="rounded-xl">Annuler</AlertDialogCancel>
                <AlertDialogAction onClick={() => onDelete(p.id)} className="bg-red-600 rounded-xl">Supprimer</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

        </div>
      </div>
    </div>
  );
}