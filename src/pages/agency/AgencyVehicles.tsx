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
import { Plus, Pencil, Trash2, Bus, Train, Ship, RefreshCw, ChevronLeft, ChevronRight, Save, Armchair, Gem, Plane } from 'lucide-react'; 
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
        // MAPPING MIS À JOUR POUR INCLURE L'AVION
        vehicleType: v.type === 'TRAIN' ? 'Train' : v.type === 'BOAT' ? 'Bateau' : v.type === 'PLANE' ? 'Avion' : v.type === 'COASTER' ? 'Coaster' : v.type === 'MINIBUS' ? 'MiniBus' : 'Bus',
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
      // MAPPING VERS LA BASE DE DONNÉES INCLUANT 'PLANE'
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

  const currentVehicles = useMemo(() => vehicles.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage), [vehicles, currentPage]);
  const totalPages = Math.ceil(vehicles.length / itemsPerPage);

  if (loading && vehicles.length === 0) return <div className="p-4 sm:p-8 space-y-4 bg-background min-h-screen"><RefreshCw className="animate-spin h-10 w-10 text-primary mx-auto" /><Skeleton className="h-64 w-full rounded-[2rem] bg-card" /></div>;

  return (
    <div className="max-w-6xl mx-auto p-3 sm:p-4 text-left space-y-8 sm:space-y-10 animate-in fade-in duration-500 bg-background text-foreground">
      
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-6">
        <div>
          <h1 className="text-2xl sm:text-4xl font-black italic text-white uppercase tracking-tighter leading-none">Mon Parc</h1>
          <p className="text-[10px] sm:text-sm font-bold text-slate-500 uppercase tracking-widest mt-1 sm:mt-2 italic">Gestion technique du parc roulant & volant</p>
        </div>
        <Button onClick={() => { resetForm(); setShowForm(true); }} className="w-full sm:w-auto rounded-xl sm:rounded-[1.5rem] font-black gap-2 h-14 sm:h-16 px-6 sm:px-10 shadow-xl bg-primary text-white border-none hover:bg-primary/90 transition-all active:scale-95 uppercase tracking-wider text-sm">
          <Plus size={20} className="sm:w-6 sm:h-6" /> ENREGISTRER UN APPAREIL
        </Button>
      </div>

      <div className="grid gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
        {currentVehicles.map(v => (
          <div key={v.id} className="bg-card border border-border rounded-[1.5rem] sm:rounded-[3rem] p-5 sm:p-8 hover:shadow-2xl hover:border-primary/30 transition-all group relative overflow-hidden">
            <div className="flex items-center gap-4 sm:gap-6 mb-6 sm:mb-8 text-left">
              <div className={`h-14 w-14 sm:h-20 sm:w-20 rounded-xl sm:rounded-[1.5rem] flex items-center justify-center text-white shadow-lg shrink-0 ${
                v.vehicleType === 'Train' ? 'bg-slate-950 border border-slate-800' : v.vehicleType === 'Bateau' ? 'bg-blue-600' : v.vehicleType === 'Avion' ? 'bg-indigo-600' : 'bg-primary'
              }`}>
                {/* LOGIQUE D'ICÔNE MISE À JOUR */}
                {v.vehicleType === 'Train' ? <Train className="w-8 h-8 sm:w-9 sm:h-9" /> : v.vehicleType === 'Bateau' ? <Ship className="w-8 h-8 sm:w-9 sm:h-9" /> : v.vehicleType === 'Avion' ? <Plane className="w-8 h-8 sm:w-9 sm:h-9" /> : <Bus className="w-8 h-8 sm:w-9 sm:h-9" />}
              </div>
              <div className="overflow-hidden">
                <p className="font-black text-lg sm:text-2xl text-white leading-tight truncate uppercase tracking-tight">{v.vehicleNumber}</p>
                <div className="flex items-center gap-2 mt-1 sm:mt-3">
                    <span className="text-[8px] sm:text-[10px] font-black text-primary uppercase bg-primary/10 px-2 py-0.5 rounded-lg border border-primary/20 tracking-wider">
                        {v.registration}
                    </span>
                    {(v.vehicleType === 'Train' || v.vehicleType === 'Bateau' || v.vehicleType === 'Avion') && <Gem size={14} className="text-amber-500 shrink-0" />}
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-6 sm:mb-8 py-4 sm:py-6 border-y-2 border-dashed border-slate-800/50">
               <div className="text-center">
                 <p className="text-[8px] sm:text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1 leading-none">Places</p>
                 <p className="font-black text-base sm:text-xl text-slate-100">{v.totalSeats}</p>
               </div>
               <div className="text-center border-x-2 border-slate-800/50">
                 <p className="text-[8px] sm:text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1 leading-none">Grille</p>
                 <p className="font-black text-base sm:text-xl text-slate-100">{v.rows}x{v.seatsPerRow}</p>
               </div>
               <div className="text-center">
                 <p className="text-[8px] sm:text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1 leading-none">Catégorie</p>
                 <p className="font-black text-primary text-[8px] sm:text-[10px] uppercase truncate mt-1">{v.vehicleType}</p>
               </div>
            </div>

            <div className="flex gap-2 sm:gap-3">
              <Button variant="outline" className="flex-1 font-black rounded-xl sm:rounded-2xl border-slate-800 bg-slate-950 text-slate-300 h-12 sm:h-14 text-[10px] sm:text-xs uppercase tracking-widest hover:bg-slate-800 hover:text-white transition-all" onClick={() => openEdit(v)}>Modifier</Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" className="rounded-xl sm:rounded-2xl border-slate-800 bg-slate-950 text-red-400 hover:text-red-300 hover:bg-red-500/10 h-12 w-12 sm:h-14 sm:w-14 p-0 shrink-0 shadow-sm transition-colors"><Trash2 size={20} /></Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="rounded-[2rem] sm:rounded-[3rem] w-[95vw] sm:max-w-md p-6 sm:p-10 bg-slate-900 border-slate-800 text-white shadow-2xl">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="font-black italic text-xl sm:text-3xl uppercase tracking-tighter text-white">Suppression</AlertDialogTitle>
                    <AlertDialogDescription className="text-sm sm:text-base font-medium mt-2 text-slate-400">Retirer définitivement <strong>{v.vehicleNumber}</strong> de votre base ?</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter className="mt-6 sm:mt-10 gap-2 sm:gap-4 flex-col sm:flex-row">
                    <AlertDialogCancel className="rounded-xl sm:rounded-2xl font-black h-12 sm:h-14 px-6 uppercase text-[10px] bg-slate-800 border-none text-white hover:bg-slate-700 mt-0">ANNULER</AlertDialogCancel>
                    <AlertDialogAction onClick={() => handleDelete(v.id)} className="bg-red-600 rounded-xl sm:rounded-2xl font-black h-12 sm:h-14 px-6 uppercase text-[10px] text-white hover:bg-red-700 border-none">SUPPRIMER</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        ))}
      </div>

      {/* PAGINATION */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 sm:gap-8 mt-10 sm:mt-16 bg-slate-900 p-2 sm:p-3 rounded-xl sm:rounded-[2rem] border-2 border-slate-800 w-fit mx-auto shadow-2xl">
          <Button variant="ghost" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="rounded-lg sm:rounded-2xl h-10 w-10 sm:h-12 sm:w-12 border border-slate-800 bg-slate-950 text-slate-400 hover:bg-slate-800 hover:text-white transition-all"><ChevronLeft size={20}/></Button>
          <div className="flex items-center gap-2 sm:gap-3 font-black text-[10px] sm:text-sm uppercase tracking-widest text-slate-500 px-2 sm:px-6 text-center">
             <span className="text-primary whitespace-nowrap">Page {currentPage}</span>
             <span className="opacity-20 text-slate-700">/</span>
             <span>{totalPages}</span>
          </div>
          <Button variant="ghost" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)} className="rounded-lg sm:rounded-2xl h-10 w-10 sm:h-12 sm:w-12 border border-slate-800 bg-slate-950 text-slate-400 hover:bg-slate-800 hover:text-white transition-all"><ChevronRight size={20}/></Button>
        </div>
      )}

      {/* DIALOG FORMULAIRE */}
      <Dialog open={showForm} onOpenChange={(o) => { if(!o) resetForm(); setShowForm(o); }}>
        <DialogContent className="rounded-none sm:rounded-[3rem] p-6 sm:p-12 h-full sm:h-auto max-w-lg overflow-y-auto border-slate-800 bg-slate-900 text-white shadow-2xl">
          <DialogHeader><DialogTitle className="text-2xl sm:text-4xl font-black italic uppercase tracking-tighter text-left text-white leading-none mb-4 sm:mb-8">{editId ? 'Édition' : 'Ajout'} Matériel</DialogTitle></DialogHeader>
          
          <div className="space-y-6 sm:space-y-8 mt-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                <div className="space-y-2 text-left">
                    <Label className="text-[10px] font-black uppercase text-slate-500 ml-2 tracking-widest italic leading-none">Nom Interne (Appel)</Label>
                    <Input value={vehicleNumber} onChange={e => setVehicleNumber(e.target.value)} className="h-12 sm:h-14 rounded-xl sm:rounded-2xl bg-slate-950 border-none font-black text-base sm:text-lg px-4 sm:px-6 shadow-inner text-white outline-none" placeholder="Ex: Vol G-200" />
                </div>
                <div className="space-y-2 text-left">
                    <Label className="text-[10px] font-black uppercase text-slate-500 ml-2 tracking-widest italic leading-none">Numéro / Immat.</Label>
                    <Input value={registration} onChange={e => setRegistration(e.target.value)} className="h-12 sm:h-14 rounded-xl sm:rounded-2xl bg-primary/10 border-2 border-primary/20 font-black text-primary text-base sm:text-lg px-4 sm:px-6 shadow-sm outline-none" placeholder="TR-XXX-AA" />
                </div>
            </div>

            <div className="space-y-2 text-left">
                <Label className="text-[10px] font-black uppercase text-slate-500 ml-2 tracking-widest italic leading-none">Type de transport</Label>
                <Select value={vehicleType} onValueChange={setVehicleType}>
                    <SelectTrigger className="h-12 sm:h-14 rounded-xl sm:rounded-2xl bg-slate-950 border-none font-black text-sm px-4 sm:px-6 shadow-inner text-white outline-none"><SelectValue /></SelectTrigger>
                    <SelectContent className="rounded-xl shadow-2xl bg-slate-900 border-slate-800 text-white">
                        {/* AJOUT DE L'OPTION AVION DANS LE FORMULAIRE */}
                        {['Bus', 'Train', 'Bateau', 'Avion', 'Coaster', 'MiniBus'].map(t => <SelectItem key={t} value={t} className="font-bold py-3 text-xs focus:bg-primary/20">{t}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>

            <div className="p-5 sm:p-8 bg-slate-950 rounded-[1.5rem] sm:rounded-[2.5rem] border-2 border-slate-800/50">
                <div className="flex items-center gap-3 mb-4 sm:mb-6">
                    <Armchair size={18} className="text-primary" />
                    <h3 className="text-[10px] sm:text-sm font-black uppercase text-white tracking-widest italic">Plan de cabine</h3>
                </div>
                <div className="grid grid-cols-3 gap-3 sm:gap-6">
                    <div className="space-y-1 text-center">
                        <Label className="text-[8px] sm:text-[9px] font-black uppercase text-slate-500 tracking-widest">Total</Label>
                        <Input type="number" value={totalSeats} onChange={e => setTotalSeats(e.target.value)} className="h-10 sm:h-12 rounded-lg bg-slate-900 border-none font-black text-lg sm:text-xl text-center text-white" />
                    </div>
                    <div className="space-y-1 text-center">
                        <Label className="text-[8px] sm:text-[9px] font-black uppercase text-slate-500 tracking-widest">Rangs</Label>
                        <Input type="number" value={rows} onChange={e => setRows(e.target.value)} className="h-10 sm:h-12 rounded-lg bg-slate-900 border-none font-black text-lg sm:text-xl text-center text-white" />
                    </div>
                    <div className="space-y-1 text-center">
                        <Label className="text-[8px] sm:text-[9px] font-black uppercase text-slate-500 tracking-widest">Cols</Label>
                        <Input type="number" value={seatsPerRow} onChange={e => setSeatsPerRow(e.target.value)} className="h-10 sm:h-12 rounded-lg bg-slate-900 border-none font-black text-lg sm:text-xl text-center text-white" />
                    </div>
                </div>
            </div>

            <Button onClick={handleSave} disabled={saving || !vehicleNumber} className="w-full h-16 sm:h-20 rounded-xl sm:rounded-[2.5rem] font-black text-lg sm:text-xl shadow-2xl bg-primary text-white border-none hover:bg-primary/90 uppercase tracking-widest active:scale-95 transition-all mt-4">
                {saving ? <RefreshCw className="animate-spin h-6 w-6" /> : <Save className="mr-2 sm:mr-4 h-5 w-5 sm:h-6 sm:w-6" />}
                {editId ? 'METTRE À JOUR' : 'VALIDER'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}