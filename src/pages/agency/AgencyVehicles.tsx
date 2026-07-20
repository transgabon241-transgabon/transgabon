"use client"

import { useEffect, useState, useMemo } from 'react';
import { useAuth } from "@/lib/auth-context";
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Pencil, Trash2, Bus, Train, Ship, RefreshCw, ChevronLeft, ChevronRight, Save, Hash, Armchair, Gem } from 'lucide-react'; 
import { toast } from 'sonner';

type Vehicle = {
  id: string;
  vehicleNumber: string; 
  registration: string;  
  vehicleType: string; 
  totalSeats: number;
  rows: number;
  seatsPerRow: number;
};

export default function AgencyVehicles() {
  const { user } = useAuth();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  // Form states
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [registration, setRegistration] = useState('');
  const [vehicleType, setVehicleType] = useState('Bus');
  const [totalSeats, setTotalSeats] = useState('30');
  const [rows, setRows] = useState('8');
  const [seatsPerRow, setSeatsPerRow] = useState('4');

  const loadData = async () => {
    if (!user?.companyId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('vehicles')
        .select('*')
        .eq('company_id', user.companyId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setVehicles((data || []).map(v => ({
        id: v.id,
        vehicleNumber: v.name,
        registration: v.registration || 'SANS IMMAT',
        vehicleType: v.type === 'TRAIN' ? 'Train' : v.type === 'BOAT' ? 'Bateau' : v.type === 'COASTER' ? 'Coaster' : v.type === 'MINIBUS' ? 'MiniBus' : 'Bus',
        totalSeats: v.capacity,
        rows: v.rows || 10,
        seatsPerRow: v.seats_per_row || 4
      })));
    } catch (e) { toast.error('Erreur de chargement'); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadData(); }, [user]);

  const handleSave = async () => {
    if (!user?.companyId || !vehicleNumber) return;
    setSaving(true);
    try {
      const dbType = { 'Train': 'TRAIN', 'Bateau': 'BOAT', 'Coaster': 'COASTER', 'MiniBus': 'MINIBUS', 'Bus': 'BUS' }[vehicleType] || 'BUS';

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
        toast.success('Matériel mis à jour');
      } else {
        await supabase.from('vehicles').insert([payload]);
        toast.success('Matériel ajouté à la flotte');
      }
      setShowForm(false);
      resetForm(); 
      loadData();
    } catch (e) { toast.error('Erreur d’enregistrement'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    const { count } = await supabase.from('trips').select('*', { count: 'exact', head: true }).eq('vehicle_id', id);
    if (count && count > 0) {
      toast.error("Impossible : Ce véhicule est utilisé dans des trajets programmés.");
      return;
    }
    const { error } = await supabase.from('vehicles').delete().eq('id', id);
    if (!error) {
      setVehicles(prev => prev.filter(v => v.id !== id));
      toast.success('Véhicule supprimé');
    }
  };

  const openEdit = (v: Vehicle) => {
    setEditId(v.id);
    setVehicleNumber(v.vehicleNumber);
    setRegistration(v.registration === 'SANS IMMAT' ? '' : v.registration);
    setVehicleType(v.vehicleType);
    setTotalSeats(String(v.totalSeats));
    setRows(String(v.rows));
    setSeatsPerRow(String(v.seatsPerRow));
    setShowForm(true);
  };

  const resetForm = () => {
    setEditId(null); setVehicleNumber(''); setRegistration(''); setVehicleType('Bus');
    setTotalSeats('30'); setRows('8'); setSeatsPerRow('4');
  };

  const currentVehicles = useMemo(() => vehicles.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage), [vehicles, currentPage]);
  const totalPages = Math.ceil(vehicles.length / itemsPerPage);

  if (loading) return <div className="p-8 space-y-4"><Skeleton className="h-12 w-48" /><Skeleton className="h-64 w-full rounded-[2rem]" /></div>;

  return (
    <div className="max-w-6xl mx-auto p-4 text-left space-y-8 animate-in fade-in duration-500">
      
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black italic text-slate-900 uppercase tracking-tighter">Ma Flotte</h1>
          <p className="text-muted-foreground font-bold text-[10px] uppercase tracking-widest mt-1">Inventaire des bus, trains et navires</p>
        </div>
        <Button onClick={() => { resetForm(); setShowForm(true); }} className="rounded-2xl font-black gap-2 h-12 shadow-lg shadow-primary/20">
          <Plus size={20} /> ENREGISTRER UN APPAREIL
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {currentVehicles.map(v => (
          <div key={v.id} className="bg-white border-2 border-slate-100 rounded-[2rem] p-6 hover:shadow-xl transition-all group relative overflow-hidden">
            <div className="flex items-center gap-4 mb-6">
              <div className={`h-14 w-14 rounded-2xl flex items-center justify-center text-white shadow-lg ${
                v.vehicleType === 'Train' ? 'bg-slate-900' : v.vehicleType === 'Bateau' ? 'bg-blue-600' : 'bg-primary'
              }`}>
                {v.vehicleType === 'Train' ? <Train size={24} /> : v.vehicleType === 'Bateau' ? <Ship size={24} /> : <Bus size={24} />}
              </div>
              <div>
                <p className="font-black text-lg text-slate-800 leading-none">{v.vehicleNumber}</p>
                <div className="flex items-center gap-2 mt-2">
                    <span className="text-[9px] font-black text-primary uppercase bg-primary/5 px-2 py-0.5 rounded border border-primary/10 tracking-widest">
                        {v.registration}
                    </span>
                    {(v.vehicleType === 'Train' || v.vehicleType === 'Bateau') && <Gem size={12} className="text-amber-500" />}
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-2 mb-6 py-4 border-y border-dashed border-slate-100">
               <div className="text-center">
                 <p className="text-[8px] font-black text-slate-300 uppercase">Capacité</p>
                 <p className="font-black text-slate-700">{v.totalSeats}</p>
               </div>
               <div className="text-center border-x">
                 <p className="text-[8px] font-black text-slate-300 uppercase">Plan</p>
                 <p className="font-black text-slate-700">{v.rows}x{v.seatsPerRow}</p>
               </div>
               <div className="text-center">
                 <p className="text-[8px] font-black text-slate-300 uppercase">Catégorie</p>
                 <p className="font-black text-primary text-[8px] uppercase truncate px-1">{v.vehicleType}</p>
               </div>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1 font-black rounded-xl border-2 h-10 text-[10px] uppercase" onClick={() => openEdit(v)}>Modifier</Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" className="rounded-xl border-2 text-red-200 hover:text-red-600 h-10 px-3"><Trash2 size={16} /></Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="rounded-[2.5rem] border-none shadow-2xl">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="font-black italic text-xl uppercase">Retirer l'appareil ?</AlertDialogTitle>
                    <AlertDialogDescription className="font-medium">Confirmez-vous la suppression de {v.vehicleNumber} ?</AlertDialogDescription>
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

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="rounded-[2.5rem] p-8 max-w-lg border-none shadow-2xl">
          <DialogHeader><DialogTitle className="text-2xl font-black italic uppercase tracking-tighter text-left">{editId ? 'Édition Matériel' : 'Nouveau Matériel'}</DialogTitle></DialogHeader>
          
          <div className="space-y-6 mt-6">
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5 text-left">
                    <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Nom / Code</Label>
                    <Input value={vehicleNumber} onChange={e => setVehicleNumber(e.target.value)} className="h-12 rounded-xl bg-slate-50 border-none font-bold shadow-inner" placeholder="Ex: Bus 101" />
                </div>
                <div className="space-y-1.5 text-left">
                    <Label className="text-[10px] font-black uppercase text-primary ml-1">Immatriculation</Label>
                    <Input value={registration} onChange={e => setRegistration(e.target.value)} className="h-12 rounded-xl bg-primary/5 border-2 border-primary/10 font-black text-primary" placeholder="RG-000-AA" />
                </div>
            </div>

            <div className="space-y-1.5 text-left">
                <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Type de transport</Label>
                <Select value={vehicleType} onValueChange={setVehicleType}>
                    <SelectTrigger className="h-12 rounded-xl bg-slate-50 border-none font-bold"><SelectValue /></SelectTrigger>
                    <SelectContent className="rounded-xl shadow-2xl">
                        {['Bus', 'Train', 'Bateau', 'Coaster', 'MiniBus'].map(t => <SelectItem key={t} value={t} className="font-bold">{t}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>

            <div className="p-5 bg-slate-50 rounded-3xl border-2 border-slate-100">
                <div className="flex items-center gap-2 mb-4">
                    <Armchair size={16} className="text-primary" />
                    <h3 className="text-[10px] font-black uppercase text-slate-600 tracking-widest">Configuration des sièges</h3>
                </div>
                <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1 text-left">
                        <Label className="text-[8px] font-black uppercase text-slate-400 ml-1">Total</Label>
                        <Input type="number" value={totalSeats} onChange={e => setTotalSeats(e.target.value)} className="h-10 rounded-xl bg-white border-none font-black text-center shadow-sm" />
                    </div>
                    <div className="space-y-1 text-left">
                        <Label className="text-[8px] font-black uppercase text-slate-400 ml-1">Rangs</Label>
                        <Input type="number" value={rows} onChange={e => setRows(e.target.value)} className="h-10 rounded-xl bg-white border-none font-black text-center shadow-sm" />
                    </div>
                    <div className="space-y-1 text-left">
                        <Label className="text-[8px] font-black uppercase text-slate-400 ml-1">Cols</Label>
                        <Input type="number" value={seatsPerRow} onChange={e => setSeatsPerRow(e.target.value)} className="h-10 rounded-xl bg-white border-none font-black text-center shadow-sm" />
                    </div>
                </div>
                <p className="text-[7px] font-bold text-slate-400 mt-3 uppercase text-center italic">Le plan de salle sera généré en {rows} rangées de {seatsPerRow} sièges.</p>
            </div>

            <Button onClick={handleSave} disabled={saving || !vehicleNumber} className="w-full h-16 rounded-3xl font-black text-xl shadow-2xl shadow-primary/20 uppercase tracking-widest mt-4">
                {saving ? <RefreshCw className="animate-spin h-6 w-6" /> : <Save className="mr-2 h-6 w-6" />}
                {editId ? 'MODIFIER' : 'AJOUTER'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}