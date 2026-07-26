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
import { 
  Plus, Pencil, Trash2, Bus, Train, Ship, RefreshCw, 
  ChevronLeft, ChevronRight, Save, Armchair, Plane,
  Search, Activity, Users, Layout
} from 'lucide-react'; 
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
  const [search, setSearch] = useState('');

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
        vehicleType: v.type === 'TRAIN' ? 'Train' : v.type === 'BOAT' ? 'Bateau' : v.type === 'PLANE' ? 'Avion' : v.type === 'COASTER' ? 'Coaster' : v.type === 'MINIBUS' ? 'MiniBus' : 'Bus',
        totalSeats: v.capacity,
        rows: v.rows || 10,
        seatsPerRow: v.seats_per_row || 4
      })));
    } catch (e) { toast.error('Erreur de chargement'); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadData(); }, [user]);

  // --- STATS ---
  const stats = useMemo(() => {
    return {
      total: vehicles.length,
      capacity: vehicles.reduce((acc, v) => acc + v.totalSeats, 0),
    };
  }, [vehicles]);

  // --- FILTRAGE ---
  const filteredVehicles = useMemo(() => {
    return vehicles.filter(v => 
      v.registration.toLowerCase().includes(search.toLowerCase()) || 
      v.vehicleNumber.toLowerCase().includes(search.toLowerCase())
    );
  }, [vehicles, search]);

  const handleSave = async () => {
    if (!user?.companyId || !vehicleNumber) return;
    setSaving(true);
    try {
      const dbType = { 'Train': 'TRAIN', 'Bateau': 'BOAT', 'Avion': 'PLANE', 'Coaster': 'COASTER', 'MiniBus': 'MINIBUS', 'Bus': 'BUS' }[vehicleType] || 'BUS';
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
        toast.success('Mise à jour réussie');
      } else {
        await supabase.from('vehicles').insert([payload]);
        toast.success('Nouvel appareil ajouté');
      }
      setShowForm(false);
      resetForm(); 
      loadData();
    } catch (e) { toast.error('Erreur d’enregistrement'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('vehicles').delete().eq('id', id);
    if (!error) {
      setVehicles(prev => prev.filter(v => v.id !== id));
      toast.success('Supprimé de la flotte');
    } else {
      toast.error("Impossible de supprimer : l'appareil est lié à des trajets.");
    }
  };

  const openEdit = (v: Vehicle) => {
    setEditId(v.id);
    setVehicleNumber(v.vehicleNumber);
    setRegistration(v.registration);
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

  const paginatedVehicles = useMemo(() => filteredVehicles.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage), [filteredVehicles, currentPage]);
  const totalPages = Math.ceil(filteredVehicles.length / itemsPerPage);

  if (loading && vehicles.length === 0) return <div className="p-8 text-center animate-pulse font-black text-slate-500 uppercase">Synchronisation du parc...</div>;

  return (
    <div className="max-w-6xl mx-auto p-2 sm:p-4 text-left space-y-6 animate-in fade-in duration-500 bg-background text-foreground pb-20">
      
      {/* HEADER COMPACT MOBILE */}
      <div className="bg-card p-4 sm:p-6 rounded-[1.5rem] sm:rounded-[2rem] border-2 border-border shadow-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-xl border border-primary/20 text-primary shrink-0">
            <Activity size={24} />
          </div>
          <div>
            <h1 className="text-xl sm:text-3xl font-black italic text-white uppercase tracking-tighter leading-none">Gestion Flotte</h1>
            <p className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Inventaire technique</p>
          </div>
        </div>
        <Button onClick={() => { resetForm(); setShowForm(true); }} className="w-full sm:w-auto h-12 sm:h-14 rounded-xl font-black bg-primary text-white border-none active:scale-95 text-[10px] uppercase tracking-widest px-6 shadow-lg">
          <Plus size={18} className="mr-1" /> Nouvel Appareil
        </Button>
      </div>

      {/* STATS RAPIDES (Adaptées mobile) */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-card border border-border p-4 rounded-2xl shadow-lg flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400 shrink-0"><Layout size={18}/></div>
            <div className="min-w-0">
                <p className="text-[7px] font-black text-slate-500 uppercase leading-none mb-1">Unités</p>
                <p className="text-lg font-black text-white">{stats.total}</p>
            </div>
        </div>
        <div className="bg-card border border-border p-4 rounded-2xl shadow-lg flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400 shrink-0"><Users size={18}/></div>
            <div className="min-w-0">
                <p className="text-[7px] font-black text-slate-500 uppercase leading-none mb-1">Sièges</p>
                <p className="text-lg font-black text-white">{stats.capacity}</p>
            </div>
        </div>
      </div>

      {/* RECHERCHE */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-600" />
        <Input 
          placeholder="Rechercher immatriculation ou nom..." 
          value={search}
          onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
          className="pl-12 h-12 bg-card border-border rounded-xl text-white font-bold text-xs"
        />
      </div>

      {/* GRILLE DES APPAREILS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {paginatedVehicles.map(v => (
          <div key={v.id} className="bg-card border border-border rounded-[1.5rem] sm:rounded-[2rem] p-5 shadow-lg flex flex-col justify-between hover:border-primary/30 transition-all group">
            <div className="flex items-center gap-4 mb-5 text-left">
              <div className={`h-12 w-12 rounded-xl flex items-center justify-center text-white shadow-md shrink-0 ${
                v.vehicleType === 'Bateau' ? 'bg-blue-600' : v.vehicleType === 'Avion' ? 'bg-indigo-600' : 'bg-primary'
              }`}>
                {v.vehicleType === 'Bateau' ? <Ship size={20}/> : v.vehicleType === 'Avion' ? <Plane size={20}/> : <Bus size={20}/>}
              </div>
              <div className="min-w-0">
                <p className="font-black text-base text-white uppercase truncate">{v.vehicleNumber}</p>
                <span className="text-[9px] font-black text-primary uppercase bg-primary/10 px-2 py-0.5 rounded border border-primary/20">{v.registration}</span>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-2 mb-5">
                <div className="bg-slate-950/50 p-2 rounded-xl border border-white/5 text-center">
                    <p className="text-[7px] font-black text-slate-500 uppercase">Capacité</p>
                    <p className="text-sm font-black text-white">{v.totalSeats} places</p>
                </div>
                <div className="bg-slate-950/50 p-2 rounded-xl border border-white/5 text-center">
                    <p className="text-[7px] font-black text-slate-500 uppercase">Config.</p>
                    <p className="text-sm font-black text-white">{v.rows}x{v.seatsPerRow}</p>
                </div>
            </div>

            <div className="flex gap-2 border-t border-slate-800 pt-4">
              <Button variant="outline" className="flex-1 h-10 rounded-xl border-slate-800 bg-slate-950 text-slate-400 font-black text-[9px] uppercase tracking-widest hover:text-white" onClick={() => openEdit(v)}>Éditer</Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl text-slate-600 hover:text-red-500 hover:bg-red-500/10"><Trash2 size={16} /></Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="rounded-[2rem] bg-slate-900 border-border text-white w-[90vw] max-w-sm">
                    <AlertDialogHeader className="text-left">
                        <AlertDialogTitle className="font-black uppercase italic tracking-tighter">Supprimer ?</AlertDialogTitle>
                        <AlertDialogDescription className="text-slate-400 text-xs">Cette action est irréversible.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="flex-row gap-3 mt-6">
                        <AlertDialogCancel className="flex-1 rounded-xl bg-slate-800 border-none m-0 text-[10px] font-black">ANNULER</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(v.id)} className="flex-1 rounded-xl bg-red-600 m-0 text-[10px] font-black">SUPPRIMER</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        ))}
      </div>

      {/* PAGINATION */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 bg-slate-900 p-2 rounded-2xl border border-border w-fit mx-auto shadow-xl">
          <Button variant="ghost" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="h-8 w-8 text-slate-400 hover:text-white"><ChevronLeft size={20}/></Button>
          <span className="text-[10px] font-black text-slate-500 uppercase px-4">Page {currentPage} / {totalPages}</span>
          <Button variant="ghost" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)} className="h-8 w-8 text-slate-400 hover:text-white"><ChevronRight size={20}/></Button>
        </div>
      )}

      {/* DIALOG FORMULAIRE */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="rounded-[2rem] p-6 sm:p-10 w-[95vw] max-w-lg bg-slate-900 border-border text-white shadow-2xl overflow-y-auto max-h-[90vh]">
          <DialogHeader className="text-left"><DialogTitle className="text-2xl font-black uppercase italic tracking-tighter leading-none mb-6">{editId ? 'Modifier' : 'Ajouter'} Matériel</DialogTitle></DialogHeader>
          
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
                <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-slate-500 ml-1">Nom (Ex: G-Trans 01)</Label>
                    <Input value={vehicleNumber} onChange={e => setVehicleNumber(e.target.value)} className="h-12 bg-slate-950 border-none rounded-xl font-bold" />
                </div>
                <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-slate-500 ml-1">Immatriculation</Label>
                    <Input value={registration} onChange={e => setRegistration(e.target.value)} className="h-12 bg-slate-950 border-none rounded-xl font-bold text-primary" placeholder="AB-123-CD" />
                </div>
            </div>

            <div className="space-y-2 text-left">
                <Label className="text-[10px] font-black uppercase text-slate-500 ml-1">Type de transport</Label>
                <Select value={vehicleType} onValueChange={setVehicleType}>
                    <SelectTrigger className="h-12 bg-slate-950 border-none rounded-xl font-bold"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-slate-900 border-border text-white">
                        {['Bus', 'Avion', 'Bateau', 'Train', 'Coaster', 'MiniBus'].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>

            <div className="p-6 bg-slate-950 rounded-2xl border border-white/5 space-y-4">
                <div className="flex items-center gap-2 mb-2">
                    <Armchair size={16} className="text-primary" />
                    <h3 className="text-[10px] font-black uppercase text-white tracking-widest">Configuration Sièges</h3>
                </div>
                <div className="grid grid-cols-3 gap-3 text-left">
                    <div className="space-y-1">
                        <Label className="text-[8px] font-black uppercase text-slate-500 text-center block">Total</Label>
                        <Input type="number" value={totalSeats} onChange={e => setTotalSeats(e.target.value)} className="h-10 bg-slate-900 border-none rounded-lg text-center font-black" />
                    </div>
                    <div className="space-y-1">
                        <Label className="text-[8px] font-black uppercase text-slate-500 text-center block">Rangs</Label>
                        <Input type="number" value={rows} onChange={e => setRows(e.target.value)} className="h-10 bg-slate-900 border-none rounded-lg text-center font-black" />
                    </div>
                    <div className="space-y-1">
                        <Label className="text-[8px] font-black uppercase text-slate-500 text-center block">Cols</Label>
                        <Input type="number" value={seatsPerRow} onChange={e => setSeatsPerRow(e.target.value)} className="h-10 bg-slate-900 border-none rounded-lg text-center font-black" />
                    </div>
                </div>
            </div>

            <Button onClick={handleSave} disabled={saving} className="w-full h-16 rounded-2xl bg-primary text-white font-black uppercase tracking-widest text-base shadow-xl active:scale-95 border-none mt-4">
                {saving ? <RefreshCw className="animate-spin h-6 w-6" /> : <Save className="mr-2" />} 
                {editId ? 'Sauvegarder' : 'Confirmer'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}