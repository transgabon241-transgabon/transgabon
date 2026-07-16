"use client"

import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from "@/lib/auth-context";
import { supabase } from '@/lib/supabase'; 
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Pencil, Trash2, Users, ArrowRight, ChevronLeft, ChevronRight, Ship, Train, Bus, Save, RefreshCw, Hash } from 'lucide-react';
import { toast } from 'sonner';

type Departure = {
  id: string;
  departureCode: string;
  registration: string; // NOUVEAU
  departureCity: string;
  arrivalCity: string;
  departureDate: string;
  departureTime: string;
  arrivalTime: string;
  price: number;
  vipPrice: number;
  businessPrice: number;
  totalSeats: number;
  bookingCount: number;
  status: string;
  type: string; // BUS, TRAIN, BOAT
};

type Route = {
  id: string;
  departureCity: string;
  arrivalCity: string;
};

type Vehicle = {
  id: string;
  vehicleNumber: string;
  vehicleType: string;
  typeCode: string;
  totalSeats: number;
};

export default function AgencyDepartures() {
  const { user } = useAuth();
  const [departures, setDepartures] = useState<Departure[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // --- ÉTATS POUR LA PAGINATION ---
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Form state
  const [routeId, setRouteId] = useState('');
  const [vehicleId, setVehicleId] = useState('');
  const [depDate, setDepDate] = useState('');
  const [depTime, setDepTime] = useState('');
  const [arrTime, setArrTime] = useState('');
  const [price, setPrice] = useState('');
  const [vipPrice, setVipPrice] = useState('');
  const [businessPrice, setBusinessPrice] = useState('');
  const [status, setStatus] = useState('');

  const isBoardingAgent = user?.role === 'Agent Embarquement';

  const loadData = async () => {
    if (!user?.companyId) return;
    setLoading(true);
    try {
      // RÉCUPÉRATION AVEC JOINTURE VEHICLE POUR L'IMMATRICULATION
      const { data: tripsData } = await supabase
        .from('trips')
        .select('*, from:cities!from_id(name), to:cities!to_id(name), vehicle:vehicles(registration)')
        .eq('company_id', user.companyId)
        .order('departure_date', { ascending: true });

      const formattedDeps: Departure[] = (tripsData || []).map(t => ({
        id: t.id,
        departureCode: t.vehicle_number,
        registration: t.vehicle?.registration || 'Non spécifiée', // MAPPAGE DE L'IMMATRICULATION
        departureCity: t.from.name,
        arrivalCity: t.to.name,
        departureDate: t.departure_date,
        departureTime: t.departure_time,
        arrivalTime: t.arrival_time,
        price: t.price,
        vipPrice: t.class_vip_price || 0,
        businessPrice: t.class_business_price || 0,
        totalSeats: t.seats_total,
        bookingCount: t.seats_total - t.seats_left,
        status: t.status || 'Programmé',
        type: t.type
      }));

      setDepartures(formattedDeps);

      const { data: routesData } = await supabase.from('routes').select('*');
      setRoutes((routesData || []).map(r => ({ id: r.id, departureCity: r.departure_city, arrivalCity: r.arrival_city })));

      const { data: vehiclesData } = await supabase.from('vehicles').select('*').eq('company_id', user.companyId);
      setVehicles((vehiclesData || []).map(v => ({
        id: v.id,
        vehicleNumber: v.name,
        vehicleType: v.type === 'BOAT' ? 'Bateau' : v.type === 'TRAIN' ? 'Train' : 'Bus',
        typeCode: v.type,
        totalSeats: v.capacity
      })));

    } catch (e: any) {
      toast.error('Erreur de chargement');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [user]);

  // --- CALCUL PAGINATION ---
  const totalPages = Math.ceil(departures.length / itemsPerPage);
  const currentItems = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return departures.slice(start, start + itemsPerPage);
  }, [departures, currentPage]);

  const resetForm = () => {
    setRouteId(''); setVehicleId(''); setDepDate(''); setDepTime(''); setArrTime(''); 
    setPrice(''); setVipPrice(''); setBusinessPrice(''); setStatus('');
    setEditId(null);
  };

  const openEdit = (dep: Departure) => {
    setEditId(dep.id);
    setDepDate(dep.departureDate);
    setDepTime(dep.departureTime);
    setArrTime(dep.arrivalTime || '');
    setPrice(String(dep.price));
    setVipPrice(String(dep.vipPrice));
    setBusinessPrice(String(dep.businessPrice));
    setStatus(dep.status);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!user?.companyId) return;
    setSaving(true);
    try {
      const payload: any = {
        departure_date: depDate,
        departure_time: depTime,
        arrival_time: arrTime,
        price: Number(price),
        class_vip_price: vipPrice ? Number(vipPrice) : null,
        class_business_price: businessPrice ? Number(businessPrice) : null,
        status: status || 'Programmé'
      };

      if (editId) {
        await supabase.from('trips').update(payload).eq('id', editId);
      } else {
        const route = routes.find(r => r.id === routeId);
        const vehicle = vehicles.find(v => v.id === vehicleId);
        const { data: fC } = await supabase.from('cities').select('id').ilike('name', route!.departureCity).single();
        const { data: tC } = await supabase.from('cities').select('id').ilike('name', route!.arrivalCity).single();

        await supabase.from('trips').insert([{
          ...payload,
          company_id: user.companyId,
          type: vehicle!.typeCode,
          vehicle_number: vehicle!.vehicleNumber,
          vehicle_id: vehicle!.id,
          from_id: fC!.id,
          to_id: tC!.id,
          duration_min: 240,
          seats_total: vehicle!.totalSeats,
          seats_left: vehicle!.totalSeats,
        }]);
      }
      setShowForm(false);
      loadData();
      toast.success('Modifications enregistrées');
    } catch (e) {
      toast.error("Erreur de sauvegarde");
    } finally {
      setSaving(false);
    }
  };

  const selectedVehicle = vehicles.find(v => v.id === vehicleId);

  if (loading) return <div className="max-w-5xl mx-auto p-8 space-y-4"><Skeleton className="h-12 w-48 rounded-xl" /><Skeleton className="h-64 w-full rounded-[2rem]" /></div>;

  return (
    <div className="max-w-6xl mx-auto p-4 text-left">
      {/* HEADER PROFESSIONNEL */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black italic text-primary uppercase tracking-tighter">Gestion des départs</h1>
          <p className="text-muted-foreground font-bold text-[10px] uppercase tracking-widest mt-1">Planification des trajets agence</p>
        </div>
        {!isBoardingAgent && (
          <Button onClick={() => { resetForm(); setShowForm(true); }} className="rounded-2xl font-black gap-2 h-12 px-6 shadow-lg shadow-primary/20 transition-all active:scale-95">
            <Plus size={20} /> NOUVEAU DÉPART
          </Button>
        )}
      </div>

      {departures.length === 0 ? (
        <div className="p-20 text-center border-2 border-dashed rounded-[3rem] bg-slate-50/50">
          <RefreshCw className="h-12 w-12 mx-auto mb-4 text-slate-200" />
          <p className="text-slate-400 font-bold uppercase text-xs tracking-widest">Aucun voyage programmé</p>
        </div>
      ) : (
        <div className="space-y-4">
          {currentItems.map(dep => (
            <div key={dep.id} className="bg-white border-2 border-slate-100 rounded-[2rem] p-6 flex flex-col md:flex-row justify-between items-center gap-4 hover:shadow-xl transition-all group">
              <div className="flex items-center gap-5 flex-1 w-full">
                <div className={`h-14 w-14 rounded-2xl flex items-center justify-center text-white shadow-lg ${dep.type === 'BOAT' ? 'bg-blue-600' : dep.type === 'TRAIN' ? 'bg-slate-900' : 'bg-primary'}`}>
                  {dep.type === 'BOAT' ? <Ship size={24} /> : dep.type === 'TRAIN' ? <Train size={24} /> : <Bus size={24} />}
                </div>
                <div>
                  <div className="flex items-center gap-2 font-black text-lg text-slate-800 uppercase tracking-tighter">
                    {dep.departureCity} <ArrowRight size={16} className="text-primary opacity-30" /> {dep.arrivalCity}
                    <StatusBadge status={dep.status} />
                  </div>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    <p className="text-xs font-bold text-muted-foreground uppercase">
                      {dep.departureCode} 
                    </p>
                    <span className="text-primary font-black px-2 py-0.5 bg-primary/5 rounded border border-primary/10 text-[10px] flex items-center gap-1 uppercase">
                       <Hash size={10} /> {dep.registration}
                    </span>
                    <span className="text-slate-300">•</span>
                    <p className="text-xs font-bold text-muted-foreground">
                      {new Date(dep.departureDate + 'T00:00:00').toLocaleDateString('fr-FR')} • {dep.departureTime}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center justify-between w-full md:w-auto gap-4 border-t md:border-none pt-4 md:pt-0">
                <div className="text-left md:text-right mr-4">
                   <p className="font-black text-primary text-xl leading-none">{dep.price.toLocaleString()} F</p>
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">{dep.bookingCount}/{dep.totalSeats} PLACES PRISES</p>
                </div>
                <div className="flex gap-2">
                  <Link to={`/agency/passengers/${dep.id}`}><Button variant="outline" size="icon" className="rounded-xl border-2 hover:bg-slate-50" title="Manifeste"><Users size={18} /></Button></Link>
                  {!isBoardingAgent && (
                    <>
                      <Button variant="outline" size="icon" onClick={() => openEdit(dep)} className="rounded-xl border-2 hover:bg-slate-50" title="Modifier"><Pencil size={18} /></Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild><Button variant="outline" size="icon" className="rounded-xl border-2 text-red-500 hover:bg-red-50"><Trash2 size={18} /></Button></AlertDialogTrigger>
                        <AlertDialogContent className="rounded-[2.5rem] border-none shadow-2xl"><AlertDialogHeader><AlertDialogTitle className="font-black italic text-2xl uppercase">Supprimer ?</AlertDialogTitle><AlertDialogDescription className="font-medium">Cette action annulera définitivement ce départ.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel className="rounded-xl font-bold">Retour</AlertDialogCancel><AlertDialogAction onClick={() => { supabase.from('trips').delete().eq('id', dep.id).then(()=>loadData()); }} className="bg-red-600 rounded-xl font-bold">SUPPRIMER</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
                      </AlertDialog>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}

          {/* --- PAGINATION UNIFIÉE --- */}
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
        </div>
      )}

      {/* MODAL FORMULAIRE UNIFIÉ */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="rounded-[2.5rem] p-8 max-w-lg border-none shadow-2xl overflow-y-auto max-h-[90vh]">
          <DialogHeader><DialogTitle className="text-2xl font-black italic uppercase tracking-tighter text-left">{editId ? 'Modifier le Voyage' : 'Programmer un Voyage'}</DialogTitle></DialogHeader>
          <div className="space-y-6 mt-6">
            {!editId && (
              <div className="space-y-4">
                <div className="space-y-1.5">
                   <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Itinéraire du trajet</Label>
                   <Select value={routeId} onValueChange={setRouteId}>
                      <SelectTrigger className="h-12 rounded-xl bg-slate-50 border-none font-bold"><SelectValue placeholder="Choisir un itinéraire" /></SelectTrigger>
                      <SelectContent className="rounded-xl">{routes.map(r => <SelectItem key={r.id} value={r.id} className="font-bold">{r.departureCity} → {r.arrivalCity}</SelectItem>)}</SelectContent>
                   </Select>
                </div>
                <div className="space-y-1.5">
                   <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Véhicule affecté</Label>
                   <Select value={vehicleId} onValueChange={setVehicleId}>
                      <SelectTrigger className="h-12 rounded-xl bg-slate-50 border-none font-bold"><SelectValue placeholder="Choisir véhicule" /></SelectTrigger>
                      <SelectContent className="rounded-xl">{vehicles.map(v => <SelectItem key={v.id} value={v.id} className="font-bold">{v.vehicleNumber} ({v.vehicleType} — {v.totalSeats} pl.)</SelectItem>)}</SelectContent>
                   </Select>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Date de départ</Label>
                <Input type="date" value={depDate} onChange={e => setDepDate(e.target.value)} className="h-12 rounded-xl bg-slate-50 border-none font-bold" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Heure de départ</Label>
                <Input type="time" value={depTime} onChange={e => setDepTime(e.target.value)} className="h-12 rounded-xl bg-slate-50 border-none font-bold" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 border-t pt-4">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Prix Standard / Éco</Label>
                <Input type="number" value={price} onChange={e => setPrice(e.target.value)} className="h-12 rounded-xl bg-slate-50 border-none font-black text-primary text-lg" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Heure d'arrivée (Est.)</Label>
                <Input type="time" value={arrTime} onChange={e => setArrTime(e.target.value)} className="h-12 rounded-xl bg-slate-50 border-none font-bold text-slate-500" />
              </div>
            </div>

            {/* OPTIONS MARITIMES (DÉTECTION DYNAMIQUE) */}
            {(selectedVehicle?.typeCode === 'BOAT' || departures.find(d=>d.id===editId)?.type === 'BOAT') && (
              <div className="grid grid-cols-2 gap-4 p-5 bg-blue-50/50 rounded-3xl border-2 border-blue-100 animate-in fade-in zoom-in-95">
                <div className="space-y-1.5 text-left">
                  <Label className="text-[10px] font-black uppercase text-blue-600 ml-1">Prix Business</Label>
                  <Input type="number" placeholder="Facultatif" value={businessPrice} onChange={e => setBusinessPrice(e.target.value)} className="h-11 rounded-xl bg-white border-blue-200 font-bold" />
                </div>
                <div className="space-y-1.5 text-left">
                  <Label className="text-[10px] font-black uppercase text-blue-600 ml-1">Prix VIP</Label>
                  <Input type="number" placeholder="Facultatif" value={vipPrice} onChange={e => setVipPrice(e.target.value)} className="h-11 rounded-xl bg-white border-blue-200 font-bold" />
                </div>
              </div>
            )}

            {editId && (
              <div className="space-y-1.5 border-t pt-4 text-left">
                <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">État actuel du trajet</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger className="h-12 rounded-xl bg-slate-50 border-none font-bold"><SelectValue /></SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {['Programmé', 'Embarquement', 'Parti', 'Arrivé', 'Annulé'].map(s => <SelectItem key={s} value={s} className="font-bold">{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}

            <Button onClick={handleSave} disabled={saving} className="w-full h-16 rounded-3xl font-black text-xl shadow-2xl shadow-primary/20 uppercase tracking-widest mt-4">
              {saving ? <RefreshCw className="animate-spin h-6 w-6" /> : <Save className="mr-2 h-6 w-6" />}
              {editId ? 'METTRE À JOUR' : 'CRÉER LE VOYAGE'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    'Programmé': 'bg-blue-100 text-blue-800 border-blue-200',
    'Embarquement': 'bg-orange-100 text-orange-800 border-orange-200',
    'Parti': 'bg-emerald-100 text-emerald-800 border-emerald-200',
    'Arrivé': 'bg-green-100 text-green-800 border-green-200',
    'Annulé': 'bg-red-100 text-red-800 border-red-200',
  };
  return <span className={`inline-block px-3 py-0.5 rounded-full text-[9px] font-black uppercase border ml-2 ${colors[status] || 'bg-muted border-slate-200'}`}>{status}</span>;
}