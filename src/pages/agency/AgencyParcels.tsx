"use client"

import { useEffect, useState, useMemo } from 'react';
import { useAuth } from "@/lib/auth-context";
import { supabase } from '@/lib/supabase'; // <-- Utilise votre SDK Supabase de production
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Package, Search, RefreshCw, Trash2, Scale } from 'lucide-react'; // <-- Ajout de Scale
import { toast } from 'sonner';
import { WeighParcelForm } from "@/components/weigh-parcel-form"; // <-- Importation de votre composant de pesée

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

const STATUSES = ['all', 'En attente', 'Pris en charge', 'En transit', 'Arrivé', 'Livré', 'Retourné'];
const STATUS_COLORS: Record<string, string> = {
  'En attente': 'bg-yellow-100 text-yellow-800',
  'Pris en charge': 'bg-blue-100 text-blue-800',
  'En transit': 'bg-orange-100 text-orange-800',
  'Arrivé': 'bg-emerald-100 text-emerald-800',
  'Livré': 'bg-green-100 text-green-800',
  'Retourné': 'bg-red-100 text-red-800',
};

export default function AgencyParcels() {
  const { user } = useAuth();
  const [parcels, setParcels] = useState<Parcel[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');

  const load = async (filter?: string) => {
    if (!user?.companyId) return;
    setLoading(true);
    try {
      const activeFilter = filter || statusFilter;

      let query = supabase
        .from('parcels')
        .select('*, company:companies(name), from:cities!from_id(name), to:cities!to_id(name)')
        .eq('company_id', user.companyId);

      if (activeFilter !== 'all') {
        // Mappage des états UI vers Enums PostgreSQL
        const dbStatusMap: Record<string, string> = {
          'En attente': 'COLIS_ENREGISTRE',
          'Pris en charge': 'EN_ATTENTE_DEPART',
          'En transit': 'EN_COURS_DE_TRANSPORT',
          'Arrivé': 'ARRIVE_A_DESTINATION',
          'Livré': 'LIVRE',
          'Retourné': 'RETOURNE',
        };
        query = query.eq('status', dbStatusMap[activeFilter]);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw new Error(error.message);

      // Mappage des données vers l'UI
      const formatted: Parcel[] = (data || []).map(p => {
        const statusLabelMap: Record<string, string> = {
          COLIS_ENREGISTRE: 'En attente',
          EN_ATTENTE_DEPART: 'Pris en charge',
          EN_COURS_DE_TRANSPORT: 'En transit',
          ARRIVE_A_DESTINATION: 'Arrivé',
          DISPONIBLE_POUR_RETRAIT: 'Arrivé',
          LIVRE: 'Livré',
          RETOURNE: 'Retourné',
        };

        return {
          id: p.id,
          trackingNumber: p.tracking_number,
          status: statusLabelMap[p.status] || p.status,
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
        };
      });

      setParcels(formatted);
    } catch (e: any) { 
      toast.error(e.message || 'Erreur de chargement'); 
    } finally { 
      setLoading(false); 
    }
  };

  useEffect(() => { load(); }, [user]);

  const handleFilterChange = (v: string) => {
    setStatusFilter(v);
    load(v);
  };

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    try {
      // Mappage inverse
      const dbStatusMap: Record<string, string> = {
        'En attente': 'COLIS_ENREGISTRE',
        'Pris en charge': 'EN_ATTENTE_DEPART',
        'En transit': 'EN_COURS_DE_TRANSPORT',
        'Arrivé': 'ARRIVE_A_DESTINATION',
        'Livré': 'LIVRE',
        'Retourné': 'RETOURNE',
      };

      const statusInDb = dbStatusMap[newStatus] || newStatus;

      // Appel de l'action transactionnelle de mise à jour (RPC) de Supabase
      const { data: res, error } = await supabase.rpc('update_parcel_status_from_agency', {
        p_parcel_id: id,
        p_status: statusInDb,
        p_comment: `Statut mis à jour par l'agence vers : ${newStatus}`
      });

      if (error || !res?.success) {
        throw new Error(error?.message || res?.error);
      }

      setParcels(prev => prev.map(p => p.id === id ? { ...p, status: newStatus } : p));
      toast.success('Statut mis à jour avec succès !');
      load();
    } catch (e: any) { 
      toast.error(e.message || 'Erreur lors de la mise à jour'); 
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from('parcels').delete().eq('id', id);
      if (error) throw new Error(error.message);
      setParcels(prev => prev.filter(p => p.id !== id));
      toast.success('Colis supprimé de l’historique.');
    } catch (e: any) { 
      toast.error(e.message || 'Erreur lors de la suppression'); 
    }
  };

  const filtered = useMemo(() => {
    if (!search) return parcels;
    const s = search.toLowerCase();
    return parcels.filter(p =>
      p.trackingNumber.toLowerCase().includes(s) ||
      p.senderName.toLowerCase().includes(s) ||
      p.receiverName.toLowerCase().includes(s)
    );
  }, [parcels, search]);

  return (
    <div className="text-foreground text-left">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Package className="h-6 w-6 text-primary" /> Gestion des colis</h1>
          <p className="text-muted-foreground text-sm">{parcels.length} colis au total</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => load()} className="gap-2">
          <RefreshCw className="h-4 w-4" /> Actualiser
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Rechercher par n° suivi, expéditeur, destinataire..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={handleFilterChange}>
          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            {STATUSES.map(s => <SelectItem key={s} value={s}>{s === 'all' ? 'Tous les statuts' : s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="space-y-3">{[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Package className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>Aucun colis trouvé</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(p => (
            <ParcelCard key={p.id} parcel={p} onUpdateStatus={handleUpdateStatus} onDelete={handleDelete} />
          ))}
        </div>
      )}
    </div>
  );
}

function ParcelCard({ parcel: p, onUpdateStatus, onDelete }: { parcel: Parcel; onUpdateStatus: (id: string, s: string) => void; onDelete: (id: string) => void }) {
  const nextStatuses: Record<string, string[]> = {
    'En attente': ['Pris en charge', 'Retourné'],
    'Pris en charge': ['En transit', 'Retourné'],
    'En transit': ['Arrivé', 'Retourné'],
    'Arrivé': ['Livré', 'Retourné'],
  };
  const available = nextStatuses[p.status] || [];

  return (
    <div className="border rounded-xl bg-card p-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="font-mono text-sm font-semibold text-primary tracking-wide">{p.trackingNumber}</span>
            <span className={`px-2 py-0.5 rounded text-xs font-semibold ${STATUS_COLORS[p.status] || 'bg-muted'}`}>{p.status}</span>
            <Badge variant="outline" className="text-xs">{p.parcelType}</Badge>
          </div>
          <div className="text-sm text-muted-foreground text-left">
            {p.departureCity} → {p.arrivalCity} • {p.departureDate ? new Date(p.departureDate + 'T00:00:00').toLocaleDateString('fr-FR') : '-'}
          </div>
          <div className="text-sm mt-1 text-left">
            <span className="text-muted-foreground">Exp:</span> {p.senderName} ({p.senderPhone}) → <span className="text-muted-foreground">Dest:</span> {p.receiverName} ({p.receiverPhone})
          </div>
          <div className="text-sm font-semibold mt-1 text-foreground text-left">{p.price.toLocaleString()} FCFA • {p.weightKg} kg • {p.paymentStatus}</div>
        </div>
        <div className="flex items-center gap-2 shrink-0 flex-wrap justify-between md:justify-end">
          {/* Si le colis est en attente de dépôt, on affiche le mini-guichet de pesée pour valider le poids réel */}
          {p.status === "En attente" ? (
            <div className="border border-primary/20 rounded-xl p-3 bg-primary/5 max-w-xs space-y-2 text-left">
              <p className="text-xs font-bold text-primary flex items-center gap-1">
                <Scale className="h-3.5 w-3.5" /> Guichet de Pesée
              </p>
              <WeighParcelForm 
                parcelId={p.id} 
                currentWeight={p.weightKg} 
                currentQuantity={1} 
              />
            </div>
          ) : (
            /* Sinon, on affiche les boutons de transit habituels (En transit, Arrivé, Livré) */
            available.map(s => (
              <Button key={s} variant="outline" size="sm" onClick={() => onUpdateStatus(p.id, s)} className="text-xs font-bold border-primary/20 text-primary hover:bg-primary/5">
                Passer à : {s}
              </Button>
            ))
          )}

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm" className="text-destructive border-destructive/30">
                <Trash2 className="h-3 w-3" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader className="text-left">
                <AlertDialogTitle>Supprimer ce colis ?</AlertDialogTitle>
                <AlertDialogDescription>Colis {p.trackingNumber}. Cette action est irréversible.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Annuler</AlertDialogCancel>
                <AlertDialogAction onClick={() => onDelete(p.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Supprimer</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </div>
  );
}