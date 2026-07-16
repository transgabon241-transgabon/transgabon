"use client"

import { useEffect, useState, useMemo } from 'react';
import { useAuth } from "@/lib/auth-context";
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Pencil, Trash2, Bus, Train, Ship, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';

/**
 * TYPES DE DONNÉES
 */
type Vehicle = {
  id: string;
  vehicleNumber: string;
  vehicleType: string; // Label UI: Train, Bus, Bateau...
  totalSeats: number;
  rows: number;
  seatsPerRow: number;
};

export default function AgencyVehicles() {
  const { user } = useAuth();
  
  // États de données
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  // États du formulaire
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [vehicleType, setVehicleType] = useState('Bus');
  const [totalSeats, setTotalSeats] = useState('30');
  const [rows, setRows] = useState('8');
  const [seatsPerRow, setSeatsPerRow] = useState('4');

  /**
   * CHARGEMENT DE LA FLOTTE
   */
  const loadData = async () => {
    if (!user?.companyId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('vehicles')
        .select('*')
        .eq('company_id', user.companyId)
        .order('name', { ascending: true });

      if (error) throw error;

      // Mappage PostgreSQL (BOAT, TRAIN, BUS...) vers Labels UI
      const formatted: Vehicle[] = (data || []).map(v => {
        let typeLabel = 'Bus';
        if (v.type === 'TRAIN') typeLabel = 'Train';
        else if (v.type === 'BOAT') typeLabel = 'Bateau'; // SUPPORT MARITIME
        else if (v.type === 'COASTER') typeLabel = 'Coaster';
        else if (v.type === 'MINIBUS') typeLabel = 'MiniBus';

        return {
          id: v.id,
          vehicleNumber: v.name,
          vehicleType: typeLabel,
          totalSeats: v.capacity,
          rows: v.rows ?? 12,
          seatsPerRow: v.seats_per_row ?? 4
        };
      });

      setVehicles(formatted);
    } catch (e: any) { 
      toast.error('Erreur lors du chargement de la flotte'); 
    } finally { 
      setLoading(false); 
    }
  };

  useEffect(() => { loadData(); }, [user]);

  /**
   * LOGIQUE DE PAGINATION
   */
  const totalPages = Math.ceil(vehicles.length / itemsPerPage);
  const currentVehicles = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return vehicles.slice(start, start + itemsPerPage);
  }, [vehicles, currentPage]);

  const resetForm = () => {
    setVehicleNumber(''); setVehicleType('Bus'); setTotalSeats('30'); setRows('8'); setSeatsPerRow('4'); setEditId(null);
  };

  const openEdit = (v: Vehicle) => {
    setEditId(v.id);
    setVehicleNumber(v.vehicleNumber);
    setVehicleType(v.vehicleType);
    setTotalSeats(String(v.totalSeats));
    setRows(String(v.rows));
    setSeatsPerRow(String(v.seatsPerRow));
    setShowForm(true);
  };

  /**
   * SAUVEGARDE (CREATE / UPDATE)
   */
  const handleSave = async () => {
    if (!user?.companyId || !vehicleNumber) return;
    setSaving(true);
    try {
      // Traduction inverse : UI vers Enums DB
      let dbType = 'BUS';
      if (vehicleType === 'Train') dbType = 'TRAIN';
      if (vehicleType === 'Bateau') dbType = 'BOAT';
      if (vehicleType === 'Coaster') dbType = 'COASTER';
      if (vehicleType === 'MiniBus') dbType = 'MINIBUS';

      const payload = {
        name: vehicleNumber.trim(),
        type: dbType,
        capacity: Number(totalSeats),
        rows: Number(rows),
        seats_per_row: Number(seatsPerRow),
        company_id: user.companyId
      };

      if (editId) {
        await supabase.from('vehicles').update(payload).eq('id', editId);
        toast.success('Matériel mis à jour');
      } else {
        await supabase.from('vehicles').insert([payload]);
        toast.success('Nouveau matériel ajouté à la flotte');
      }
      setShowForm(false); resetForm(); loadData();
    } catch (e: any) { 
      toast.error('Erreur lors de l’enregistrement'); 
    } finally { 
      setSaving(false); 
    }
  };

  const handleDelete = async (id: string) => {
    // Sécurité : On vérifie si le véhicule est utilisé avant de supprimer
    const { count } = await supabase.from('trips').select('*', { count: 'exact', head: true }).eq('vehicle_id', id);
    if (count && count > 0) {
      toast.error("Suppression impossible : Ce véhicule est affecté à des voyages planifiés.");
      return;
    }

    const { error } = await supabase.from('vehicles').delete().eq('id', id);
    if (!error) {
      setVehicles(prev => prev.filter(v => v.id !== id));
      toast.success('Véhicule retiré du parc');
    }
  };

  if (loading) return <div className="max-w-6xl mx-auto p-8 space-y-4"><Skeleton className="h-12 w-48" /><Skeleton className="h-64 w-full rounded-[2rem]" /></div>;

  return (
    <div className="max-w-6xl mx-auto p-4 text-left">
      
      {/* HEADER PROFESSIONNEL */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black italic text-primary tracking-tighter uppercase">Gestion de la Flotte</h1>
          <p className="text-muted-foreground font-bold text-[10px] uppercase tracking-widest mt-1">Inventaire du matériel de transport</p>
        </div>
        <Button onClick={() => { resetForm(); setShowForm(true); }} className="rounded-2xl font-black gap-2 h-12 px-6 shadow-lg shadow-primary/20 transition-all active:scale-95">
          <Plus size={20} /> ENREGISTRER UN MATÉRIEL
        </Button>
      </div>

      {vehicles.length === 0 ? (
        <div className="p-20 text-center border-2 border-dashed rounded-[3rem] bg-slate-50/50">
          <Bus className="h-12 w-12 mx-auto mb-4 text-slate-200" />
          <p className="text-slate-400 font-bold uppercase text-xs tracking-widest mb-4">Aucun véhicule enregistré</p>
          <Button variant="outline" onClick={() => setShowForm(true)} className="rounded-xl border-2">Ajouter mon premier véhicule</Button>
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {currentVehicles.map(v => (
              <div key={v.id} className="bg-white border-2 border-slate-100 rounded-[2rem] p-6 hover:shadow-xl transition-all group relative overflow-hidden">
                <div className="flex items-center gap-4 mb-6">
                  <div className={`h-14 w-14 rounded-2xl flex items-center justify-center text-white shadow-lg ${
                    v.vehicleType === 'Train' ? 'bg-slate-900' : 
                    v.vehicleType === 'Bateau' ? 'bg-blue-600' : 
                    'bg-primary'
                  }`}>
                    {v.vehicleType === 'Train' ? <Train size={24} /> : v.vehicleType === 'Bateau' ? <Ship size={24} /> : <Bus size={24} />}
                  </div>
                  <div>
                    <div className="font-black text-xl text-slate-800 tracking-tight">{v.vehicleNumber}</div>
                    <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{v.vehicleType} • {v.totalSeats} Places</div>
                  </div>
                </div>
                
                <div className="flex gap-2 relative z-10">
                  <Button variant="outline" size="sm" className="flex-1 font-black rounded-xl border-2 hover:bg-slate-50 gap-2 h-10" onClick={() => openEdit(v)}>
                    <Pencil size={14} /> MODIFIER
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm" className="rounded-xl border-2 text-red-500 hover:bg-red-50 h-10"><Trash2 size={16} /></Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="rounded-[2.5rem] border-none shadow-2xl">
                      <AlertDialogHeader>
                        <AlertDialogTitle className="font-black italic text-2xl uppercase">Retirer de la flotte ?</AlertDialogTitle>
                        <AlertDialogDescription className="font-medium text-slate-600">
                          Voulez-vous vraiment supprimer le véhicule <strong>{v.vehicleNumber}</strong> de votre inventaire ?
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel className="rounded-xl font-bold">ANNULER</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(v.id)} className="bg-red-600 rounded-xl font-bold">OUI, SUPPRIMER</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            ))}
          </div>

          {/* PAGINATION UNIFIÉE */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-4 mt-12 bg-slate-100 p-2 rounded-2xl w-fit mx-auto border-2 border-white shadow-sm">
              <Button variant="ghost" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="rounded-xl h-10 w-10"><ChevronLeft /></Button>
              <div className="flex items-center gap-1 font-black text-xs uppercase tracking-widest text-slate-400 px-2">
                <span className="text-primary">{currentPage}</span>
                <span>/</span>
                <span>{totalPages}</span>
              </div>
              <Button variant="ghost" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)} className="rounded-xl h-10 w-10"><ChevronRight /></Button>
            </div>
          )}
        </>
      )}

      {/* DIALOG FORMULAIRE STYLE SaaS */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="rounded-[2.5rem] p-8 max-w-lg border-none shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black italic uppercase tracking-tighter text-left">
                {editId ? 'Modifier l’appareil' : 'Nouveau Matériel'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6 mt-4">
            <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Numéro d’immatriculation / Nom du navire</Label>
                <Input value={vehicleNumber} onChange={e => setVehicleNumber(e.target.value)} className="h-12 rounded-xl bg-slate-50 border-none font-black text-lg px-5 shadow-inner" placeholder="Ex: 210-G1 / NAV-1" />
            </div>

            <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Type de transport</Label>
                <Select value={vehicleType} onValueChange={setVehicleType}>
                    <SelectTrigger className="h-12 rounded-xl bg-slate-50 border-none font-bold px-5"><SelectValue /></SelectTrigger>
                    <SelectContent className="rounded-xl border-none shadow-2xl">
                        {['Train', 'Bus', 'Bateau', 'Coaster', 'MiniBus'].map(t => <SelectItem key={t} value={t} className="font-bold">{t}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>

            <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1.5">
                    <Label className="text-[10px] font-black uppercase text-slate-400">Total Places</Label>
                    <Input type="number" value={totalSeats} onChange={e => setTotalSeats(e.target.value)} className="h-12 rounded-xl bg-slate-50 border-none font-bold" />
                </div>
                <div className="space-y-1.5">
                    <Label className="text-[10px] font-black uppercase text-slate-400">Nb de Rangs</Label>
                    <Input type="number" value={rows} onChange={e => setRows(e.target.value)} className="h-12 rounded-xl bg-slate-50 border-none font-bold" />
                </div>
                <div className="space-y-1.5">
                    <Label className="text-[10px] font-black uppercase text-slate-400">Sièges/Rang</Label>
                    <Input type="number" value={seatsPerRow} onChange={e => setSeatsPerRow(e.target.value)} className="h-12 rounded-xl bg-slate-50 border-none font-bold" />
                </div>
            </div>

            <Button onClick={handleSave} disabled={saving || !vehicleNumber} className="w-full h-14 rounded-2xl font-black text-lg shadow-xl shadow-primary/20 uppercase tracking-widest mt-4 transition-all active:scale-95">
                {saving ? <RefreshCw className="animate-spin mr-2 h-6 w-6" /> : <Save className="mr-2 h-6 w-6" />}
                {editId ? 'METTRE À JOUR LA FLOTTE' : 'AJOUTER AU PARC'}
            </Button>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowForm(false)} className="w-full text-xs font-bold text-muted-foreground uppercase">Fermer la fenêtre</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}