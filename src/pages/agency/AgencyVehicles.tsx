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

  if (loading && vehicles.length === 0) return <div className="p-8 space-y-4"><Skeleton className="h-12 w-48" /><Skeleton className="h-64 w-full rounded-[2rem]" /></div>;

  return (
    <div className="max-w-6xl mx-auto p-4 text-left space-y-10 animate-in fade-in duration-500">
      
      {/* HEADER : BOOSTE POUR LE CONFORT */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
        <div>
          <h1 className="text-4xl font-black italic text-slate-900 uppercase tracking-tighter leading-none">Ma Flotte</h1>
          <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest mt-2 italic text-primary">Gestion technique du parc roulant</p>
        </div>
        <Button onClick={() => { resetForm(); setShowForm(true); }} size="lg" className="w-full sm:w-auto rounded-[1.5rem] font-black gap-3 h-20 px-10 shadow-2xl shadow-primary/20 transition-all active:scale-95 uppercase tracking-widest text-base">
          <Plus size={28} /> ENREGISTRER UN APPAREIL
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {currentVehicles.map(v => (
          <div key={v.id} className="bg-white border-2 border-slate-100 rounded-[3rem] p-8 hover:shadow-xl transition-all group relative overflow-hidden">
            <div className="flex items-center gap-6 mb-8 text-left">
              <div className={`h-20 w-20 rounded-[1.5rem] flex items-center justify-center text-white shadow-xl shrink-0 ${
                v.vehicleType === 'Train' ? 'bg-slate-900' : v.vehicleType === 'Bateau' ? 'bg-blue-600' : 'bg-primary'
              }`}>
                {v.vehicleType === 'Train' ? <Train size={36} /> : v.vehicleType === 'Bateau' ? <Ship size={36} /> : <Bus size={36} />}
              </div>
              <div className="overflow-hidden">
                <p className="font-black text-2xl text-slate-800 leading-none truncate">{v.vehicleNumber}</p>
                <div className="flex items-center gap-2 mt-3">
                    <span className="text-[10px] font-black text-primary uppercase bg-primary/5 px-3 py-1 rounded-xl border-2 border-primary/10 tracking-widest shadow-sm">
                        {v.registration}
                    </span>
                    {(v.vehicleType === 'Train' || v.vehicleType === 'Bateau') && <Gem size={16} className="text-amber-500 animate-pulse" />}
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-4 mb-8 py-6 border-y-2 border-dashed border-slate-50">
               <div className="text-center">
                 <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Places</p>
                 <p className="font-black text-xl text-slate-700">{v.totalSeats}</p>
               </div>
               <div className="text-center border-x-2 border-slate-50">
                 <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Grille</p>
                 <p className="font-black text-xl text-slate-700">{v.rows}x{v.seatsPerRow}</p>
               </div>
               <div className="text-center">
                 <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Catégorie</p>
                 <p className="font-black text-primary text-[10px] uppercase truncate">{v.vehicleType}</p>
               </div>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" className="flex-1 font-black rounded-2xl border-2 h-14 text-xs uppercase tracking-widest shadow-sm" onClick={() => openEdit(v)}>Modifier</Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" className="rounded-2xl border-2 text-red-300 hover:text-red-600 hover:bg-red-50 h-14 px-6 shadow-sm"><Trash2 size={24} /></Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="rounded-[3rem] border-none shadow-2xl p-12">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="font-black italic text-3xl uppercase tracking-tighter leading-none">Supprimer l'appareil ?</AlertDialogTitle>
                    <AlertDialogDescription className="text-base font-medium mt-4">Confirmez-vous le retrait de <strong>{v.vehicleNumber}</strong> de votre inventaire ?</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter className="mt-10 gap-4">
                    <AlertDialogCancel className="rounded-2xl font-black h-16 px-8 uppercase tracking-widest text-xs">ANNULER</AlertDialogCancel>
                    <AlertDialogAction onClick={() => handleDelete(v.id)} className="bg-red-600 rounded-2xl font-black h-16 px-8 uppercase tracking-widest text-xs text-white">OUI, SUPPRIMER</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        ))}
      </div>

      {/* PAGINATION XXL */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-8 mt-16 bg-white p-4 rounded-[2rem] border-2 border-slate-50 w-fit mx-auto shadow-2xl">
          <Button variant="ghost" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="rounded-2xl h-14 w-14 border-2 bg-white hover:bg-slate-50"><ChevronLeft size={28}/></Button>
          <div className="flex items-center gap-3 font-black text-base uppercase tracking-widest text-slate-400 px-8">
             <span className="text-primary">Page {currentPage}</span>
             <span className="opacity-20 text-2xl">/</span>
             <span>{totalPages}</span>
          </div>
          <Button variant="ghost" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)} className="rounded-2xl h-14 w-14 border-2 bg-white hover:bg-slate-50"><ChevronRight size={28}/></Button>
        </div>
      )}

      {/* DIALOG FORMULAIRE XXL */}
      <Dialog open={showForm} onOpenChange={(o) => { if(!o) resetForm(); setShowForm(o); }}>
        <DialogContent className="rounded-[3rem] p-12 max-w-lg border-none shadow-[0_40px_100px_rgba(0,0,0,0.3)] animate-in zoom-in-95">
          <DialogHeader><DialogTitle className="text-4xl font-black italic uppercase tracking-tighter text-left leading-none text-slate-900 mb-8">{editId ? 'Édition' : 'Ajout'} Matériel</DialogTitle></DialogHeader>
          
          <div className="space-y-10 mt-10">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                <div className="space-y-3 text-left">
                    <Label className="text-xs font-black uppercase text-slate-900 opacity-70 ml-4 tracking-[0.2em] italic">Nom Interne</Label>
                    <Input value={vehicleNumber} onChange={e => setVehicleNumber(e.target.value)} className="h-16 rounded-2xl bg-slate-50 border-none font-black text-xl px-8 shadow-inner focus:ring-4 focus:ring-primary/20" placeholder="Ex: Bus 101" />
                </div>
                <div className="space-y-3 text-left">
                    <Label className="text-xs font-black uppercase text-slate-900 opacity-70 ml-4 tracking-[0.2em] italic">Plaque / Immat.</Label>
                    <Input value={registration} onChange={e => setRegistration(e.target.value)} className="h-16 rounded-2xl bg-primary/5 border-2 border-primary/20 font-black text-primary text-xl px-8 shadow-sm" placeholder="RG-000-AA" />
                </div>
            </div>

            <div className="space-y-3 text-left">
                <Label className="text-xs font-black uppercase text-slate-900 opacity-70 ml-4 tracking-[0.2em] italic">Type d'appareil</Label>
                <Select value={vehicleType} onValueChange={setVehicleType}>
                    <SelectTrigger className="h-16 rounded-2xl bg-slate-50 border-none font-black text-sm px-8 shadow-inner focus:ring-4 focus:ring-primary/20"><SelectValue /></SelectTrigger>
                    <SelectContent className="rounded-[1.5rem] shadow-2xl border-none">
                        {['Bus', 'Train', 'Bateau', 'Coaster', 'MiniBus'].map(t => <SelectItem key={t} value={t} className="font-bold py-4 text-xs">{t}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>

            {/* CONFIGURATION DES SIÈGES XXL */}
            <div className="p-8 bg-slate-50 rounded-[2.5rem] border-2 border-slate-100 shadow-inner">
                <div className="flex items-center gap-3 mb-8 px-2">
                    <Armchair size={24} className="text-primary" />
                    <h3 className="text-sm font-black uppercase text-slate-900 tracking-widest italic">Plan de cabine</h3>
                </div>
                <div className="grid grid-cols-3 gap-6">
                    <div className="space-y-2 text-left">
                        <Label className="text-[9px] font-black uppercase text-slate-500 text-center block tracking-widest">Total</Label>
                        <Input type="number" value={totalSeats} onChange={e => setTotalSeats(e.target.value)} className="h-14 rounded-xl bg-white border-none font-black text-2xl text-center shadow-sm" />
                    </div>
                    <div className="space-y-2 text-left">
                        <Label className="text-[9px] font-black uppercase text-slate-500 text-center block tracking-widest">Rangs</Label>
                        <Input type="number" value={rows} onChange={e => setRows(e.target.value)} className="h-14 rounded-xl bg-white border-none font-black text-2xl text-center shadow-sm" />
                    </div>
                    <div className="space-y-2 text-left">
                        <Label className="text-[9px] font-black uppercase text-slate-500 text-center block tracking-widest">Cols</Label>
                        <Input type="number" value={seatsPerRow} onChange={e => setSeatsPerRow(e.target.value)} className="h-14 rounded-xl bg-white border-none font-black text-2xl text-center shadow-sm" />
                    </div>
                </div>
            </div>

            <Button onClick={handleSave} disabled={saving || !vehicleNumber} className="w-full h-24 rounded-[2.5rem] font-black text-2xl shadow-2xl shadow-primary/20 uppercase tracking-[0.3em] active:scale-95 transition-all mt-8 bg-primary text-white border-b-8 border-primary-foreground/20">
                {saving ? <RefreshCw className="animate-spin h-10 w-10" /> : <Save className="mr-4 h-10 w-10" />}
                {editId ? 'METTRE À JOUR' : 'VALIDER L’AJOUT'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}