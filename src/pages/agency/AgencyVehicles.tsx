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
import { Plus, Pencil, Trash2, Bus, Train, Ship, RefreshCw, ChevronLeft, ChevronRight, Save, Hash } from 'lucide-react'; 
import { toast } from 'sonner';

/**
 * TYPES DE DONNÉES
 */
type Vehicle = {
  id: string;
  vehicleNumber: string; // Nom interne (ex: "Bus 01")
  registration: string;  // Plaque d'immatriculation (ex: "RG-123-AA")
  vehicleType: string; 
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
  const [registration, setRegistration] = useState('');
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

      const formatted: Vehicle[] = (data || []).map(v => ({
        id: v.id,
        vehicleNumber: v.name,
        registration: v.registration || 'NON IMMATRICULÉ',
        vehicleType: v.type === 'TRAIN' ? 'Train' : v.type === 'BOAT' ? 'Bateau' : v.type === 'COASTER' ? 'Coaster' : v.type === 'MINIBUS' ? 'MiniBus' : 'Bus',
        totalSeats: v.capacity,
        rows: v.rows ?? 10,
        seatsPerRow: v.seats_per_row ?? 4
      }));

      setVehicles(formatted);
    } catch (e: any) { 
      toast.error('Erreur de chargement de la flotte'); 
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
    setVehicleNumber(''); setRegistration(''); setVehicleType('Bus'); setTotalSeats('30'); setRows('8'); setSeatsPerRow('4'); setEditId(null);
  };

  const openEdit = (v: Vehicle) => {
    setEditId(v.id);
    setVehicleNumber(v.vehicleNumber);
    setRegistration(v.registration === 'NON IMMATRICULÉ' ? '' : v.registration);
    setVehicleType(v.vehicleType);
    setTotalSeats(String(v.totalSeats));
    setRows(String(v.rows));
    setSeatsPerRow(String(v.seatsPerRow));
    setShowForm(true);
  };

  /**
   * SAUVEGARDE
   */
  const handleSave = async () => {
    if (!user?.companyId || !vehicleNumber) return;
    setSaving(true);
    try {
      let dbType = 'BUS';
      if (vehicleType === 'Train') dbType = 'TRAIN';
      if (vehicleType === 'Bateau') dbType = 'BOAT';
      if (vehicleType === 'Coaster') dbType = 'COASTER';
      if (vehicleType === 'MiniBus') dbType = 'MINIBUS';

      const payload = {
        name: vehicleNumber.trim(),
        registration: registration.trim().toUpperCase(),
        type: dbType,
        capacity: Number(totalSeats),
        rows: Number(rows),
        seats_per_row: Number(seatsPerRow),
        company_id: user.companyId
      };

      if (editId) {
        await supabase.from('vehicles').update(payload).eq('id', editId);
        toast.success('Données mises à jour');
      } else {
        await supabase.from('vehicles').insert([payload]);
        toast.success('Véhicule ajouté au parc');
      }
      setShowForm(false); resetForm(); 
      setTimeout(() => loadData(), 300);
    } catch (e: any) { 
      toast.error('Erreur lors de l’enregistrement'); 
    } finally { 
      setSaving(false); 
    }
  };

  const handleDelete = async (id: string) => {
    const { count } = await supabase.from('trips').select('*', { count: 'exact', head: true }).eq('vehicle_id', id);
    if (count && count > 0) {
      toast.error("Impossible : Ce véhicule est rattaché à des voyages existants.");
      return;
    }
    const { error } = await supabase.from('vehicles').delete().eq('id', id);
    if (!error) {
      setVehicles(prev => prev.filter(v => v.id !== id));
      toast.success('Véhicule retiré');
    }
  };

  if (loading) return <div className="max-w-6xl mx-auto p-8 space-y-4"><Skeleton className="h-12 w-48" /><Skeleton className="h-64 w-full rounded-[2.5rem]" /></div>;

  return (
    <div className="max-w-6xl mx-auto p-4 text-left">
      
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black italic text-primary tracking-tighter uppercase">Gestion de la Flotte</h1>
          <p className="text-muted-foreground font-bold text-[10px] uppercase tracking-widest mt-1">Inventaire technique des appareils</p>
        </div>
        <Button onClick={() => { resetForm(); setShowForm(true); }} className="rounded-2xl font-black gap-2 h-12 px-6 shadow-lg shadow-primary/20 transition-all active:scale-95">
          <Plus size={20} /> ENREGISTRER UN MATÉRIEL
        </Button>
      </div>

      {vehicles.length === 0 ? (
        <div className="p-20 text-center border-2 border-dashed rounded-[3rem] bg-slate-50/50">
          <Bus className="h-12 w-12 mx-auto mb-4 text-slate-200" />
          <p className="text-slate-400 font-bold uppercase text-xs tracking-widest">Aucun véhicule dans votre base</p>
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {currentVehicles.map(v => (
              <div key={v.id} className="bg-white border-2 border-slate-100 rounded-[2rem] p-6 hover:shadow-xl transition-all group">
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <div className={`h-14 w-14 rounded-2xl flex items-center justify-center text-white shadow-lg ${
                      v.vehicleType === 'Train' ? 'bg-slate-900' : v.vehicleType === 'Bateau' ? 'bg-blue-600' : 'bg-primary'
                    }`}>
                      {v.vehicleType === 'Train' ? <Train size={24} /> : v.vehicleType === 'Bateau' ? <Ship size={24} /> : <Bus size={24} />}
                    </div>
                    <div>
                      <div className="font-black text-lg text-slate-800 tracking-tight leading-tight">{v.vehicleNumber}</div>
                      <div className="flex items-center gap-1.5 text-[9px] font-black text-primary uppercase bg-primary/5 px-2 py-0.5 rounded border border-primary/10 mt-1 w-fit shadow-sm">
                        <Hash size={10} /> {v.registration}
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center justify-between mb-6 px-1 border-y border-dashed border-slate-100 py-4">
                   <div className="text-center flex-1">
                     <p className="text-[9px] font-bold text-muted-foreground uppercase">Places</p>
                     <p className="font-black text-slate-800">{v.totalSeats}</p>
                   </div>
                   <div className="w-px h-6 bg-slate-100" />
                   <div className="text-center flex-1">
                     <p className="text-[9px] font-bold text-muted-foreground uppercase">Type</p>
                     <p className="font-black text-slate-800 uppercase text-[10px]">{v.vehicleType}</p>
                   </div>
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1 font-black rounded-xl border-2 hover:bg-slate-50 h-11" onClick={() => openEdit(v)}>MODIFIER</Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm" className="rounded-xl border-2 text-red-400 hover:text-red-600 h-11 px-4 transition-colors"><Trash2 size={18} /></Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="rounded-[2.5rem] border-none shadow-2xl text-left">
                      <AlertDialogHeader>
                        <AlertDialogTitle className="font-black italic text-2xl uppercase">Supprimer ?</AlertDialogTitle>
                        <AlertDialogDescription className="font-medium text-slate-600">
                          Supprimer <strong>{v.vehicleNumber}</strong> ({v.registration}) de votre inventaire. Cette action est irréversible.
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

          {/* PAGINATION */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-4 mt-12 bg-white p-2 rounded-2xl w-fit mx-auto border-2 border-slate-50 shadow-sm">
              <Button variant="ghost" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="rounded-xl h-10 w-10"><ChevronLeft /></Button>
              <span className="text-xs font-black uppercase text-slate-400 px-4">Page {currentPage} / {totalPages}</span>
              <Button variant="ghost" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)} className="rounded-xl h-10 w-10"><ChevronRight /></Button>
            </div>
          )}
        </>
      )}

      {/* DIALOG FORMULAIRE STYLE SaaS */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="rounded-[2.5rem] p-8 max-w-lg border-none shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black italic uppercase tracking-tighter text-left leading-none">
                {editId ? 'Modifier l’Appareil' : 'Nouveau Matériel'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6 mt-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5 text-left">
                    <Label className="text-[10px] font-black uppercase text-slate-400 ml-1 tracking-widest">Nom Interne</Label>
                    <Input value={vehicleNumber} onChange={e => setVehicleNumber(e.target.value)} className="h-12 rounded-xl bg-slate-50 border-none font-bold px-4 shadow-inner" placeholder="Ex: Bus 01, Alizé..." />
                </div>
                <div className="space-y-1.5 text-left">
                    <Label className="text-[10px] font-black uppercase text-slate-400 ml-1 tracking-widest text-primary">Immatriculation</Label>
                    <Input value={registration} onChange={e => setRegistration(e.target.value)} className="h-12 rounded-xl bg-primary/5 border-2 border-primary/10 font-black text-primary px-4 shadow-sm" placeholder="Ex: RG-210-AA" />
                </div>
            </div>

            <div className="space-y-1.5 text-left">
                <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Type de transport</Label>
                <Select value={vehicleType} onValueChange={setVehicleType}>
                    <SelectTrigger className="h-12 rounded-xl bg-slate-50 border-none font-bold px-5"><SelectValue /></SelectTrigger>
                    <SelectContent className="rounded-xl border-none shadow-2xl">
                        {['Bus', 'Train', 'Bateau', 'Coaster', 'MiniBus'].map(t => <SelectItem key={t} value={t} className="font-bold">{t}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>

            <div className="grid grid-cols-3 gap-4 border-t border-dashed pt-4">
                <div className="space-y-1.5 text-left">
                    <Label className="text-[9px] font-black uppercase text-slate-400 text-center block">Nb Places</Label>
                    <Input type="number" value={totalSeats} onChange={e => setTotalSeats(e.target.value)} className="h-11 rounded-xl bg-slate-50 border-none font-bold text-center" />
                </div>
                <div className="space-y-1.5 text-left">
                    <Label className="text-[9px] font-black uppercase text-slate-400 text-center block">Nb Rangs</Label>
                    <Input type="number" value={rows} onChange={e => setRows(e.target.value)} className="h-11 rounded-xl bg-slate-50 border-none font-bold text-center" />
                </div>
                <div className="space-y-1.5 text-left">
                    <Label className="text-[9px] font-black uppercase text-slate-400 text-center block">Sièges/Rang</Label>
                    <Input type="number" value={seatsPerRow} onChange={e => setSeatsPerRow(e.target.value)} className="h-11 rounded-xl bg-slate-50 border-none font-bold text-center" />
                </div>
            </div>

            <Button onClick={handleSave} disabled={saving || !vehicleNumber} className="w-full h-14 rounded-2xl font-black text-lg shadow-xl shadow-primary/20 uppercase tracking-widest mt-4 transition-all active:scale-95">
                {saving ? <RefreshCw className="animate-spin mr-2 h-6 w-6" /> : <Save className="mr-2 h-6 w-6" />}
                {editId ? 'METTRE À JOUR' : 'AJOUTER AU PARC'}
            </Button>
          </div>
          
          <button onClick={() => setShowForm(false)} className="w-full mt-4 text-[10px] font-black text-slate-300 uppercase tracking-widest hover:text-slate-500 transition-colors">FERMER LA FENÊTRE</button>
        </DialogContent>
      </Dialog>
    </div>
  );
}