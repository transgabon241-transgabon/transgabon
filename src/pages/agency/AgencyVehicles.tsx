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
  ChevronLeft, ChevronRight, Save, Armchair, Gem, Plane,
  LayoutDashboard, Search, Filter, Activity, Users, Boxes
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
  const [filterType, setFilterType] = useState('all');

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

  // --- STATISTIQUES DU DASHBOARD ---
  const stats = useMemo(() => {
    return {
      total: vehicles.length,
      capacity: vehicles.reduce((acc, v) => acc + v.totalSeats, 0),
      planes: vehicles.filter(v => v.vehicleType === 'Avion').length,
      terrestre: vehicles.filter(v => ['Bus', 'Coaster', 'MiniBus', 'Train'].includes(v.vehicleType)).length,
      maritime: vehicles.filter(v => v.vehicleType === 'Bateau').length,
    };
  }, [vehicles]);

  // --- LOGIQUE DE FILTRAGE ---
  const filteredVehicles = useMemo(() => {
    return vehicles.filter(v => {
      const matchesSearch = v.registration.toLowerCase().includes(search.toLowerCase()) || v.vehicleNumber.toLowerCase().includes(search.toLowerCase());
      const matchesType = filterType === 'all' || v.vehicleType === filterType;
      return matchesSearch && matchesType;
    });
  }, [vehicles, search, filterType]);

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
        toast.success('Matériel mis à jour');
      } else {
        await supabase.from('vehicles').insert([payload]);
        toast.success('Matériel ajouté');
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
      toast.error("Impossible : véhicule utilisé dans des trajets.");
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

  const paginatedVehicles = useMemo(() => filteredVehicles.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage), [filteredVehicles, currentPage]);
  const totalPages = Math.ceil(filteredVehicles.length / itemsPerPage);

  if (loading && vehicles.length === 0) return <div className="p-8"><RefreshCw className="animate-spin h-10 w-10 text-primary mx-auto" /></div>;

  return (
    <div className="max-w-6xl mx-auto p-3 sm:p-4 text-left space-y-8 animate-in fade-in duration-500 bg-background text-foreground pb-20">
      
      {/* HEADER AVEC ACTION */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 bg-card p-6 rounded-[2rem] border-2 border-border shadow-2xl relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <LayoutDashboard className="text-primary h-8 w-8" />
            <h1 className="text-2xl sm:text-4xl font-black italic text-white uppercase tracking-tighter leading-none">Flotte Opérationnelle</h1>
          </div>
          <p className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-widest mt-2 italic">Centre de gestion technique du parc</p>
        </div>
        <Button onClick={() => { resetForm(); setShowForm(true); }} className="relative z-10 w-full sm:w-auto rounded-2xl font-black gap-2 h-14 px-8 shadow-xl bg-primary text-white border-none hover:bg-primary/90 transition-all active:scale-95 uppercase text-xs">
          <Plus size={20} /> AJOUTER UN APPAREIL
        </Button>
      </div>

      {/* SECTION KPIs DASHBOARD */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 px-1">
        <StatCard label="Appareils" value={stats.total} icon={Activity} color="text-blue-400" bg="bg-blue-500/10" />
        <StatCard label="Sièges Totaux" value={stats.capacity} icon={Users} color="text-emerald-400" bg="bg-emerald-500/10" />
        <StatCard label="Unités Air" value={stats.planes} icon={Plane} color="text-indigo-400" bg="bg-indigo-500/10" />
        <StatCard label="Unités Mer" value={stats.maritime} icon={Ship} color="text-cyan-400" bg="bg-cyan-500/10" />
      </div>

      {/* BARRE DE FILTRES */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-card p-4 rounded-[1.5rem] border border-border shadow-xl">
        <div className="md:col-span-2 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <Input 
            placeholder="Rechercher par nom ou immatriculation..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-12 h-12 bg-slate-950 border-none rounded-xl text-white font-bold"
          />
        </div>
        <div className="md:col-span-2">
            <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="h-12 bg-slate-950 border-none rounded-xl text-white font-black uppercase text-[10px] tracking-widest">
                    <div className="flex items-center gap-2"><Filter size={14}/> <SelectValue placeholder="Catégorie" /></div>
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-border text-white rounded-xl">
                    <SelectItem value="all">Toutes les catégories</SelectItem>
                    <SelectItem value="Avion">Aérien (Avion)</SelectItem>
                    <SelectItem value="Bateau">Maritime (Bateau)</SelectItem>
                    <SelectItem value="Bus">Terrestre (Bus)</SelectItem>
                    <SelectItem value="Train">Ferroviaire (Train)</SelectItem>
                </SelectContent>
            </Select>
        </div>
      </div>

      {/* GRILLE DES VÉHICULES */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {paginatedVehicles.map(v => (
          <div key={v.id} className="bg-card border border-border rounded-[2.5rem] p-6 hover:shadow-2xl hover:border-primary/20 transition-all group">
            <div className="flex items-center gap-4 mb-6 text-left">
              <div className={`h-16 w-16 rounded-[1.2rem] flex items-center justify-center text-white shadow-lg shrink-0 ${
                v.vehicleType === 'Train' ? 'bg-slate-950 border border-slate-800' : v.vehicleType === 'Bateau' ? 'bg-blue-600' : v.vehicleType === 'Avion' ? 'bg-indigo-600' : 'bg-primary'
              }`}>
                {v.vehicleType === 'Train' ? <Train size={28} /> : v.vehicleType === 'Bateau' ? <Ship size={28} /> : v.vehicleType === 'Avion' ? <Plane size={28} /> : <Bus size={28} />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-black text-xl text-white truncate uppercase tracking-tight leading-none">{v.vehicleNumber}</p>
                <div className="flex items-center gap-2 mt-2">
                    <span className="text-[9px] font-black text-primary uppercase bg-primary/10 px-2 py-0.5 rounded border border-primary/20">
                        {v.registration}
                    </span>
                    <span className="text-[8px] font-black text-slate-500 uppercase">{v.vehicleType}</span>
                </div>
              </div>
            </div>
            
            <div className="bg-slate-950/50 rounded-2xl p-4 mb-6 border border-white/5">
                <div className="flex justify-between items-center mb-1">
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Configuration Cabine</span>
                    <span className="text-[9px] font-black text-white">{v.totalSeats} Sièges</span>
                </div>
                <div className="flex items-center gap-1.5">
                    {[...Array(Math.min(12, v.rows))].map((_, i) => (
                        <div key={i} className="h-1.5 flex-1 bg-slate-800 rounded-full overflow-hidden">
                            <div className="h-full w-full bg-primary/30" />
                        </div>
                    ))}
                    {v.rows > 12 && <span className="text-[8px] font-bold text-slate-700">...</span>}
                </div>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1 font-black rounded-xl border-slate-800 bg-slate-950 text-slate-300 h-11 text-[10px] uppercase tracking-widest hover:bg-slate-800" onClick={() => openEdit(v)}>Détails / Éditer</Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" className="rounded-xl border-slate-800 bg-slate-950 text-red-400 hover:text-red-300 hover:bg-red-500/10 h-11 w-11 p-0 shrink-0"><Trash2 size={18} /></Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="rounded-[2.5rem] bg-slate-900 border-slate-800 text-white shadow-2xl">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="font-black italic text-2xl uppercase tracking-tighter">Supprimer ?</AlertDialogTitle>
                        <AlertDialogDescription className="text-slate-400">Retirer définitivement cet appareil de la flotte ?</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="mt-8 flex-row gap-4">
                        <AlertDialogCancel className="rounded-xl flex-1 bg-slate-800 border-none m-0">ANNULER</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(v.id)} className="rounded-xl flex-1 bg-red-600 hover:bg-red-700 m-0">CONFIRMER</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        ))}
      </div>

      {/* PAGINATION */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 mt-12 bg-slate-900 p-2 rounded-2xl border border-border w-fit mx-auto shadow-xl">
          <Button variant="ghost" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="rounded-xl h-10 w-10 text-slate-400"><ChevronLeft size={20}/></Button>
          <span className="text-[10px] font-black uppercase text-slate-500 px-4">Page {currentPage} / {totalPages}</span>
          <Button variant="ghost" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)} className="rounded-xl h-10 w-10 text-slate-400"><ChevronRight size={20}/></Button>
        </div>
      )}

      {/* MODAL FORMULAIRE */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="rounded-[2rem] p-8 max-w-lg bg-slate-900 border-border text-white shadow-2xl overflow-y-auto max-h-[90vh]">
          <DialogHeader><DialogTitle className="text-3xl font-black italic uppercase tracking-tighter text-left mb-6">{editId ? 'Modifier' : 'Nouvel'} Appareil</DialogTitle></DialogHeader>
          
          <div className="space-y-6 text-left">
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-slate-500 ml-1">Nom / Désignation</Label>
                    <Input value={vehicleNumber} onChange={e => setVehicleNumber(e.target.value)} className="h-12 rounded-xl bg-slate-950 border-none font-bold" placeholder="Ex: G-Express 01" />
                </div>
                <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-slate-500 ml-1">Immatriculation</Label>
                    <Input value={registration} onChange={e => setRegistration(e.target.value)} className="h-12 rounded-xl bg-slate-950 border-none font-bold text-primary" placeholder="TR-001-AA" />
                </div>
            </div>

            <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-slate-500 ml-1">Type de transport</Label>
                <Select value={vehicleType} onValueChange={setVehicleType}>
                    <SelectTrigger className="h-12 bg-slate-950 border-none rounded-xl text-white font-bold"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-slate-900 border-border text-white">
                        {['Bus', 'Train', 'Bateau', 'Avion', 'Coaster', 'MiniBus'].map(t => <SelectItem key={t} value={t} className="font-bold">{t}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>

            <div className="p-6 bg-slate-950 rounded-[1.5rem] border border-white/5 space-y-4">
                <div className="flex items-center gap-2 mb-2">
                    <Armchair size={16} className="text-primary" />
                    <h3 className="text-[10px] font-black uppercase text-white tracking-widest">Configuration de la grille</h3>
                </div>
                <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-1">
                        <Label className="text-[8px] font-black uppercase text-slate-500 text-center block">Total Places</Label>
                        <Input type="number" value={totalSeats} onChange={e => setTotalSeats(e.target.value)} className="h-10 rounded-lg bg-slate-900 border-none font-black text-center" />
                    </div>
                    <div className="space-y-1">
                        <Label className="text-[8px] font-black uppercase text-slate-500 text-center block">Nb Rangs</Label>
                        <Input type="number" value={rows} onChange={e => setRows(e.target.value)} className="h-10 rounded-lg bg-slate-900 border-none font-black text-center" />
                    </div>
                    <div className="space-y-1">
                        <Label className="text-[8px] font-black uppercase text-slate-500 text-center block">Nb Colonnes</Label>
                        <Input type="number" value={seatsPerRow} onChange={e => setSeatsPerRow(e.target.value)} className="h-10 rounded-lg bg-slate-900 border-none font-black text-center" />
                    </div>
                </div>
            </div>

            <Button onClick={handleSave} disabled={saving} className="w-full h-14 rounded-xl font-black text-lg shadow-2xl bg-primary text-white hover:bg-primary/90 uppercase tracking-widest active:scale-95 transition-all mt-4 border-none">
                {saving ? <RefreshCw className="animate-spin h-6 w-6" /> : <Save className="mr-2 h-5 w-5" />}
                {editId ? 'METTRE À JOUR' : 'VALIDER L\'APPAREIL'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// --- SOUS-COMPOSANT : STAT CARD ---
function StatCard({ label, value, icon: Icon, color, bg }: any) {
    return (
        <div className="bg-card border-2 border-border rounded-2xl p-4 shadow-xl flex items-center gap-4 transition-all hover:border-primary/20">
            <div className={`h-10 w-10 sm:h-12 sm:w-12 rounded-xl ${bg} flex items-center justify-center shrink-0 border border-white/5 shadow-inner`}>
                <Icon size={22} className={color} />
            </div>
            <div className="min-w-0">
                <p className="text-[7px] sm:text-[9px] font-black uppercase text-slate-500 tracking-widest leading-none mb-1 truncate">{label}</p>
                <p className={`text-base sm:text-2xl font-black tracking-tighter leading-none ${color}`}>{value}</p>
            </div>
        </div>
    );
}